/**
 * Transparencia económica — «¿Cómo se distribuye tu dinero?». Aritmética en centavos enteros.
 *
 * Hoy NO existe ningún convenio de reparto firmado con una comunidad: `agreementFor` devuelve `null`
 * para todo el catálogo y `computeDistribution` responde `pending_agreement`, sin porcentajes.
 *
 * Redondeo (documentado): cada línea recibe ⌊monto × puntos básicos ÷ 10 000⌋ centavos. Los centavos
 * que sobran por el redondeo hacia abajo (siempre menos que el número de líneas) se suman a la línea
 * «Comunidad»: el redondeo nunca favorece a la plataforma ni al procesador. La suma de las líneas es
 * exactamente el monto cobrado.
 */

export const PENDING_AGREEMENT_TEXT = 'Distribución pendiente de validar con la comunidad; no disponible para compra';
export const EXAMPLE_AGREEMENT_NAME = 'Ejemplo ilustrativo — no es un convenio real';

export const LINE_KEYS = ['community', 'local_providers', 'operating_costs', 'platform_fee', 'processor_fee', 'taxes'] as const;
export type LineKey = typeof LINE_KEYS[number];
export const LINE_LABELS: Readonly<Record<LineKey, string>> = {
  community: 'Comunidad',
  local_providers: 'Guías y proveedores locales',
  operating_costs: 'Costos operativos',
  platform_fee: 'Comisión de la plataforma',
  processor_fee: 'Procesador de pago',
  taxes: 'Impuestos y tasas',
};
/** Línea que recibe el residuo del redondeo. */
export const ROUNDING_RESIDUE_LINE: LineKey = 'community';

/** Participación de cada línea en puntos básicos (10 000 = 100 %) sobre el monto bruto cobrado. */
export type Shares = Record<LineKey, number>;
export interface Agreement {
  id: string;
  name: string;
  /** Estados de `revenue_share_agreements`; solo `active` puede mostrarse. */
  status: 'draft' | 'pending_community_validation' | 'active' | 'suspended' | 'ended';
  /** Fecha de firma del representante autorizado de la comunidad. */
  signedAt: string | null;
  approvedByCommunity: boolean;
  /** `true` solo para el explorador ilustrativo; jamás describe a una comunidad concreta. */
  isExample: boolean;
  sharesBps: Shares;
}

export interface DistributionLine { key: LineKey; label: string; bps: number; cents: number }
export type Distribution =
  | { status: 'pending_agreement'; message: typeof PENDING_AGREEMENT_TEXT }
  | { status: 'invalid_amount' }
  | { status: 'invalid_agreement' }
  | { status: 'ok'; totalCents: number; lines: DistributionLine[]; residueCents: number; residueLine: LineKey; illustrative: boolean; agreementName: string };

export function validShares(shares: unknown): shares is Shares {
  if (!shares || typeof shares !== 'object') return false;
  const row = shares as Record<string, unknown>;
  return LINE_KEYS.every(key => Number.isSafeInteger(row[key]) && (row[key] as number) >= 0)
    && LINE_KEYS.reduce((sum, key) => sum + (row[key] as number), 0) === 10000;
}
/** Un convenio real solo cuenta si está activo, firmado y aprobado por la comunidad. */
export function isApprovedAgreement(agreement: Agreement | null | undefined): agreement is Agreement {
  return Boolean(agreement && !agreement.isExample && agreement.status === 'active' && agreement.approvedByCommunity === true
    && typeof agreement.signedAt === 'string' && !Number.isNaN(Date.parse(agreement.signedAt)));
}

/**
 * Reparte `amountCents` según el convenio. Sin convenio aprobado y firmado devuelve `pending_agreement`.
 * El acuerdo de ejemplo solo se calcula con `{ allowExample: true }` (explorador ilustrativo).
 */
