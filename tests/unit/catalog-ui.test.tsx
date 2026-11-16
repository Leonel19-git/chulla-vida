// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { CatalogProvider } from '../../src/features/catalog/CatalogContext';
import { CatalogDetail, CatalogExplorer } from '../../src/features/catalog/CatalogExplorer';
import { experiences } from '../../src/domain/catalog';
import { ConsentProvider, useConsent } from '../../src/features/privacy/ConsentContext';
import { ConsentMedia } from '../../src/features/privacy/ConsentMedia';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Catalog() {
  return <AppProvider><CatalogProvider><RegionControls /><CatalogExplorer onPlan={vi.fn()} onDownloads={vi.fn()} onDemo={vi.fn()} /><CatalogDetail onDownload={vi.fn()} onAsk={vi.fn()} onInquiry={vi.fn()} /></CatalogProvider></AppProvider>;
}
/** Solo las tarjetas del catálogo (la portada también tiene cartas de Cultura Viva). */
const cards = () => within(document.getElementById('experiencias')!).getAllByRole('article');
function RegionControls() { const { setSelectedRegion } = useApp(); return <button onClick={() => setSelectedRegion('Sierra')}>Cambiar a Sierra</button>; }
describe('recorrido público de catálogo V3', () => {
  it('muestra el catálogo completo y permite encontrar un destino y consultar su fuente sin ofrecer pago', async () => {
    const user = userEvent.setup();
    render(<Catalog />);
    expect(cards()).toHaveLength(experiences.length);
    await user.type(screen.getByRole('textbox', { name: 'Buscar experiencias' }), 'Saraguro');
    expect(cards()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Conocer Saraguro/i }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText(/Operador sin verificar/)).toBeInTheDocument();
    await user.click(screen.getByText('Información de origen y documento completo'));
    expect(screen.getByRole('link', { name: /Consultar documento fuente/ })).toHaveAttribute('href', '/catalogos/01_catalogo_14_destinos.txt');
    expect(screen.queryByRole('button', { name: /pagar|reservar y/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar en mi viaje' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('chullavida:v1:catalog-saved')!).data).toContain('gen-01-saraguro-ancestral'));
  });
  it('no oculta Galápagos por un límite de USD 200 implícito', async () => {
    const user = userEvent.setup();
    render(<Catalog />);
    await user.type(screen.getByRole('textbox', { name: 'Buscar experiencias' }), 'Bartolomé');
    expect(screen.getByRole('button', { name: /Conocer Bartolomé/i })).toBeInTheDocument();
    // La tarjeta muestra «USD 270» con «Desde» debajo; el rango completo (270–315) vive en la ficha.
    const price = within(cards()[0]).getByText(/USD 270/);
    expect(price).toHaveTextContent(/^USD 270Desde$/);
  });
  it('retira una provincia incompatible al cambiar de región', async () => {
    const user = userEvent.setup();
    render(<Catalog />);
    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.selectOptions(screen.getByLabelText('Provincia'), 'Napo');
    expect(cards()).toHaveLength(experiences.filter(item => item.province === 'Napo').length);
    await user.click(screen.getByRole('button', { name: 'Cambiar a Sierra' }));
    expect(screen.getByLabelText('Provincia')).toHaveValue('');
    expect(cards()).toHaveLength(experiences.filter(item => item.localizedRegion === 'sierra').length);
  });
});
function ConsentHarness() {
  const { update } = useConsent();
  return <><button onClick={() => update({ media: true })}>Permitir medios</button><button onClick={() => update({})}>Revocar medios</button><ConsentMedia><iframe title="Reproductor externo" src="https://open.spotify.com/embed/test" /></ConsentMedia></>;
}
it('impide cargar un embed sin permiso y lo retira al revocar', async () => {
  const user = userEvent.setup();
  render(<ConsentProvider><ConsentHarness /></ConsentProvider>);
  expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Permitir medios' }));
  expect(screen.getByTitle('Reproductor externo')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Revocar medios' }));
  expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
});
describe('portada Ecuador Vivo', () => {
  it('las regiones del héroe filtran el catálogo y marcan la elegida', async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    render(<Catalog />);
    const galapagos = screen.getByRole('button', { name: /^Galápagos, \d+ fichas$/ });
    await user.click(galapagos);
    expect(galapagos).toHaveAttribute('aria-pressed', 'true');
    expect(cards()).toHaveLength(experiences.filter(item => item.localizedRegion === 'galapagos').length);
  });
  it('cuenta los pasos, el reparto por región y aclara que la compra es de prueba', async () => {
    render(<Catalog />);
    expect(await screen.findByRole('heading', { name: 'Así funciona CHULLA VIDA' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').some(item => /Compra o pregunta/.test(item.textContent ?? ''))).toBe(true);
    const amazonia = experiences.filter(item => item.localizedRegion === 'amazonia').length;
    expect(screen.getByRole('button', { name: `Amazonía, ${amazonia} fichas` })).toBeInTheDocument();
    expect(screen.getAllByText(/modo prueba, sin cobro/).length).toBeGreaterThan(0);
  });
});

const mockMotion = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }) as MediaQueryList);
function CatalogWithDownload({ onDownload }: { onDownload: (experience: unknown) => Promise<string | void> }) {
  return <AppProvider><CatalogProvider><CatalogExplorer onPlan={vi.fn()} onDownloads={vi.fn()} onDemo={vi.fn()} /><CatalogDetail onDownload={onDownload} onAsk={vi.fn()} onInquiry={vi.fn()} /></CatalogProvider></AppProvider>;
}
describe('integración de la portada y la ficha', () => {
  it('«Descargar ficha» muestra el resultado real de la descarga (archivo y sin señal)', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn().mockResolvedValue('Listo: se descargó chulla-vida-saraguro.html y la ficha quedó guardada para usarla sin señal.');
    render(<CatalogWithDownload onDownload={onDownload} />);
    await user.type(screen.getByRole('textbox', { name: 'Buscar experiencias' }), 'Saraguro');
    await user.click(screen.getByRole('button', { name: /Conocer Saraguro/i }));
    await user.click(screen.getByRole('button', { name: 'Descargar ficha' }));
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'gen-01-saraguro-ancestral' }));
    expect(await screen.findByText(/se descargó chulla-vida-saraguro\.html/)).toBeInTheDocument();
  });
  it('si la descarga falla explica el motivo en vez de fingir que se guardó', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn().mockRejectedValue(new Error('Esta ficha no se puede descargar. Vuelve al catálogo y reintenta.'));
    render(<CatalogWithDownload onDownload={onDownload} />);
    await user.type(screen.getByRole('textbox', { name: 'Buscar experiencias' }), 'Saraguro');
    await user.click(screen.getByRole('button', { name: /Conocer Saraguro/i }));
    await user.click(screen.getByRole('button', { name: 'Descargar ficha' }));
    expect(await screen.findByText(/no se puede descargar/)).toBeInTheDocument();
    expect(screen.queryByText(/quedó guardada/)).not.toBeInTheDocument();
  });
  it('marca para el recorrido las regiones, la búsqueda, las tarjetas, sin señal y pasaporte', () => {
    render(<Catalog />);
    for (const id of ['regions', 'search', 'cards', 'offline', 'passport']) expect(document.querySelector(`[data-tour="${id}"]`)).not.toBeNull();
  });
  it('el hero no carga el video si hay movimiento reducido (queda la foto)', () => {
    mockMotion(true);
    render(<Catalog />);
    expect(document.querySelector('.vivo-hero-video')).toBeNull();
    expect(document.querySelector('.vivo-hero-photo')).not.toBeNull();
  });
  it('sin movimiento reducido el video del hero espera a la carga, va silenciado y se puede pausar', () => {
    mockMotion(false);
    render(<Catalog />);
    const video = document.querySelector<HTMLVideoElement>('.vivo-hero-video')!;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('poster')).toBe('/video/chulla-vida-hero-poster.webp');
    // Todavía sin src: el archivo de video no forma parte de la carga inicial.
    expect(video.getAttribute('src')).toBeNull();
  });
});

