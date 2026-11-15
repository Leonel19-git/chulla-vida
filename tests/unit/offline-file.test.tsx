// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { experiences, getExperienceById, type Experience } from '../../src/domain/catalog';
import { JOURNEY_KEY, newJourney } from '../../src/domain/itinerary';
import { downloadExperienceFile, downloadTripFile, experienceFileHtml, experienceFileName, tripFileHtml } from '../../src/features/offline/experienceFile';
import { clearOfflineLibrary, readOfflineLibrary, saveExperienceOffline } from '../../src/features/offline/library';
import { DownloadsPanel } from '../../src/features/offline/DownloadsPanel';
import { AppProvider } from '../../src/context/AppContext';

const quilotoa = getExperienceById('gen-02-quilotoa-shalala')!;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
let blobs: { name: string; blob: Blob }[] = [];
let lastHref = '';

beforeEach(async () => {
  await clearOfflineLibrary();
  localStorage.clear();
  blobs = [];
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const created = new Map<string, Blob>();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => { const id = `blob:test/${created.size}`; created.set(id, blob); return id; }, revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { lastHref = this.href; blobs.push({ name: this.download, blob: created.get(this.getAttribute('href')!)! }); });
  // Foto local -640.webp servida por la propia app.
  vi.stubGlobal('fetch', vi.fn(async (input: string) => input.startsWith('/images/') ? { ok: true, blob: async () => new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'image/webp' }) } : { ok: false }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('archivo HTML autónomo de una ficha', () => {
  it('incluye foto incrustada con crédito, precio rotulado, incluye/no incluye, 911, fecha y QR sin scripts', () => {
    const html = experienceFileHtml(quilotoa, { photo: PNG, qrSvg: '<svg viewBox="0 0 10 10"><path d="M0 0h1v1H0z"/></svg>' }, '2026-11-14T15:00:00Z');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain(`<img src="${PNG}"`);
    expect(html).toContain(quilotoa.media[0].credit);
    expect(html).toContain('USD 38 por persona · referencial');
    expect(html).toContain('Precio referencial tomado del catálogo de origen');
    expect(html).toContain('Qué incluye');
    expect(html).toContain('Qué no incluye');
    expect(html).toContain('href="tel:911"');
    expect(html).toContain('14 de noviembre de 2026');
    expect(html).toContain('https://chulla-vida.vercel.app/experiencias/gen-02-quilotoa-shalala');
    expect(html).toContain('<svg viewBox="0 0 10 10">');
    expect(html).not.toMatch(/<script|https?:\/\/[^"]+\.(?:js|css|woff)/i);
    expect(html).toContain("default-src 'none'");
  });
  it('escapa todo texto y descarta fotos o QR que no sean seguros', () => {
    const evil: Experience = { ...quilotoa, title: '<img src=x onerror=alert(1)>', summary: '"><script>alert(1)</script>' };
    const html = experienceFileHtml(evil, { photo: 'javascript:alert(1)', qrSvg: '<svg onload="alert(1)"></svg>' });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onload');
  });
  it('nombra el archivo con el slug de la ficha', () => {
    expect(experienceFileName(quilotoa)).toBe('chulla-vida-quilotoa-shalala.html');
    expect(experienceFileName({ id: 'x', slug: 'Ñandú / ../raro' })).toBe('chulla-vida-nandu-raro.html');
  });
});

describe('descarga real al dispositivo', () => {
  it('downloadExperienceFile baja chulla-vida-<slug>.html con la foto en base64 y además guarda la ficha sin señal', async () => {
    const result = await downloadExperienceFile(quilotoa);
    expect(result.message).toBe('Listo: se descargó chulla-vida-quilotoa-shalala.html y la ficha quedó guardada para usarla sin señal.');
    expect(blobs).toHaveLength(1);
    expect(blobs[0].name).toBe('chulla-vida-quilotoa-shalala.html');
    expect(lastHref).toMatch(/^blob:/);
    const html = await blobs[0].blob.text();
    expect(blobs[0].blob.type).toBe('text/html;charset=utf-8');
    expect(html).toMatch(/<img src="data:image\/webp;base64,[A-Za-z0-9+/=]+"/);
    expect(html).toContain('<svg');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/images/places/gen-02-quilotoa-shalala-640.webp', { credentials: 'omit' });
    expect((await readOfflineLibrary()).experiences.map(item => item.id)).toEqual([quilotoa.id]);
  });
  it('si no hay foto disponible igual descarga el archivo, sin imagen rota', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await downloadExperienceFile(quilotoa);
    expect(await blobs[0].blob.text()).not.toContain('<img');
  });
  it('rechaza fichas fuera del catálogo público', async () => {
    await expect(downloadExperienceFile({ ...quilotoa, id: 'privada' })).rejects.toThrow(/no se puede descargar/);
    expect(blobs).toHaveLength(0);
  });
  it('si la biblioteca falla, el archivo igual baja y el mensaje lo dice con honestidad', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const result = await downloadExperienceFile(quilotoa);
    expect(blobs).toHaveLength(1);
    expect(result.savedOffline).toBe(false);
    expect(result.message).toMatch(/No pudimos guardarla también/);
  });
});

describe('Descargar mi viaje', () => {
  it('un único HTML con el itinerario de Mi viaje y todas las fichas guardadas', async () => {
    const [first, second] = experiences.filter(item => item.media.length && item.id !== quilotoa.id);
    await saveExperienceOffline(quilotoa);
    await saveExperienceOffline(second);
    localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), origin: 'Ambato', people: 2, stops: [first.id, quilotoa.id], notes: 'Llevar <poncho>' }));
    const saved = (await readOfflineLibrary()).experiences;
    const result = await downloadTripFile(saved);
    expect(result.fileName).toBe('chulla-vida-mi-viaje.html');
    expect(result.count).toBe(3);
    const html = await blobs[0].blob.text();
    expect(html).toContain('Desde Ambato');
    expect(html).toContain(first.title);
    expect(html).toContain(second.title);
    expect(html).toContain('Base conocida de experiencias');
    expect(html).toContain('Llevar &lt;poncho&gt;');
    expect(html.match(/class="stop"/g)).toHaveLength(3);
    expect(html).not.toContain('<script');
  });
  it('funciona aunque no haya borrador ni fichas', () => {
    const html = tripFileHtml({ experiences: [], journey: null });
    expect(html).toContain('Aún no guardas fichas');
  });
  it('el panel Sin señal ofrece «Descargar mi viaje» y confirma la descarga', async () => {
    await saveExperienceOffline(quilotoa);
    render(<AppProvider><DownloadsPanel onClose={vi.fn()} onOpenExperience={vi.fn()} /></AppProvider>);
    expect(await screen.findByRole('heading', { name: quilotoa.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Descargar mi viaje/ }));
    expect(await screen.findByText(/Listo: se descargó chulla-vida-mi-viaje.html con 1 ficha/)).toBeInTheDocument();
    expect(blobs[0].name).toBe('chulla-vida-mi-viaje.html');
    fireEvent.click(screen.getByRole('button', { name: `Bajar archivo de ${quilotoa.title}` }));
    expect(await screen.findByText(/se descargó chulla-vida-quilotoa-shalala.html/)).toBeInTheDocument();
    expect(blobs[1].name).toBe('chulla-vida-quilotoa-shalala.html');
  });
});
