// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experiences } from '../../src/domain/catalog';
import { PASSPORT_PAGES } from '../../src/domain/passport/book';
import { PassportView, nextMobileLeaf } from '../../src/components/chulla/PassportView';

const mocks = vi.hoisted(() => ({ close: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null, supabaseConfiguration: () => ({ available: false }) }));
vi.mock('../../src/context/AppContext', () => ({ CURRENT_TRAVELER_EMAIL: 'demo@local', useApp: () => ({ places: [], reservations: [], language: 'es', role: 'turista', setActiveTab: vi.fn(), t: (value: string) => value }) }));
vi.mock('../../src/context/MembershipContext', () => ({ useMembership: () => ({ hasAccess: () => false }) }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2), saved: [], toggle: vi.fn(), select: vi.fn(), online: true }) }));

/** Celular sin movimiento reducido: solo la consulta de ancho responde «sí». */
const phone = () => vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('max-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  phone();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const spread = () => document.querySelector('.pg-spread') as HTMLElement;
const counter = () => document.querySelector('.pg-pagination small')?.textContent ?? '';

describe('pasaporte a tamaño celular', () => {
  it('nextMobileLeaf recorre cara izquierda, derecha y siguiente pliego sin salirse del libro', () => {
    expect(nextMobileLeaf(0, 0, 1, 8)).toEqual({ page: 0, side: 1 });
    expect(nextMobileLeaf(0, 1, 1, 8)).toEqual({ page: 1, side: 0 });
    expect(nextMobileLeaf(1, 0, -1, 8)).toEqual({ page: 0, side: 1 });
    expect(nextMobileLeaf(0, 0, -1, 8)).toEqual({ page: 0, side: 0 });
    expect(nextMobileLeaf(7, 1, 1, 8)).toEqual({ page: 7, side: 1 });
  });

  it('muestra una página por pantalla y se pasa de hoja con botones y deslizando', () => {
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    const total = PASSPORT_PAGES.length * 2;
    expect(spread()).toHaveClass('pg-one-side');
    expect(spread()).toHaveAttribute('data-side', '0');
    expect(counter()).toContain(`1 de ${total}`);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(document.querySelector('.pg-pagination')).toHaveClass('pg-pagination-sticky');

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(spread()).toHaveAttribute('data-side', '1');
    expect(counter()).toContain(`2 de ${total}`);

    const book = screen.getByRole('region', { name: /Libro interactivo/ });
    fireEvent.touchStart(book, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(book, { changedTouches: [{ clientX: 200, clientY: 210 }] });
    expect(counter()).toContain(`3 de ${total}`);
    expect(spread()).toHaveAttribute('data-side', '0');
    expect(screen.getByRole('heading', { name: 'Este viaje lleva tu nombre' })).toBeInTheDocument();

    // Un gesto vertical (scroll) no cambia de hoja.
    fireEvent.touchStart(book, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(book, { changedTouches: [{ clientX: 150, clientY: 400 }] });
    expect(counter()).toContain(`3 de ${total}`);

    fireEvent.touchStart(book, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(book, { changedTouches: [{ clientX: 220, clientY: 205 }] });
    expect(counter()).toContain(`2 de ${total}`);
  });

  it('las pestañas llevan a la cara izquierda del pliego elegido', () => {
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: PASSPORT_PAGES[2].label }));
    expect(spread()).toHaveAttribute('data-side', '0');
    expect(counter()).toContain(`5 de ${PASSPORT_PAGES.length * 2}`);
  });

  it('el CSS de celular oculta la otra cara, pone sellos grandes en 2 columnas y botones de 44 px o más', () => {
    const css = readFileSync(resolve('src/features/passport/passport-book.css'), 'utf8');
    const phoneBlock = css.slice(css.lastIndexOf('@media(max-width:600px){'));
    expect(phoneBlock).toContain('.pg-one-side[data-side="0"]>.pg-page:nth-of-type(2)');
    expect(phoneBlock).toContain('.pg-stamps{grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(phoneBlock).toMatch(/\.pg-tabs button\{min-height:44px/);
    expect(phoneBlock).toMatch(/\.pg-pagination-sticky \.button\{min-width:48px;min-height:48px/);
  });
});
