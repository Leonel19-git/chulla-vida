/**
 * Personas y fechas de una compra o de Mi viaje. Puro y sin efectos.
 * - Personas: adultos (mínimo 1) + niños (opcional). El total nunca pasa la capacidad de la ficha.
 * - Fechas: inicio y fin (fin ≥ inicio). Para experiencias de N días se sugiere el fin.
 */

export const MAX_GROUP = 50;
/** Máximo de días entre inicio y fin que aceptamos en una compra (rango razonable para un viaje). */
export const MAX_RANGE_DAYS = 60;

export interface Party { adults: number; children: number }

/** Capacidad efectiva: la de la ficha si existe, nunca más de 50 ni menos de 1. */
export function partyCapacity(...maxes: Array<number | null | undefined>): number {
  const known = maxes.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 1);
  return Math.max(1, Math.min(MAX_GROUP, ...known.map(value => Math.floor(value))));
}

const whole = (value: unknown, fallback: number) => {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(number) ? Math.round(number) : fallback;
};

/** Ajusta adultos y niños a la capacidad: primero se respetan los adultos (mínimo 1). */
export function clampParty(party: Partial<Party>, capacity: number): Party {
  const max = partyCapacity(capacity);
  const adults = Math.min(max, Math.max(1, whole(party.adults, 1)));
  const children = Math.min(max - adults, Math.max(0, whole(party.children, 0)));
  return { adults, children };
}
export const partySize = (party: Party) => party.adults + party.children;
export function partyLabel(party: Party): string {
  const adults = `${party.adults} ${party.adults === 1 ? 'adulto' : 'adultos'}`;
  return party.children ? `${adults} · ${party.children} ${party.children === 1 ? 'niño' : 'niños'}` : adults;
}

/* ───────────── Fechas ───────────── */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** `YYYY-MM-DD` válido de verdad (no acepta 2026-02-31). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function addDays(value: string, days: number): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
/** Fecha local de hoy + `offset` días, en `YYYY-MM-DD`. */
export function localDay(offset = 0, now = new Date()): string {
  const value = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

/** Días de la experiencia según la ficha (días declarados u horas máximas), o null si no se sabe. */
export function experienceDays(duration: { days?: number | null; maxHours?: number | null } | null | undefined): number | null {
  if (!duration) return null;
  if (typeof duration.days === 'number' && duration.days >= 1) return Math.floor(duration.days);
  if (typeof duration.maxHours === 'number' && duration.maxHours > 0) return Math.max(1, Math.ceil(duration.maxHours / 24));
  return null;
}
/** Fin sugerido: una experiencia de 2 días que empieza el 10 termina el 11. */
export function suggestEnd(start: string, days: number | null): string {
  if (!isIsoDate(start)) return '';
  return addDays(start, Math.max(0, (days ?? 1) - 1));
}

export interface RangeSummary { days: number; nights: number; label: string }
export function rangeSummary(start: string, end: string): RangeSummary | null {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return null;
  const nights = daysBetween(start, end);
  const days = nights + 1;
  return { days, nights, label: `${days} ${days === 1 ? 'día' : 'días'} / ${nights} ${nights === 1 ? 'noche' : 'noches'}` };
}

export type RangeError = '' | 'start_missing' | 'start_past' | 'end_missing' | 'end_before' | 'too_long';
export const RANGE_ERROR_TEXT: Readonly<Record<Exclude<RangeError, ''>, string>> = {
  start_missing: 'Elige la fecha de inicio.',
  start_past: 'El inicio debe ser a partir de mañana.',
  end_missing: 'Elige la fecha de fin.',
  end_before: 'El fin no puede ser antes del inicio.',
  too_long: `El viaje puede durar hasta ${MAX_RANGE_DAYS} días.`,
};
export function validateRange(start: string, end: string, minStart: string): RangeError {
  if (!isIsoDate(start)) return 'start_missing';
  if (start < minStart) return 'start_past';
  if (!isIsoDate(end)) return 'end_missing';
  if (end < start) return 'end_before';
  if (daysBetween(start, end) > MAX_RANGE_DAYS) return 'too_long';
  return '';
}

/** Fecha corta para tarjetas: «sáb 14 mar». */
export function shortDay(value: string): string {
  if (!isIsoDate(value)) return '—';
  return new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
