import { getSupabase } from '../../lib/supabase';
import { checkedCheckoutUrl } from '../../domain/payments';

export interface PaymentConfiguration {
  enabled: boolean;
  provider: 'payphone';
  environment: 'sandbox' | 'live';
  reason?: string;
}
export interface PaymentResult {
  reference: string;
  status: 'pending' | 'captured' | 'failed' | 'cancelled' | 'review_required';
  amount: number;
  currency: 'USD';
  environment: 'sandbox' | 'live';
  bookingId: string;
  provider: 'payphone';
  requiresReview: boolean;
}
export interface ConnectedBooking {
  id: string;
  code: string;
  traveler_id: string;
  experience_id: string;
  participants: number;
  status: string;
  total_amount: number;
  currency: 'USD' | 'EUR';
  payment_environment: 'sandbox' | 'live';
  expires_at: string | null;
  cancellation_policy_snapshot: string | null;
  title: string;
  startsAt: string | null;
}
export interface BookableSlot {
  id: string;
  experienceId: string;
  title: string;
  startsAt: string;
  available: number;
  price: number;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export { paymentReference } from './reference';
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const relation = (value: unknown) => object(Array.isArray(value) ? value[0] : value);
export class PaymentRequestError extends Error {
  constructor(message: string, public reference?: string) { super(message); this.name = 'PaymentRequestError'; }
}
export interface StoredPaymentAttempt { key: string; reference?: string }
export interface RefundReviewRequest {
  id: string;
  bookingId: string;
  status: 'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'rejected';
  amount: number;
  currency: 'USD';
  reason: string;
  createdAt: string;
  environment: 'sandbox' | 'live';
}
export function readPaymentAttempt(user: string, booking: string): StoredPaymentAttempt | undefined {
  try {
    const data = object(JSON.parse(sessionStorage.getItem(`cv3:payment:${user}:${booking}`) || 'null'));
    return typeof data.key === 'string' && uuid.test(data.key) && (data.reference === undefined || typeof data.reference === 'string' && uuid.test(data.reference)) ? data as unknown as StoredPaymentAttempt : undefined;
  } catch { return undefined; }
}
export function savePaymentAttempt(user: string, booking: string, attempt: StoredPaymentAttempt) {
  try { sessionStorage.setItem(`cv3:payment:${user}:${booking}`, JSON.stringify(attempt)); } catch { /* Server idempotency remains authoritative when storage is blocked. */ }
}

async function request(path: string, token?: string, body?: unknown): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`/api/payments/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'omit', cache: 'no-store',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
    });
  } catch { throw new Error('No se pudo conectar con pagos. Comprueba tu conexión y vuelve a consultar antes de reintentar.'); }
  let data: Record<string, unknown>;
  try { data = object(await response.json()); }
  catch { throw new Error('El servicio de pagos todavía no está disponible. Puedes seguir explorando y probar la demostración.'); }
  if (!response.ok) throw new PaymentRequestError(response.status === 401 ? 'Vuelve a iniciar sesión para consultar tus pagos.'
    : response.status === 409 ? 'La reserva o el pago cambiaron. Actualiza su estado antes de continuar.'
      : 'No se pudo completar la operación de pago. Actualiza el estado antes de volver a intentarlo.', typeof data.reference === 'string' && uuid.test(data.reference) ? data.reference : undefined);
  return data;
}
export async function getPaymentConfiguration(): Promise<PaymentConfiguration> {
  const data = await request('config');
  if (typeof data.enabled !== 'boolean' || data.provider !== 'payphone' || !['sandbox', 'live'].includes(String(data.environment))) throw new Error('No se pudo comprobar la disponibilidad de pagos.');
  return { enabled: data.enabled, provider: 'payphone', environment: data.environment as 'sandbox' | 'live' };
}
export async function getPaymentStatus(reference: string, token: string): Promise<PaymentResult> {
  if (!uuid.test(reference)) throw new Error('La referencia del pago no es válida.');
  const data = await request(`status?reference=${encodeURIComponent(reference)}`, token);
  return validatePaymentResult(data, reference);
}
export async function reconcilePaymentStatus(reference: string, token: string): Promise<PaymentResult> {
  if (!uuid.test(reference)) throw new Error('La referencia del pago no es válida.');
  return validatePaymentResult(await request('reconcile', token, { reference }), reference);
}
function validatePaymentResult(data: Record<string, unknown>, reference: string): PaymentResult {
  if (data.reference !== reference || data.provider !== 'payphone' || !uuid.test(String(data.bookingId))
    || !['pending', 'captured', 'failed', 'cancelled', 'review_required'].includes(String(data.status))
    || !['sandbox', 'live'].includes(String(data.environment)) || data.currency !== 'USD'
    || typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount <= 0 || typeof data.requiresReview !== 'boolean') {
    throw new Error('No se pudo verificar el resultado. Vuelve a consultar; no se da el pago por aprobado.');
  }
  return data as unknown as PaymentResult;
}
export function safeCheckoutURL(value: unknown): string {
  try { return checkedCheckoutUrl(value); }
  catch { throw new Error('El enlace de pago no pertenece al formulario de PayPhone. Actualiza la reserva.'); }
}
export async function preparePayment(bookingId: string, idempotencyKey: string, token: string): Promise<{ checkoutUrl: string; reference: string }> {
  const data = await request('prepare', token, { bookingId, idempotencyKey });
  if (typeof data.clientTransactionId !== 'string' || !uuid.test(data.clientTransactionId)) throw new Error('No se pudo verificar la referencia del intento. Actualiza la reserva.');
  return { checkoutUrl: safeCheckoutURL(data.checkoutUrl), reference: data.clientTransactionId };
}
function validateRefundReview(data: Record<string, unknown>, bookingId: string): RefundReviewRequest | null {
  if (data.request === null) return null;
  const value = object(data.request);
  if (!uuid.test(String(value.id)) || value.bookingId !== bookingId || !['requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected'].includes(String(value.status))
    || typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0 || value.currency !== 'USD'
    || typeof value.reason !== 'string' || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))
    || !['sandbox', 'live'].includes(String(value.environment))) throw new Error('No se pudo comprobar tu solicitud de revisión. Vuelve a consultar.');
  return value as unknown as RefundReviewRequest;
}
export async function getRefundReview(bookingId: string, token: string): Promise<RefundReviewRequest | null> {
  if (!uuid.test(bookingId)) throw new Error('La reserva no es válida.');
  return validateRefundReview(await request(`refund-request?bookingId=${encodeURIComponent(bookingId)}`, token), bookingId);
}
export async function submitRefundReview(bookingId: string, reason: string, idempotencyKey: string, token: string): Promise<RefundReviewRequest> {
  const review = validateRefundReview(await request('refund-request', token, { bookingId, reason: reason.trim(), idempotencyKey }), bookingId);
  if (!review) throw new Error('No se pudo registrar la revisión. Conserva el motivo y vuelve a consultar.');
  return review;
}
export async function loadBookingData() {
  const client = getSupabase();
  if (!client) throw new Error('Inicia sesión para ver tus reservas.');
  const [bookings, slots] = await Promise.all([
    client.from('bookings').select('id,code,traveler_id,experience_id,participants,status,total_amount,currency,payment_environment,expires_at,cancellation_policy_snapshot,experiences(title),availability_slots(starts_at)').order('created_at', { ascending: false }).limit(100),
    client.from('availability_slots').select('id,experience_id,starts_at,capacity,reserved,price_amount,currency,experiences!inner(id,title,booking_enabled)')
      .eq('status', 'open').eq('currency', 'USD').eq('experiences.booking_enabled', true).gt('starts_at', new Date().toISOString()).order('starts_at').limit(50),
  ]);
  if (bookings.error || slots.error) throw new Error('No se pudieron cargar las reservas. Comprueba la conexión y vuelve a intentarlo.');
  const parsedBookings = (bookings.data ?? []).map((raw: unknown): ConnectedBooking => {
    const row = object(raw);
    const amount = Number(row.total_amount);
    if (typeof row.id !== 'string' || typeof row.traveler_id !== 'string' || typeof row.status !== 'string' || !Number.isFinite(amount) || !['USD', 'EUR'].includes(String(row.currency)) || !['sandbox', 'live'].includes(String(row.payment_environment))) throw new Error('No se pudieron leer los datos de reservas.');
    return { ...row, total_amount: amount, title: String(relation(row.experiences).title ?? row.experience_id), startsAt: typeof relation(row.availability_slots).starts_at === 'string' ? relation(row.availability_slots).starts_at as string : null } as unknown as ConnectedBooking;
  });
  const parsedSlots = (slots.data ?? []).flatMap((raw: unknown): BookableSlot[] => {
    const row = object(raw); const exp = relation(row.experiences); const price = Number(row.price_amount); const available = Number(row.capacity) - Number(row.reserved);
    if (exp.booking_enabled !== true || !Number.isFinite(price) || price <= 0 || !Number.isInteger(available) || available < 1 || typeof row.starts_at !== 'string' || typeof row.id !== 'string' || typeof row.experience_id !== 'string') return [];
    return [{ id: row.id, experienceId: row.experience_id, title: String(exp.title), startsAt: row.starts_at, price, available }];
  });
  return { bookings: parsedBookings, slots: parsedSlots };
}
export async function changeBooking(booking: ConnectedBooking, status: string) {
  const client = getSupabase();
  if (!client) throw new Error('Vuelve a iniciar sesión.');
  const { error, data } = await client.from('bookings').update({ status }).eq('id', booking.id).eq('status', booking.status).select('id').single();
  if (error || !data) throw new Error('No se pudo cambiar la reserva. Actualiza sus datos y comprueba tus permisos.');
}
export async function requestBooking(slot: BookableSlot, participants: number, key: string) {
  const client = getSupabase();
  if (!client) throw new Error('Vuelve a iniciar sesión.');
  const { error } = await client.rpc('request_booking', { p_experience_id: slot.experienceId, p_slot_id: slot.id, p_participants: participants, p_idempotency_key: key });
  if (error) throw new Error('No se pudo solicitar. Confirma tu correo y comprueba los cupos; puedes reintentar sin duplicar la solicitud.');
}
