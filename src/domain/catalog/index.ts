import legacyCatalog from './data.json';
import { COSTA_EXPERIENCES } from './data/costa';
import { GALAPAGOS_EXPERIENCES } from './data/galapagos';
import { GENERAL_EXPERIENCES } from './data/general';
import { LEGACY_ID_ALIASES } from './data/source-texts';
import { CATALOG_SOURCES } from './sources';
import type {
  CatalogSource,
  CatalogSourceId,
  Currency,
  Difficulty,
  Experience,
  ExperienceKind,
  ExperiencePrice,
  RegionId,
} from './types';

export * from './types';
export {
  CATALOG_SOURCES,
  GALAPAGOS_COST_CAVEATS,
  GALAPAGOS_FIXED_COSTS,
  GALAPAGOS_STATUS_SNAPSHOT,
  SOURCE_CHECKED_AT,
} from './sources';
export { COSTA_EXPERIENCES, GALAPAGOS_EXPERIENCES, GENERAL_EXPERIENCES, LEGACY_ID_ALIASES };

/** Las 33 fichas editoriales: 14 del catálogo general, 7 de Costa y 12 de Galápagos. Ninguna es reservable. */
export const EXPERIENCES: readonly Experience[] = Object.freeze([
  ...GENERAL_EXPERIENCES,
  ...COSTA_EXPERIENCES,
  ...GALAPAGOS_EXPERIENCES,
]);

const AMAZONIA_SOURCE_ID: CatalogSourceId = 'catalogo-amazonia-usuario';

/**
 * 18 inspiraciones amazónicas aportadas por el usuario (ingestión automática previa,
 * `scripts/build-catalog-seed.mjs`). No forman parte de las 33 fichas.
 */
export const AMAZONIA_INSPIRATIONS: readonly Experience[] = Object.freeze(
  (legacyCatalog.experiences as Experience[]).filter(record => record.contentSourceId === AMAZONIA_SOURCE_ID),
);

/** Todo lo que el catálogo puede mostrar: las 33 fichas más las inspiraciones amazónicas. */
export const ALL_EXPERIENCES: readonly Experience[] = Object.freeze([...EXPERIENCES, ...AMAZONIA_INSPIRATIONS]);

const LEGACY_SLUG_ALIASES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(LEGACY_ID_ALIASES).map(([oldId, newId]) => [oldId.replace(/^[a-z]+-\d{2}-/, ''), newId]),
);

/** Acepta también los IDs de la primera importación para no romper favoritos, sellos o descargas ya guardados. */
export function getExperienceById(id: string): Experience | undefined {
  const resolved = LEGACY_ID_ALIASES[id] ?? id;
  return ALL_EXPERIENCES.find(experience => experience.id === resolved);
}

