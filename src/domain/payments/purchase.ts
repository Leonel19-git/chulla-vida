/**
 * Compra de experiencias: qué se puede comprar, cómo se calcula el importe y qué guarda la
 * billetera de viaje. Puro y sin efectos (sin fetch ni almacenamiento).
 *
 * Reglas de honestidad:
 * - Ninguna compra de este módulo mueve dinero. Mientras el servidor no tenga PayPhone configurado
 *   y la ficha no esté habilitada por él, la compra es una PRUEBA SIN COBRO.
 * - Los precios de las fichas son referenciales o propuestos por la fuente; se muestran en su
 *   moneda original. Una ficha en EUR o sin precio comparable se solicita como cotización.
 * - El documento del comprador solo se guarda enmascarado (últimos 4 caracteres).
 */
import type { Experience } from '../catalog';
import { isMaskedDocument, type DocumentType } from '../identity/cedula';
import { cardLabel, isCardSummary, type CardSummary } from './card';
import { isIsoDate } from './travel';
import { isTransferReference } from './transfer';

export const WALLET_KEY = 'chullavida:wallet:v1';
export const WALLET_VERSION = 1;
export const WALLET_LIMIT = 200;
export const TEST_RECEIPT_LABEL = 'COMPRA DE PRUEBA — SIN VALOR';

export interface PriceChoice {
  id: string;
  label: string;
  /** Centavos por persona. */
  minCents: number;
  /** Centavos por persona; igual a `minCents` si es precio fijo; `null` si la fuente dice «desde». */
  maxCents: number | null;
  /** Personas fijadas por la opción (tarifa por tamaño de grupo). */
  fixedPeople: number | null;
  note: string;
}
export type PurchasePlan =
  | { kind: 'buy'; currency: 'USD'; choices: PriceChoice[]; priceType: Experience['price']['type'] }
  | { kind: 'quote'; reason: string };

const cents = (value: number) => Math.round(value * 100);

/** Decide si una ficha se compra (con sus opciones de precio) o se pide como cotización. */
export function purchasePlan(experience: Experience): PurchasePlan {
  const price = experience.price;
  if (price.currency !== 'USD') return { kind: 'quote', reason: `La fuente da el precio en ${price.currency}. No lo convertimos por nuestra cuenta: pide una cotización en dólares.` };
  if (price.groupBreakdown?.length) {
    const choices = price.groupBreakdown.filter(item => Number.isInteger(item.groupSize) && item.groupSize > 0 && item.amountPerPerson > 0)
      .map(item => ({ id: `grupo-${item.groupSize}`, label: `Grupo de ${item.groupSize} personas`, minCents: cents(item.amountPerPerson), maxCents: cents(item.amountPerPerson), fixedPeople: item.groupSize, note: 'Precio por persona según el tamaño del grupo, tal como lo da la fuente.' }));
    if (choices.length) return { kind: 'buy', currency: 'USD', choices, priceType: price.type };
  }
  const options = (price.options ?? []).filter(option => option.currency === 'USD' && option.unit === 'per_person' && option.min !== null && option.min > 0 && (option.max === null || option.max >= option.min));
  if (options.length) {
    return { kind: 'buy', currency: 'USD', priceType: price.type, choices: options.map(option => ({ id: option.id, label: option.label, minCents: cents(option.min as number), maxCents: option.max === null ? null : cents(option.max), fixedPeople: null, note: option.notes })) };
  }
  if (price.min !== null && price.min > 0) {
    return { kind: 'buy', currency: 'USD', priceType: price.type, choices: [{ id: 'base', label: price.originalLabel || 'Precio de la fuente', minCents: cents(price.min), maxCents: price.max === null ? null : cents(Math.max(price.max, price.min)), fixedPeople: null, note: '' }] };
  }
  return { kind: 'quote', reason: 'La fuente no da un precio por persona comparable. Pide una cotización con tus fechas y tu grupo.' };
}

