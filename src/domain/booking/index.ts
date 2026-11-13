/**
 * Reservas CHULLA VIDA 3.0 — máquina de estados, cupos y tiempos. Lógica pura, sin red ni almacenamiento.
 *
 * Refleja `booking_transition_allowed` y `bookings_guard` de
 * `supabase/migrations/202611130008_bookings_payments.sql`: la base de datos es la autoridad en línea
 * y este módulo es la misma regla para la interfaz, el simulador y las pruebas.
 *
 * Regla que no se negocia: `paid` solo se alcanza con `applyVerifiedPayment`, a partir de un pago
 * verificado por el webhook del proveedor (monto, moneda e id de reserva coinciden). Ni la persona
 * viajera, ni el anfitrión, ni administración pueden marcar una reserva como pagada.
 */

export const BOOKING_STATUSES = [
  'draft', 'requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment',
  'paid', 'completed', 'expired', 'cancelled', 'refunded', 'payment_failed',
] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];
export type BookingActor = 'traveler' | 'merchant' | 'system_payment_webhook' | 'admin';
export type BookingKind = 'information' | 'booking';
export type BookingCurrency = 'USD' | 'EUR';

const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  draft: ['requested', 'cancelled', 'expired'],
  requested: ['awaiting_merchant_confirmation', 'confirmed', 'cancelled', 'expired'],
  awaiting_merchant_confirmation: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['awaiting_payment', 'cancelled', 'expired'],
  awaiting_payment: ['paid', 'payment_failed', 'cancelled', 'expired'],
  payment_failed: ['awaiting_payment', 'cancelled', 'expired'],
  paid: ['completed', 'cancelled', 'refunded'],
  completed: ['refunded'],
  cancelled: ['refunded'],
  expired: [],
  refunded: [],
};

export const isBookingStatus = (value: unknown): value is BookingStatus => typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);
/** ¿Existe la arista en la máquina, sin mirar quién la pide? */
export const transitionExists = (from: BookingStatus, to: BookingStatus): boolean => TRANSITIONS[from]?.includes(to) ?? false;
export const nextStatuses = (from: BookingStatus): readonly BookingStatus[] => TRANSITIONS[from] ?? [];
export const isTerminal = (status: BookingStatus): boolean => nextStatuses(status).length === 0;

/**
 * ¿Puede este actor pedir la transición?
 * - traveler: envía su borrador y cancela antes del pago.
 * - merchant: recibe, confirma, habilita el pago, marca como realizada y cancela antes del pago.
 * - system_payment_webhook: único camino a `paid`, `payment_failed` y `refunded`.
 * - admin: vencimientos y soporte; cancelar una reserva pagada abre el flujo de reembolso.
 *   Nunca `paid` ni `refunded`: el dinero solo lo acredita el proveedor de pagos.
 */
export function canTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): boolean {
  if (!isBookingStatus(from) || !isBookingStatus(to) || !transitionExists(from, to)) return false;
  switch (actor) {
    case 'system_payment_webhook':
      return (from === 'awaiting_payment' && (to === 'paid' || to === 'payment_failed'))
        || (from === 'payment_failed' && to === 'awaiting_payment') || to === 'refunded';
    case 'traveler':
      return (to === 'cancelled' && from !== 'paid') || (from === 'draft' && to === 'requested');
    case 'merchant':
      return (to === 'cancelled' && from !== 'paid')
        || (from === 'requested' && (to === 'awaiting_merchant_confirmation' || to === 'confirmed'))
        || (from === 'awaiting_merchant_confirmation' && to === 'confirmed')
        || (from === 'confirmed' && to === 'awaiting_payment')
        || (from === 'paid' && to === 'completed');
    case 'admin':
      return to !== 'paid' && to !== 'refunded' && to !== 'payment_failed';
    default:
      return false;
  }
}

export interface BookingHistoryEntry { from: BookingStatus | null; to: BookingStatus; actor: BookingActor; at: string; note?: string }
export interface Booking {
  id: string;
  code: string;
  experienceId: string;
  kind: BookingKind;
  status: BookingStatus;
  participants: number;
  /** Fecha tentativa AAAA-MM-DD que propone la persona viajera; no es disponibilidad confirmada. */
  date: string | null;
  note: string;
  pet: boolean;
  /** Total en centavos enteros. `null` mientras no exista una tarifa aprobada. */
  totalCents: number | null;
  currency: BookingCurrency | null;
  createdAt: string;
  updatedAt: string;
  /** Límite de la etapa actual, cuando aplica. */
  expiresAt: string | null;
  history: BookingHistoryEntry[];
  /** `true` = existe solo en este dispositivo, sin dinero ni proveedor real. */
  demo: boolean;
  paymentId?: string;
}

export type TransitionFailure = 'unknown_status' | 'invalid_transition' | 'actor_not_allowed' | 'requires_verified_payment' | 'information_request_cannot_be_charged';
export type TransitionResult = { ok: true; booking: Booking } | { ok: false; reason: TransitionFailure };

