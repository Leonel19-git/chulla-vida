import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, CircleX, Download, FlaskConical, Inbox, ReceiptText, ShieldCheck, Trash2, Users, Wallet } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { formatUsd, STATUS_TEXT, type WalletRecord } from '../../domain/payments/purchase';
import { getSupabase } from '../../lib/supabase';
import { loadBookingData, type ConnectedBooking } from '../payments/api';
import { removeRecord, updateRecord, useWallet, WALLET_OPEN } from './store';
import { downloadReceipt } from './receipt';
import './wallet.css';

const BOOKING_LABELS: Record<string, string> = { draft: 'Borrador', requested: 'Esperando al anfitrión', awaiting_merchant_confirmation: 'En revisión del anfitrión', confirmed: 'Confirmada por el anfitrión', awaiting_payment: 'Lista para pagar', paid: 'Pagada · verificada por el servidor', completed: 'Visita completada', expired: 'Vencida', cancelled: 'Cancelada', refunded: 'Reembolsada', payment_failed: 'Pago sin completar' };
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(amount);
const day = (value: string) => value ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : 'Fecha por confirmar';
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
    }).catch(error => { if (live) setValue({ state: 'error', message: error instanceof Error ? error.message : 'No se pudieron cargar tus reservas.' }); });
    return () => { live = false; };
  }, []);
  return value;
}

