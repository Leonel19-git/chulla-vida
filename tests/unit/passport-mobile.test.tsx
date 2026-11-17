// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experiences } from '../../src/domain/catalog';
import { resetWalletMemory } from '../../src/features/wallet/store';
import { PassportView } from '../../src/components/chulla/PassportView';

const mocks = vi.hoisted(() => ({ close: vi.fn(), select: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null, supabaseConfiguration: () => ({ available: false }) }));
vi.mock('../../src/context/AppContext', () => ({ CURRENT_TRAVELER_EMAIL: 'demo@local', useApp: () => ({ places: [], reservations: [], language: 'es', role: 'turista', setActiveTab: vi.fn(), t: (value: string) => value }) }));
vi.mock('../../src/context/MembershipContext', () => ({ useMembership: () => ({ hasAccess: () => false }) }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2), saved: [], toggle: vi.fn(), select: mocks.select, online: true }) }));

/** Celular (< 900 px); con `reduced`, además «reducir movimiento». */
const phone = (reduced = false) => vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('max-width') || (reduced && query.includes('reduced-motion')), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
const view = () => render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
const counter = () => document.querySelector('.pg-pager .pg-counter strong')?.textContent;
const current = () => document.querySelector<HTMLElement>('.pg-sheet[data-role="current"]')!;
const deck = () => document.querySelector<HTMLElement>('.pg-deck')!;
const finger = { pointerId: 7, pointerType: 'touch', button: 0 };
const press = (x: number, y = 300) => fireEvent.pointerDown(deck(), { ...finger, clientX: x, clientY: y });
const drag = (x: number, y = 304) => fireEvent.pointerMove(deck(), { ...finger, clientX: x, clientY: y });
const lift = (x: number, y = 304) => fireEvent.pointerUp(deck(), { ...finger, clientX: x, clientY: y });
const swipe = (from: number, to: number) => { press(from); drag((from + to) / 2); drag(to); lift(to); };
const css = readFileSync(resolve('src/features/passport/passport-book.css'), 'utf8');

