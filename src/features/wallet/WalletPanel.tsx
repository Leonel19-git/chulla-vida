import { localDay } from '../../domain/payments/travel';
import { partyLabel, rangeSummary, shortDay } from '../../i18n/travel';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, CheckCircle2, CircleX, Clock3, Download, Eye, FlaskConical, Inbox, Landmark, ReceiptText, ShieldCheck, Trash2, Users, Wallet, XCircle } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { formatUsd, isBoughtStatus, STATUS_TEXT, type WalletRecord } from '../../domain/payments/purchase';

import { TRANSFER_STATUS_TEXT } from '../../domain/payments/transfer';
import { loadMyTransfers, receiptUrl, type TransferRow } from '../payments/transferApi';
import { getSupabase } from '../../lib/supabase';
import { loadBookingData, type ConnectedBooking } from '../payments/api';
import { removeRecord, updateRecord, useWallet, WALLET_OPEN } from './store';
import { downloadReceipt } from './receipt';
import { cardLabel } from '../../domain/payments/card';
import { CardBrandMark } from '../payments/CardBrandMark';
import './wallet.css';

import { useT, tr, msg } from '../../i18n/v3';
const BOOKING_LABELS: Record<string, string> = { draft: 'Borrador', requested: 'Esperando al anfitrión', awaiting_merchant_confirmation: 'En revisión del anfitrión', confirmed: 'Confirmada por el anfitrión', awaiting_payment: 'Lista para pagar', paid: 'Pagada · verificada por el servidor', completed: 'Visita completada', expired: 'Vencida', cancelled: 'Cancelada', refunded: 'Reembolsada', payment_failed: 'Pago sin completar' };
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(amount);
const day = (value: string) => value ? shortDay(value) : tr('Fecha por confirmar');
function dates(record: Pick<WalletRecord, 'date' | 'endDate'>): string {
  if (!record.date) return tr('Fecha por confirmar');
  const range = record.endDate ? rangeSummary(record.date, record.endDate) : null;
  return range && record.endDate && range.days > 1 ? `${shortDay(record.date)} → ${shortDay(record.endDate)} · ${range.label}` : day(record.date);
}
const people = (record: Pick<WalletRecord, 'people' | 'children'>) => partyLabel({ adults: record.people - (record.children ?? 0), children: record.children ?? 0 });
/** Método de pago en una línea: «Visa •••• 4242» o «Transferencia · comprobante en revisión». */
function MethodChip({ record }: { record: WalletRecord }) {
  const t = useT();
  if (record.method === 'transfer' && record.transfer) {
    const verified = record.status === 'test_approved'; const rejected = record.status === 'test_transfer_rejected';
    return <span className={`wallet-method is-transfer ${verified ? 'is-ok' : rejected ? 'is-bad' : 'is-wait'}`}>{verified ? <CheckCircle2 size={14} aria-hidden="true" /> : rejected ? <XCircle size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}{t("Transferencia ·")}{' '}{verified ? t("verificada (prueba)") : rejected ? 'rechazada' : t("comprobante en revisión")}</span>;
  }
  return record.card ? <span className="wallet-card"><CardBrandMark brand={record.card.brand} size="sm" />{cardLabel(record.card)}</span> : null;
}

type Transfers = { state: 'off' } | { state: 'ready'; rows: TransferRow[] } | { state: 'error' };
function useMyTransfers(): Transfers {
  const [value, setValue] = useState<Transfers>({ state: 'off' });
  useEffect(() => {
    if (!getSupabase()) return;
    let live = true;
    loadMyTransfers().then(rows => { if (live) setValue({ state: 'ready', rows }); }, () => { if (live) setValue({ state: 'error' }); });
    return () => { live = false; };
  }, []);
  return value;
}
/** Comprobante propio: URL firmada de 60 s, se pide solo al tocar. */
function ReceiptLink({ path }: { path: string }) {
  const t = useT();
  const [error, setError] = useState('');
  const open = () => { setError(''); receiptUrl(path).then(url => { window.open(url, '_blank', 'noopener'); }, () => setError(t("No se pudo abrir el comprobante."))); };
  return <><button type="button" className="button button-secondary" onClick={open}><Eye size={16} aria-hidden="true" />{t("Ver mi comprobante")}</button>{error && <small role="alert">{error}</small>}</>;
}
type Filter = 'all' | 'purchases' | 'requests';

