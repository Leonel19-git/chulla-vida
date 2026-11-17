import type { RegionId } from '../catalog';

/**
 * Sellos del Pasaporte Guambra por fuente. Regla central: SOLO `verified_visit` cuenta como visita verificada,
 * y solo llega desde Supabase (passport_stamps.stamp_type = 'verified_visit', emitido por el servidor o el anfitrión).
 * Todo lo demás (demo, compras de prueba, planes, exploraciones) se muestra con su propio rótulo.
 */
export type StampSource = 'verified_visit' | 'demo_validated' | 'purchased' | 'planned' | 'explored';
export const STAMP_SOURCES: readonly StampSource[] = ['verified_visit', 'demo_validated', 'purchased', 'planned', 'explored'];
export const STAMP_REGIONS: readonly RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];

export const STAMP_META: Readonly<Record<StampSource, { label: string; short: string; description: string }>> = {
  verified_visit: { label: 'Visita verificada', short: 'Verificada', description: 'El servidor o el anfitrión confirmaron tu visita. Es el único sello que acredita que estuviste ahí.' },
  demo_validated: { label: 'Visita validada en demostración', short: 'Demo', description: 'Un anfitrión de demostración validó el código de tu comprobante de prueba. Sirve para ensayar, no acredita una visita.' },
  purchased: { label: 'Comprado · por visitar', short: 'Por visitar', description: 'Está en tu billetera. Cuando el anfitrión valide tu llegada, se convierte en sello.' },
  planned: { label: 'Planeado', short: 'Planeado', description: 'Lo guardaste o está en Mi viaje. Ya es parte de tu próxima historia.' },
  explored: { label: 'Explorado virtualmente', short: 'Virtual', description: 'Abriste la ficha y conociste el lugar desde la pantalla.' },
};
/** Prioridad para mostrar UNA estampa por lugar: la fuente más fuerte gana. */
const RANK: Readonly<Record<StampSource, number>> = { verified_visit: 5, demo_validated: 4, purchased: 3, planned: 2, explored: 1 };

export interface StampDestination { id: string; title: string; localizedRegion: RegionId }
/** Fila de passport_stamps leída por RLS (solo las del usuario con sesión). */
export interface ServerStampRow { id: string; experience_id: string | null; region_id: string | null; stamp_type: string; awarded_at: string }
export interface DemoValidation { code: string; experienceId: string; title: string; region: RegionId | null; validatedAt: string; mode: 'demo' }
export interface WalletStampInput { experienceId: string; title: string; code: string; kind: string; status: string; updatedAt: string }

export interface CollectedStamp {
  key: string;
  experienceId: string;
  title: string;
  region: RegionId | null;
  source: StampSource;
  /** Todas las fuentes que tiene el lugar, de la más fuerte a la más débil. */
  sources: StampSource[];
  date: string | null;
  reference: string | null;
}

const isRegion = (value: unknown): value is RegionId => typeof value === 'string' && (STAMP_REGIONS as readonly string[]).includes(value);
export const isVerifiedStamp = (stamp: Pick<CollectedStamp, 'source'>) => stamp.source === 'verified_visit';
/**
 * Compras de prueba que de verdad apartan el lugar: aprobada, o transferencia de prueba enviada y en revisión
 * (mismo criterio que `isBoughtStatus` de la billetera). Sin terminar, rechazadas o canceladas no cuentan.
 */
export const BOUGHT_WALLET_STATUSES: readonly string[] = ['test_approved', 'test_transfer_review'];
export const isBoughtWalletStatus = (status: string) => BOUGHT_WALLET_STATUSES.includes(status);
const DEAD_WALLET_STATUSES: readonly string[] = ['test_rejected', 'test_transfer_rejected', 'cancelled'];

export interface CollectInput {
  destinations: readonly StampDestination[];
  serverStamps?: readonly ServerStampRow[];
  demoValidations?: readonly DemoValidation[];
  wallet?: readonly WalletStampInput[];
  savedIds?: readonly string[];
  tripIds?: readonly string[];
  exploredIds?: readonly string[];
}

