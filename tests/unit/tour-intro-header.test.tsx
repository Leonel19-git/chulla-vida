// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { BrandIntro, INTRO_POSTER, INTRO_VIDEO } from '../../src/components/chulla/BrandIntro';
import { AccountButton, identityFromSession } from '../../src/features/workspace/AccountButton';

const supabase = vi.hoisted(() => ({ session: null as unknown, listeners: [] as ((event: string, session: unknown) => void)[] }));
vi.mock('../../src/lib/supabase', () => ({
  getSupabase: () => ({ auth: {
    getSession: async () => ({ data: { session: supabase.session }, error: null }),
    onAuthStateChange: (callback: (event: string, session: unknown) => void) => { supabase.listeners.push(callback); return { data: { subscription: { unsubscribe: () => {} } } }; },
  } }),
}));

const motion = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }) as MediaQueryList);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => {
  localStorage.clear(); supabase.session = null; supabase.listeners = [];
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('intro con video', () => {
  it('reproduce el video original a pantalla completa, silenciado, con «Entrar» y «Saltar»', () => {
    motion(false);
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<AppProvider><BrandIntro onClose={onClose} /></AppProvider>);
    const video = document.querySelector<HTMLVideoElement>('video.cv-intro-video')!;
    // Fuentes: vertical para celular, H.264 1080 y VP9 de respaldo (sin texto incrustado).
    expect([...video.querySelectorAll('source')].map(source => source.getAttribute('src'))).toContain(INTRO_VIDEO);
    expect(video.getAttribute('poster')).toBe(INTRO_POSTER);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(screen.getByRole('heading', { name: 'Descubre el Ecuador que se vive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar a CHULLA VIDA' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Saltar/ }));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('con movimiento reducido no arranca sola: póster y botón «Ver video»', () => {
    motion(true);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    const video = document.querySelector<HTMLVideoElement>('video.cv-intro-video')!;
    expect(video.autoplay).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByText(/movimiento reducido/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver video/ }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
  it('si el navegador no puede reproducir el video muestra el póster', () => {
    motion(false);
    render(<AppProvider><BrandIntro onClose={() => {}} /></AppProvider>);
    fireEvent.error(document.querySelector('video.cv-intro-video')!);
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('img.cv-intro-video')).toHaveAttribute('src', INTRO_POSTER);
  });
  it('los archivos de video existen, pesan menos de 4 MB y llevan créditos', () => {
    for (const file of ['public/video/chulla-vida-intro-1080.mp4', 'public/video/chulla-vida-intro-1080.webm', 'public/video/chulla-vida-intro-720x1280.mp4', 'public/video/chulla-vida-hero-1080.mp4', 'public/video/chulla-vida-hero-1080.webm', 'public/video/chulla-vida-hero-720x1280.mp4']) {
      const size = readFileSync(file).length;
      expect(size).toBeGreaterThan(100_000);
      expect(size).toBeLessThan(4 * 1024 * 1024);
    }
    expect(readFileSync('public/video/chulla-vida-intro-poster.webp').subarray(8, 12).toString()).toBe('WEBP');
    expect(readFileSync('public/video/CREDITS.md', 'utf8')).toMatch(/Wikimedia Commons/);
  });
});

describe('botón de cuenta en la cabecera', () => {
  it('sin sesión ofrece «Entrar / Crear cuenta» y abre la cuenta en «crear»', () => {
    const onAccount = vi.fn();
    window.addEventListener('cv3:account', onAccount);
    render(<AccountButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar o crear cuenta' }));
    expect((onAccount.mock.calls[0][0] as CustomEvent).detail).toEqual({ tab: 'signup' });
    window.removeEventListener('cv3:account', onAccount);
  });
  it('con sesión guardada muestra la inicial y el nombre, nunca el correo completo', async () => {
    localStorage.setItem('sb-proyecto-auth-token', '{}');
    supabase.session = { user: { email: 'maria.quispe@example.com', user_metadata: { display_name: 'María José' } } };
    render(<AccountButton />);
    const button = await screen.findByRole('button', { name: 'Tu cuenta: María' });
    expect(button).toHaveTextContent('M');
    expect(document.body.textContent).not.toContain('@example.com');
    act(() => { supabase.listeners.forEach(listener => listener('SIGNED_OUT', null)); });
    expect(screen.getByRole('button', { name: 'Entrar o crear cuenta' })).toBeInTheDocument();
  });
  it('deduce un nombre corto de la sesión', () => {
    expect(identityFromSession(null)).toBeNull();
    expect(identityFromSession({ user: { email: 'pana@correo.ec', user_metadata: {} } })).toEqual({ name: 'pana', initial: 'P' });
    expect(identityFromSession({ user: { email: null, user_metadata: { full_name: '  ñusta  Andrade ' } } })).toEqual({ name: 'ñusta', initial: 'Ñ' });
  });
});

describe('nada queda «borrado»', () => {
  it('las entradas animadas parten de opacidad ≥ 0,85 y se apagan con la pestaña oculta', () => {
    const css = readFileSync('src/index.css', 'utf8');
    expect(css).toMatch(/\.cv-reveal-on \[data-reveal\]:not\(\.is-revealed\)\{opacity:\.88;/);
    expect(css).toMatch(/@keyframes cv-fade-up\{from\{opacity:\.88/);
    expect(css).toMatch(/html:not\(\.cv-motion-ok\) \*/);
    expect(readFileSync('src/main.tsx', 'utf8')).toContain("classList.toggle('cv-motion-ok'");
    for (const file of ['src/components/chulla/brand-motion.css', 'src/components/host/wallet.css', 'src/components/chulla/offline-route.css', 'src/features/catalog/vivo-2026.css']) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/@keyframes[^{]+\{from\{opacity:([\d.]+)/g)) expect(Number(match[1])).toBeGreaterThanOrEqual(0.85);
    }
  });
});
