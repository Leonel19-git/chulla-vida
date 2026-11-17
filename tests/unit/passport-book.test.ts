import { describe, expect, it } from 'vitest';
import { albumPage } from '../../src/domain/album';
import { PASSPORT_BOOK_KEY, addJournalEntry, emptyPassportBook, isPassportBook, passportExportHtml, passportProgress, readPassportBook, savePassportBook, toggleVirtualExploration } from '../../src/domain/passport/book';
import { PASSPORT_PAGES, PASSPORT_TABS, PHONE_MAX_SLOTS, nextPassportPage, pageIndexForId, pageIndexForTab, passportPages, spreadCount, spreadOf, spreadPages } from '../../src/domain/passport/pages';

describe('páginas del libro-álbum', () => {
  it('en computador: tapa, carné, mapa, una página por región, especiales, diario, código y contratapa', () => {
    expect(PASSPORT_PAGES.map(page => page.id)).toEqual(['tapa', 'carne', 'ecuador', 'sierra', 'costa', 'amazonia', 'galapagos', 'especiales', 'diario', 'codigo', 'contratapa']);
    expect(PASSPORT_PAGES.filter(page => page.region).map(page => [page.region, page.first, page.last])).toEqual([['sierra', 1, 13], ['costa', 14, 20], ['amazonia', 21, 39], ['galapagos', 40, 51]]);
    expect(PASSPORT_TABS).toEqual(['tapa', 'carne', 'ecuador', 'sierra', 'costa', 'amazonia', 'galapagos', 'especiales', 'diario', 'codigo']);
  });
  it('en celular Amazonía (19) se parte en dos páginas para caber sin desplazarse en un iPhone SE; el resto queda igual', () => {
    const phone = passportPages('phone');
    expect(phone.map(page => page.id)).toEqual(['tapa', 'carne', 'ecuador', 'sierra', 'costa', 'amazonia-1', 'amazonia-2', 'galapagos', 'especiales', 'diario', 'codigo', 'contratapa']);
    const amazonia = albumPage('amazonia');
    expect(phone.filter(page => page.region === 'amazonia').map(page => [page.first, page.last, page.tab, page.part])).toEqual([[amazonia.first, 30, 'amazonia', 1], [31, amazonia.last, 'amazonia', 2]]);
    for (const page of phone.filter(item => item.region)) expect(page.last! - page.first! + 1).toBeLessThanOrEqual(PHONE_MAX_SLOTS);
    expect(pageIndexForTab(phone, 'amazonia')).toBe(5);
    expect(pageIndexForId(PASSPORT_PAGES, 'amazonia-2')).toBe(5);
    expect(pageIndexForId(phone, 'amazonia')).toBe(5);
    expect(pageIndexForId(phone, 'no-existe')).toBe(0);
  });
  it('pliegos: la tapa sola y luego dos páginas por pliego, sin salirse del libro', () => {
    expect(spreadCount()).toBe(6);
    expect([0, 1, 2, 3, 4, 9, 10].map(spreadOf)).toEqual([0, 1, 1, 2, 2, 5, 5]);
    expect(spreadPages(0)).toEqual([null, 0]);
    expect(spreadPages(1)).toEqual([1, 2]);
    expect(spreadPages(5)).toEqual([9, 10]);
    expect(nextPassportPage(0, -1)).toBe(0);
    expect(nextPassportPage(PASSPORT_PAGES.length - 1, 1)).toBe(PASSPORT_PAGES.length - 1);
    expect(nextPassportPage(2, 1)).toBe(3);
    expect(nextPassportPage(Number.NaN, 1)).toBe(0);
  });
});

describe('Pasaporte Guambra personal', () => {
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
  it('la copia descargada luce álbum: casillas numeradas con su estado honesto, sin brillo inventado', () => {
    const html = passportExportHtml({ ...emptyPassportBook(), nickname: 'Nayra' }, [], [], new Date('2026-11-13T17:00:00Z'), [
      { label: '01', title: 'Saraguro <Ancestral>', region: 'Sierra', regionId: 'sierra', estado: 'pegado', fecha: '2026-11-08T16:00:00Z' },
      { label: '02', title: 'Quilotoa', region: 'Sierra', regionId: 'sierra', estado: 'comprado', prueba: true },
      { label: '14', title: 'Agua Blanca', region: 'Costa', regionId: 'costa', estado: 'pegado_demo' },
      { label: '15', title: 'Guayaquil', region: 'Costa', regionId: 'costa', estado: 'album' },
    ]);
    expect(html).toContain('Pasaporte Guambra');
    expect(html).toContain('Nayra');
    expect(html).toContain('Saraguro &lt;Ancestral&gt;');
    expect(html).toContain('Pegado · visita verificada');
    expect(html).toContain('Comprado · por vivir · de prueba');
    expect(html).toContain('Pegado de demostración');
    expect(html).toContain('Te falta');
    expect(html).toContain('Pegados: 1');
    expect(html).toContain('Demo: 1');
    expect(html).toContain('Sierra · 01–02');
    expect(html).not.toMatch(/<script|<iframe|<img|<link/i);
  });
});