/** Billetera de viaje NO custodial: historial, comprobantes y estados. No guarda saldo ni dinero. */
export function WalletPanel({ onClose, onOpenExperience, experienceId, title = 'Mi billetera de viaje' }: { onClose: () => void; onOpenExperience?: (id: string) => void; experienceId?: string; title?: string }) {
  const all = useWallet();
  const connected = useConnectedBookings();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const records = useMemo(() => all.filter(record => (!experienceId || record.experienceId === experienceId) && (filter === 'all' || (filter === 'purchases') === (record.kind === 'test_purchase'))), [all, experienceId, filter]);
  const approved = all.filter(record => record.status === 'test_approved' && (!experienceId || record.experienceId === experienceId));
  const requests = all.filter(record => record.status === 'requested' && (!experienceId || record.experienceId === experienceId));
  const trips = useMemo(() => { const map = new Map<string, WalletRecord[]>(); for (const record of records) map.set(record.trip, [...(map.get(record.trip) ?? []), record]); return [...map.entries()]; }, [records]);
  const paid = connected.state === 'ready' ? connected.bookings.filter(item => ['paid', 'completed'].includes(item.status)) : [];
  const receipt = (record: WalletRecord) => void downloadReceipt(record.code, all.filter(item => item.code === record.code && (item.status === 'test_approved' || item.kind === 'request')));

  return <Dialog title={title} onClose={onClose} wide>
    <div className="wallet-panel">
      <header className="wallet-hero"><span className="wallet-hero-icon" aria-hidden="true"><Wallet size={30} /></span><div><h3>Todo tu viaje, en un solo lugar.</h3><p>Compras, solicitudes y comprobantes. No es una cuenta de dinero: aquí no se recarga saldo ni se guardan tarjetas.</p></div></header>
      <ul className="wallet-stats" aria-label="Resumen de tu billetera">
        <li><span>Compras de prueba</span><strong>{approved.length}</strong></li>
        <li><span>Solicitudes</span><strong>{requests.length}</strong></li>
        <li><span>Total de prueba</span><strong>{formatUsd(approved.reduce((sum, record) => sum + (record.totalCents ?? 0), 0))}</strong><small>sin cobro</small></li>
        <li><span>Pagos verificados</span><strong>{connected.state === 'ready' ? paid.length : '—'}</strong><small>{connected.state === 'ready' ? 'por el servidor' : 'requiere cuenta'}</small></li>
      </ul>
      <div className="wallet-filter" role="group" aria-label="Filtrar movimientos">{([['all', 'Todo'], ['purchases', 'Compras'], ['requests', 'Solicitudes']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      {trips.length ? trips.map(([trip, items]) => { const spent = items.filter(item => item.status === 'test_approved').reduce((sum, item) => sum + (item.totalCents ?? 0), 0); return <section key={trip} className="wallet-trip">
        <div className="wallet-trip-head"><h4>{trip}</h4><p>Total de prueba en este viaje: <strong>{formatUsd(spent)}</strong></p></div>
        <ul className="wallet-records">{items.map(record => <li key={record.id} data-status={record.status}>
          <div className="wallet-record-top"><h5>{record.title}</h5><strong>{record.totalCents === null ? 'Cotización pendiente' : formatUsd(record.totalCents)}</strong></div>
          <p className="wallet-record-meta"><span><CalendarDays size={15} aria-hidden="true" />{day(record.date)}</span><span><Users size={15} aria-hidden="true" />{record.people} {record.people === 1 ? 'persona' : 'personas'}</span><span>{record.province}</span></p>
          <p className="wallet-chip-row"><span className={`wallet-chip is-${record.status}`}>{STATUS_TEXT[record.status]}</span>{record.kind === 'test_purchase' && <span className="wallet-chip is-test"><FlaskConical size={13} aria-hidden="true" />Prueba · sin valor</span>}<span className="wallet-code">{record.code}</span></p>
          <p className="wallet-record-note">{record.priceNote}{record.buyer.documentMasked ? ` · Documento ${record.buyer.documentMasked}` : ''}{record.attempts > 1 ? ` · ${record.attempts} intentos de pago de prueba` : ''}</p>
          <div className="wallet-actions">
            {record.status === 'test_approved' && <button type="button" className="button button-secondary" onClick={() => receipt(record)}><Download size={16} />Comprobante de prueba</button>}
            {onOpenExperience && <button type="button" className="button button-secondary" onClick={() => onOpenExperience(record.experienceId)}>Ver ficha<ArrowUpRight size={15} /></button>}
            {record.status === 'requested' && <button type="button" className="button button-secondary" onClick={() => { updateRecord(record.id, { status: 'cancelled' }); setNotice('Solicitud cancelada. No se había enviado a ningún anfitrión.'); }}><CircleX size={16} />Cancelar solicitud</button>}
            {['test_rejected', 'cancelled', 'test_pending'].includes(record.status) && (confirm === record.id
              ? <><button type="button" className="button button-primary" onClick={() => { removeRecord(record.id); setConfirm(''); setNotice('Movimiento quitado de este navegador.'); }}>Sí, quitar</button><button type="button" className="button button-secondary" onClick={() => setConfirm('')}>Conservar</button></>
              : <button type="button" className="button button-secondary" onClick={() => setConfirm(record.id)}><Trash2 size={16} />Quitar de mi billetera</button>)}
          </div>
        </li>)}</ul>
      </section>; }) : <div className="wallet-empty"><Inbox size={34} aria-hidden="true" /><h4>{experienceId ? 'Aún no tienes movimientos para esta experiencia.' : 'Tu billetera está lista para el primer viaje.'}</h4><p>Cuando compres una experiencia o pidas una cotización, aparecerá aquí con su comprobante.</p></div>}
      <section className="wallet-connected" aria-live="polite"><h4><ShieldCheck size={20} aria-hidden="true" />Reservas y pagos reales</h4>
        {connected.state === 'off' ? <p>Las compras con cobro real aparecerán aquí cuando el servicio de reservas esté conectado y entres en tu cuenta. Hoy no hay cobros activos.</p>
          : connected.state === 'loading' ? <p role="status">Consultando tus reservas…</p>
            : connected.state === 'signed_out' ? <><p>Entra en tu cuenta para ver tus reservas conectadas y sus pagos verificados.</p><button type="button" className="button button-secondary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }}>Entrar en mi cuenta</button></>
              : connected.state === 'error' ? <p role="alert">{connected.message}</p>
                : connected.bookings.length ? <ul className="wallet-records">{connected.bookings.filter(item => !experienceId || item.experience_id === experienceId).map(item => <li key={item.id} data-status={item.status}><div className="wallet-record-top"><h5>{item.title}</h5><strong>{money(item.total_amount, item.currency)}</strong></div><p className="wallet-chip-row"><span className={`wallet-chip is-${['paid', 'completed'].includes(item.status) ? 'test_approved' : 'requested'}`}>{BOOKING_LABELS[item.status] ?? 'Estado por consultar'}</span><span className="wallet-chip">{item.payment_environment === 'sandbox' ? 'Entorno de pruebas de la pasarela' : 'Cobro real'}</span><span className="wallet-code">{item.code}</span></p></li>)}</ul>
                  : <p>No tienes reservas conectadas todavía.</p>}
        <button type="button" className="text-button wallet-link" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:payments')); }}><ReceiptText size={15} aria-hidden="true" />Ir a Reservas y pagos</button>
      </section>
      <p className="wallet-footnote">Se guarda solo en este navegador (sin tu documento completo ni tu correo completo). Un pago de prueba nunca se convierte en un pago real.</p>
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
