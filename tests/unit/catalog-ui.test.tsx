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
    expect(price).toHaveTextContent(/USD 270–315/);
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
  it('las pestañas de región filtran el álbum', async () => {
    const user = userEvent.setup();
    render(<Catalog />);
    await user.click(screen.getByRole('button', { name: 'Galápagos', exact: true }));
    expect(cards()).toHaveLength(experiences.filter(item => item.localizedRegion === 'galapagos').length);
  });
  it('cuenta los pasos, el reparto por región y aclara que la compra es de prueba', async () => {
    render(<Catalog />);
    const how = await screen.findByText('Así funciona CHULLA VIDA');
    expect(how).toBeVisible();
    await userEvent.click(how);
    expect(screen.getAllByRole('listitem').some(item => /Compra o pregunta/.test(item.textContent ?? ''))).toBe(true);
    expect(screen.getByRole('button', { name: 'Amazonía', exact: true })).toBeInTheDocument();
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
    for (const id of ['regions', 'search', 'cards', 'offline', 'passport', 'pack']) expect(document.querySelector(`[data-tour="${id}"]`)).not.toBeNull();
  });
  it('la portada usa fotos reales sin iniciar video ni descargar el modelo de voz', () => {
    mockMotion(true); render(<Catalog />);
    expect(document.querySelector('.al-cover video')).toBeNull();
    const photos = [...document.querySelectorAll<HTMLImageElement>('.al-preview-card img')];
    expect(photos).toHaveLength(3);
    expect(photos.every(photo => photo.getAttribute('src')?.includes('/images/'))).toBe(true);
  });
  it('abrir el sobre muestra tres destinos que se pueden guardar', async () => {
    const user = userEvent.setup(); render(<Catalog />);
    await user.click(screen.getAllByRole('button', { name: 'Abrir mi primer sobre' })[0]);
    const stage = document.querySelector('.al-pack-stage') as HTMLElement;
    expect(stage).toHaveClass('is-open');
    await user.click(within(stage).getAllByRole('button', { name: 'Guardar', exact: true })[0]);
    expect(within(stage).getByRole('button', { name: 'En mi sobre' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('portada compacta (3.4)', () => {
  it('la tarjeta muestra el precio corto y su carácter en una línea aparte, sin «·» cortado', () => {
    render(<Catalog />);
    const card = cards().find(item => within(item).queryByRole('button', { name: /Conocer Saraguro/ }))!;
    const price = card.querySelector('.al-cromo-strip>strong')!;
    expect(price.textContent).toMatch(/^USD [\d.,–]+(Referencial|Propuesto|Verificado)$/);
    expect(price.textContent).not.toContain('·');
    expect(price).toHaveTextContent('Referencial');
  });
  it('girar un cromo muestra su información y los créditos de la foto', async () => {
    const user = userEvent.setup(); render(<Catalog />);
    const card = cards()[0];
    expect(card).not.toHaveClass('is-flipped');
    await user.click(within(card).getByRole('button', { name: /Girar cromo/ }));
    expect(card).toHaveClass('is-flipped');
    expect(card.querySelector('.al-cromo-front')).toHaveAttribute('inert');
    expect(within(card).getByRole('link', { name: /Créditos/ })).toHaveAttribute('href', expect.stringContaining('commons.wikimedia.org'));
    await user.click(within(card).getByRole('button', { name: 'Volver a la foto' }));
    expect(card).not.toHaveClass('is-flipped');
  });
  it('el aviso de precios explica el modo prueba y el álbum no abre el prototipo anterior', async () => {
    render(<Catalog />);
    const foot = document.querySelector('.cv-discovery-foot')!;
    const summary = within(foot as HTMLElement).getByText('Precios referenciales · compra de prueba');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(within(foot as HTMLElement).queryByRole('button', { name: /Ver el prototipo anterior/ })).not.toBeInTheDocument();
  });
});
