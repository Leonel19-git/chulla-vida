import { albumPage } from '../album';
import type { RegionId } from '../catalog';

/**
 * Orden del Pasaporte Guambra como libro-álbum.
 * - `book` (computador): libro abierto a doble página. La tapa va sola y después cada pliego junta dos páginas:
 *   [Carné | Mi Ecuador] · [Sierra | Costa] · [Amazonía | Galápagos] · [Especiales | Diario] · [Código | Contratapa].
 * - `phone` (celular): una página por pantalla. Una región con más de `PHONE_MAX_SLOTS` cromos se parte en varias
 *   páginas para que la rejilla (4 columnas) quepa sin desplazarse en un iPhone SE: hoy solo Amazonía (21–30 y 31–39).
 */
export type PassportTabId = 'tapa' | 'carne' | 'ecuador' | RegionId | 'especiales' | 'diario' | 'codigo';
export type PassportPageId = Exclude<PassportTabId, RegionId> | RegionId | `${RegionId}-${number}` | 'contratapa';
export type PassportLayout = 'book' | 'phone';

export interface PassportPageDef {
  id: PassportPageId;
  /** Pestaña de índice que la representa (`null`: sin pestaña propia, como la contratapa). */
  tab: PassportTabId | null;
  region?: RegionId;
  /** Rango de números de cromo de la página (inclusive). */
  first?: number;
  last?: number;
  /** Parte de una región partida (1, 2…). */
  part?: number;
}

/** Pestañas del índice, en el orden del canto del libro. */
export const PASSPORT_TABS: readonly PassportTabId[] = ['tapa', 'carne', 'ecuador', 'sierra', 'costa', 'amazonia', 'galapagos', 'especiales', 'diario', 'codigo'];
/** 4 columnas × 4 filas: lo que entra sin desplazarse en el alto útil de un iPhone SE (375 × 667). */
export const PHONE_MAX_SLOTS = 16;
const REGIONS: readonly RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];

function regionPages(region: RegionId, layout: PassportLayout): PassportPageDef[] {
  const page = albumPage(region);
  const count = page.experiences.length;
  if (layout === 'book' || count <= PHONE_MAX_SLOTS) return [{ id: region, tab: region, region, first: page.first, last: page.last }];
  const parts = Math.ceil(count / PHONE_MAX_SLOTS);
  const size = Math.ceil(count / parts);
  return Array.from({ length: parts }, (_, index) => {
    const first = page.first + index * size;
    return { id: `${region}-${index + 1}` as const, tab: region, region, first, last: Math.min(page.last, first + size - 1), part: index + 1 };
  });
}

export function passportPages(layout: PassportLayout): PassportPageDef[] {
  return [
    { id: 'tapa', tab: 'tapa' },
    { id: 'carne', tab: 'carne' },
    { id: 'ecuador', tab: 'ecuador' },
    ...REGIONS.flatMap(region => regionPages(region, layout)),
    { id: 'especiales', tab: 'especiales' },
    { id: 'diario', tab: 'diario' },
    { id: 'codigo', tab: 'codigo' },
    { id: 'contratapa', tab: null },
  ];
}
/** Páginas del libro abierto (computador). */
export const PASSPORT_PAGES: readonly PassportPageDef[] = Object.freeze(passportPages('book'));

/** Página siguiente o anterior sin salirse del libro. */
export function nextPassportPage(current: number, direction: -1 | 1, total: number = PASSPORT_PAGES.length): number {
  if (!Number.isInteger(current) || total < 1) return 0;
  return Math.min(total - 1, Math.max(0, current + direction));
}
/** Primera página que muestra una pestaña (o la tapa si no existe). */
export function pageIndexForTab(pages: readonly PassportPageDef[], tab: PassportTabId): number {
  return Math.max(0, pages.findIndex(page => page.tab === tab));
}
/** Índice de una página por id; si no existe en este formato (p. ej. «amazonia-2» en computador), su pestaña. */
export function pageIndexForId(pages: readonly PassportPageDef[], id: string): number {
  const exact = pages.findIndex(page => page.id === id);
  if (exact >= 0) return exact;
  const base = id.replace(/-\d+$/, '');
  const byTab = pages.findIndex(page => page.tab === base);
  return byTab >= 0 ? byTab : 0;
}

// ── Pliegos del libro abierto ────────────────────────────────────────────────
/** Pliego que contiene una página: 0 es la tapa sola; luego (1,2) → 1, (3,4) → 2… */
export function spreadOf(pageIndex: number): number {
  return pageIndex <= 0 ? 0 : Math.ceil(pageIndex / 2);
}
/** Páginas [izquierda, derecha] de un pliego; `null` donde no hay página (a la izquierda de la tapa). */
export function spreadPages(spread: number, total: number = PASSPORT_PAGES.length): [number | null, number | null] {
  if (spread <= 0) return [null, 0];
  const left = spread * 2 - 1;
  return [left < total ? left : null, left + 1 < total ? left + 1 : null];
}
export function spreadCount(total: number = PASSPORT_PAGES.length): number {
  return spreadOf(total - 1) + 1;
}