export function computeDistribution(amountCents: number, agreement: Agreement | null | undefined, options: { allowExample?: boolean } = {}): Distribution {
  const example = Boolean(agreement?.isExample && options.allowExample === true && agreement.name === EXAMPLE_AGREEMENT_NAME);
  if (!example && !isApprovedAgreement(agreement)) return { status: 'pending_agreement', message: PENDING_AGREEMENT_TEXT };
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return { status: 'invalid_amount' };
  const shares = agreement!.sharesBps;
  if (!validShares(shares)) return { status: 'invalid_agreement' };
  // BigInt evita perder precisión con montos grandes; el resultado siempre cabe en un entero seguro.
  const lines: DistributionLine[] = LINE_KEYS.map(key => ({ key, label: LINE_LABELS[key], bps: shares[key], cents: Number(BigInt(amountCents) * BigInt(shares[key]) / 10000n) }));
  const residueCents = amountCents - lines.reduce((sum, line) => sum + line.cents, 0);
  lines.find(line => line.key === ROUNDING_RESIDUE_LINE)!.cents += residueCents;
  return { status: 'ok', totalCents: amountCents, lines, residueCents, residueLine: ROUNDING_RESIDUE_LINE, illustrative: example, agreementName: agreement!.name };
}

/** Hoy ninguna ficha tiene convenio aprobado. Cuando exista, se leerá de la vista pública consentida. */
export function agreementFor(_experienceId: string): Agreement | null { return null; }

/** Convierte pesos libres (lo que marca cada control deslizante) en puntos básicos que suman 10 000. */
export function sharesFromWeights(weights: Record<LineKey, number>): Shares | null {
  const clean = LINE_KEYS.map(key => (Number.isFinite(weights[key]) && weights[key] > 0 ? Math.round(weights[key]) : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  const exact = clean.map(value => (value * 10000) / total);
  const base = exact.map(Math.floor);
  let missing = 10000 - base.reduce((sum, value) => sum + value, 0);
  // Mayor resto primero; ante empate, el orden fijo de LINE_KEYS.
  const order = exact.map((value, index) => ({ index, rest: value - base[index] })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const item of order) { if (missing <= 0) break; base[item.index] += 1; missing -= 1; }
  return Object.fromEntries(LINE_KEYS.map((key, index) => [key, base[index]])) as Shares;
}
/** Acuerdo de ejemplo para el modo demostración: las cifras las elige quien mira. */
export function exampleAgreement(weights: Record<LineKey, number>): Agreement | null {
  const sharesBps = sharesFromWeights(weights);
  return sharesBps ? { id: 'example-illustrative', name: EXAMPLE_AGREEMENT_NAME, status: 'draft', signedAt: null, approvedByCommunity: false, isExample: true, sharesBps } : null;
}
/** Punto de partida neutro de los controles: partes iguales. No es una propuesta de reparto. */
export const NEUTRAL_WEIGHTS: Readonly<Record<LineKey, number>> = { community: 10, local_providers: 10, operating_costs: 10, platform_fee: 10, processor_fee: 10, taxes: 10 };

export const formatUsd = (cents: number): string => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatPercent = (bps: number): string => `${(bps / 100).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`;
/** Dólares → centavos enteros; `null` si no es un monto positivo razonable. */
export function usdToCents(amountUsd: number): number | null {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 1_000_000) return null;
  const cents = Math.round((amountUsd + Number.EPSILON) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/**
 * Respuesta para MIJIN a «¿Cuánto llega a una comunidad si pago $49?».
 * Sin convenio aprobado no hay cifra: se dice la verdad con el texto oficial, sin porcentajes.
 */
export function answerCommunityShare(amountUsd: number, agreement: Agreement | null): string {
  const cents = usdToCents(amountUsd);
  if (cents === null) return 'Dime un monto en dólares mayor que cero y te cuento qué se sabe de su distribución.';
  const result = computeDistribution(cents, agreement);
  if (result.status === 'pending_agreement' || result.status === 'invalid_amount' || result.status === 'invalid_agreement')
    return `Todavía no puedo decirte cuánto de ${formatUsd(cents)} llegaría a una comunidad. ${PENDING_AGREEMENT_TEXT}. Hoy Chulla Vida no tiene ningún convenio de reparto firmado, así que no voy a inventarte una cifra. Cuando una comunidad apruebe y firme su acuerdo, aquí verás el desglose al centavo.`;
  const community = result.lines.find(line => line.key === 'community')!;
  const rest = result.lines.filter(line => line.key !== 'community' && line.cents > 0).map(line => `${line.label.toLowerCase()}: ${formatUsd(line.cents)}`).join('; ');
  return `De ${formatUsd(cents)}, ${formatUsd(community.cents)} van a la comunidad según el convenio «${result.agreementName}», firmado el ${agreement!.signedAt!.slice(0, 10)}.${rest ? ` El resto: ${rest}.` : ''} Las líneas suman exactamente ${formatUsd(result.totalCents)}.`;
}
