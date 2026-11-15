/**
 * Tarjeta de crédito o débito: marca, Luhn, vencimiento, CVV y tarjetas de prueba públicas.
 * Puro y sin efectos: no guarda nada, no envía nada, no registra nada.
 *
 * Reglas:
 * - Con PayPhone activo en el servidor, la tarjeta se escribe SOLO en la pasarela alojada de PayPhone.
 *   Este módulo no participa en ese flujo.
 * - En modo prueba solo se aceptan los números de prueba públicos de `TEST_CARDS`. Un número que no
 *   sea de prueba nunca se procesa.
 * - Lo único que sobrevive a una compra es `CardSummary` (marca + últimos 4). Número completo,
 *   vencimiento y CVV se descartan.
 * Sin dependencias ni `Array.prototype.at`: se puede usar desde dominio compartido.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'discover';

export interface BrandInfo {
  label: string;
  /** Longitudes válidas del número. */
  lengths: readonly number[];
  /** Dígitos del código de seguridad. */
  cvv: 3 | 4;
  /** Tamaños de los bloques al escribir el número. */
  groups: readonly number[];
}

export const CARD_BRANDS: Readonly<Record<CardBrand, BrandInfo>> = {
  visa: { label: 'Visa', lengths: [13, 16, 19], cvv: 3, groups: [4, 4, 4, 4, 3] },
  mastercard: { label: 'Mastercard', lengths: [16], cvv: 3, groups: [4, 4, 4, 4] },
  amex: { label: 'American Express', lengths: [15], cvv: 4, groups: [4, 6, 5] },
  diners: { label: 'Diners Club', lengths: [14, 16, 19], cvv: 3, groups: [4, 6, 4, 4] },
  discover: { label: 'Discover', lengths: [16, 19], cvv: 3, groups: [4, 4, 4, 4, 3] },
};

export const MAX_CARD_DIGITS = 19;
export const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, MAX_CARD_DIGITS);

/** Detecta la marca por el prefijo (IIN). Funciona desde los primeros dígitos. */
export function detectBrand(value: string): CardBrand | null {
  const d = digitsOnly(value);
  if (!d) return null;
  if (/^3[47]/.test(d)) return 'amex';
  if (/^3(0[0-5]|095|[689])/.test(d)) return 'diners';
  if (/^(6011|65|64[4-9]|622(12[6-9]|1[3-9]\d|[2-8]\d\d|9[01]\d|92[0-5]))/.test(d)) return 'discover';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(d)) return 'mastercard';
  if (/^4/.test(d)) return 'visa';
  return null;
}

