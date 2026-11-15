import { markExplored, readPassportBook, savePassportBook } from '../../domain/passport/book';

/** Evento opcional que otros frentes pueden emitir al abrir una ficha por otra vía (p. ej. un enlace profundo): detail { id }. */
export const EXPERIENCE_OPENED = 'cv3:experience-opened';

/** Guarda la ficha como «Explorado virtualmente» en el Pasaporte. Idempotente; nunca crea visitas. */
export function recordExploration(experienceId: string, allowedIds: readonly string[]): boolean {
  const book = readPassportBook();
  const next = markExplored(book, experienceId, allowedIds);
  if (next === book) return false;
  return savePassportBook(next);
}