function move(booking: Booking, to: BookingStatus, actor: BookingActor, now: Date, note?: string, patch: Partial<Booking> = {}): Booking {
  const at = now.toISOString();
  return { ...booking, ...patch, status: to, updatedAt: at, history: [...booking.history, { from: booking.status, to, actor, at, ...(note ? { note } : {}) }] };
}

/** Transición ordinaria. `paid` y `payment_failed` jamás pasan por aquí: usan `applyVerifiedPayment`. */
export function transition(booking: Booking, to: BookingStatus, actor: BookingActor, now: Date = new Date(), note?: string): TransitionResult {
  if (!isBookingStatus(booking.status) || !isBookingStatus(to)) return { ok: false, reason: 'unknown_status' };
  if (!transitionExists(booking.status, to)) return { ok: false, reason: 'invalid_transition' };
  if (to === 'paid' || to === 'payment_failed') return { ok: false, reason: 'requires_verified_payment' };
  if (!canTransition(booking.status, to, actor)) return { ok: false, reason: 'actor_not_allowed' };
  if (to === 'awaiting_payment' && (booking.kind !== 'booking' || !booking.totalCents || booking.totalCents <= 0 || !booking.currency))
    return { ok: false, reason: 'information_request_cannot_be_charged' };
  return { ok: true, booking: move(booking, to, actor, now, note, { expiresAt: isTerminal(to) || to === 'completed' ? null : booking.expiresAt }) };
}

/** Resultado ya verificado de un evento del proveedor (firma comprobada antes de construirlo). */
export interface VerifiedPayment {
  verified: true;
  paymentId: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  outcome: 'captured' | 'failed';
}
export type PaymentApplyFailure = 'unverified' | 'booking_mismatch' | 'amount_mismatch' | 'currency_mismatch' | 'not_awaiting_payment';
export type PaymentApplyResult = { ok: true; booking: Booking; duplicate: boolean } | { ok: false; reason: PaymentApplyFailure };

/**
 * Único camino a `paid`. Idempotente: repetir el mismo pago verificado devuelve la reserva tal cual.
 * Un rechazo deja la reserva en `payment_failed` (o sin cambios si ya estaba ahí).
 */
export function applyVerifiedPayment(booking: Booking, payment: VerifiedPayment, now: Date = new Date()): PaymentApplyResult {
  if (!payment || payment.verified !== true || !payment.paymentId) return { ok: false, reason: 'unverified' };
  if (payment.bookingId !== booking.id) return { ok: false, reason: 'booking_mismatch' };
  if (!Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0 || payment.amountCents !== booking.totalCents) return { ok: false, reason: 'amount_mismatch' };
  if (!booking.currency || payment.currency !== booking.currency) return { ok: false, reason: 'currency_mismatch' };
  if (payment.outcome === 'captured') {
    if (booking.status === 'paid' && booking.paymentId === payment.paymentId) return { ok: true, booking, duplicate: true };
    if (booking.status !== 'awaiting_payment' && booking.status !== 'payment_failed') return { ok: false, reason: 'not_awaiting_payment' };
    const ready = booking.status === 'payment_failed' ? move(booking, 'awaiting_payment', 'system_payment_webhook', now, 'Reintento de pago') : booking;
    return { ok: true, duplicate: false, booking: move(ready, 'paid', 'system_payment_webhook', now, 'Pago verificado por el proveedor', { paymentId: payment.paymentId, expiresAt: null }) };
  }
  if (booking.status === 'payment_failed') return { ok: true, booking, duplicate: true };
  if (booking.status !== 'awaiting_payment') return { ok: false, reason: 'not_awaiting_payment' };
  return { ok: true, duplicate: false, booking: move(booking, 'payment_failed', 'system_payment_webhook', now, 'El proveedor no aprobó el pago') };
}

export type BookingCta = 'request_info' | 'request_booking' | 'book_and_pay';
/**
 * Qué acción ofrece una ficha.
 * - Sin `bookingEnabled` (hoy, todo el catálogo): solo pedir información.
 * - Habilitada con oferta verificada y confirmación inmediata acordada: reservar y pagar.
 * - Habilitada en cualquier otro caso: solicitar reserva y esperar al anfitrión.
 */
export function ctaFor(experience: { bookingEnabled: boolean; price?: { type?: string } | null; instantConfirmation?: boolean }): BookingCta {
  if (experience.bookingEnabled !== true) return 'request_info';
  return experience.price?.type === 'verified_offer' && experience.instantConfirmation === true ? 'book_and_pay' : 'request_booking';
}

// ── Cupos ────────────────────────────────────────────────────────────────────

