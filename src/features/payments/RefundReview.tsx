import { useEffect, useRef, useState } from 'react';
import { getRefundReview, submitRefundReview, type ConnectedBooking, type RefundReviewRequest } from './api';

const statuses: Record<RefundReviewRequest['status'], string> = {
  requested: 'Solicitud recibida · revisión pendiente', approved: 'Revisión aprobada · devolución pendiente',
  processing: 'Devolución en proceso', succeeded: 'Reembolso registrado', failed: 'Devolución sin completar', rejected: 'Solicitud rechazada',
};
export function RefundReview({ booking, token, online }: { booking: ConnectedBooking; token: string; online: boolean }) {
  const [review, setReview] = useState<RefundReviewRequest | null>();
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const active = useRef(true); const lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    setLoading(true); setReadError(false);
    void getRefundReview(booking.id, token).then(value => { if (current) { setReview(value); setNotice(''); } })
      .catch(error => { if (current) { setReadError(true); setNotice(error instanceof Error ? error.message : 'No se pudo consultar la revisión.'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [booking.id, token, revision]);
  return <section className="payments-review" aria-label={`Revisión del pago de ${booking.code}`} aria-busy={busy}>
    <h4>Revisión y reembolso</h4>
    <p>Una solicitud abre una revisión del pago. Enviarla no cancela la visita ni devuelve dinero automáticamente.</p>
    {loading ? <p role="status">Consultando solicitudes anteriores…</p> : readError ? <p>No se pudo recuperar el estado de la revisión. Usa «Actualizar revisión» para volver a consultar antes de enviar una solicitud.</p> : review ? <><strong>{statuses[review.status]}</strong><p>{review.environment === 'sandbox' ? 'Solicitud del entorno de pruebas.' : 'Solicitud de revisión del pago real.'}</p><p>{review.reason}</p><p className="payments-footnote">Referencia de revisión: {review.id}</p></> : review === null ? <form className="payments-refund-form" onSubmit={event => {
      event.preventDefault(); if (lock.current || !online || reason.trim().length < 3) return;
      lock.current = true; setBusy(true); setNotice('');
      void submitRefundReview(booking.id, reason, key, token).then(value => { if (active.current) { setReview(value); setNotice('Solicitud guardada para revisión. No se ha realizado una devolución.'); } })
        .catch(error => { if (active.current) setNotice(error instanceof Error ? error.message : 'No se pudo registrar la solicitud.'); })
        .finally(() => { lock.current = false; if (active.current) setBusy(false); });
    }}><label>Motivo de la revisión<textarea className="field" minLength={3} maxLength={1000} required value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label><p>Describe el motivo sin introducir números de tarjeta ni claves bancarias.</p><button className="button button-primary" disabled={busy || !online || reason.trim().length < 3}>{busy ? 'Guardando solicitud…' : 'Solicitar revisión · sin devolución automática'}</button></form> : <p role="status">Consultando solicitudes anteriores…</p>}
    <p className="payments-notice" role="status">{notice}</p>
    <button className="button button-secondary" disabled={busy || !online || loading} onClick={() => setRevision(value => value + 1)}>Actualizar revisión</button>
  </section>;
}