/** Une todas las fuentes en una estampa por lugar. Las filas del servidor que no sean `verified_visit` se ignoran. */
export function collectStamps(input: CollectInput): CollectedStamp[] {
  const byId = new Map(input.destinations.map(destination => [destination.id, destination]));
  const found = new Map<string, { title: string; region: RegionId | null; entries: { source: StampSource; date: string | null; reference: string | null }[] }>();
  const add = (experienceId: string, source: StampSource, extra: { title?: string; region?: RegionId | null; date?: string | null; reference?: string | null } = {}) => {
    if (!experienceId) return;
    const destination = byId.get(experienceId);
    const title = destination?.title ?? extra.title ?? '';
    if (!title) return;
    const current = found.get(experienceId) ?? { title, region: destination?.localizedRegion ?? extra.region ?? null, entries: [] };
    if (!current.region && extra.region) current.region = extra.region;
    if (!current.entries.some(entry => entry.source === source)) current.entries.push({ source, date: extra.date ?? null, reference: extra.reference ?? null });
    found.set(experienceId, current);
  };
  for (const row of input.serverStamps ?? []) {
    if (row.stamp_type !== 'verified_visit' || !row.experience_id) continue;
    add(row.experience_id, 'verified_visit', { region: isRegion(row.region_id) ? row.region_id : null, date: row.awarded_at, reference: row.id, title: row.experience_id });
  }
  for (const validation of input.demoValidations ?? []) {
    if (validation.mode !== 'demo') continue;
    add(validation.experienceId, 'demo_validated', { title: validation.title, region: validation.region, date: validation.validatedAt, reference: validation.code });
  }
  for (const record of input.wallet ?? []) {
    if (record.kind !== 'test_purchase' || !isBoughtWalletStatus(record.status)) continue;
    add(record.experienceId, 'purchased', { title: record.title, date: record.updatedAt, reference: record.code });
  }
  for (const id of [...(input.savedIds ?? []), ...(input.tripIds ?? [])]) add(id, 'planned');
  for (const id of input.exploredIds ?? []) add(id, 'explored');
  return [...found.entries()].map(([experienceId, value]) => {
    const entries = [...value.entries].sort((a, b) => RANK[b.source] - RANK[a.source]);
    const best = entries[0];
    return { key: `${experienceId}:${best.source}`, experienceId, title: value.title, region: value.region, source: best.source,
      sources: entries.map(entry => entry.source), date: best.date, reference: best.reference };
  }).sort((a, b) => RANK[b.source] - RANK[a.source] || a.title.localeCompare(b.title, 'es'));
}

export interface RegionStampProgress { region: RegionId; total: number; verified: number; demo: number; purchased: number; planned: number; explored: number; touched: number }
export function regionProgress(stamps: readonly CollectedStamp[], destinations: readonly StampDestination[]): RegionStampProgress[] {
  return STAMP_REGIONS.map(region => {
    const local = stamps.filter(stamp => stamp.region === region);
    const count = (source: StampSource) => local.filter(stamp => stamp.source === source).length;
    return { region, total: destinations.filter(destination => destination.localizedRegion === region).length,
      verified: count('verified_visit'), demo: count('demo_validated'), purchased: count('purchased'), planned: count('planned'), explored: count('explored'), touched: local.length };
  });
}
export const verifiedVisitCount = (stamps: readonly CollectedStamp[]) => stamps.filter(isVerifiedStamp).length;

export type AchievementBasis = 'verified' | 'demo' | 'activity';
export interface Achievement { id: string; title: string; description: string; basis: AchievementBasis; earned: boolean; progress: number; goal: number }
/** Logros: los de base `verified` solo cuentan visitas verificadas; los de `demo` siempre se rotulan como demostración. */
export function passportAchievements(stamps: readonly CollectedStamp[]): Achievement[] {
  const has = (source: StampSource) => stamps.filter(stamp => stamp.sources.includes(source)).length;
  const regionsTouched = new Set(stamps.map(stamp => stamp.region).filter(Boolean)).size;
  const regionsVerified = new Set(stamps.filter(isVerifiedStamp).map(stamp => stamp.region).filter(Boolean)).size;
  const make = (id: string, title: string, description: string, basis: AchievementBasis, progress: number, goal: number): Achievement =>
    ({ id, title, description, basis, progress: Math.min(progress, goal), goal, earned: progress >= goal });
  return [
    make('primera-idea', 'Primera idea', 'Guarda o planea tu primer lugar.', 'activity', has('planned'), 1),
    make('curiosidad', 'Curiosidad viajera', 'Explora 5 fichas desde la pantalla.', 'activity', has('explored'), 5),
    make('cuatro-mundos', 'Cuatro mundos', 'Ten algo de Sierra, Costa, Amazonía y Galápagos en tu pasaporte.', 'activity', regionsTouched, 4),
    make('ruta-en-marcha', 'Ruta en marcha', 'Ten una compra en tu billetera, lista para visitar.', 'activity', has('purchased'), 1),
    make('ensayo-general', 'Ensayo general (demo)', 'Valida un comprobante de prueba con un anfitrión de demostración.', 'demo', has('demo_validated'), 1),
    make('huella-real', 'Huella real', 'Recibe tu primer sello de visita verificada.', 'verified', stamps.filter(isVerifiedStamp).length, 1),
    make('ecuador-completo', 'Ecuador completo', 'Visitas verificadas en las cuatro regiones.', 'verified', regionsVerified, 4),
  ];
}

// ───────────── Validación local de demostración con el código del comprobante de prueba ─────────────
export const DEMO_VALIDATIONS_KEY = 'chullavida:passport-demo-validations:v1';
export const SEEN_STAMPS_KEY = 'chullavida:passport-seen:v1';
export const normalizeReceiptCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '').replace(/^PRB(?=[A-Z0-9]{6}$)/, 'PRB-');
const RECEIPT_CODE = /^PRB-[A-Z0-9]{6}$/;

