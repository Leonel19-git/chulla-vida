// @vitest-environment jsdom
import { readFileSync, statSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { BrandIntro, INTRO_CUES_URL, INTRO_POSTER, INTRO_SOURCES, cueIndexAt, parseIntroCues, shotProgress } from '../../src/components/chulla/BrandIntro';
import { HERO_SOURCES } from '../../src/features/catalog/HeroVideo';

const cuesFile = JSON.parse(readFileSync('public/video/intro-cues.json', 'utf8'));
const motion = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }) as MediaQueryList);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: url === INTRO_CUES_URL, json: async () => cuesFile })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const video = () => document.querySelector<HTMLVideoElement>('video.cvi-video')!;
const setTime = (seconds: number) => {
  Object.defineProperty(video(), 'currentTime', { configurable: true, get: () => seconds });
  fireEvent.timeUpdate(video());
};

describe('tomas de la intro (intro-cues.json)', () => {
  const cues = parseIntroCues(cuesFile)!;
  it('el JSON es válido: 8 tomas de las cuatro regiones, contiguas, con crédito y licencia', () => {
    expect(cues).not.toBeNull();
    expect(cues.shots).toHaveLength(8);
    expect(new Set(cues.shots.map(shot => shot.region))).toEqual(new Set(['Sierra', 'Costa', 'Amazonía', 'Galápagos']));
    cues.shots.forEach((shot, i) => {
      expect(shot.end).toBeGreaterThan(shot.start);
      if (i > 0) expect(shot.start).toBe(cues.shots[i - 1].end);
      expect(shot.credit.author.length).toBeGreaterThan(1);
      expect(shot.credit.license).toMatch(/CC|dominio|Public/i);
    });
    expect(cues.closingStart).toBe(cues.shots.at(-1)!.end);
    expect(cues.duration).toBeGreaterThanOrEqual(cues.closingStart + 2);
  });
  it('cueIndexAt da la toma correcta en cada segundo y -1 en el cierre azul', () => {
    expect(cueIndexAt(cues, 0)).toBe(0);
    expect(cueIndexAt(cues, cues.shots[1].start - 0.01)).toBe(0);
    expect(cueIndexAt(cues, cues.shots[1].start)).toBe(1);
    expect(cueIndexAt(cues, cues.shots[7].start + 0.5)).toBe(7);
    expect(cueIndexAt(cues, cues.closingStart + 0.1)).toBe(-1);
    expect(cueIndexAt(null, 3)).toBe(-1);
    expect(cueIndexAt(cues, Number.NaN)).toBe(-1);
  });
  it('shotProgress llena los segmentos anteriores y el actual a medias', () => {
    const mid = (cues.shots[2].start + cues.shots[2].end) / 2;
    const progress = shotProgress(cues, mid);
    expect(progress.slice(0, 2)).toEqual([1, 1]);
    expect(progress[2]).toBeCloseTo(0.5, 5);
    expect(progress.slice(3).every(value => value === 0)).toBe(true);
  });
  it('rechaza datos rotos (la intro sigue sin títulos)', () => {
    expect(parseIntroCues(null)).toBeNull();
    expect(parseIntroCues({ duration: 1, closingStart: 1, shots: [] })).toBeNull();
    expect(parseIntroCues({ ...cuesFile, shots: [{ ...cuesFile.shots[0], end: -1 }] })).toBeNull();
  });
});

