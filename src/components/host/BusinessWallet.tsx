import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BadgeCheck, Check, CircleHelp, Coins, LockKeyhole, ScanLine, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { businessWallet, isDemoWithdrawalArray, requestDemoWithdrawal, WALLET_STORAGE_KEY, type DemoWithdrawal } from '../../lib/business-wallet';
import { readStoredValue, writeStoredValue } from '../../lib/storage';
import { languageMetadata } from '../../i18n/ui';
import { walletText } from '../../i18n/wallet';
import './wallet.css';

export function BusinessWallet() {
  const { language, t, role, currentBusinessId, reservations, validateVoucherQr } = useApp();
  const w = (key: string) => walletText(language, key, t);
  const [records, setRecords] = useState<DemoWithdrawal[]>(() => readStoredValue(WALLET_STORAGE_KEY, [], isDemoWithdrawalArray));
  const recordsRef = useRef(records);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [candidate, setCandidate] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const wallet = useMemo(() => businessWallet(currentBusinessId, reservations, records), [currentBusinessId, reservations, records]);
  const money = (cents: number) => new Intl.NumberFormat(languageMetadata[language].tag, { style: 'currency', currency: 'USD' }).format(cents / 100);
  const isHost = role === 'local' || role === 'gestor';
  useEffect(() => { recordsRef.current = records; }, [records]);
  useEffect(() => {
    const update = () => { const saved = readStoredValue<DemoWithdrawal[]>(WALLET_STORAGE_KEY, [], isDemoWithdrawalArray); recordsRef.current = saved; setRecords(saved); };
    window.addEventListener('storage', update); return () => window.removeEventListener('storage', update);
  }, []);
  useEffect(() => { setNotice(''); setCode(''); setCandidate(null); }, [currentBusinessId]);
  useEffect(() => {
    const node = dialog.current;
    if (candidate !== null) node?.showModal();
    else if (node?.open) { node.close(); opener.current?.focus(); }
  }, [candidate]);
  const withdraw = () => {
    if (!isHost) return;
    // Re-read before committing, so an updated tab cannot withdraw the same allocation twice.
    const stored = readStoredValue<DemoWithdrawal[]>(WALLET_STORAGE_KEY, recordsRef.current, isDemoWithdrawalArray);
    const latest = businessWallet(currentBusinessId, reservations, stored);
    if (candidate !== latest.available || latest.needsReview) { setCandidate(null); setRecords(stored); recordsRef.current = stored; setNotice('El saldo cambió. Revisa los movimientos antes de continuar.'); return; }
    const id = `WD-DEMO-${crypto.randomUUID()}`;
    const updated = requestDemoWithdrawal(currentBusinessId, reservations, stored, id);
    if (!updated) { setCandidate(null); setNotice('No hay saldo disponible.'); return; }
    writeStoredValue(WALLET_STORAGE_KEY, updated);
    // A failed storage write must not be presented as a saved withdrawal.
    const persisted = readStoredValue<DemoWithdrawal[]>(WALLET_STORAGE_KEY, [], isDemoWithdrawalArray);
    if (!persisted.some(row => row.id === id)) { setCandidate(null); setNotice('No pudimos guardar el retiro. Inténtalo de nuevo.'); return; }
    recordsRef.current = persisted; setRecords(persisted); setCandidate(null);
    setNotice('Solicitud demo registrada. No se realizó ninguna transferencia.');
  };
  if (!isHost) return null;
  if (!currentBusinessId) return <p>{w('Selecciona un negocio para ver sus cobros.')}</p>;
  return <section className="business-wallet" aria-labelledby="wallet-heading">
    <header className="wallet-heading"><div><span className="wallet-demo"><CircleHelp size={14} />{w('Demostración · sin dinero real')}</span><h2 id="wallet-heading">{w('Tu trabajo tiene su recompensa.')}</h2><p>{w('El viajero paga a CHULLA VIDA. Al validar su llegada, el 90% queda disponible para tu negocio.')}</p></div><div className="wallet-emblem" aria-hidden="true"><Wallet size={34} /></div></header>
    <ol className="wallet-flow"><li><Coins size={19} /><span>{w('Pago del viajero')}</span><strong>100%</strong></li><ArrowRight aria-hidden="true" size={18} /><li><BadgeCheck size={19} /><span>{w('Llegada validada')}</span><strong>−10%</strong></li><ArrowRight aria-hidden="true" size={18} /><li><ArrowDownToLine size={19} /><span>{w('Retiro del negocio')}</span><strong>90%</strong></li></ol>
    <div className="wallet-accounting">{([{ label: 'Cobrado en la plataforma', value: wallet.gross }, { label: 'Comisión CHULLA VIDA · 10%', value: wallet.commission }, { label: 'Para tu negocio · 90%', value: wallet.net }]).map(item => <div key={item.label}><span>{w(item.label)}</span><strong>{money(item.value)}</strong></div>)}</div>
    <p className="wallet-scope">{w('Solicitudes aceptadas y pagos aprobados; las canceladas no generan saldo.')}</p>
    <div className="wallet-balances"><div><LockKeyhole size={19} /><span>{w('Retenido hasta la llegada')}</span><strong>{money(wallet.retained)}</strong></div><div className="wallet-available"><Wallet size={21} /><span>{w('Disponible para retirar')}</span><strong>{money(wallet.available)}</strong><button className="button button-primary" type="button" ref={opener} disabled={!wallet.available || wallet.needsReview} onClick={() => setCandidate(wallet.available)}><ArrowDownToLine size={17} />{w('Simular retiro')}</button></div><div><Check size={19} /><span>{w('Retiros solicitados · demo')}</span><strong>{money(wallet.withdrawn)}</strong></div></div>
    {wallet.needsReview && <p className="wallet-warning" role="alert">{w('Un retiro previo requiere revisión porque cambió una visita. No se generan saldos negativos ni devoluciones automáticas.')}</p>}
    <form className="wallet-validation" onSubmit={event => { event.preventDefault(); const result = validateVoucherQr(code); setNotice(result.message); if (result.success) setCode(''); }}><div><h3><ScanLine size={20} />{w('Valida una llegada')}</h3><p>{w('Primero acepta la solicitud. El pago demo debe estar aprobado y la fecha de visita debe haber llegado.')}</p></div><label htmlFor="wallet-visit-code">{w('Código del viajero o contenido del QR')}</label><div className="wallet-code-row"><input id="wallet-visit-code" className="field" value={code} onChange={event => setCode(event.target.value)} maxLength={250} required autoComplete="off" placeholder="CV-…" /><button type="submit" className="button button-secondary" disabled={!code.trim()}>{w('Validar código')}</button></div></form>
    {notice && <p className="wallet-notice" role="status">{w(notice)}</p>}
    <section className="wallet-movements"><h3>{w('Movimientos de este negocio')}</h3>{!wallet.transactions.length ? <div className="wallet-empty"><Coins size={26} /><h4>{w('Todavía no hay cobros.')}</h4><p>{w('Los pagos demo aprobados aparecen aquí después de aceptar la solicitud.')}</p></div> : wallet.transactions.map(row => {
      const requested = wallet.withdrawals.some(record => record.reservationIds.includes(row.reservation.id));
      return <article className="wallet-transaction" key={row.reservation.id}><div><strong>{row.reservation.lugar_titulo}</strong><span>{row.reservation.codigo_voucher} · {row.reservation.fecha_tour}</span><small>{row.reservation.pago_demo?.referencia}</small></div><div><strong>{money(row.net)}</strong><span>{w(requested ? 'Retiro solicitado' : row.arrived ? 'Disponible' : 'Esperando llegada')}</span><small>{money(row.gross)} − {money(row.commission)} (10%)</small></div></article>;
    })}</section>
    {!!wallet.withdrawals.length && <section className="wallet-movements"><h3>{w('Historial de retiros')}</h3>{wallet.withdrawals.map(record => <article key={record.id} className="wallet-transaction"><div><strong>{w('Solicitud de prueba')}</strong><small>{record.id}</small><span>{new Date(record.createdAt).toLocaleString(languageMetadata[language].tag)}</span></div><div><strong>{money(record.amountCents)}</strong><span>{w('Retiro solicitado')}</span></div></article>)}</section>}
    <p className="wallet-footnote"><CircleHelp size={15} />{w('Guardado solo en este navegador. La comisión se calcula por cobro, en centavos.')}</p>
    <dialog className="wallet-dialog" ref={dialog} onCancel={event => { event.preventDefault(); setCandidate(null); }} aria-labelledby="wallet-confirm-title"><h2 id="wallet-confirm-title">{w('Confirmar retiro de demostración')}</h2><strong className="wallet-dialog-amount">{money(candidate ?? 0)}</strong><p>{w('Destino de prueba · cuenta ficticia CHULLA VIDA')}</p><p>{w('Se registrará una solicitud local. No se enviará dinero ni se solicitarán datos bancarios.')}</p><div><button autoFocus className="button button-secondary" type="button" onClick={() => setCandidate(null)}>{w('Cancelar')}</button><button className="button button-primary" type="button" onClick={withdraw}>{w('Confirmar simulación')}</button></div></dialog>
  </section>;
}