/** El valor elegido siempre queda dentro del rango de la fuente. */
export function clampChoice(choice: PriceChoice, requestedCents: number): number {
  const value = Number.isFinite(requestedCents) ? Math.round(requestedCents) : choice.minCents;
  if (choice.maxCents === null) return choice.minCents;
  return Math.min(choice.maxCents, Math.max(choice.minCents, value));
}
export const isRange = (choice: PriceChoice) => choice.maxCents !== null && choice.maxCents > choice.minCents;
export const lineTotalCents = (unitCents: number, people: number) => unitCents * people;
export const formatUsd = (centsValue: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(centsValue / 100);
export function choiceLabel(choice: PriceChoice): string {
  if (choice.maxCents === null) return `Desde ${formatUsd(choice.minCents)} por persona`;
  if (isRange(choice)) return `${formatUsd(choice.minCents)}–${formatUsd(choice.maxCents)} por persona`;
  return `${formatUsd(choice.minCents)} por persona`;
}

/* ───────────────────────── Billetera de viaje ───────────────────────── */

export type WalletStatus = 'test_pending' | 'test_approved' | 'test_rejected' | 'test_transfer_review' | 'test_transfer_rejected' | 'requested' | 'cancelled';
/** Cómo se pagó la prueba. Sin `method` es tarjeta (registros anteriores). */
export type WalletMethod = 'card' | 'transfer';
/** Transferencia de prueba: SOLO referencia y tipo de archivo. El archivo nunca sale del navegador ni se guarda. */
export interface WalletTransfer { reference: string; receiptKind: 'image' | 'pdf' | null; rejectionReason?: string }
export type WalletKind = 'test_purchase' | 'request';
export interface WalletBuyer { name: string; emailMasked: string; documentType: DocumentType | null; documentMasked: string | null }
export interface WalletRecord {
  id: string;
  code: string;
  kind: WalletKind;
  status: WalletStatus;
  /** Siempre `test` en este módulo: las compras reales viven en Supabase y se leen aparte. */
  mode: 'test';
  experienceId: string;
  title: string;
  province: string;
  /** Fecha de inicio. */
  date: string;
  /** Fecha de fin (≥ inicio). Ausente en registros anteriores. */
  endDate?: string;
  /** Total de personas (adultos + niños). */
  people: number;
  /** Niños dentro de `people`. */
  children?: number;
  currency: 'USD' | 'EUR';
  unitCents: number | null;
  totalCents: number | null;
  priceNote: string;
  buyer: WalletBuyer;
  /** Viaje al que pertenece (p. ej. «Mi viaje desde Quito»). */
  trip: string;
  batchId: string | null;
  attempts: number;
  /** Tarjeta usada en la prueba: SOLO marca y últimos 4. Nunca número completo, vencimiento ni CVV. */
  card?: CardSummary | null;
  method?: WalletMethod;
  transfer?: WalletTransfer | null;
  createdAt: string;
  updatedAt: string;
}
export interface WalletState { version: 1; records: WalletRecord[] }
export const emptyWallet = (): WalletState => ({ version: 1, records: [] });

const STATUSES: readonly WalletStatus[] = ['test_pending', 'test_approved', 'test_rejected', 'test_transfer_review', 'test_transfer_rejected', 'requested', 'cancelled'];
const KINDS: readonly WalletKind[] = ['test_purchase', 'request'];
export const STATUS_TEXT: Readonly<Record<WalletStatus, string>> = {
  test_pending: 'Compra de prueba sin terminar',
  test_approved: 'Compra de prueba aprobada · sin cobro',
  test_rejected: 'Pago de prueba rechazado',
  test_transfer_review: 'Comprobante enviado · pendiente de verificación',
  test_transfer_rejected: 'Comprobante rechazado · sube otro',
  requested: 'Solicitud guardada · sin enviar todavía',
  cancelled: 'Cancelada por ti',
};

export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.trim().toLowerCase().split('@');
  if (!user || !domain) return '';
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(6, user.length - 2)))}@${domain}`;
}
export const isEmail = (value: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(value.trim());

const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
function isTransfer(value: unknown): value is WalletTransfer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const t = value as WalletTransfer;
  return isTransferReference(t.reference) && (t.receiptKind === null || t.receiptKind === 'image' || t.receiptKind === 'pdf')
    && (t.rejectionReason === undefined || text(t.rejectionReason, 500))
    && Object.keys(t).every(key => ['reference', 'receiptKind', 'rejectionReason'].includes(key));
}
/** Registro pagado (o en revisión) a efectos de Mi viaje. */
export const isBoughtStatus = (status: WalletStatus) => status === 'test_approved' || status === 'test_transfer_review';
const centsOrNull = (value: unknown) => value === null || Number.isSafeInteger(value) && (value as number) >= 0;
function isBuyer(value: unknown): value is WalletBuyer {
  if (!value || typeof value !== 'object') return false;
  const buyer = value as WalletBuyer;
  return text(buyer.name, 120) && text(buyer.emailMasked, 260) && (buyer.emailMasked === '' || /^[^@*\s]{0,2}\*+@[^@\s]+$/.test(buyer.emailMasked))
    && (buyer.documentType === null || buyer.documentType === 'cedula' || buyer.documentType === 'passport')
    && (buyer.documentMasked === null || isMaskedDocument(buyer.documentMasked));
}
/** Valida un registro leído del navegador: lo que no encaja se descarta, nunca se repara. */
export function isWalletRecord(value: unknown): value is WalletRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as WalletRecord;
  return text(r.id, 80) && r.id.length > 0 && text(r.code, 40) && KINDS.includes(r.kind) && STATUSES.includes(r.status) && r.mode === 'test'
    && text(r.experienceId, 150) && text(r.title, 300) && text(r.province, 120) && text(r.date, 10) && (r.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    && Number.isInteger(r.people) && r.people >= 1 && r.people <= 50 && (r.currency === 'USD' || r.currency === 'EUR')
    && centsOrNull(r.unitCents) && centsOrNull(r.totalCents) && text(r.priceNote, 600) && isBuyer(r.buyer) && text(r.trip, 160)
    && (r.batchId === null || text(r.batchId, 80)) && Number.isInteger(r.attempts) && r.attempts >= 0 && r.attempts <= 50
    && (r.card === undefined || r.card === null || isCardSummary(r.card))
    && (r.endDate === undefined || isIsoDate(r.endDate) && r.date !== '' && r.endDate >= r.date)
    && (r.children === undefined || Number.isInteger(r.children) && r.children >= 0 && r.children < r.people)
    && (r.method === undefined || r.method === 'card' || r.method === 'transfer')
    && (r.transfer === undefined || r.transfer === null || isTransfer(r.transfer))
    && (!r.status.startsWith('test_transfer') || r.method === 'transfer' && isTransfer(r.transfer))
    && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt)) && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt))
    && (r.kind === 'request' ? (r.status === 'requested' || r.status === 'cancelled') : r.status.startsWith('test_'));
}
export function parseWallet(raw: unknown): WalletState {
  if (!raw || typeof raw !== 'object' || (raw as WalletState).version !== WALLET_VERSION || !Array.isArray((raw as WalletState).records)) return emptyWallet();
  const seen = new Set<string>();
  const records = (raw as WalletState).records.filter(isWalletRecord).filter(record => !seen.has(record.id) && Boolean(seen.add(record.id)));
  return { version: 1, records: records.slice(0, WALLET_LIMIT) };
}

/** Código legible del comprobante, p. ej. `PRB-7K2Q9M`. Prefijo PRB = prueba. */
export function testCode(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let index = 0; index < 6; index++) value += alphabet[Math.floor(random() * alphabet.length) % alphabet.length];
  return `PRB-${value}`;
}

/** Estado de una parada de Mi viaje según lo que hay en la billetera. */
export type StopStatus = 'none' | 'test_purchase' | 'transfer_review' | 'paid' | 'request';
export const STOP_STATUS_TEXT: Readonly<Record<StopStatus, string>> = { none: 'Sin comprar', test_purchase: 'Compra de prueba', transfer_review: 'Transferencia en revisión', paid: 'Pagada', request: 'Solicitud' };
export function stopStatus(experienceId: string, records: readonly WalletRecord[], paidExperienceIds: readonly string[] = []): StopStatus {
  if (paidExperienceIds.includes(experienceId)) return 'paid';
  const own = records.filter(record => record.experienceId === experienceId);
  if (own.some(record => record.status === 'test_approved')) return 'test_purchase';
  if (own.some(record => record.status === 'test_transfer_review')) return 'transfer_review';
  if (own.some(record => record.status === 'requested')) return 'request';
  return 'none';
}

export interface TripTotals { boughtCents: number; pendingCents: number; incomparable: number; boughtCount: number; pendingCount: number }
/**
 * Total de Mi viaje separado en: ya comprado (pruebas aprobadas o pagos verificados),
 * por comprar (paradas en USD aún sin comprar, con el mínimo de su rango) y sin precio comparable.
 */
export function tripTotals(stops: readonly Experience[], people: number, records: readonly WalletRecord[], paidExperienceIds: readonly string[] = []): TripTotals {
  const totals: TripTotals = { boughtCents: 0, pendingCents: 0, incomparable: 0, boughtCount: 0, pendingCount: 0 };
  for (const stop of stops) {
    const status = stopStatus(stop.id, records, paidExperienceIds);
    if (status === 'test_purchase' || status === 'transfer_review' || status === 'paid') {
      const record = records.find(item => item.experienceId === stop.id && isBoughtStatus(item.status));
      totals.boughtCount++;
      if (record?.totalCents != null) totals.boughtCents += record.totalCents;
      continue;
    }
    const plan = purchasePlan(stop);
    if (plan.kind === 'quote') { totals.incomparable++; continue; }
    const choice = plan.choices[0];
    totals.pendingCount++;
    totals.pendingCents += lineTotalCents(choice.minCents, choice.fixedPeople ?? people);
  }
  return totals;
}

export interface ReceiptLine { title: string; date: string; endDate?: string; people: number; unitCents: number | null; totalCents: number | null; currency: string; note: string }
/** Texto del comprobante. Una compra de prueba SIEMPRE lleva el rótulo en la primera línea y al final. */
export function testReceiptText(input: { code: string; buyerName: string; emailMasked: string; documentMasked: string | null; createdAt: string; lines: ReceiptLine[]; card?: CardSummary | null; transfer?: { reference: string; verified: boolean } | null }): string {
  const total = input.lines.reduce((sum, line) => sum + (line.totalCents ?? 0), 0);
  return [
    TEST_RECEIPT_LABEL,
    'CHULLA VIDA · Comprobante de compra de prueba',
    `Código: ${input.code}`,
    `Fecha de emisión: ${input.createdAt}`,
    `A nombre de: ${input.buyerName}${input.emailMasked ? ` · ${input.emailMasked}` : ''}${input.documentMasked ? ` · Documento ${input.documentMasked}` : ''}`,
    ...(input.card && isCardSummary(input.card) ? [`Método de pago: ${cardLabel(input.card)} · tarjeta de prueba, sin cobro`] : []),
    ...(input.transfer ? [`Método de pago: Transferencia bancaria de prueba · referencia ${input.transfer.reference} · ${input.transfer.verified ? 'verificación simulada' : 'comprobante pendiente de verificación'}`] : []),
    '',
    ...input.lines.flatMap(line => [`• ${line.title}`, `  ${line.date ? `${line.date}${line.endDate && line.endDate !== line.date ? ` al ${line.endDate}` : ''}` : 'Fecha por confirmar'} · ${line.people} ${line.people === 1 ? 'persona' : 'personas'} · ${line.totalCents === null ? 'Cotización pendiente' : `${formatUsd(line.totalCents)} (${line.unitCents === null ? '' : `${formatUsd(line.unitCents)} por persona`})`}`, ...(line.note ? [`  ${line.note}`] : [])]),
    '',
    `Total de la prueba: ${formatUsd(total)} · NO SE COBRÓ NADA`,
    'Precios referenciales o propuestos por la fuente; no son una tarifa vigente confirmada por un anfitrión.',
    'Este documento no es una factura, no confirma cupos y no da derecho a ningún servicio.',
    TEST_RECEIPT_LABEL,
  ].join('\n');
}
