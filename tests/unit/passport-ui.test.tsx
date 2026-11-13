// @vitest-environment jsdom
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { experiences } from '../../src/domain/catalog';
import { PASSPORT_BOOK_KEY } from '../../src/domain/passport/book';
import { PassportView } from '../../src/components/chulla/PassportView';

const mocks = vi.hoisted(() => ({ close: vi.fn(), select: vi.fn(), toggle: vi.fn(), tab: vi.fn(), saved: [] as string[] }));
vi.mock('../../src/context/AppContext', () => ({ CURRENT_TRAVELER_EMAIL: 'demo@local', useApp: () => ({ places: [], reservations: [], language: 'es', role: 'turista', setActiveTab: mocks.tab, t: (value: string) => value }) }));
vi.mock('../../src/context/MembershipContext', () => ({ useMembership: () => ({ hasAccess: () => false }) }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2), saved: mocks.saved, toggle: mocks.toggle, select: mocks.select, online: true }) }));

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); mocks.saved = [];
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('libro del Pasaporte Guambra', () => {
  it('abre la portada, responde a flechas y gestos sin atrapar flechas de un campo de texto', () => {
    vi.useFakeTimers();
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mi pasaporte' }));
    expect(screen.getByLabelText('¿Cómo te llamas?')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(700); });
    fireEvent.keyDown(screen.getByLabelText('¿Cómo te llamas?'), { key: 'ArrowRight' });
    expect(screen.getByLabelText('¿Cómo te llamas?')).toBeInTheDocument();
    const book = screen.getByRole('region', { name: /Libro interactivo/ });
    fireEvent.keyDown(book, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Sierra' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(700); });
    fireEvent.touchStart(book, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(book, { changedTouches: [{ clientX: 70, clientY: 110 }] });
    expect(screen.getByRole('heading', { name: 'Costa' })).toBeInTheDocument();
  });
  it('usa lectura lineal con movimiento reducido y nunca convierte exploración en visita real', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const user = userEvent.setup();
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ver como libro' })).toBeInTheDocument();
    const first = experiences.find(record => record.localizedRegion === 'sierra')!;
    await user.click(screen.getByRole('button', { name: `Marcar explorado virtualmente ${first.title}` }));
    const stored = JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!);
    expect(stored.exploredIds).toContain(first.id);
    expect(stored).not.toHaveProperty('verified');
    expect(screen.getByText('Visitas reales verificadas').nextElementSibling).toHaveTextContent('0');
    expect(screen.getByText('Exploración virtual actualizada. No acredita una visita al lugar.')).toBeInTheDocument();
  });
  it('permite escribir un recuerdo y exige confirmar su borrado local', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const user = userEvent.setup();
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    await user.type(screen.getByLabelText('Título'), 'Mi recuerdo');
    await user.type(screen.getByLabelText('Tu historia'), 'Escuché una historia que quiero conservar.');
    await user.click(screen.getByRole('button', { name: 'Guardar historia' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Borrar historia Mi recuerdo' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(0);
  });
});
