import { ALL_EXPERIENCES } from '../catalog/index.js';
import type { Experience, RegionId } from '../catalog/types.js';

/**
 * Numeración del «Álbum del Ecuador»: cada ficha es un cromo con número fijo de dos dígitos.
 * Orden de álbum: por región (Sierra, Costa, Amazonía, Galápagos) y, dentro, el orden del catálogo.
 * Contrato compartido por toda la interfaz: no calcular números en otro sitio.
 */
export const ALBUM_REGION_ORDER: readonly RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];

const ordered: readonly Experience[] = Object.freeze(
  ALBUM_REGION_ORDER.flatMap(region => ALL_EXPERIENCES.filter(experience => experience.localizedRegion === region)),
);
const numberById = new Map(ordered.map((experience, index) => [experience.id, index + 1]));

/** Total de cromos del álbum (hoy 51). */
export const ALBUM_TOTAL = ordered.length;
/** Cromos en orden de álbum. */
export const ALBUM_EXPERIENCES: readonly Experience[] = ordered;

/** Número de cromo (1…ALBUM_TOTAL) o `null` si la ficha no pertenece al álbum. */
export function albumNumber(experienceId: string): number | null {
  return numberById.get(experienceId) ?? null;
}
/** «02», «17»… siempre dos dígitos; «—» si no hay número. */
export function formatAlbumNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? String(value).padStart(2, '0') : '—';
}
export function albumLabel(experienceId: string): string {
  return formatAlbumNumber(albumNumber(experienceId));
}
export function experienceByAlbumNumber(value: number): Experience | undefined {
  return ordered[value - 1];
}
/** Cromos de una región, en orden de álbum, con su rango de números. */
export function albumPage(region: RegionId): { region: RegionId; experiences: Experience[]; first: number; last: number } {
  const experiences = ordered.filter(experience => experience.localizedRegion === region);
  const first = experiences.length ? numberById.get(experiences[0]!.id)! : 0;
  return { region, experiences, first, last: first ? first + experiences.length - 1 : 0 };
}

/**
 * Estado honesto de un cromo en la colección de una persona.
 * Solo `pegado` (visita verificada por el anfitrión o el servidor) lleva brillo y cuenta como vivido.
 */
export type CromoEstado = 'album' | 'visto' | 'en_sobre' | 'comprado' | 'pegado_demo' | 'pegado';
export const CROMO_ESTADO_ORDEN: readonly CromoEstado[] = ['album', 'visto', 'en_sobre', 'comprado', 'pegado_demo', 'pegado'];
export const CROMO_ESTADO_TEXTO: Readonly<Record<CromoEstado, string>> = {
  album: 'En el álbum',
  visto: 'Visto',
  en_sobre: 'En mi sobre',
  comprado: 'Comprado · por vivir',
  pegado_demo: 'Pegado de demostración',
  pegado: 'Pegado',
};
/** El estado más avanzado entre varios (p. ej. guardado y además comprado → comprado). */
export function mejorEstado(...estados: CromoEstado[]): CromoEstado {
  return estados.reduce<CromoEstado>((best, current) => (CROMO_ESTADO_ORDEN.indexOf(current) > CROMO_ESTADO_ORDEN.indexOf(best) ? current : best), 'album');
}
