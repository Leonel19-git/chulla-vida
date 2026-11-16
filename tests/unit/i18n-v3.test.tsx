// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../src/i18n/v3/en';
import fr from '../../src/i18n/v3/fr';
import pt from '../../src/i18n/v3/pt';
import zh from '../../src/i18n/v3/zh';
import { loadV3Dictionary, setV3Language, translateV3 } from '../../src/i18n/v3';
import { translate } from '../../src/i18n/ui';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { ConsentProvider } from '../../src/features/privacy/ConsentContext';
import { V3Footer } from '../../src/features/workspace/V3Workspace';
import { SpanishContentNote } from '../../src/i18n/v3/SpanishContentNote';
import { CONSENT_CATEGORIES, CONSENT_LEVELS } from '../../src/domain/consent';
import { PACKING_LIST } from '../../src/domain/itinerary';

const dictionaries = { en, fr, pt, zh } as const;
const root = join(__dirname, '../../src');

/** Todos los archivos de la interfaz que usan src/i18n/v3 y los literales que pasan por t(), tr() o msg(). */
function interfaceKeys() {
  const files: string[] = [];
  const walk = (dir: string) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path); } };
  walk(root);
  const keys = new Map<string, string>();
  const call = /\b(?:t|tr|msg)\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (!/from '(?:\.\.?\/)+(?:i18n\/)?v3'|from '\.\/index'|from '\.\/i18n\/v3'/.test(source) || file.includes(join('i18n', 'v3', 'index'))) continue;
    for (const match of source.matchAll(call)) {
      const raw = match[1]!;
      const key = raw.startsWith('"') ? JSON.parse(raw) as string : raw.slice(1, -1).replace(/\\'/g, "'");
      if (!keys.has(key)) keys.set(key, relative(root, file));
    }
  }
  return keys;
}
const variables = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

afterEach(() => { cleanup(); setV3Language('es'); });

describe('Traducción de la interfaz 3.x', () => {
  const keys = interfaceKeys();

  it('encuentra los textos de la interfaz nueva', () => {
    expect(keys.size).toBeGreaterThan(1000);
    expect([...keys.values()].some(file => file.includes('WorkspaceVivo'))).toBe(true);
  });

  it.each(['en', 'fr', 'pt', 'zh'] as const)('toda clave de la interfaz 3.x tiene traducción en %s', language => {
    const dictionary: Record<string, string> = dictionaries[language];
    const missing = [...keys].filter(([key]) => !dictionary[key]?.trim() && translate(language, key) === key).map(([key, file]) => `${file}: ${key}`);
    expect(missing).toEqual([]);
  });

  it.each(['en', 'fr', 'pt', 'zh'] as const)('niveles de privacidad y lista de equipaje (dominio) tienen traducción en %s', language => {
    const dictionary: Record<string, string> = dictionaries[language];
    const domain = [...CONSENT_LEVELS.flatMap(level => [level.title, level.tagline, level.stores, level.shares]), ...CONSENT_CATEGORIES.flatMap(item => [item.title, item.summary, item.stores, item.shares]), ...PACKING_LIST];
    expect(domain.filter(text => !dictionary[text])).toEqual([]);
  });

  it.each(['en', 'fr', 'pt', 'zh'] as const)('las traducciones en %s conservan las variables', language => {
    const dictionary: Record<string, string> = dictionaries[language];
    const broken = Object.entries(dictionary).filter(([key, text]) => variables(key).join() !== variables(text).join()).map(([key]) => key);
    expect(broken).toEqual([]);
  });

  it('español devuelve el literal y rellena variables; Kichwa sin equivalencia vuelve al español', async () => {
    expect(translateV3('es', 'Paso {n} de {total}', { n: 2, total: 5 })).toBe('Paso 2 de 5');
    await loadV3Dictionary('en');
    expect(translateV3('en', 'Paso {n} de {total}', { n: 2, total: 5 })).toBe('Step 2 of 5');
    expect(translateV3('ki', 'Ver la bienvenida')).toBe('Ver la bienvenida');
    expect(translateV3('fr', 'texto sin traducción')).toBe('texto sin traducción');
  });

  it('el pie cambia de idioma y el aviso de contenido aparece fuera del español', async () => {
    render(<ConsentProvider><V3Footer /><SpanishContentNote /></ConsentProvider>);
    expect(screen.getByRole('heading', { name: 'Explora' })).toBeInTheDocument();
    expect(screen.queryByText('Contenido en español')).not.toBeInTheDocument();
    await act(async () => { setV3Language('pt'); await loadV3Dictionary('pt'); });
    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jurídico e privacidade' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo em espanhol')).toBeInTheDocument();
    await act(async () => { setV3Language('zh'); await loadV3Dictionary('zh'); });
    expect(screen.getByRole('heading', { name: '法律与隐私' })).toBeInTheDocument();
  });

  it('AppProvider actualiza document.documentElement.lang y la interfaz nueva', async () => {
    localStorage.clear();
    let change: ((language: 'en') => void) | undefined;
    function Probe() { change = useApp().setLanguage; return null; }
    render(<AppProvider><ConsentProvider><Probe /><V3Footer /></ConsentProvider></AppProvider>);
    await act(async () => { change?.('en'); await loadV3Dictionary('en'); });
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('heading', { name: 'Legal & privacy' })).toBeInTheDocument();
  });
});
