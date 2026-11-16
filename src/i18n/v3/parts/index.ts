/**
 * Fragmentos del diccionario 3.x. Cada frente añade aquí su archivo `<nombre>.part.ts`
 * con `export const en = {...}`, `fr`, `pt` y `zh` (clave: literal en español).
 * Así varios equipos agregan traducciones sin editar a la vez los diccionarios grandes.
 */
export type PartLanguage = 'en' | 'fr' | 'pt' | 'zh';
type Part = Partial<Record<PartLanguage, Record<string, string>>>;
const modules = import.meta.glob<Part>('./*.part.ts', { eager: true });

export function partsFor(language: PartLanguage): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const path of Object.keys(modules).sort()) Object.assign(merged, modules[path]?.[language] ?? {});
  return merged;
}
