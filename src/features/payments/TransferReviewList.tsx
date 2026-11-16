import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Eye, FileText, Inbox, Landmark, Loader2, RotateCcw, Users, XCircle } from 'lucide-react';
import { formatUsd } from '../../domain/payments/purchase';
import { shortDay } from '../../domain/payments/travel';
import { TRANSFER_STATUS_TEXT, validateRejection } from '../../domain/payments/transfer';
import { loadTransfersToReview, receiptUrl, reviewTransfer, type TransferRow } from './transferApi';
import './transfer.css';

type Tab = 'receipt_submitted' | 'paid' | 'rejected';
const TABS: Array<[Tab, string]> = [['receipt_submitted', 'Por revisar'], ['paid', 'Recibidos'], ['rejected', 'Rechazados']];
type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; rows: TransferRow[] };

function Item({ row, onDecided }: { row: TransferRow; onDecided: (row: TransferRow) => void }) {
  const [url, setUrl] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const show = async () => {
    if (!row.receiptPath) return;
    setError('');
    try { const signed = await receiptUrl(row.receiptPath); if (row.receiptMime === 'application/pdf') window.open(signed, '_blank', 'noopener'); else setUrl(signed); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir.'); }
  };
  const decide = async (decision: 'paid' | 'rejected') => {
    if (decision === 'rejected') { const problem = validateRejection(reason); if (problem) { setError(problem); return; } }
    setBusy(true); setError('');
    try { const result = await reviewTransfer(row.id, decision, decision === 'rejected' ? reason.trim() : undefined); onDecided({ ...row, status: result.status, rejectionReason: result.rejectionReason }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };
  const people = row.adults + row.children;
  return <li className="trv-item" data-status={row.status}>
    <div className="trv-top"><h4>{row.title}</h4><strong>{formatUsd(Math.round(row.amount * 100))}</strong></div>
    <ul className="trv-meta">
      <li className="trv-ref">{row.reference}</li>
      <li><CalendarDays size={14} aria-hidden="true" />{shortDay(row.startDate)} → {shortDay(row.endDate)}</li>
      <li><Users size={14} aria-hidden="true" />{people} {people === 1 ? 'persona' : 'personas'}</li>
    </ul>
    <p className="trv-note">{TRANSFER_STATUS_TEXT[row.status]}{row.rejectionReason ? ` · «${row.rejectionReason}»` : ''}</p>
    {url && <img className="trv-preview" src={url} alt={`Comprobante ${row.reference}`} />}
    {rejecting && <label className="trv-reject"><span>Motivo para el viajero</span><textarea className="field" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ej.: el monto no coincide" /></label>}
    <p className="buy-error" role="alert">{error}</p>
    <div className="trv-actions">
      {row.receiptPath && !url && <button type="button" className="button button-secondary" onClick={() => void show()}>{row.receiptMime === 'application/pdf' ? <FileText size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}Ver comprobante</button>}
      {row.status === 'receipt_submitted' && !rejecting && <>
        <button type="button" className="button button-primary" disabled={busy} onClick={() => void decide('paid')}>{busy ? <Loader2 className="tr-spin" size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}Pago recibido</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => setRejecting(true)}><XCircle size={16} aria-hidden="true" />Rechazar</button>
      </>}
      {rejecting && <>
        <button type="button" className="button button-primary" disabled={busy} onClick={() => void decide('rejected')}><XCircle size={16} aria-hidden="true" />Rechazar · pedir otro</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setRejecting(false); setError(''); }}>Cancelar</button>
      </>}
    </div>
  </li>;
}

/**
 * Comprobantes de transferencia que llegan al negocio. Para montar en el panel de negocio.
 * La RLS de Supabase solo devuelve transferencias de organizaciones donde la persona es miembro activo;
 * decidir («Pago recibido» / «Rechazar») exige ser responsable y queda auditado en el servidor.
 */
export function TransferReviewList({ organizationId }: { organizationId?: string }) {
  const [tab, setTab] = useState<Tab>('receipt_submitted');
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const refresh = useCallback(() => {
    setLoad({ state: 'loading' });
    loadTransfersToReview(organizationId).then(rows => setLoad({ state: 'ready', rows }), reason => setLoad({ state: 'error', message: reason instanceof Error ? reason.message : 'No se pudieron cargar.' }));
  }, [organizationId]);
  useEffect(() => { refresh(); }, [refresh]);
  const rows = load.state === 'ready' ? load.rows.filter(row => row.status === tab) : [];
  const pending = load.state === 'ready' ? load.rows.filter(row => row.status === 'receipt_submitted').length : 0;
  const decided = (next: TransferRow) => setLoad(current => current.state === 'ready' ? { state: 'ready', rows: current.rows.map(row => row.id === next.id ? next : row) } : current);
  return <section className="trv" aria-label="Transferencias recibidas">
    <div className="trv-head"><h3><Landmark size={20} aria-hidden="true" />Transferencias</h3>{pending > 0 && <span className="trv-count">{pending} por revisar</span>}<button type="button" className="tr-icon-button" onClick={refresh} aria-label="Actualizar lista"><RotateCcw size={16} /></button></div>
    <div className="trv-tabs" role="group" aria-label="Filtrar transferencias">{TABS.map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {load.state === 'loading' ? <p className="tr-loading" role="status"><Loader2 className="tr-spin" size={18} aria-hidden="true" />Cargando…</p>
      : load.state === 'error' ? <p className="buy-error" role="alert">{load.message}</p>
        : rows.length ? <ul className="trv-list">{rows.map(row => <Item key={row.id} row={row} onDecided={decided} />)}</ul>
          : <div className="trv-empty"><Inbox size={28} aria-hidden="true" /><p>{tab === 'receipt_submitted' ? 'Nada por revisar.' : 'Sin movimientos aquí.'}</p></div>}
    <p className="trv-note">Revisa en tu banco que el dinero llegó antes de marcar «Pago recibido».</p>
  </section>;
}