describe('intro con video nuevo', () => {
  it('fuentes: vertical 720×1280 para celular, mp4 H.264 1080 y webm VP9; silenciado, en línea y con autoplay', () => {
    motion(false);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    const node = video();
    const sources = [...node.querySelectorAll('source')];
    expect(sources.map(source => source.getAttribute('src'))).toEqual([INTRO_SOURCES.portrait, INTRO_SOURCES.mp4, INTRO_SOURCES.webm]);
    expect(sources[0].getAttribute('media')).toMatch(/orientation: portrait/);
    expect(sources[1].getAttribute('type')).toMatch(/video\/mp4/);
    expect(sources[2].getAttribute('type')).toMatch(/video\/webm/);
    expect(node.getAttribute('poster')).toBe(INTRO_POSTER);
    expect(node.muted).toBe(true);
    expect(node.hasAttribute('playsinline')).toBe(true);
    expect(node.autoplay).toBe(true);
  });
  it('los títulos siguen al video: lugar, región/provincia y crédito; en el cierre se van', async () => {
    motion(false);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    await waitFor(() => expect(document.querySelector('.cvi-place')).toHaveTextContent(cuesFile.shots[0].place));
    fireEvent.playing(video());
    setTime(cuesFile.shots[1].start + 0.2);
    expect(document.querySelector('.cvi-place')).toHaveTextContent('Volcán Cotopaxi');
    expect(document.querySelector('.cvi-chip')).toHaveTextContent('Sierra');
    expect(document.querySelector('.cvi-photo-credit')).toHaveTextContent('Bernard Gagnon · CC BY-SA 3.0');
    setTime(cuesFile.shots[6].start + 0.2);
    expect(document.querySelector('.cvi-place')).toHaveTextContent('Kicker Rock');
    expect(document.querySelector('.cvi-chip')).toHaveTextContent('Galápagos');
    setTime(cuesFile.closingStart + 0.5);
    expect(document.querySelector('.cvi-place')).toBeNull();
    expect(document.querySelector('.cvi')).toHaveClass('is-outro');
    expect(document.querySelectorAll('.cvi-progress > span')).toHaveLength(8);
  });
  it('la barra inferior tiene Entrar (con foco), Pausar/Reproducir y Saltar; Saltar cierra', () => {
    motion(false);
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<AppProvider><BrandIntro onClose={onClose} /></AppProvider>);
    const bar = document.querySelector('.cvi-bar')!;
    expect(bar.contains(screen.getByRole('button', { name: 'Entrar a CHULLA VIDA' }))).toBe(true);
    expect(screen.getByRole('button', { name: 'Entrar a CHULLA VIDA' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Descubre el Ecuador que se vive' })).toBeInTheDocument();
    fireEvent.playing(video());
    fireEvent.click(screen.getByRole('button', { name: 'Pausar video' }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Saltar/ }));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('con movimiento reducido: no arranca, póster con título estático de la primera toma y «Ver video»', async () => {
    motion(true);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    expect(video().autoplay).toBe(false);
    expect(video().getAttribute('preload')).toBe('none');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await waitFor(() => expect(document.querySelector('.cvi-place')).toHaveTextContent('Laguna del Quilotoa'));
    // Aunque el tiempo cambie, sin reproducir el título no se mueve.
    setTime(cuesFile.shots[3].start + 0.1);
    expect(document.querySelector('.cvi-place')).toHaveTextContent('Laguna del Quilotoa');
    expect(document.querySelector('.cvi')).toHaveClass('is-reduced');
    expect(screen.getByText(/movimiento reducido/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver video/ }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
  it('si el MP4 falla al decodificar, prueba solo el WebM antes de rendirse', () => {
    motion(false);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    Object.defineProperty(video(), 'currentSrc', { configurable: true, get: () => `http://localhost${INTRO_SOURCES.mp4}` });
    fireEvent.error(video());
    expect([...video().querySelectorAll('source')].map(source => source.getAttribute('src'))).toEqual([INTRO_SOURCES.webm]);
    fireEvent.error(video());
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('img.cv-intro-video')).toHaveAttribute('src', INTRO_POSTER);
  });
  it('si ninguna fuente se puede reproducir, queda el póster (vertical en celular)', () => {
    motion(false);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    fireEvent.error(document.querySelectorAll('video source')[2]);
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('img.cv-intro-video')).toHaveAttribute('src', INTRO_POSTER);
    expect(document.querySelector('picture source')?.getAttribute('srcset')).toMatch(/portrait/);
  });
});

describe('archivos de video', () => {
  const all = [...Object.values(INTRO_SOURCES), ...Object.values(HERO_SOURCES)].map(path => `public${path}`);
  it('existen, son MP4 (ftyp) o WebM (EBML) y suman menos de 12 MB', () => {
    let total = 0;
    for (const file of all) {
      const head = readFileSync(file).subarray(0, 12);
      if (file.endsWith('.mp4')) expect(head.subarray(4, 8).toString()).toBe('ftyp');
      else expect([...head.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
      total += statSync(file).size;
    }
    expect(total).toBeLessThan(12 * 1024 * 1024);
  });
  it('los MP4 llevan el índice al principio (+faststart) para empezar sin descargar todo', () => {
    for (const file of all.filter(path => path.endsWith('.mp4'))) {
      const head = readFileSync(file).subarray(0, 4096).toString('latin1');
      expect(head.indexOf('moov')).toBeGreaterThan(-1);
    }
  });
  it('pósteres WebP y créditos con autores', () => {
    for (const file of ['chulla-vida-intro-poster.webp', 'chulla-vida-intro-poster-portrait.webp', 'chulla-vida-hero-poster.webp']) expect(readFileSync(`public/video/${file}`).subarray(8, 12).toString()).toBe('WEBP');
    const credits = readFileSync('public/video/CREDITS.md', 'utf8');
    for (const shot of cuesFile.shots) expect(credits).toContain(shot.credit.author);
  });
});
