import { describe, expect, it } from 'vitest';
import { PASSPORT_BOOK_KEY, PASSPORT_PAGES, addJournalEntry, emptyPassportBook, isPassportBook, nextPassportPage, passportExportHtml, passportProgress, readPassportBook, savePassportBook, toggleVirtualExploration } from '../../src/domain/passport/book';

describe('Pasaporte Guambra personal', () => {
  it('limita la navegación a las páginas existentes y conserva las cuatro regiones', () => {
    expect(nextPassportPage(0, -1)).toBe(0);
    expect(nextPassportPage(PASSPORT_PAGES.length - 1, 1)).toBe(PASSPORT_PAGES.length - 1);
    expect(nextPassportPage(2, 1)).toBe(3);
    expect(nextPassportPage(Number.NaN, 1)).toBe(0);
    expect(PASSPORT_PAGES.map(page => page.id)).toEqual(['cover', 'profile', 'sierra', 'costa', 'amazonia', 'galapagos', 'journal', 'back']);
  });
  it('distingue planes y exploraciones virtuales sin fabricar visitas reales', () => {
    const state = toggleVirtualExploration(emptyPassportBook(), 'quito', ['quito', 'cuyabeno']);
    expect(passportProgress(state, ['quito', 'quito', 'cuyabeno'], ['quito', 'cuyabeno'], ['old-demo', 'old-demo'])).toEqual({ explored: 1, planned: 2, total: 2, validatedDemo: 1, verifiedRealVisits: 0 });
    expect(toggleVirtualExploration(state, 'unknown', ['quito'])).toBe(state);
    expect(toggleVirtualExploration(state, 'quito', ['quito']).exploredIds).toEqual([]);
    expect(state).not.toHaveProperty('verified');
    expect(state).not.toHaveProperty('visits');
  });
  it('guarda y recupera perfil y diario como datos validados, sin perder caracteres', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const state = addJournalEntry({ ...emptyPassportBook(), nickname: 'Nayra', origin: 'Cuenca' }, { title: 'Una historia en el bosque', text: 'Aprendí a escuchar. 🌿', destinationId: 'cuyabeno' }, new Date('2026-11-13T16:00:00Z'), 'entry-1');
    expect(savePassportBook(state, storage)).toBe(true);
    expect(readPassportBook(storage)).toEqual(state);
    expect(values.has(PASSPORT_BOOK_KEY)).toBe(true);
    expect(addJournalEntry(state, { title: 'Duplicado', text: 'Texto' }, new Date(), 'entry-1')).toBe(state);
    expect(addJournalEntry(state, { title: ' ', text: 'Texto' }, new Date(), 'entry-2')).toBe(state);
  });
  it('rechaza corrupción, fechas inválidas y contenido excesivo; la falta de almacenamiento no rompe el pasaporte', () => {
    const state = emptyPassportBook();
    expect(isPassportBook({ ...state, exploredIds: ['quito', 'quito'] })).toBe(false);
    expect(isPassportBook({ ...state, nickname: 'n'.repeat(65) })).toBe(false);
    expect(isPassportBook({ ...state, journal: [{ id: 'a', title: 'Título', text: 'Texto', destinationId: null, createdAt: 'ayer' }] })).toBe(false);
    expect(readPassportBook({ getItem: () => '{oops' })).toEqual(state);
    expect(savePassportBook(state, { setItem: () => { throw new Error('quota'); } })).toBe(false);
  });
  it('exporta HTML autónomo con notas escapadas que no ejecutan código ni cargan rastreadores', () => {
    const state = addJournalEntry({ ...emptyPassportBook(), nickname: '<img src=x onerror=alert(1)>' }, { title: '</h3><script>bad()</script>', text: '<iframe src="https://evil.example"></iframe> & mi recuerdo' }, new Date('2026-11-13T16:00:00Z'), 'entry-export');
    const html = passportExportHtml(state, [{ id: 'quito', title: 'Quito <centro>', region: 'Sierra' }], ['quito'], new Date('2026-11-13T17:00:00Z'));
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;iframe');
    expect(html).toContain('Quito &lt;centro&gt;');
    expect(html).not.toMatch(/<script|<iframe|<img|<link|<video|<audio/i);
    expect(html).toContain('No acredita visitas reales');
    expect(html).toContain('Se puede leer sin internet');
  });
});
