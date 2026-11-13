import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, CalendarDays, CheckCircle2, CreditCard, Download, FlaskConical, LockKeyhole, RefreshCw, Store, Users } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { changeBooking, getPaymentConfiguration, getPaymentStatus, loadBookingData, PaymentRequestError, preparePayment, readPaymentAttempt, reconcilePaymentStatus, requestBooking, savePaymentAttempt, type BookableSlot, type ConnectedBooking, type PaymentConfiguration, type PaymentResult } from './api';
import './payments.css';
import { RefundReview } from './RefundReview';
import { CheckoutTerms } from './CheckoutTerms';

/* Established CHULLA VIDA operational surface: warm paper, navy headings,
   tabular amounts, explicit server status, separate local demonstration.
   Card details are entered only on the provider's top-level hosted page. */
const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(amount);
const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(value)) : 'Fecha por confirmar';
const labels: Record<string, string> = { draft: 'Borrador', requested: 'Esperando al anfitrión', awaiting_merchant_confirmation: 'En revisión del anfitrión', confirmed: 'Confirmada por el anfitrión', awaiting_payment: 'Lista para pagar', paid: 'Pagada', completed: 'Visita completada', expired: 'Vencida', cancelled: 'Cancelada', refunded: 'Reembolsada', payment_failed: 'Pago sin completar' };
const canCancel = (status: string) => ['draft', 'requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'payment_failed'].includes(status);

export function PaymentsPanel({ reference, onAccount, onDemo }: { reference?: string | null; onAccount: () => void; onDemo: () => void }) {
  const client = getSupabase();
  const [session, setSession] = useState<Session | null>();
  const [configuration, setConfiguration] = useState<PaymentConfiguration>();
  const [configLoading, setConfigLoading] = useState(true);
  const [configRevision, setConfigRevision] = useState(0);
  const [connectionError, setConnectionError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let active = true; let eventObserved = false;
    if (!client) { setSession(null); return () => { active = false; }; }
    void client.auth.getSession().then(({ data, error }) => { if (active && !eventObserved) { setSession(error ? null : data.session); if (error) setConnectionError('No se pudo recuperar tu sesión. Vuelve a entrar en tu cuenta.'); } }).catch(() => { if (active && !eventObserved) { setSession(null); setConnectionError('No se pudo recuperar tu sesión.'); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => { if (active) { eventObserved = true; setSession(nextSession); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);
  useEffect(() => {
    let current = true;
    setConfigLoading(true); setConfiguration(undefined);
    void getPaymentConfiguration().then(value => { if (current) setConfiguration(value); })
      .catch(() => { /* Availability is unknown, rather than reported as disabled. */ })
      .finally(() => { if (current) setConfigLoading(false); });
    return () => { current = false; };
  }, [configRevision]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <section className="payments-panel">
    <header className="payments-heading"><CreditCard size={30} aria-hidden="true" /><div><h3>Tu próxima aventura, en orden.</h3><p>Primero confirma el anfitrión. Después eliges pagar con tarjeta en PayPhone.</p></div></header>
    <ol className="payments-steps" aria-label="Cómo funciona la reserva"><li><CalendarDays size={19} />Solicita una fecha</li><li><Store size={19} />El anfitrión confirma</li><li><LockKeyhole size={19} />Paga en PayPhone</li></ol>
    {!online && <p className="payments-warning" role="status">Estás sin conexión. Los pagos y las reservas conectadas necesitan internet. Vuelve a consultar al recuperar la señal.</p>}
    <div className="payments-availability"><strong>{configLoading ? 'Comprobando disponibilidad de pagos…' : !configuration ? 'No se pudo consultar la disponibilidad de pagos' : configuration.enabled ? configuration.environment === 'sandbox' ? 'Pasarela en entorno de pruebas' : 'Pago con tarjeta disponible' : 'Cobros con tarjeta pendientes de activación'}</strong><p>{configLoading ? 'Esperamos la respuesta del servicio antes de habilitar el pago.' : !configuration ? 'Comprueba tu conexión y vuelve a consultar. Los botones de cobro permanecerán desactivados hasta verificar la disponibilidad.' : configuration.enabled ? configuration.environment === 'sandbox' ? 'Este entorno no acredita un pago real ni emite una factura. Sigue las instrucciones de prueba de la pasarela.' : 'Revisa el importe de tu reserva antes de continuar. Es un cobro real.' : 'Mientras se activa la pasarela, puedes explorar y practicar el recorrido sin cobros. Las fichas con precios de referencia no están a la venta.'}</p>{!configLoading && !configuration && <button className="button button-secondary" onClick={() => setConfigRevision(value => value + 1)} disabled={!online}>Volver a comprobar pagos</button>}</div>
    {connectionError && <p role="status">{connectionError}</p>}
    {session === undefined ? <p role="status">Comprobando tu sesión…</p> : session ? <Reservations key={session.user.id} session={session} configuration={configuration} reference={reference} online={online} /> : <section className="payments-account"><h4>Reservas vinculadas a tu cuenta</h4><p>{reference ? 'Recibimos una referencia de regreso. Entra en la cuenta que realizó el pago para consultar su resultado verificado.' : 'Entra para consultar tus solicitudes, las respuestas del anfitrión y el estado de cada pago.'}</p><button className="button button-primary" onClick={onAccount}>Entrar en mi cuenta</button></section>}
    <section className="payments-demo"><FlaskConical size={23} aria-hidden="true" /><div><h4>Practica antes de salir</h4><p>Prueba aprobación, rechazo y comprobante con una tarjeta ficticia. Se guarda solo en este navegador.</p><button className="button button-secondary" onClick={onDemo}>Probar pago sin cobro<ArrowUpRight size={16} /></button></div></section>
    <p className="payments-footnote">Los datos de tu tarjeta se introducen únicamente en la página de PayPhone. Una consulta del catálogo o una prueba local no confirman una reserva.</p>
  </section>;
}

function Reservations({ session, configuration, reference, online }: { session: Session; configuration?: PaymentConfiguration; reference?: string | null; online: boolean }) {
  const [bookings, setBookings] = useState<ConnectedBooking[]>([]);
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<'traveler' | 'business'>('traveler');
  const [review, setReview] = useState<ConnectedBooking>();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cancel, setCancel] = useState<ConnectedBooking>();
  const [refundId, setRefundId] = useState<string>();
  const [result, setResult] = useState<PaymentResult>();
  const [attemptReference, setAttemptReference] = useState(reference);
  const [now, setNow] = useState(Date.now);
  const [slotId, setSlotId] = useState('');
  const [participants, setParticipants] = useState(1);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const active = useRef(true);
  const locked = useRef(false);
  const keys = useRef(new Map<string, string>());
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setLoadError('');
    loadBookingData().then(value => { if (current) { setBookings(value.bookings); setSlots(value.slots); } })
      .catch(error => { if (current) { setBookings([]); setSlots([]); setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar tus reservas.'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);
  useEffect(() => {
    let current = true;
    setResult(undefined);
    if (attemptReference) void getPaymentStatus(attemptReference, session.access_token).then(value => { if (current) setResult(value); }).catch(error => { if (current) setNotice(error instanceof Error ? error.message : 'No se pudo consultar el pago.'); });
    return () => { current = false; };
  }, [attemptReference, revision, session.access_token]);

  async function run(action: () => Promise<void>) {
    if (locked.current || !online) return;
    locked.current = true; setBusy(true); setNotice('');
    try { await action(); }
    catch (error) { if (active.current) setNotice(error instanceof Error ? error.message : 'No se pudo completar la operación.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  const refresh = () => { setNotice(''); setReview(undefined); setCancel(undefined); setRevision(value => value + 1); };
  const selected = slots.find(slot => slot.id === slotId);
  const visible = bookings.filter(booking => (booking.traveler_id === session.user.id) === (tab === 'traveler'));

  async function pay() {
    if (!review || !configuration?.enabled || configuration.environment === 'live' && !termsAccepted) return;
    const booking = review;
    await run(async () => {
      const previous = readPaymentAttempt(session.user.id, booking.id);
      const retryCancelled = result?.bookingId === booking.id && result.status === 'cancelled';
      const key = retryCancelled ? crypto.randomUUID() : keys.current.get(booking.id) ?? previous?.key ?? crypto.randomUUID();
      keys.current.set(booking.id, key);
      savePaymentAttempt(session.user.id, booking.id, { ...(!retryCancelled && previous ? previous : {}), key });
      try {
        const prepared = await preparePayment(booking.id, key, session.access_token);
        savePaymentAttempt(session.user.id, booking.id, { key, reference: prepared.reference });
        if (active.current) { setAttemptReference(prepared.reference); window.location.assign(prepared.checkoutUrl); }
      } catch (error) {
        if (error instanceof PaymentRequestError && error.reference) {
          savePaymentAttempt(session.user.id, booking.id, { key, reference: error.reference });
          if (active.current) setAttemptReference(error.reference);
        }
        throw error;
      }
    });
  }
  async function transition(booking: ConnectedBooking, status: string) {
    await run(async () => {
      await changeBooking(booking, status);
      if (active.current) { setNotice('Estado actualizado por el servidor.'); setCancel(undefined); setRevision(value => value + 1); }
    });
  }

  return <div aria-busy={busy || loading}>
    {attemptReference && (result ? <PaymentSummary result={result} onRefresh={() => void run(async () => { const next = await reconcilePaymentStatus(attemptReference, session.access_token); if (active.current) { setResult(next); setRevision(value => value + 1); } })} disabled={busy || !online} /> : <div className="payments-return"><h4>Consulta del pago</h4><p>El regreso de la pasarela por sí solo no aprueba el pago. Consulta el resultado confirmado por el servidor.</p><button className="button button-secondary" onClick={() => void run(async () => { const next = await reconcilePaymentStatus(attemptReference, session.access_token); if (active.current) setResult(next); })} disabled={busy || !online}><RefreshCw size={16} />Consultar resultado</button></div>)}
    <div className="payments-controls"><div className="payments-tabs" aria-label="Tipo de reservas"><button aria-pressed={tab === 'traveler'} onClick={() => { setTab('traveler'); setReview(undefined); setCancel(undefined); }}>Mis reservas</button><button aria-pressed={tab === 'business'} onClick={() => { setTab('business'); setReview(undefined); setCancel(undefined); }}>Reservas de mi negocio</button></div><button className="button button-secondary" onClick={refresh} disabled={busy || loading || !online}><RefreshCw size={16} />Actualizar</button></div>
    {loading ? <p role="status">Consultando reservas y fechas disponibles…</p> : loadError ? <section className="payments-empty" role="alert"><h4>No pudimos consultar tus reservas</h4><p>{loadError}</p><button className="button button-secondary" onClick={refresh} disabled={busy || !online}>Reintentar consulta de reservas</button></section> : visible.length ? <ul className="payments-bookings">{visible.map(booking => {
      const expired = booking.expires_at !== null && Date.parse(booking.expires_at) <= now;
      const previousAttempt = readPaymentAttempt(session.user.id, booking.id);
      return <li key={booking.id}><div className="payments-booking-title"><h4>{booking.title}</h4><strong>{money(booking.total_amount, booking.currency)}</strong></div><p><CalendarDays size={16} />{date(booking.startsAt)}<span><Users size={16} />{booking.participants} {booking.participants === 1 ? 'persona' : 'personas'}</span></p><div className="payments-booking-state"><strong>{labels[booking.status] ?? 'Estado por consultar'}</strong><span>{booking.code}</span></div>
        {booking.expires_at && <p className="payments-footnote">Límite de la reserva: {date(booking.expires_at)}{expired && ' · vencido'}</p>}
        <div className="payments-actions">
          {tab === 'traveler' && (['paid', 'completed', 'refunded'].includes(booking.status) || result?.bookingId === booking.id && (result.requiresReview || result.status === 'captured')) && <button className="button button-secondary" disabled={busy || !online || configuration?.environment !== booking.payment_environment} onClick={() => setRefundId(value => value === booking.id ? undefined : booking.id)}>Revisión y reembolso</button>}
          {tab === 'traveler' && previousAttempt?.reference && <button className="button button-secondary" disabled={busy || !online} onClick={() => { setResult(undefined); setAttemptReference(previousAttempt.reference); setRevision(value => value + 1); }}>Consultar intento anterior</button>}
          {tab === 'traveler' && ['awaiting_payment', 'payment_failed'].includes(booking.status) && <button className="button button-primary" disabled={busy || !online || !configuration?.enabled || expired || booking.currency !== 'USD' || booking.payment_environment !== configuration.environment} onClick={() => { setTermsAccepted(false); setReview(booking); setCancel(undefined); }}>Revisar y pagar con tarjeta<CreditCard size={16} /></button>}
          {tab === 'business' && ['requested', 'awaiting_merchant_confirmation'].includes(booking.status) && <button className="button button-primary" disabled={busy || !online || expired} onClick={() => void transition(booking, 'confirmed')}>Confirmar disponibilidad</button>}
          {tab === 'business' && booking.status === 'confirmed' && <button className="button button-primary" disabled={busy || !online || expired} onClick={() => void transition(booking, 'awaiting_payment')}>Habilitar pago al viajero</button>}
          {canCancel(booking.status) && <button className="button button-secondary" disabled={busy || !online} onClick={() => { setCancel(booking); setReview(undefined); }}>Cancelar solicitud</button>}
        </div>
        {booking.currency !== 'USD' && ['awaiting_payment', 'payment_failed'].includes(booking.status) && <p>Esta pasarela acepta USD. La reserva en EUR conserva su moneda y no se convierte automáticamente.</p>}
        {configuration?.enabled && booking.payment_environment !== configuration.environment && <p>Esta reserva pertenece a otro entorno de pagos. No se puede cobrar desde aquí.</p>}
        {tab === 'traveler' && refundId === booking.id && <RefundReview key={booking.id} booking={booking} token={session.access_token} online={online} />}
        {cancel?.id === booking.id && <section className="payments-review"><h4>¿Cancelar esta solicitud?</h4><p>El servidor liberará los cupos de {booking.code}. Esta acción no realiza ningún reembolso.</p><div className="payments-actions"><button className="button button-secondary" disabled={busy} onClick={() => setCancel(undefined)}>Conservar solicitud</button><button className="button button-primary" disabled={busy || !online} onClick={() => void transition(booking, 'cancelled')}>Confirmar cancelación</button></div></section>}
        {review?.id === booking.id && <section className="payments-review"><h4>Revisa antes de pagar</h4><dl><div><dt>Reserva</dt><dd>{booking.code}</dd></div><div><dt>Total de la reserva</dt><dd>{money(booking.total_amount, booking.currency)}</dd></div><div><dt>Entorno</dt><dd>{configuration?.environment === 'live' ? 'Cobro real' : 'Prueba de la pasarela'}</dd></div></dl><p>{booking.cancellation_policy_snapshot || 'Consulta con el anfitrión las condiciones de cancelación antes de pagar.'}</p>{configuration?.environment === 'live' && <CheckoutTerms key={booking.id} disabled={busy || !online} onAccepted={setTermsAccepted} />}<p>Continuar abre PayPhone en esta pestaña. El resultado se comprueba al volver a CHULLA VIDA.</p><div className="payments-actions"><button className="button button-secondary" disabled={busy} onClick={() => setReview(undefined)}>Volver</button><button className="button button-primary" disabled={busy || !online || !configuration?.enabled || configuration.environment === 'live' && !termsAccepted} onClick={() => void pay()}>{busy ? 'Preparando pago…' : configuration?.environment === 'live' ? `Pagar ${money(booking.total_amount)} en PayPhone` : 'Continuar a PayPhone · prueba'}<ArrowUpRight size={16} /></button></div></section>}
      </li>;
    })}</ul> : <div className="payments-empty"><CalendarDays size={28} /><h4>{tab === 'traveler' ? 'Tu viaje empieza con una fecha.' : 'Sin solicitudes para tu negocio.'}</h4><p>{tab === 'traveler' ? 'Aquí aparecerán tus solicitudes conectadas y sus pagos. Las pruebas locales están en «Mis viajes y pagos» del catálogo demo.' : 'Solo se muestran reservas que tu cuenta puede gestionar. Elegir el perfil de negocio de demostración no da acceso a reservas conectadas.'}</p></div>}
    {tab === 'traveler' && !loading && !loadError && <section className="payments-offers"><h4>Solicitar una fecha</h4>{slots.length ? <form onSubmit={event => { event.preventDefault(); if (!selected) return; void run(async () => { await requestBooking(selected, participants, requestKey); if (active.current) { setNotice('Solicitud registrada. Espera la confirmación del anfitrión antes de pagar.'); setRequestKey(crypto.randomUUID()); setRevision(value => value + 1); } }); }}><label>Experiencia y salida<select className="field" value={slotId} required disabled={busy} onChange={event => { setSlotId(event.target.value); setParticipants(1); setRequestKey(crypto.randomUUID()); }}><option value="">Elige una salida</option>{slots.map(slot => <option key={slot.id} value={slot.id}>{slot.title} · {date(slot.startsAt)} · {money(slot.price)} por persona</option>)}</select></label><label>Personas<input className="field" type="number" min={1} max={Math.min(selected?.available ?? 1, 100)} value={participants} required disabled={busy} onChange={event => { setParticipants(Number(event.target.value)); setRequestKey(crypto.randomUUID()); }} /></label>{selected && <p>{selected.available} cupos disponibles al consultar · Base del grupo: <strong>{money(selected.price * participants)}</strong>. El servidor vuelve a comprobar precio y cupos.</p>}<button className="button button-primary" disabled={busy || !online || !selected}>Solicitar disponibilidad · sin cobro</button></form> : <p>Aún no hay salidas autorizadas para reservar. Las 51 fichas de referencia siguen disponibles para explorar y consultar.</p>}</section>}
    <p className="payments-notice" role="status">{notice}</p>
  </div>;
}

function PaymentSummary({ result, onRefresh, disabled }: { result: PaymentResult; onRefresh: () => void; disabled: boolean }) {
  const approved = result.status === 'captured' && !result.requiresReview;
  const title = result.requiresReview || result.status === 'review_required' ? 'Pago en revisión' : approved ? 'Pago confirmado por la pasarela' : result.status === 'cancelled' ? 'Pago cancelado' : result.status === 'failed' ? 'Pago sin completar' : 'Resultado pendiente de verificar';
  function download() {
    const content = ['CHULLA VIDA · Resumen de pago', result.environment === 'sandbox' ? 'PRUEBA · SIN VALOR DE PAGO REAL' : 'Pago verificado mediante la API de PayPhone', `Referencia: ${result.reference}`, `Reserva: ${result.bookingId}`, `Importe: ${money(result.amount)}`, 'Estado: confirmado por la pasarela', 'Este resumen no sustituye una factura ni acredita una liquidación al anfitrión.'].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `chulla-vida-pago-${result.reference}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="payments-return" aria-label="Resultado de pago"><div className="payments-result-heading">{approved ? <CheckCircle2 size={25} /> : <RefreshCw size={25} />}<h4>{title}</h4></div><p>{result.environment === 'sandbox' ? 'Entorno de pruebas · no es un cobro real.' : 'Entorno de cobros reales.'}</p><dl><div><dt>Importe</dt><dd>{money(result.amount)}</dd></div><div><dt>Referencia</dt><dd>{result.reference}</dd></div></dl>{!approved && <p>Vuelve a consultar antes de intentar otro pago. Si el resultado sigue pendiente o en revisión, contacta con el equipo con esta referencia.</p>}<div className="payments-actions"><button className="button button-secondary" onClick={onRefresh} disabled={disabled}><RefreshCw size={16} />Actualizar resultado</button>{approved && <button className="button button-secondary" onClick={download}><Download size={16} />Descargar resumen{result.environment === 'sandbox' ? ' de prueba' : ''}</button>}</div></section>;
}