type Connected = { state: 'off' } | { state: 'loading' } | { state: 'signed_out' } | { state: 'error'; message: string } | { state: 'ready'; bookings: ConnectedBooking[] };
function useConnectedBookings(): Connected {
  const [value, setValue] = useState<Connected>(() => getSupabase() ? { state: 'loading' } : { state: 'off' });
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let live = true;
    void client.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      if (!data.session) { setValue({ state: 'signed_out' }); return; }
      const { bookings } = await loadBookingData();
      if (live) setValue({ state: 'ready', bookings: bookings.filter(item => item.traveler_id === data.session?.user.id) });
    }).catch(error => { if (live) setValue({ state: 'error', message: error instanceof Error ? error.message : tr("No se pudieron cargar tus reservas.") }); });
    return () => { live = false; };
  }, []);
  return value;
}

/** Billetera de viaje NO custodial: historial, comprobantes y estados. No guarda saldo ni dinero. */
export function WalletPanel({ onClose, onOpenExperience, experienceId, onReservations, upcomingOnly = false, title = msg('Mi billetera de viaje') }: { onClose: () => void; onOpenExperience?: (id: string) => void; onReservations?: () => void; upcomingOnly?: boolean; experienceId?: string; title?: string }) {
  const t = useT();
  const all = useWallet();
  const connected = useConnectedBookings();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const today = localDay(0);
  const upcoming = (record: {date?: string; endDate?: string; status: string}) => !['completed','cancelled','refunded','rejected','expired','test_rejected','test_transfer_rejected'].includes(record.status) && (!record.date || (record.endDate || record.date) >= today);
  const records = useMemo(() => all.filter(record => (!upcomingOnly || upcoming(record)) && (!experienceId || record.experienceId === experienceId) && (filter === 'all' || (filter === 'purchases') === (record.kind === 'test_purchase'))), [all, experienceId, filter, upcomingOnly, today]);
  const transfers = useMyTransfers();
  const approved = all.filter(record => isBoughtStatus(record.status) && (!experienceId || record.experienceId === experienceId));
  const requests = all.filter(record => record.status === 'requested' && (!experienceId || record.experienceId === experienceId));
  const trips = useMemo(() => { const map = new Map<string, WalletRecord[]>(); for (const record of records) map.set(record.trip, [...(map.get(record.trip) ?? []), record]); return [...map.entries()]; }, [records]);
  const paid = connected.state === 'ready' ? connected.bookings.filter(item => ['paid', 'completed'].includes(item.status)) : [];
  const receipt = (record: WalletRecord) => void downloadReceipt(record.code, all.filter(item => item.code === record.code && (item.status === 'test_approved' || item.kind === 'request')));

  return <Dialog title={t(title)} onClose={onClose} wide>
    <div className="wallet-panel">
      {onReservations && <nav className="wallet-filter" aria-label={t('Billetera y reservas')}><button aria-current="page">{t('Billetera')}</button><button onClick={onReservations}>{t('Reservas y pagos')}</button></nav>}
      {upcomingOnly && <p>{t('Tus planes pendientes y viajes con fechas por venir, pana.')}</p>}
      <header className="wallet-hero"><span className="wallet-hero-icon" aria-hidden="true"><Wallet size={30} /></span><div><h3>{t("Todo tu viaje, en un solo lugar.")}</h3><p>{t("Compras, solicitudes y comprobantes. Sin saldo: de tu tarjeta solo guardamos marca y 4 dígitos.")}</p></div></header>
      <ul className="wallet-stats" aria-label={t("Resumen de tu billetera")}>
        <li><span>{t("Compras de prueba")}</span><strong>{approved.length}</strong></li>
        <li><span>{t("Solicitudes")}</span><strong>{requests.length}</strong></li>
        <li><span>{t("Total de prueba")}</span><strong>{formatUsd(approved.reduce((sum, record) => sum + (record.totalCents ?? 0), 0))}</strong><small>{t("sin cobro")}</small></li>
        <li><span>{t("Pagos verificados")}</span><strong>{connected.state === 'ready' ? paid.length : '—'}</strong><small>{connected.state === 'ready' ? t('por el servidor') : t('requiere cuenta')}</small></li>
      </ul>
      <div className="wallet-filter" role="group" aria-label={t("Filtrar movimientos")}>{([['all', 'Todo'], ['purchases', 'Compras'], ['requests', 'Solicitudes']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{t(label)}</button>)}</div>
      {trips.length ? trips.map(([trip, items]) => { const spent = items.filter(item => isBoughtStatus(item.status)).reduce((sum, item) => sum + (item.totalCents ?? 0), 0); return <section key={trip} className="wallet-trip">
        <div className="wallet-trip-head"><h4>{trip}</h4><p>{t("Total de prueba en este viaje:")}{' '}<strong>{formatUsd(spent)}</strong></p></div>
        <ul className="wallet-records">{items.map(record => <li key={record.id} data-status={record.status}>
          <div className="wallet-record-top"><h5>{record.title}</h5><strong>{record.totalCents === null ? t("Cotización pendiente") : formatUsd(record.totalCents)}</strong></div>
          <p className="wallet-record-meta"><span><CalendarDays size={15} aria-hidden="true" />{dates(record)}</span><span><Users size={15} aria-hidden="true" />{people(record)}</span><span>{record.province}</span></p>
          <p className="wallet-chip-row"><span className={`wallet-chip is-${record.status}`}>{STATUS_TEXT[record.status]}</span>{record.kind === 'test_purchase' && <span className="wallet-chip is-test"><FlaskConical size={13} aria-hidden="true" />{t("Prueba · sin valor")}</span>}<MethodChip record={record} /><span className="wallet-code">{record.transfer?.reference ?? record.code}</span></p>
          {record.transfer?.rejectionReason && record.status === 'test_transfer_rejected' && <p className="wallet-record-note">{t("Motivo:")}{' '}{record.transfer.rejectionReason}</p>}
          <details className="wallet-more"><summary>{t("Detalle")}</summary><p className="wallet-record-note">{record.priceNote}{record.buyer.documentMasked ? t(" · Documento {documentMasked}", { documentMasked: record.buyer.documentMasked }) : ''}{record.attempts > 1 ? t(" · {attempts} intentos de pago de prueba", { attempts: record.attempts }) : ''}</p></details>
          <div className="wallet-actions">
            {(record.status === 'test_approved' || record.status === 'test_transfer_review') && <button type="button" className="button button-secondary" onClick={() => receipt(record)}><Download size={16} />{t("Comprobante de prueba")}</button>}
            {record.status === 'test_transfer_review' && record.transfer && <span className="wallet-simulate" role="group" aria-label={t("Simular respuesta del anfitrión (prueba)")}><small><FlaskConical size={13} aria-hidden="true" />{t("Simular anfitrión")}</small>
              <button type="button" className="button button-secondary" onClick={() => { updateRecord(record.id, { status: 'test_approved' }); setNotice(t("Simulado: el anfitrión marcó «Pago recibido». No hubo dinero real.")); }}><CheckCircle2 size={16} />{t("Recibido")}</button>
              <button type="button" className="button button-secondary" onClick={() => { if (record.transfer) updateRecord(record.id, { status: 'test_transfer_rejected', transfer: { ...record.transfer, rejectionReason: 'Simulación: la foto no se lee bien.' } }); setNotice(t("Simulado: comprobante rechazado. Puedes enviar otro.")); }}><XCircle size={16} />{t("Rechazado")}</button></span>}
            {record.status === 'test_transfer_rejected' && record.transfer && <button type="button" className="button button-primary" onClick={() => { if (record.transfer) updateRecord(record.id, { status: 'test_transfer_review', transfer: { reference: record.transfer.reference, receiptKind: record.transfer.receiptKind } }); setNotice(t("Prueba: comprobante reenviado. Vuelve a estar en revisión.")); }}><ReceiptText size={16} />{t("Enviar otro (prueba)")}</button>}
            {onOpenExperience && <button type="button" className="button button-secondary" onClick={() => onOpenExperience(record.experienceId)}>{t("Ver ficha")}<ArrowUpRight size={15} /></button>}
            {record.status === 'requested' && <button type="button" className="button button-secondary" onClick={() => { updateRecord(record.id, { status: 'cancelled' }); setNotice(t("Solicitud cancelada. No se había enviado a ningún anfitrión.")); }}><CircleX size={16} />{t("Cancelar solicitud")}</button>}
            {['test_rejected', 'cancelled', 'test_pending', 'test_transfer_rejected'].includes(record.status) && (confirm === record.id
              ? <><button type="button" className="button button-primary" onClick={() => { removeRecord(record.id); setConfirm(''); setNotice(t("Movimiento quitado de este navegador.")); }}>{t("Sí, quitar")}</button><button type="button" className="button button-secondary" onClick={() => setConfirm('')}>{t("Conservar")}</button></>
              : <button type="button" className="button button-secondary" onClick={() => setConfirm(record.id)}><Trash2 size={16} />{t("Quitar de mi billetera")}</button>)}
          </div>
        </li>)}</ul>
      </section>; }) : <div className="wallet-empty"><Inbox size={34} aria-hidden="true" /><h4>{experienceId ? t("Aún no tienes movimientos para esta experiencia.") : t("Tu billetera está lista para el primer viaje.")}</h4><p>{t("Cuando compres una experiencia o pidas una cotización, aparecerá aquí con su comprobante.")}</p></div>}
      {transfers.state === 'ready' && transfers.rows.length > 0 && <section className="wallet-connected" aria-label={t("Mis transferencias")}><h4><Landmark size={20} aria-hidden="true" />{t("Mis transferencias")}</h4>
        <ul className="wallet-records">{transfers.rows.filter(item => (!upcomingOnly || upcoming({date:item.startDate,endDate:item.endDate,status:item.status})) && (!experienceId || item.experienceId === experienceId)).map(item => <li key={item.id} data-status={item.status === 'paid' ? 'paid' : item.status === 'rejected' ? 'test_rejected' : 'requested'}>
          <div className="wallet-record-top"><h5>{item.title}</h5><strong>{money(item.amount, 'USD')}</strong></div>
          <p className="wallet-record-meta"><span><CalendarDays size={15} aria-hidden="true" />{dates({ date: item.startDate, endDate: item.endDate })}</span><span><Users size={15} aria-hidden="true" />{people({ people: item.adults + item.children, children: item.children })}</span></p>
          <p className="wallet-chip-row"><span className={`wallet-method is-transfer ${item.status === 'paid' ? 'is-ok' : item.status === 'rejected' ? 'is-bad' : 'is-wait'}`}><Landmark size={14} aria-hidden="true" />{TRANSFER_STATUS_TEXT[item.status]}</span><span className="wallet-code">{item.reference}</span></p>
          {item.rejectionReason && <p className="wallet-record-note">{t("Motivo:")}{' '}{item.rejectionReason}</p>}
          {item.receiptPath && <div className="wallet-actions"><ReceiptLink path={item.receiptPath} /></div>}
        </li>)}</ul>
      </section>}
      <section className="wallet-connected" aria-live="polite"><h4><ShieldCheck size={20} aria-hidden="true" />{t("Reservas y pagos reales")}</h4>
        {connected.state === 'off' ? <p>{t("Las compras con cobro real aparecerán aquí cuando el servicio de reservas esté conectado y entres en tu cuenta. Hoy no hay cobros activos.")}</p>
          : connected.state === 'loading' ? <p role="status">{t("Consultando tus reservas…")}</p>
            : connected.state === 'signed_out' ? <><p>{t("Entra en tu cuenta para ver tus reservas conectadas y sus pagos verificados.")}</p><button type="button" className="button button-secondary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }}>{t("Entrar en mi cuenta")}</button></>
              : connected.state === 'error' ? <p role="alert">{connected.message}</p>
                : connected.bookings.length ? <ul className="wallet-records">{connected.bookings.filter(item => (!upcomingOnly || upcoming({date:item.startsAt?.slice(0,10),status:item.status})) && (!experienceId || item.experience_id === experienceId)).map(item => <li key={item.id} data-status={item.status}><div className="wallet-record-top"><h5>{item.title}</h5><strong>{money(item.total_amount, item.currency)}</strong></div><p className="wallet-chip-row"><span className={`wallet-chip is-${['paid', 'completed'].includes(item.status) ? 'test_approved' : 'requested'}`}>{BOOKING_LABELS[item.status] ?? t("Estado por consultar")}</span><span className="wallet-chip">{item.payment_environment === 'sandbox' ? t("Entorno de pruebas de la pasarela") : t("Cobro real")}</span><span className="wallet-code">{item.code}</span></p></li>)}</ul>
                  : <p>{t("No tienes reservas conectadas todavía.")}</p>}
        <button type="button" className="text-button wallet-link" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:payments')); }}><ReceiptText size={15} aria-hidden="true" />{t("Ir a Reservas y pagos")}</button>
      </section>
      <p className="wallet-footnote">{t("Las pruebas se guardan solo en este navegador, sin tu documento ni tu correo completos. Nunca se convierten en pagos reales.")}</p>
      <p className="wallet-notice" role="status">{notice}</p>
    </div>
  </Dialog>;
}

/** Montar una vez: abre la billetera con el evento `cv3:wallet`. */
export function WalletHost({ onOpenExperience }: { onOpenExperience?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener(WALLET_OPEN, show); return () => window.removeEventListener(WALLET_OPEN, show); }, []);
  return open ? <WalletPanel onClose={() => setOpen(false)} onOpenExperience={onOpenExperience ? id => { setOpen(false); onOpenExperience(id); } : undefined} /> : null;
}
