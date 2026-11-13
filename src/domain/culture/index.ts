import type { CulturalEvent, EventEdition, RegionId } from '../catalog/types.js';
import { CULTURAL_EVENT_SEED, CULTURE_CHECKED_AT, CULTURE_SOURCE, LOJA_FESTIVAL_AGENDA_URL } from './data.js';

export type { CulturalEvent, EventConfirmation, EventEdition } from '../catalog/types.js';
export { CULTURE_CHECKED_AT, CULTURE_SOURCE, LOJA_FESTIVAL_AGENDA_URL };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** Contenido semilla de Cultura Viva (sección 5): diez fiestas y tradiciones, con fechas orientativas salvo indicación. */
export const CULTURAL_EVENTS: readonly CulturalEvent[] = deepFreeze([...CULTURAL_EVENT_SEED]);

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** Nombre del mes (1-12) en español; cadena vacía si está fuera de rango. */
export const monthName = (month: number): string => MONTH_NAMES[month - 1] ?? '';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function getEventById(id: string): CulturalEvent | undefined {
  return CULTURAL_EVENTS.find(event => event.id === id || event.slug === id);
}

/**
 * Eventos que suelen celebrarse en el mes (1-12), o que tienen una edición fechada que lo toca.
 * Las ceremonias de calendario comunitario sin mes habitual (Kasama) no aparecen en ningún mes.
 */
export function getEventsByMonth(month: number): CulturalEvent[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  return CULTURAL_EVENTS.filter(
    event =>
      event.usualMonths.includes(month) ||
      datedEditions(event).some(edition => {
        const start = Number(edition.startDate.slice(5, 7));
        const end = Number(edition.endDate.slice(5, 7));
        return start <= end ? month >= start && month <= end : month >= start || month <= end;
      }),
  );
}

export function getEventsByRegion(region: RegionId): CulturalEvent[] {
  return CULTURAL_EVENTS.filter(event => event.region === region);
}

/* ── Fechas: se comparan como día calendario de Ecuador continental (UTC−5, sin horario de verano) ── */

const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000;