describe('portada compacta (3.4)', () => {
  it('la tarjeta muestra el precio corto y su carácter en una línea aparte, sin «·» cortado', () => {
    render(<Catalog />);
    const card = cards().find(item => within(item).queryByRole('button', { name: /Conocer Saraguro/ }))!;
    const price = card.querySelector('.cv-card-price')!;
    expect(price.textContent).toMatch(/^USD [\d.,–]+(Referencial|Propuesto|Verificado)$/);
    expect(price.textContent).not.toContain('·');
    expect(price.getAttribute('title')).toMatch(/Lo confirma el anfitrión/);
  });
  it('los créditos del héroe quedan en una línea y el detalle se abre al tocar', async () => {
    const user = userEvent.setup();
    render(<Catalog />);
    const hero = document.querySelector('.cv-hero')!;
    const credit = within(hero as HTMLElement).getByText('Créditos');
    expect(credit.closest('details')).not.toHaveAttribute('open');
    await user.click(credit);
    expect(credit.closest('details')).toHaveAttribute('open');
    expect(within(hero as HTMLElement).getByRole('link', { name: 'Créditos del video' })).toHaveAttribute('href', '/video/CREDITS.md');
  });
  it('el aviso de precios es un chip con el detalle desplegable y el prototipo anterior va al lado', async () => {
    render(<Catalog />);
    const foot = document.querySelector('.cv-discovery-foot')!;
    const summary = within(foot as HTMLElement).getByText('Precios referenciales · compra de prueba');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(within(foot as HTMLElement).getByRole('button', { name: /Ver el prototipo anterior/ })).toBeInTheDocument();
  });
});
