/**
 * Consentimiento de cookies y tecnologías equivalentes por niveles (Privado / Equilibrado / Personalizado).
 *
 * Reglas que no se negocian:
 * - Las categorías necesarias siempre están activas y no dependen del consentimiento.
 * - Ninguna categoría opcional nace activa: `makeConsent({})` equivale a Privado.
 * - Analítica y marketing NO están conectadas hoy: aunque alguien las pida, se guardan en `false`.
 *   Cuando exista un proveedor real, cambia `CONNECTED_CATEGORIES` y sube `CONSENT_POLICY_VERSION`
 *   para que todas las personas vuelvan a elegir.
 */
export const CONSENT_VERSION = 2;
export const CONSENT_POLICY_VERSION = '1.0-borrador-2026-11-13';
export const CONSENT_KEY = 'chullavida:consent:v2';
/** Clave de la versión 3.0 (solo medios externos). Se migra al leerla y luego se elimina. */
export const LEGACY_CONSENT_KEY = 'chullavida:consent:v1';

export type ConsentLevel = 'private' | 'balanced' | 'custom';
export type ConsentMethod = 'banner' | 'editor' | 'feature' | 'migration' | 'revoke';
export type OptionalCategory = 'media' | 'personalization' | 'analytics' | 'marketing';
export type ConsentCategories = Record<OptionalCategory, boolean>;

export interface ConsentPreferences extends ConsentCategories {
  version: 2;
  essential: true;
  level: ConsentLevel;
  policyVersion: string;
  method: ConsentMethod;
  updatedAt: string;
}

/** Categorías que hoy tienen un uso real en CHULLA VIDA. Las desconectadas nunca se activan. */
export const CONNECTED_CATEGORIES: Readonly<ConsentCategories> = Object.freeze({ media: true, personalization: true, analytics: false, marketing: false });
const OPTIONAL: OptionalCategory[] = ['media', 'personalization', 'analytics', 'marketing'];

export const LEVEL_PRESETS: Readonly<Record<Exclude<ConsentLevel, 'custom'>, ConsentCategories>> = Object.freeze({
  private: { media: false, personalization: false, analytics: false, marketing: false },
  balanced: { media: true, personalization: false, analytics: false, marketing: false },
});

export interface CategoryInfo { id: 'essential' | OptionalCategory; title: string; summary: string; stores: string; shares: string; connected: boolean }
export const CONSENT_CATEGORIES: readonly CategoryInfo[] = [
  { id: 'essential', title: 'Necesarias', connected: true,
    summary: 'Hacen que el sitio funcione y sea seguro. Siempre están activas.',
    stores: 'Tu elección de privacidad, idioma, viajes guardados, descargas sin señal y, si inicias sesión, tu sesión segura. Todo vive en este dispositivo.',
    shares: 'Vercel (alojamiento) recibe los datos técnicos mínimos de cada visita para entregarte la página. Si usas tu cuenta, Supabase gestiona el acceso.' },
  { id: 'media', title: 'Contenido externo', connected: true,
    summary: 'Reproductores de Spotify y mapas de OpenStreetMap, solo cuando tú los abres.',
    stores: 'Nada adicional en CHULLA VIDA. El proveedor externo puede guardar sus propias cookies cuando se carga su contenido.',
    shares: 'Al abrir un reproductor o un mapa, Spotify u OpenStreetMap reciben tu dirección IP y datos de navegador.' },
  { id: 'personalization', title: 'Personalización', connected: true,
    summary: 'Usar tus favoritos e intereses guardados para ordenar sugerencias.',
    stores: 'Tus intereses y favoritos, solo en este dispositivo.',
    shares: 'Nada. No sale de tu dispositivo.' },
  { id: 'analytics', title: 'Analítica', connected: false,
    summary: 'Medir visitas para mejorar el sitio. Hoy no existe ninguna herramienta conectada.',
    stores: 'Nada: no hay analítica instalada.', shares: 'Nada.' },
  { id: 'marketing', title: 'Marketing', connected: false,
    summary: 'Publicidad o seguimiento entre sitios. Hoy no existe ninguna herramienta conectada.',
    stores: 'Nada: no hay publicidad instalada.', shares: 'Nada.' },
];