/** Algoritmo de Luhn (módulo 10). */
export function luhn(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length < 12 || d.length > MAX_CARD_DIGITS) return false;
  let sum = 0;
  for (let index = 0; index < d.length; index++) {
    let digit = Number(d[d.length - 1 - index]);
    if (index % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Número con espacios según la marca: `4242 4242 4242 4242`, `3782 822463 10005`. */
export function formatCardNumber(value: string): string {
  const d = digitsOnly(value);
  const brand = detectBrand(d);
  const groups = brand ? CARD_BRANDS[brand].groups : [4, 4, 4, 4, 3];
  const parts: string[] = [];
  let position = 0;
  for (const size of groups) {
    if (position >= d.length) break;
    parts.push(d.slice(position, position + size));
    position += size;
  }
  if (position < d.length) parts.push(d.slice(position));
  return parts.join(' ');
}

export const maxNumberLength = (brand: CardBrand | null) => {
  const lengths = brand ? CARD_BRANDS[brand].lengths : [MAX_CARD_DIGITS];
  return lengths[lengths.length - 1];
};
export const numberComplete = (value: string) => {
  const d = digitsOnly(value); const brand = detectBrand(d);
  return brand ? CARD_BRANDS[brand].lengths.includes(d.length) : d.length >= 12;
};

/** Vencimiento mientras se escribe: `1` → `1`, `12` → `12/`, `1229` → `12/29`. */
export function formatExpiry(value: string, previous = ''): string {
  let d = value.replace(/\D/g, '').slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  if (d.length < 2) return d;
  // Al borrar la barra, no la volvemos a poner.
  if (d.length === 2 && previous.length > value.length) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export type ExpiryState = 'incomplete' | 'invalid' | 'expired' | 'valid';
export function expiryState(value: string, now: Date = new Date()): ExpiryState {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!match) return value.replace(/\D/g, '').length < 4 ? 'incomplete' : 'invalid';
  const month = Number(match[1]); const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'invalid';
  // Una tarjeta vence al terminar su mes.
  const end = new Date(year, month, 1).getTime();
  if (end <= now.getTime()) return 'expired';
  if (year > now.getFullYear() + 20) return 'invalid';
  return 'valid';
}

export const cvvLength = (brand: CardBrand | null) => brand ? CARD_BRANDS[brand].cvv : 3;
export const cvvValid = (cvv: string, brand: CardBrand | null) => new RegExp(`^\\d{${cvvLength(brand)}}$`).test(cvv);
export const holderValid = (holder: string) => /^[\p{L}][\p{L}' .-]{1,58}[\p{L}.]$/u.test(holder.trim()) && holder.trim().includes(' ');

/* ───────────────────────── Tarjetas de prueba ───────────────────────── */

export type TestOutcome = 'approved' | 'declined';
export interface TestCard {
  number: string;
  brand: CardBrand;
  outcome: TestOutcome;
  /** Lo que verá el viajero si es rechazada. */
  reason?: string;
}
/**
 * Números de prueba públicos y documentados por las pasarelas (p. ej. la documentación de pruebas de
 * Stripe). No corresponden a ninguna cuenta real y ningún banco los cobra.
 */
export const TEST_CARDS: readonly TestCard[] = [
  { number: '4242424242424242', brand: 'visa', outcome: 'approved' },
  { number: '5555555555554444', brand: 'mastercard', outcome: 'approved' },
  { number: '378282246310005', brand: 'amex', outcome: 'approved' },
  { number: '30569309025904', brand: 'diners', outcome: 'approved' },
  { number: '6011111111111117', brand: 'discover', outcome: 'approved' },
  { number: '4000000000000002', brand: 'visa', outcome: 'declined', reason: 'El banco emisor rechazó la tarjeta (simulado).' },
  { number: '4000000000009995', brand: 'visa', outcome: 'declined', reason: 'Fondos insuficientes (simulado).' },
];
export const testCard = (value: string): TestCard | null => {
  const d = digitsOnly(value);
  return TEST_CARDS.find(card => card.number === d) ?? null;
};
export const REAL_CARD_MESSAGE = 'En modo prueba solo aceptamos tarjetas de prueba. No escribas tu tarjeta real hasta que activemos la pasarela segura.';

/* ───────────────────────── Lo único que se conserva ───────────────────────── */

export interface CardSummary { brand: CardBrand; last4: string }
const BRANDS = Object.keys(CARD_BRANDS) as CardBrand[];
export function isCardSummary(value: unknown): value is CardSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  const card = value as CardSummary;
  // Exactamente dos campos: nada de número completo, vencimiento ni CVV colados.
  return keys.length === 2 && BRANDS.includes(card.brand) && typeof card.last4 === 'string' && /^\d{4}$/.test(card.last4);
}
export const cardLabel = (card: CardSummary) => `${CARD_BRANDS[card.brand].label} •••• ${card.last4}`;
export const maskedNumber = (card: CardSummary) => `•••• ${card.last4}`;

export interface CardInput { number: string; expiry: string; cvv: string; holder: string }
export type CardField = keyof CardInput;
export type CardCheck =
  | { ok: true; summary: CardSummary; outcome: TestOutcome; reason: string }
  | { ok: false; field: CardField; message: string; realCard?: true };

/**
 * Valida el formulario de prueba. Devuelve, como mucho, marca + últimos 4: el resto del número,
 * el vencimiento y el CVV no salen de aquí.
 */
export function checkTestCard(input: CardInput, now: Date = new Date()): CardCheck {
  const d = digitsOnly(input.number);
  const brand = detectBrand(d);
  if (!d) return { ok: false, field: 'number', message: 'Escribe el número de la tarjeta o elige una tarjeta de prueba.' };
  if (!brand) return { ok: false, field: 'number', message: 'No reconocemos la marca. Aceptamos Visa, Mastercard, American Express, Diners Club y Discover.' };
  if (!numberComplete(d)) return { ok: false, field: 'number', message: `Al número le faltan dígitos para una ${CARD_BRANDS[brand].label}.` };
  if (!luhn(d)) return { ok: false, field: 'number', message: 'Revisa el número: no pasa la verificación de la tarjeta.' };
  const known = testCard(d);
  if (!known) return { ok: false, field: 'number', message: REAL_CARD_MESSAGE, realCard: true };
  const expiry = expiryState(input.expiry, now);
  if (expiry === 'incomplete') return { ok: false, field: 'expiry', message: 'Escribe el vencimiento como MM/AA.' };
  if (expiry === 'invalid') return { ok: false, field: 'expiry', message: 'Ese vencimiento no es válido: el mes va de 01 a 12.' };
  if (expiry === 'expired') return { ok: false, field: 'expiry', message: 'Esa tarjeta ya venció. Usa una fecha futura.' };
  if (!cvvValid(input.cvv, brand)) return { ok: false, field: 'cvv', message: `El código de seguridad tiene ${cvvLength(brand)} dígitos${brand === 'amex' ? ' (en Amex va al frente)' : ' (detrás de la tarjeta)'}.` };
  if (!holderValid(input.holder)) return { ok: false, field: 'holder', message: 'Escribe el nombre y apellido como aparece en la tarjeta.' };
  return { ok: true, summary: { brand, last4: d.slice(-4) }, outcome: known.outcome, reason: known.reason ?? '' };
}

/** Vencimiento de ejemplo para rellenar una tarjeta de prueba: diciembre dentro de tres años. */
export function sampleExpiry(now: Date = new Date()): string {
  return `12/${String((now.getFullYear() + 3) % 100).padStart(2, '0')}`;
}
export const sampleCvv = (brand: CardBrand) => brand === 'amex' ? '1234' : '123';
