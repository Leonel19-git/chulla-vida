import { useCallback, useSyncExternalStore } from 'react';
import type { Language } from '../../types';
import { translate } from '../ui';
import { translateKichwa } from '../kichwa';

/**
 * Traducción de la interfaz 3.x. La clave es el literal en español (como en src/i18n/ui.ts).
 * - es: devuelve el literal (no se descarga ningún diccionario).
 * - en/fr/pt/zh: diccionario propio (src/i18n/v3/<idioma>.ts), que se descarga solo al elegir ese idioma;
 *   mientras llega, o si falta una clave, usa el diccionario histórico y, al final, el español.
 * - ki/ki-amz: base editorial Kichwa existente; si no hay equivalencia, vuelve al español.
 * Nunca hay traducción automática en ejecución.
 */
export type V3Language = 'en' | 'fr' | 'pt' | 'zh';
export type Vars = Record<string, string | number>;
const loaders: Record<V3Language, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import('./en'),
  fr: () => import('./fr'),
  pt: () => import('./pt'),
  zh: () => import('./zh'),
};
const dictionaries: Partial<Record<V3Language, Record<string, string>>> = {};
const isV3Language = (language: Language): language is V3Language => language in loaders;

const fill = (text: string, vars?: Vars) => vars ? text.replace(/\{(\w+)\}/g, (match, key: string) => key in vars ? String(vars[key]) : match) : text;

export function translateV3(language: Language, source: string, vars?: Vars): string {
  if (language === 'es') return fill(source, vars);
  if (language === 'ki' || language === 'ki-amz') return fill(translateKichwa(source), vars);
  const own = isV3Language(language) ? dictionaries[language]?.[source] : undefined;
  return own ? fill(own, vars) : translate(language, source, vars);
}

/** Marca un literal para el extractor sin traducirlo aún (listas estáticas que luego pasan por t()). */
export const msg = <T extends string>(source: T): T => source;

// Idioma actual compartido con AppContext. Funciona también sin proveedor (pruebas): español.
let current: Language = 'es';
let version = 0;
let snapshot = 'es:0';
const listeners = new Set<() => void>();
const notify = () => { snapshot = `${current}:${++version}`; listeners.forEach(listener => listener()); };
export function getV3Language(): Language { return current; }

/** Descarga (una sola vez) el diccionario del idioma. Resuelve cuando ya se puede traducir. */
export function loadV3Dictionary(language: Language): Promise<void> {
  if (!isV3Language(language) || dictionaries[language]) return Promise.resolve();
  return loaders[language]().then(module => {
    dictionaries[language] = module.default;
    if (current === language) notify();
  }, () => { /* sin red: se queda el diccionario histórico y el español */ });
}

/** Lo llama AppProvider. `silent` sincroniza durante el render sin notificar a otros componentes. */
export function setV3Language(language: Language, silent = false) {
  const changed = language !== current;
  current = language;
  if (changed) snapshot = `${current}:${version}`;
  void loadV3Dictionary(language);
  if (!silent) notify();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;

export function useV3Language(): Language {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return current;
}

/** Hook de traducción de la interfaz 3.x: `const t = useT(); t('Mi viaje')`. */
export function useT() {
  const key = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // `key` cambia con el idioma y cuando llega su diccionario: así el texto se vuelve a calcular.
  const language = key.slice(0, key.indexOf(':')) as Language;
  // `key` también cambia cuando llega el diccionario aunque el idioma sea el mismo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((source: string, vars?: Vars) => translateV3(language, source, vars), [language, key]);
}

/** Traducción fuera de componentes (auxiliares que se llaman durante el render de un componente que usa useT). */
export function tr(source: string, vars?: Vars): string {
  return translateV3(current, source, vars);
}