export interface CapacitySlot { capacity: number; reserved: number }
export type SeatResult = { ok: true; slot: CapacitySlot } | { ok: false; reason: 'invalid_request' | 'not_enough_capacity'; left: number };
/** Estados que retienen cupo. Borradores, vencidas, canceladas y reembolsadas lo liberan. */
export const HOLDS_SEATS: readonly BookingStatus[] = ['requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'payment_failed', 'paid', 'completed'];
export const holdsSeats = (status: BookingStatus): boolean => HOLDS_SEATS.includes(status);
export const seatsLeft = (slot: CapacitySlot): number => Math.max(0, slot.capacity - slot.reserved);

/** Aparta cupos sin sobreventa: o entran todos los participantes o no entra ninguno. */
export function reserveSeats(slot: CapacitySlot, participants: number): SeatResult {
  const left = Number.isSafeInteger(slot.capacity) && Number.isSafeInteger(slot.reserved) ? seatsLeft(slot) : 0;
  if (!Number.isSafeInteger(participants) || participants < 1 || participants > 100 || !Number.isSafeInteger(slot.capacity) || slot.capacity < 1
    || !Number.isSafeInteger(slot.reserved) || slot.reserved < 0 || slot.reserved > slot.capacity) return { ok: false, reason: 'invalid_request', left };
  if (participants > left) return { ok: false, reason: 'not_enough_capacity', left };
  return { ok: true, slot: { capacity: slot.capacity, reserved: slot.reserved + participants } };
}
export function releaseSeats(slot: CapacitySlot, participants: number): CapacitySlot {
  return { capacity: slot.capacity, reserved: Math.max(0, slot.reserved - Math.max(0, Math.trunc(participants) || 0)) };
}
/** Cupos ya retenidos para una experiencia y fecha, a partir de las reservas existentes. */
export function seatsHeld(bookings: readonly Booking[], experienceId: string, date: string | null, exceptId?: string): number {
  return bookings.reduce((sum, row) => row.experienceId === experienceId && row.date === date && row.id !== exceptId && row.kind === 'booking' && holdsSeats(row.status) ? sum + row.participants : sum, 0);
}

// ── Tiempos ──────────────────────────────────────────────────────────────────

const WAITING: readonly BookingStatus[] = ['draft', 'requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'payment_failed'];
export interface TimeLeft { kind: 'expires' | 'starts' | 'none'; ms: number; overdue: boolean; label: string }

function span(ms: number): string {
  const minutes = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(minutes / 1440); const hours = Math.floor((minutes % 1440) / 60); const rest = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${rest} min`;
  return minutes > 0 ? `${rest} min` : 'menos de un minuto';
}
/**
 * Cuenta regresiva de la etapa: hasta el vencimiento mientras se espera una respuesta o un pago;
 * hasta la fecha tentativa (mediodía de Ecuador, UTC−5) cuando ya está confirmada o pagada.
 */
export function timeUntil(booking: Pick<Booking, 'status' | 'expiresAt' | 'date'>, now: Date = new Date()): TimeLeft {
  if (WAITING.includes(booking.status) && booking.expiresAt && !Number.isNaN(Date.parse(booking.expiresAt))) {
    const ms = Date.parse(booking.expiresAt) - now.getTime();
    return { kind: 'expires', ms, overdue: ms <= 0, label: ms <= 0 ? 'El plazo de esta etapa ya venció' : `Quedan ${span(ms)} para que venza esta etapa` };
  }
  if ((booking.status === 'paid' || booking.status === 'confirmed') && booking.date && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    const start = Date.parse(`${booking.date}T12:00:00-05:00`);
    if (!Number.isNaN(start)) {
      const ms = start - now.getTime();
      return { kind: 'starts', ms, overdue: ms <= 0, label: ms <= 0 ? 'La fecha tentativa ya pasó' : `Faltan ${span(ms)} para tu fecha tentativa` };
    }
  }
  return { kind: 'none', ms: 0, overdue: false, label: '' };
}
/** Vence una etapa pendiente cuyo plazo terminó (tarea programada, con permisos de administración). */
export function expireIfDue(booking: Booking, now: Date = new Date()): Booking {
  const left = timeUntil(booking, now);
  if (left.kind !== 'expires' || !left.overdue) return booking;
  const result = transition(booking, 'expired', 'admin', now, 'Venció el plazo de la etapa');
  return result.ok ? result.booking : booking;
}

export const STATUS_LABELS: Readonly<Record<BookingStatus, string>> = {
  draft: 'Borrador',
  requested: 'Solicitud enviada',
  awaiting_merchant_confirmation: 'Esperando respuesta del anfitrión',
  confirmed: 'Confirmada por el anfitrión',
  awaiting_payment: 'Pendiente de pago',
  paid: 'Pagada',
  completed: 'Completada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  payment_failed: 'Pago no aprobado',
};
export const ACTOR_LABELS: Readonly<Record<BookingActor, string>> = {
  traveler: 'Tú', merchant: 'Anfitrión', system_payment_webhook: 'Proveedor de pagos', admin: 'Chulla Vida',
};
/** Camino feliz, para dibujar la línea de tiempo. */
export const HAPPY_PATH: readonly BookingStatus[] = ['requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'paid', 'completed'];
