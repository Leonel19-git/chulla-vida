// @vitest-environment jsdom
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { experiences } from '../../src/domain/catalog';
import { PASSPORT_BOOK_KEY } from '../../src/domain/passport/book';
import { WALLET_KEY } from '../../src/domain/payments/purchase';
import { DEMO_VALIDATIONS_KEY } from '../../src/domain/passport/stamps';
import { PassportView } from '../../src/components/chulla/PassportView';

const mocks = vi.hoisted(() => ({ close: vi.fn(), select: vi.fn(), toggle: vi.fn(), tab: vi.fn(), saved: [] as string[],
  client: null as null | object, stampRows: [] as unknown[], stampFilters: [] as [string, string][] }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => mocks.client, supabaseConfiguration: () => ({ available: Boolean(mocks.client) }) }));
vi.mock('../../src/context/AppContext', () => ({ CURRENT_TRAVELER_EMAIL: 'demo@local', useApp: () => ({ places: [], reservations: [], language: 'es', role: 'turista', setActiveTab: mocks.tab, t: (value: string) => value }) }));
vi.mock('../../src/context/MembershipContext', () => ({ useMembership: () => ({ hasAccess: () => false }) }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2), saved: mocks.saved, toggle: mocks.toggle, select: mocks.select, online: true }) }));

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); mocks.saved = []; mocks.client = null; mocks.stampRows = []; mocks.stampFilters = [];
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

  it('ya no dice que no hay sellos conectados: con sesión muestra las visitas verificadas del servidor', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const sierra = experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2);
    mocks.stampRows = [{ id: 'stamp-1', experience_id: sierra[0].id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-10T15:00:00Z' }];
    const query = { select: () => query, eq: (column: string, value: string) => { mocks.stampFilters.push([column, value]); return query; }, limit: async () => ({ data: mocks.stampRows, error: null }) };
    mocks.client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }) }, from: (table: string) => { expect(table).toBe('passport_stamps'); return query; } };
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    expect(screen.queryByText(/No hay sellos de visita real conectados/)).not.toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Sellos de Sierra' });
    expect(list).toHaveTextContent(sierra[0].title);
    expect(list).toHaveTextContent('Visita verificada');
    expect(screen.getByText('Visitas reales verificadas').nextElementSibling).toHaveTextContent('1');
    expect(mocks.stampFilters).toEqual([['user_id', 'user-1'], ['stamp_type', 'verified_visit']]);
  });

  it('un anfitrión demo valida el código del comprobante de prueba: sello demo, nunca visita verificada', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const record = experiences.filter(item => item.localizedRegion === 'sierra')[1];
    const now = '2026-11-14T12:00:00.000Z';
    localStorage.setItem(WALLET_KEY, JSON.stringify({ version: 1, records: [{ id: 'w1', code: 'PRB-ABC234', kind: 'test_purchase', status: 'test_approved', mode: 'test', experienceId: record.id,
      title: record.title, province: record.province, date: '2026-12-01', people: 1, currency: 'USD', unitCents: 1000, totalCents: 1000, priceNote: 'Referencial',
      buyer: { name: 'Ana', emailMasked: 'a***@correo.ec', documentType: null, documentMasked: null }, trip: 'Mi viaje', batchId: null, attempts: 0, createdAt: now, updatedAt: now }] }));
    const user = userEvent.setup();
    render(<PassportView onClose={mocks.close} onChoosePlans={vi.fn()} />);
    const list = screen.getByRole('list', { name: 'Sellos de Sierra' });
    expect(list).toHaveTextContent('Comprado · por visitar');
    await user.type(screen.getByLabelText('Código del comprobante'), 'PRB-NOPE22');
    await user.click(screen.getByRole('button', { name: 'Validar en demostración' }));
    expect(screen.getByText(/No encontramos PRB-NOPE22/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Código del comprobante'));
    await user.type(screen.getByLabelText('Código del comprobante'), 'prb-abc234');
    await user.click(screen.getByRole('button', { name: 'Validar en demostración' }));
    expect(screen.getByText(/visita validada en demostración\. No acredita una visita real/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Sellos de Sierra' })).toHaveTextContent('Visita validada en demostración');
    expect(screen.getByRole('list', { name: 'Sellos de Sierra' })).toHaveTextContent('Demostración · no acredita visita');
    expect(screen.getByText('Visitas reales verificadas').nextElementSibling).toHaveTextContent('0');
    expect(screen.getByText('Validadas en demostración').nextElementSibling).toHaveTextContent('1');
    const stored = JSON.parse(localStorage.getItem(DEMO_VALIDATIONS_KEY)!);
    expect(stored).toEqual([expect.objectContaining({ code: 'PRB-ABC234', experienceId: record.id, mode: 'demo' })]);
    expect(JSON.stringify(stored)).not.toMatch(/verified/);
  });
});