export function isDemoValidation(value: unknown): value is DemoValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as DemoValidation;
  return v.mode === 'demo' && typeof v.code === 'string' && RECEIPT_CODE.test(v.code) && typeof v.experienceId === 'string' && v.experienceId.length > 0 && v.experienceId.length <= 160
    && typeof v.title === 'string' && v.title.length > 0 && v.title.length <= 300 && (v.region === null || isRegion(v.region))
    && typeof v.validatedAt === 'string' && Number.isFinite(Date.parse(v.validatedAt));
}
export function readDemoValidations(storage?: Pick<Storage, 'getItem'>): DemoValidation[] {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const value: unknown = JSON.parse(target?.getItem(DEMO_VALIDATIONS_KEY) || '[]');
    return Array.isArray(value) ? value.filter(isDemoValidation).slice(0, 200) : [];
  } catch { return []; }
}
export function saveDemoValidations(list: readonly DemoValidation[], storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!target) return false;
    target.setItem(DEMO_VALIDATIONS_KEY, JSON.stringify(list.filter(isDemoValidation).slice(0, 200))); return true;
  } catch { return false; }
}

/** Motivo del resultado, para que la interfaz lo cuente con sus propias palabras (y traducido). */
export type DemoValidationReason = 'ok' | 'format' | 'not_found' | 'rejected' | 'pending' | 'duplicate';
export type DemoValidationResult =
  | { ok: true; reason: 'ok'; code: string; added: DemoValidation[]; list: DemoValidation[]; message: string }
  | { ok: false; reason: Exclude<DemoValidationReason, 'ok'>; code: string; list: DemoValidation[]; message: string };

/**
 * Simula al anfitrión que escanea el QR del comprobante de prueba. Solo acepta códigos que existan en la billetera
 * de este navegador, de compras de prueba aprobadas (o transferencia de prueba en revisión). El resultado siempre lleva `mode: 'demo'`.
 */
export function validateDemoReceipt(rawCode: string, wallet: readonly WalletStampInput[], current: readonly DemoValidation[], regionOf: (experienceId: string) => RegionId | null, now = new Date()): DemoValidationResult {
  const code = normalizeReceiptCode(rawCode);
  const list = [...current];
  if (!RECEIPT_CODE.test(code)) return { ok: false, reason: 'format', code, list, message: 'El código del comprobante de prueba tiene este formato: PRB-ABC123.' };
  const matches = wallet.filter(record => record.code.toUpperCase() === code && record.kind === 'test_purchase');
  if (!matches.length) return { ok: false, reason: 'not_found', code, list, message: `No encontramos ${code} en la billetera de este dispositivo. Revisa el código impreso bajo el QR.` };
  const usable = matches.filter(record => isBoughtWalletStatus(record.status));
  if (!usable.length) {
    return matches.every(record => DEAD_WALLET_STATUSES.includes(record.status))
      ? { ok: false, reason: 'rejected', code, list, message: 'Ese comprobante de prueba fue rechazado o cancelado, así que no se puede validar.' }
      : { ok: false, reason: 'pending', code, list, message: 'Esa compra de prueba aún no está aprobada, así que no se puede validar.' };
  }
  const fresh = usable.filter(record => !list.some(item => item.code === code && item.experienceId === record.experienceId));
  if (!fresh.length) return { ok: false, reason: 'duplicate', code, list, message: 'Ese comprobante ya se validó en la demostración. Tu sello demo ya está en el pasaporte.' };
  const added = fresh.map(record => ({ code, experienceId: record.experienceId, title: record.title, region: regionOf(record.experienceId), validatedAt: now.toISOString(), mode: 'demo' as const }));
  const next = [...added, ...list].slice(0, 200);
  return { ok: true, reason: 'ok', code, added, list: next, message: `¡Sello demo! ${added.map(item => item.title).join(', ')}: visita validada en demostración. No acredita una visita real.` };
}

export function readSeenStamps(storage?: Pick<Storage, 'getItem'>): string[] {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const value: unknown = JSON.parse(target?.getItem(SEEN_STAMPS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length <= 200).slice(0, 2000) : [];
  } catch { return []; }
}
export function saveSeenStamps(keys: readonly string[], storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? localStorage).setItem(SEEN_STAMPS_KEY, JSON.stringify([...new Set(keys)].slice(-2000))); } catch { /* sin almacenamiento: la animación se repetirá */ }
}
/** Sellos fuertes (no meras exploraciones) que la persona todavía no vio: reciben el «golpe de sello». */
export function freshStampKeys(stamps: readonly CollectedStamp[], seen: readonly string[]): string[] {
  const known = new Set(seen);
  return stamps.filter(stamp => stamp.source !== 'explored' && !known.has(stamp.key)).map(stamp => stamp.key);
}