function ecuadorToday(now: Date): { iso: string; year: number; month: number } {
  const iso = new Date(now.getTime() - ECUADOR_OFFSET_MS).toISOString().slice(0, 10);
  return { iso, year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

type DatedEdition = EventEdition & { startDate: string; endDate: string };

/** Solo cuenta como fechada una edición confirmada, con fecha de inicio y con fuente. */
function datedEditions(event: CulturalEvent): DatedEdition[] {
  return event.editions
    .filter(edition => edition.confirmation === 'confirmed_official' && edition.startDate !== null && edition.sourceUrl !== null)
    .map(edition => ({ ...edition, startDate: edition.startDate as string, endDate: edition.endDate ?? (edition.startDate as string) }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function formatDay(iso: string, withYear: boolean): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} de ${monthName(month)}${withYear ? ` de ${year}` : ''}`;
}

/** «del 12 al 22 de noviembre de 2026», «el 5 de junio de 2027», «del 30 de octubre al 2 de noviembre de 2026». */
export function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return `el ${formatDay(startDate, true)}`;
  const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  if (sameMonth) return `del ${Number(startDate.slice(8, 10))} al ${formatDay(endDate, true)}`;
  return `del ${formatDay(startDate, !sameYear)} al ${formatDay(endDate, true)}`;
}

export type UpcomingStatus = 'in_progress' | 'scheduled' | 'orientative';

export interface UpcomingEvent {
  event: CulturalEvent;
  /**
   * `in_progress` / `scheduled`: hay una edición con fechas y fuente que aún no termina.
   * `orientative`: solo se conoce el mes habitual; NO es una fecha confirmada.
   */
  status: UpcomingStatus;
  /** Edición fechada; null cuando el estado es `orientative`. */
  edition: EventEdition | null;
  /** Año y mes (1-12) en que cae o suele caer. */
  year: number;
  month: number;
  /** Texto listo para mostrar. */
  label: string;
}

const REVALIDATE = 'Revalida la programación en la agenda oficial antes de ir.';

/**
 * Lo que viene a partir de `now`, en orden cronológico: ediciones fechadas en curso o futuras y,
 * marcadas como orientativas, las fiestas en su próximo mes habitual.
 *
 * - Una edición confirmada que ya terminó nunca aparece, ni como fechada ni como orientativa de ese mismo mes.
 * - Las ceremonias sensibles o de calendario comunitario (Kasama, Chonta/Uwi) no se anuncian como «próximas»:
 *   se consultan en su ficha, con sus protocolos.
 */
export function getUpcomingEvents(now: Date, options: { monthsAhead?: number } = {}): UpcomingEvent[] {
  const today = ecuadorToday(now);
  const monthsAhead = Math.max(0, Math.min(12, options.monthsAhead ?? 12));
  const horizon = today.year * 12 + today.month + monthsAhead;
  const dated: UpcomingEvent[] = [];
  const orientative: UpcomingEvent[] = [];

  for (const event of CULTURAL_EVENTS) {
    const editions = datedEditions(event);
    const active = editions.find(edition => edition.endDate >= today.iso);
    if (active) {
      const year = Number(active.startDate.slice(0, 4));
      const month = Number(active.startDate.slice(5, 7));
      if (year * 12 + month > horizon) continue;
      const inProgress = active.startDate <= today.iso;
      dated.push({
        event,
        status: inProgress ? 'in_progress' : 'scheduled',
        edition: active,
        year,
        month,
        label: `${inProgress ? 'En curso' : 'Programada'}: ${formatDateRange(active.startDate, active.endDate)}. ${REVALIDATE}`,
      });
      continue;
    }
    if (event.sensitive || event.usualMonths.length === 0) continue;
    if (event.editions.some(edition => edition.confirmation === 'community_defined')) continue;

    // Un mes que ya cubrió una edición terminada no vuelve a ofrecerse como «próximo».
    const lastEnded = editions.slice(-1)[0];
    const endedIndex = lastEnded ? Number(lastEnded.endDate.slice(0, 4)) * 12 + Number(lastEnded.endDate.slice(5, 7)) : -Infinity;
    for (let offset = 0; offset <= monthsAhead && offset < 12; offset += 1) {
      const index = today.year * 12 + (today.month - 1) + offset;
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      if (!event.usualMonths.includes(month) || year * 12 + month <= endedIndex) continue;
      orientative.push({
        event,
        status: 'orientative',
        edition: null,
        year,
        month,
        label: `Suele celebrarse en ${monthName(month)} (${event.dateLabel}). Fecha orientativa: la edición ${year} no está confirmada.`,
      });
      break;
    }
  }

  // Orden cronológico; en el mismo mes, lo fechado va antes que lo orientativo.
  const rank = (item: UpcomingEvent) => (item.year * 12 + item.month) * 2 + (item.status === 'orientative' ? 1 : 0);
  return [...dated, ...orientative].sort(
    (a, b) => rank(a) - rank(b) || (a.edition?.startDate ?? '').localeCompare(b.edition?.startDate ?? ''),
  );
}

/** Estado legible de una fiesta en la fecha dada, sin prometer nada que la fuente no confirme. */
export function eventStatusLabel(event: CulturalEvent, now: Date): string {
  const today = ecuadorToday(now);
  const editions = datedEditions(event);
  const active = editions.find(edition => edition.endDate >= today.iso);
  if (active) {
    const range = formatDateRange(active.startDate, active.endDate);
    return active.startDate <= today.iso
      ? `En curso: ${range}, según la agenda oficial citada. ${REVALIDATE}`
      : `Programada ${range}, según la agenda oficial citada. ${REVALIDATE}`;
  }
  const lastEnded = editions.slice(-1)[0];
  if (lastEnded) {
    return `Edición ${lastEnded.year} finalizada el ${formatDay(lastEnded.endDate, true)}. La próxima fecha está por confirmar.`;
  }
  return undatedLabel(event);
}

function undatedLabel(event: CulturalEvent): string {
  const communityDefined = event.usualMonths.length === 0 || event.editions.some(edition => edition.confirmation === 'community_defined');
  if (communityDefined) {
    const season = event.usualMonths.length
      ? ` Referencia estacional: ${event.usualMonths.map(monthName).join(' o ')}.`
      : ' No hay fecha fija.';
    return `Fecha definida por la comunidad.${season} Participación solo con invitación o autorización.`;
  }
  return `Fecha orientativa: ${event.dateLabel}. Edición sin confirmar.`;
}

/* ───────── Compatibilidad con la interfaz existente ───────── */

/** @deprecated Usa `CULTURE_SOURCE`. */
export const cultureSource = CULTURE_SOURCE;

/** @deprecated Usa `CULTURAL_EVENTS`. */
export const culturalEvents: CulturalEvent[] = [...CULTURAL_EVENTS];

/** @deprecated Usa `getEventById`. */
export const getCulturalEventById = getEventById;

export function filterCulturalEvents(filters: { region?: RegionId | 'all'; month?: number; query?: string } = {}): CulturalEvent[] {
  const query = normalize(filters.query || '');
  return CULTURAL_EVENTS.filter(
    event =>
      (!filters.region || filters.region === 'all' || event.region === filters.region) &&
      (filters.month === undefined || event.usualMonths.includes(filters.month)) &&
      (!query ||
        normalize([event.name, event.localName, event.description, ...event.provinces, ...event.localities, event.community].filter(Boolean).join(' ')).includes(query)),
  );
}

/**
 * @deprecated Usa `eventStatusLabel(event, now)` y `getUpcomingEvents(now)`.
 * `upcoming` solo es true para una edición fechada que aún no empieza. Sin `today` no consulta
 * ningún reloj: devuelve la descripción de la fecha sin afirmar si ya pasó o está por venir.
 */
export function eventStatus(event: CulturalEvent, today?: Date): { label: string; upcoming: boolean } {
  if (!today) {
    const edition = datedEditions(event).slice(-1)[0];
    return {
      label: edition
        ? `Edición ${edition.year} programada ${formatDateRange(edition.startDate, edition.endDate)}, según la agenda oficial citada. ${REVALIDATE}`
        : undatedLabel(event),
      upcoming: false,
    };
  }
  const iso = ecuadorToday(today).iso;
  const next = datedEditions(event).find(edition => edition.endDate >= iso);
  return { label: eventStatusLabel(event, today), upcoming: Boolean(next && next.startDate > iso) };
}