export function getExperienceBySlug(slug: string): Experience | undefined {
  const direct = ALL_EXPERIENCES.find(experience => experience.slug === slug);
  if (direct) return direct;
  const aliased = LEGACY_SLUG_ALIASES[slug];
  return aliased ? ALL_EXPERIENCES.find(experience => experience.id === aliased) : undefined;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export interface ExperienceSearchFilters {
  /** Texto libre; ignora tildes y mayúsculas. Todas las palabras deben aparecer. */
  query?: string;
  region?: RegionId;
  province?: string;
  sourceId?: CatalogSourceId;
  kind?: ExperienceKind;
  difficulty?: Difficulty;
  /** Tope en USD contra `price.min`. Lo publicado en otra moneda no se convierte: va a `notComparable`. */
  maxPricePerPerson?: number;
  /** Tope de duración en horas; una ficha de «n días» cuenta como n × 24 h. Sin duración conocida, queda fuera. */
  maxDurationHours?: number;
  /** La ficha debe tener todas estas etiquetas. */
  tags?: string[];
  /** Solo fichas con admisión de mascotas confirmada por un responsable (`confirmed_allowed`). */
  petFriendlyOnly?: boolean;
}

export interface ExperienceSearchResult {
  matches: Experience[];
  /**
   * Fichas que cumplen los demás filtros pero cuyo precio no puede compararse con el tope en USD
   * (publicado en EUR o sin monto). Solo se llena cuando se pide `maxPricePerPerson`.
   */
  notComparable: Experience[];
}

function durationHours(experience: Experience): number | null {
  const { maxHours, minHours, days } = experience.duration;
  return maxHours ?? minHours ?? (days !== null ? days * 24 : null);
}

function searchText(experience: Experience): string {
  return normalize(
    [
      experience.title,
      experience.experienceName,
      experience.summary,
      experience.description,
      experience.context,
      experience.province,
      experience.locality,
      experience.subregion,
      ...experience.tags,
      ...experience.attractions,
      ...experience.activities,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Busca en las 33 fichas y las inspiraciones amazónicas (o en `records`, si se pasa). */
export function searchExperiences(
  filters: ExperienceSearchFilters = {},
  records: readonly Experience[] = ALL_EXPERIENCES,
): ExperienceSearchResult {
  const words = normalize(filters.query ?? '').split(/\s+/).filter(Boolean);
  const province = filters.province ? normalize(filters.province) : null;
  const tags = (filters.tags ?? []).map(normalize).filter(Boolean);
  const priceCap = filters.maxPricePerPerson;
  const durationCap = filters.maxDurationHours;
  const matches: Experience[] = [];
  const notComparable: Experience[] = [];

  for (const record of records) {
    if (filters.region && record.localizedRegion !== filters.region) continue;
    if (province && normalize(record.province) !== province) continue;
    if (filters.sourceId && record.contentSourceId !== filters.sourceId) continue;
    if (filters.kind && record.kind !== filters.kind) continue;
    if (filters.difficulty && record.difficulty !== filters.difficulty) continue;
    if (filters.petFriendlyOnly && record.petPolicy.status !== 'confirmed_allowed') continue;
    if (durationCap !== undefined) {
      const duration = durationHours(record);
      if (!Number.isFinite(durationCap) || durationCap <= 0 || duration === null || duration > durationCap) continue;
    }
    if (tags.length) {
      const own = record.tags.map(normalize);
      if (!tags.every(tag => own.includes(tag))) continue;
    }
    if (words.length) {
      const haystack = searchText(record);
      if (!words.every(word => haystack.includes(word))) continue;
    }
    if (priceCap !== undefined) {
      if (!Number.isFinite(priceCap) || priceCap < 0) continue;
      if (record.price.currency !== 'USD' || record.price.min === null) {
        notComparable.push(record);
        continue;
      }
      if (record.price.min > priceCap) continue;
    }
    matches.push(record);
  }
  return { matches, notComparable };
}

/** Formato numérico es-EC fijo (miles con punto, decimales con coma), sin depender del ICU del entorno. */
function formatAmount(amount: number): string {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals ? `${grouped},${decimals}` : grouped;
}

/** Muestra el precio en su moneda ORIGINAL y con su rango; nunca convierte. */
export function formatPrice(price: ExperiencePrice): string {
  if (price.min === null) return 'Precio por confirmar';
  const min = formatAmount(price.min);
  if (price.max === null) return `Desde ${price.currency} ${min} por persona`;
  if (price.max !== price.min) return `${price.currency} ${min}–${formatAmount(price.max)} por persona`;
  return `${price.currency} ${min} por persona`;
}

const PRICE_TYPE_LABELS: Record<ExperiencePrice['type'], string> = {
  referential: 'referencial',
  proposed: 'propuesta',
  verified_offer: 'oferta verificada',
};

/** Aviso que debe acompañar siempre al precio de una ficha. */
export function priceDisclaimer(experience: Experience): string {
  const { price } = experience;
  const parts: string[] = [];
  if (price.type === 'proposed') {
    parts.push(
      'Tarifa propuesta, pendiente de convenio con el operador. No es una cotización aceptada, un precio oficial ni una reserva activa; los servicios no descritos se consideran excluidos.',
    );
  } else if (price.type === 'referential') {
    parts.push(
      'Precio referencial tomado del catálogo de origen. No es una tarifa oficial ni una oferta verificada: confírmalo con el operador antes de planificar.',
    );
  } else {
    parts.push('Oferta publicada por un operador verificado. Revisa qué incluye y sus condiciones antes de reservar.');
  }
  if (price.currency !== 'USD') {
    parts.push('La fuente lo publica en euros; no lo convertimos a dólares porque el tipo de cambio y la tarifa final dependen del operador.');
  }
  if (price.min !== null && price.max === null) parts.push('La fuente solo indica un precio «desde»; no hay tope conocido.');
  if (price.separateCosts?.length) {
    parts.push('Tasas de ingreso, tarjeta de tránsito, vuelos y traslados entre islas se pagan aparte y dependen de nacionalidad, residencia y edad.');
  }
  if (experience.kind === 'trip_plan') parts.push('Es un plan de presupuesto orientativo, no un paquete en venta.');
  if (!experience.bookingEnabled) parts.push('Esta ficha no se puede reservar ni pagar en CHULLA VIDA.');
  return parts.join(' ');
}

/* ───────── Compatibilidad con la interfaz existente (API anterior a las constantes en mayúsculas) ───────── */

/** @deprecated Usa `CATALOG_SOURCES`. Incluye además la fuente de las inspiraciones amazónicas. */
export const catalogSources: CatalogSource[] = [
  ...CATALOG_SOURCES,
  ...(legacyCatalog.catalogSources as CatalogSource[]).filter(source => source.id === AMAZONIA_SOURCE_ID),
];

/** @deprecated Usa `ALL_EXPERIENCES` (51) o `EXPERIENCES` (33). */
export const experiences: Experience[] = [...ALL_EXPERIENCES];

export function catalogSourceDownload(source: CatalogSource | CatalogSourceId): string {
  const value = typeof source === 'string' ? catalogSources.find(item => item.id === source) : source;
  return value ? `/catalogos/${value.originalDocument.split('/').at(-1)}` : '';
}

export interface CatalogFilters {
  query?: string;
  region?: RegionId | 'all';
  source?: CatalogSourceId;
  difficulty?: Difficulty;
  currency?: Currency;
  maxPrice?: number;
  maxDays?: number;
}

/** @deprecated Usa `searchExperiences`. El presupuesto exige una moneda explícita: EUR nunca se mezcla con USD. */
export function filterExperiences(filters: CatalogFilters = {}, records: readonly Experience[] = experiences): Experience[] {
  const words = normalize(filters.query || '').split(/\s+/).filter(Boolean);
  return records.filter(record => {
    if (filters.region && filters.region !== 'all' && record.localizedRegion !== filters.region) return false;
    if (filters.source && record.contentSourceId !== filters.source) return false;
    if (filters.difficulty && record.difficulty !== filters.difficulty) return false;
    if (filters.currency && record.price.currency !== filters.currency) return false;
    if (filters.maxPrice !== undefined) {
      if (!Number.isFinite(filters.maxPrice) || filters.maxPrice < 0 || !filters.currency) return false;
      if (record.price.min === null || record.price.min > filters.maxPrice) return false;
    }
    if (filters.maxDays !== undefined) {
      if (!Number.isFinite(filters.maxDays) || filters.maxDays <= 0) return false;
      const dayCount = record.duration.days ?? (record.duration.maxHours !== null && record.duration.maxHours <= 24 ? 1 : null);
      if (dayCount === null || dayCount > filters.maxDays) return false;
    }
    const haystack = searchText(record);
    return words.every(word => haystack.includes(word));
  });
}

/** @deprecated Usa `formatPrice(experience.price)` junto con `priceDisclaimer(experience)`. */
export function formatExperiencePrice(experience: Experience, _locale = 'es-EC'): string {
  if (experience.price.min === null) return formatPrice(experience.price);
  return `${formatPrice(experience.price)} · ${PRICE_TYPE_LABELS[experience.price.type]}`;
}

/** Esta importación editorial nunca habilita una transacción. */
export function canBookExperience(_experience: Experience): false {
  return false;
}