beforeEach(() => {
  localStorage.clear(); resetWalletMemory(); vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  phone();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Pasaporte Guambra a tamaño celular', () => {
  it('muestra UNA página por pantalla: solo la actual es interactiva y el contador dice «1 de 12»', () => {
    view();
    expect(document.querySelector('.pg-passport')).toHaveAttribute('data-layout', 'phone');
    expect(document.querySelectorAll('.pg-sheet[data-role="current"]')).toHaveLength(1);
    for (const sheet of document.querySelectorAll('.pg-sheet:not([data-role="current"])')) {
      expect(sheet).toHaveAttribute('inert');
      expect(sheet).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(counter()).toBe('1 de 12');
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();
  });

  it('deslizar sigue al dedo 1:1 y pasa la hoja; un gesto vertical no cambia de hoja y un arrastre corto vuelve a su sitio', async () => {
    view();
    press(300); drag(260);
    expect(current().style.transform).toMatch(/translate3d\(-40(\.0)?px/);
    drag(140);
    expect(current().style.transform).toMatch(/translate3d\(-160(\.0)?px/);
    lift(140);
    await waitFor(() => expect(counter()).toBe('2 de 12'), { timeout: 3000 });
    expect(current().style.transform).toBe('');
    expect(screen.getByRole('heading', { name: 'Mi carné' })).toBeInTheDocument();

    press(200, 100); drag(206, 190); lift(206, 190);
    expect(counter()).toBe('2 de 12');
    expect(current().style.transform).toBe('');

    // Arrastre corto (menos de 24 px): ni la distancia ni la velocidad alcanzan para pasar de hoja.
    press(300); drag(288); drag(280);
    expect(current().style.transform).toMatch(/-20/);
    lift(280);
    await waitFor(() => expect(current().style.transform).toBe(''), { timeout: 3000 });
    expect(counter()).toBe('2 de 12');

    swipe(100, 260);
    await waitFor(() => expect(counter()).toBe('1 de 12'), { timeout: 3000 });
  });

  it('en la primera página, deslizar hacia atrás solo cede un poco (banda elástica) y vuelve', async () => {
    view();
    press(100); drag(150); drag(200);
    expect(current().style.transform).toMatch(/translate3d\(20(\.0)?px/);
    lift(200);
    await waitFor(() => expect(current().style.transform).toBe(''), { timeout: 3000 });
    expect(counter()).toBe('1 de 12');
  });

  it('los botones ◀ ▶ pasan de hoja y las pestañas llevan directo a su página (Amazonía partida en 21–30 y 31–39)', async () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(counter()).toBe('2 de 12'), { timeout: 3000 });
    const index = screen.getByRole('navigation', { name: 'Índice del pasaporte' });
    fireEvent.click(within(index).getByRole('button', { name: 'Amazonía' }));
    expect(counter()).toBe('6 de 12');
    expect(within(index).getByRole('button', { name: 'Amazonía' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Amazonía' })).toBeInTheDocument();
    expect(current()).toHaveTextContent('21–30');
    expect(current().querySelectorAll('.pg-slot')).toHaveLength(10);
    expect(current().querySelector('.pg-grid ol')).toHaveAttribute('data-cols', '4');
    expect(current()).toHaveClass('is-entering');
    fireEvent.keyDown(current(), { key: 'ArrowRight' });
    await waitFor(() => expect(counter()).toBe('7 de 12'), { timeout: 3000 });
    expect(current()).toHaveTextContent('31–39');
    expect(current().querySelectorAll('.pg-slot')).toHaveLength(9);
  });

  it('con movimiento reducido no hay deslizamiento animado: la hoja no sigue al dedo y el cambio es un fundido', () => {
    phone(true);
    view();
    expect(document.querySelector('.pg-passport')).toHaveAttribute('data-motion', 'reduced');
    press(300); drag(200); drag(140);
    expect(current().style.transform).toBe('');
    lift(140);
    expect(counter()).toBe('2 de 12');
    expect(current()).toHaveClass('is-entering');
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(counter()).toBe('3 de 12');
  });

  it('un toque sobre un cromo lo abre; arrastrar sobre él no lo abre', async () => {
    view();
    const index = screen.getByRole('navigation', { name: 'Índice del pasaporte' });
    fireEvent.click(within(index).getByRole('button', { name: 'Sierra' }));
    const first = current().querySelector<HTMLElement>('.pg-slot')!;
    fireEvent.pointerDown(first, { ...finger, clientX: 300, clientY: 300 });
    fireEvent.pointerMove(first, { ...finger, clientX: 286, clientY: 301 });
    fireEvent.pointerUp(first, { ...finger, clientX: 282, clientY: 301 });
    fireEvent.click(first);
    expect(counter()).toBe('4 de 12');
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
    await waitFor(() => expect(current().style.transform).toBe(''), { timeout: 3000 });
    fireEvent.pointerDown(first, { ...finger, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(first, { ...finger, clientX: 301, clientY: 300 });
    fireEvent.click(first);
    expect(mocks.close).toHaveBeenCalled();
    expect(mocks.select).toHaveBeenCalledWith(experiences.find(record => record.localizedRegion === 'sierra')!.id);
  });

  it('el CSS de celular: hoja a pantalla completa con zona segura, navegación siempre a la vista y objetivos de 44 px o más', () => {
    const phoneBlock = css.slice(css.indexOf('@media (max-width: 899.98px) {'));
    expect(phoneBlock).toMatch(/height: 100dvh/);
    expect(phoneBlock).toContain('padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)');
    expect(css).toMatch(/\.pg-pager \{[^}]*padding-bottom: max\(8px, env\(safe-area-inset-bottom\)\)/);
    expect(css).toMatch(/\.pg-index\.is-row \.pg-tab \{[^}]*min-height: 44px; min-width: 44px/);
    expect(css).toMatch(/\.pg-nav \{ width: 58px; height: 48px; \}/);
    expect(css).toMatch(/\.pg-deck \{[^}]*touch-action: pan-y/);
    expect(css).toMatch(/\.is-phone \.pg-stage \{[^}]*min-height: 0;[^}]*overflow: hidden/);
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.pg-book, [^{]*\{ transition: none; \}/);
    expect(reduced).toMatch(/\.pg-sheet\.is-entering, \.pg-side\.is-entering \{ animation: pg-fade-in/);
  });
});