export interface LevelInfo { id: ConsentLevel; title: string; tagline: string; stores: string; shares: string }
export const CONSENT_LEVELS: readonly LevelInfo[] = [
  { id: 'private', title: 'Privado', tagline: 'Máxima privacidad. Solo lo necesario para que el sitio funcione y sea seguro.',
    stores: 'Tus preferencias y viajes, solo en este dispositivo.',
    shares: 'Nada con terceros, salvo lo técnico del alojamiento. Spotify y mapas quedan bloqueados.' },
  { id: 'balanced', title: 'Equilibrado', tagline: 'Lo necesario y el contenido externo que tú decidas abrir.',
    stores: 'Lo mismo que Privado.',
    shares: 'Spotify y OpenStreetMap, solo cuando abres un reproductor o un mapa. Sin analítica ni publicidad.' },
  { id: 'custom', title: 'Personalizado', tagline: 'Tú eliges categoría por categoría. Nada viene marcado.',
    stores: 'Lo que actives en el editor.',
    shares: 'Solo lo que actives en el editor.' },
];

function sanitize(optional: Partial<Record<OptionalCategory, unknown>>): ConsentCategories {
  return Object.fromEntries(OPTIONAL.map(key => [key, CONNECTED_CATEGORIES[key] && optional[key] === true])) as ConsentCategories;
}

/** Nivel que corresponde a un conjunto de categorías. Personalizado = cualquier combinación distinta de los preajustes. */
export function levelFor(categories: ConsentCategories): ConsentLevel {
  const same = (preset: ConsentCategories) => OPTIONAL.every(key => preset[key] === categories[key]);
  if (same(LEVEL_PRESETS.private)) return 'private';
  if (same(LEVEL_PRESETS.balanced)) return 'balanced';
  return 'custom';
}

/** Categorías que aplica un nivel. Para Personalizado se parte de cero: nada premarcado. */
export function levelCategories(level: ConsentLevel, custom: Partial<ConsentCategories> = {}): ConsentCategories {
  if (level === 'custom') return sanitize(custom);
  return { ...LEVEL_PRESETS[level] };
}

export function makeConsent(optional: Partial<Record<OptionalCategory, unknown>>, now = new Date(), method: ConsentMethod = 'editor'): ConsentPreferences {
  const categories = sanitize(optional);
  return { version: 2, essential: true, ...categories, level: levelFor(categories), policyVersion: CONSENT_POLICY_VERSION, method, updatedAt: now.toISOString() };
}

const METHODS: ConsentMethod[] = ['banner', 'editor', 'feature', 'migration', 'revoke'];
export function isConsent(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ConsentPreferences>;
  return item.version === CONSENT_VERSION && item.essential === true
    && OPTIONAL.every(key => typeof item[key] === 'boolean')
    && (['private', 'balanced', 'custom'] as unknown[]).includes(item.level)
    && typeof item.policyVersion === 'string' && (METHODS as unknown[]).includes(item.method)
    && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt));
}

/** Preferencias de CHULLA VIDA 3.0 (versión 1): solo tenían `media`, `analytics` y `marketing`. */
export function isLegacyConsent(value: unknown): value is { version: 1; essential: true; media: boolean; updatedAt: string } {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return item.version === 1 && item.essential === true && typeof item.media === 'boolean'
    && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt));
}

/**
 * Lee lo guardado. Las preferencias de otra versión de la política se descartan (la persona vuelve a elegir);
 * las de 3.0 se migran conservando solo `media` y su fecha original.
 */
export function restoreConsent(stored: unknown, legacy: unknown): ConsentPreferences | null {
  if (isConsent(stored)) return stored.policyVersion === CONSENT_POLICY_VERSION ? { ...stored, ...sanitize(stored), level: levelFor(sanitize(stored)) } : null;
  if (isLegacyConsent(legacy)) return makeConsent({ media: legacy.media }, new Date(legacy.updatedAt), 'migration');
  return null;
}

/** ¿Puede cargarse ahora contenido de terceros (Spotify, mapas)? */
export function allowsExternalMedia(preferences: ConsentPreferences | null | undefined) { return preferences?.media === true; }
