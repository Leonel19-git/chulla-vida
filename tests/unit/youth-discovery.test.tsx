// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { experiences, type Experience } from '../../src/domain/catalog';
import { PhotoStories, QuickStart, RegionFilms } from '../../src/features/discovery/YouthDiscovery';
import { setV3Language, loadV3Dictionary } from '../../src/i18n/v3';

const catalog = vi.hoisted(() => ({ records: [] as Experience[], saved: [] as string[], online: true, toggle: vi.fn(), select: vi.fn() }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => catalog }));
beforeEach(() => {
  catalog.records = experiences; catalog.saved = []; catalog.online = true;
  vi.clearAllMocks(); setV3Language('es');
  Object.defineProperty(navigator, 'share', {configurable:true, writable:true, value:undefined});
  Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:vi.fn().mockResolvedValue(undefined)}});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); setV3Language('es'); });

describe('descubrimiento visual conectado al catálogo', () => {
  it('abre perfiles externos reales, sin simular redes de CHULLA VIDA ni insertar rastreadores', () => {
    const { container }=render(<PhotoStories />);
    expect(screen.getByRole('link', {name:'Instagram: @ecuadortravel'})).toHaveAttribute('href','https://www.instagram.com/ecuadortravel/');
    const tiktok=screen.getByRole('link', {name:'TikTok: @ecuador.travel'});
    expect(tiktok).toHaveAttribute('href','https://www.tiktok.com/@ecuador.travel');
    expect(tiktok).toHaveAttribute('rel','noopener noreferrer');
    expect(screen.getByText('Inspiración externa · Ecuador Travel')).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByText(/Demostración/)).not.toBeInTheDocument();
  });
  it('abre el plan y las descargas por los mismos accesos de la plataforma', async () => {
    const user = userEvent.setup(); const plan=vi.fn(), downloads=vi.fn(), culture=vi.fn();
    window.addEventListener('cv3:culture', culture);
    render(<QuickStart onPlan={plan} onDownloads={downloads} />);
    await user.click(screen.getByRole('button', {name:/Arma el plan/}));
    await user.click(screen.getByRole('button', {name:/Llévalo sin señal/}));
    await user.click(screen.getByRole('button', {name:/Cultura Viva/}));
    expect(plan).toHaveBeenCalledOnce(); expect(downloads).toHaveBeenCalledOnce(); expect(culture).toHaveBeenCalledOnce();
    window.removeEventListener('cv3:culture', culture);
  });
  it('filtra fotos reales por región, guarda el id y abre su ficha', async () => {
    const user=userEvent.setup(); render(<PhotoStories />);
    await user.click(screen.getByRole('button', {name:'Amazonía',exact:true}));
    const cards=screen.getAllByRole('article'); expect(cards).toHaveLength(2);
    expect(cards.every(card=>card.dataset.region==='amazonia')).toBe(true);
    await user.click(within(cards[0]).getByRole('button', {name:/Guardar este plan/}));
    expect(catalog.toggle).toHaveBeenCalledWith('amz-01-reserva-cuyabeno');
    await user.click(within(cards[0]).getByRole('button', {name:/Ver el lugar/}));
    expect(catalog.select).toHaveBeenCalledWith('amz-01-reserva-cuyabeno');
    expect(within(cards[0]).getByRole('link', {name:/Foto:/}).getAttribute('href')).toMatch(/^https:\/\/commons.wikimedia.org\//);
  });
  it('comparte un enlace profundo real sin publicar nada en redes', async () => {
    const user=userEvent.setup(); vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined); render(<PhotoStories />);
    await user.click(screen.getAllByRole('button', {name:/^Compartir:/})[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${location.origin}/experiencias/gen-02-quilotoa-shalala`);
    expect(screen.getByRole('status')).toHaveTextContent('Enlace copiado');
  });
  it('respeta cancelar el menú de compartir sin copiar ni anunciar éxito', async () => {
    const user=userEvent.setup(); vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined); navigator.share=vi.fn().mockRejectedValue(new DOMException('Cancelado','AbortError'));
    render(<PhotoStories />); await user.click(screen.getAllByRole('button', {name:/^Compartir:/})[0]);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
  it('usa la hoja nativa para compartir cuando está disponible', async () => {
    const user=userEvent.setup(); navigator.share=vi.fn().mockResolvedValue(undefined);
    render(<PhotoStories />); await user.click(screen.getAllByRole('button', {name:/^Compartir:/})[0]);
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({url:`${location.origin}/experiencias/gen-02-quilotoa-shalala`}));
    expect(screen.getByRole('status')).toHaveTextContent('Plan compartido');
  });
  it('no carga videos hasta pulsar, mantiene uno solo y permite reintentar errores', async () => {
    const user=userEvent.setup(); const {container}=render(<RegionFilms />);
    expect(container.querySelector('video')).toBeNull();
    await user.click(screen.getByRole('button', {name:'Reproducir video: Sierra'}));
    expect(container.querySelector('video')).toHaveAttribute('src','/video/regions/sierra.mp4');
    await user.click(screen.getByRole('button', {name:'Reproducir video: Costa'}));
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(container.querySelector('video')).toHaveAttribute('src','/video/regions/costa.mp4');
    fireEvent.error(container.querySelector('video')!);
    expect(container.querySelector('video')).toBeNull();
    await user.click(screen.getByRole('button', {name:'Reproducir video: Costa'}));
    expect(container.querySelector('video')).toHaveAttribute('src','/video/regions/costa.mp4');
    await user.click(screen.getByRole('button', {name:'Pausar video: Costa'}));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', {name:'Reproducir video: Costa'})).toBeInTheDocument();
  });
  it('sin conexión solo muestra fotos de fichas descargadas y oculta los videos', () => {
    catalog.online=false; catalog.records=experiences.filter(x=>x.id==='gen-02-quilotoa-shalala');
    const {container}=render(<><PhotoStories /><RegionFilms /></>);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', {name:/Ver el lugar: Quilotoa/})).toBeInTheDocument();
    expect(container.querySelector('.cv-films')).toBeNull();
  });
  it('traduce las nuevas acciones al elegir inglés', async () => {
    await loadV3Dictionary('en'); setV3Language('en');
    render(<><QuickStart onPlan={vi.fn()} onDownloads={vi.fn()} /><PhotoStories /><RegionFilms /></>);
    expect(screen.getByRole('heading', {name:'What can you do here?'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name:'This photo was taken here.'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'Play video: Sierra'})).toBeInTheDocument();
  });
});
