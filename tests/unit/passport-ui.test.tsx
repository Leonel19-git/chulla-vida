// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { experiences } from '../../src/domain/catalog';
import { albumLabel } from '../../src/domain/album';
import { PASSPORT_BOOK_KEY } from '../../src/domain/passport/book';
import { WALLET_KEY } from '../../src/domain/payments/purchase';
import { DEMO_VALIDATIONS_KEY, SEEN_STAMPS_KEY } from '../../src/domain/passport/stamps';
import { resetWalletMemory } from '../../src/features/wallet/store';
import { PassportView } from '../../src/components/chulla/PassportView';

const mocks = vi.hoisted(() => ({ close: vi.fn(), select: vi.fn(), plans: vi.fn(), saved: [] as string[], premium: false,
  client: null as null | object, stampRows: [] as unknown[], stampFilters: [] as [string, string][] }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => mocks.client, supabaseConfiguration: () => ({ available: Boolean(mocks.client) }) }));
vi.mock('../../src/context/AppContext', () => ({ CURRENT_TRAVELER_EMAIL: 'demo@local', useApp: () => ({ places: [], reservations: [], language: 'es', role: 'turista', setActiveTab: vi.fn(), t: (value: string) => value }) }));
vi.mock('../../src/context/MembershipContext', () => ({ useMembership: () => ({ hasAccess: () => mocks.premium }) }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: experiences.filter(record => record.localizedRegion === 'sierra').slice(0, 2), saved: mocks.saved, toggle: vi.fn(), select: mocks.select, online: true }) }));

const sierra = experiences.filter(record => record.localizedRegion === 'sierra');
const NOW = '2026-11-14T12:00:00.000Z';
const walletRecord = (record: (typeof experiences)[number], code: string, status = 'test_approved') => ({ id: `w-${code}`, code, kind: 'test_purchase', status, mode: 'test', experienceId: record.id,
  title: record.title, province: record.province, date: '2026-12-01', people: 1, currency: 'USD', unitCents: 1000, totalCents: 1000, priceNote: 'Referencial',
  buyer: { name: 'Ana', emailMasked: 'a***@correo.ec', documentType: null, documentMasked: null }, trip: 'Mi viaje', batchId: null, attempts: 0, createdAt: NOW, updatedAt: NOW });
const media = (reduced = false) => vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: reduced && query.includes('reduced-motion'), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
const view = () => render(<PassportView onClose={mocks.close} onChoosePlans={mocks.plans} />);
const index = () => screen.getByRole('navigation', { name: 'Índice del pasaporte' });
const goTab = (name: string) => fireEvent.click(within(index()).getByRole('button', { name }));
const book = () => screen.getByRole('region', { name: /Libro del pasaporte/ });
const slot = (id: string) => document.querySelector<HTMLElement>(`.pg-slot[data-number="${albumLabel(id)}"]`)!;
const chip = (label: string) => screen.getByText(label, { selector: '.pg-chip span' }).previousElementSibling?.textContent;
const signedIn = () => {
  const query = { select: () => query, eq: (column: string, value: string) => { mocks.stampFilters.push([column, value]); return query; }, limit: async () => ({ data: mocks.stampRows, error: null }) };
  mocks.client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }) }, from: (table: string) => { expect(table).toBe('passport_stamps'); return query; } };
};
const originalAnimate = Element.prototype.animate;

beforeEach(() => {
  localStorage.clear(); resetWalletMemory(); vi.clearAllMocks();
  mocks.saved = []; mocks.premium = false; mocks.client = null; mocks.stampRows = []; mocks.stampFilters = [];
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  media();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); Element.prototype.animate = originalAnimate; });

describe('Pasaporte Guambra · libro abierto en computador', () => {
  it('empieza cerrado con el logo 2026 (nunca chulla-vida-logo.png); «Abrir» gira la tapa y el teclado pasa pliegos sin robar las flechas a un campo', () => {
    view();
    expect(screen.getByRole('img', { name: 'Bandera del Ecuador' }).querySelector('img')).toHaveAttribute('src', '/brand/ecuador-flag.svg');
    expect(document.body.innerHTML).not.toContain('chulla-vida-logo.png');
    expect(screen.getByRole('heading', { level: 3, name: 'Pasaporte Guambra' })).toBeInTheDocument();
    expect(screen.getByText('Viajero/a')).toBeInTheDocument();
    expect(screen.getByText('Tu álbum del Ecuador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('heading', { name: 'Mi carné' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mi Ecuador' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('Tu apodo'), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Mi carné' })).toBeInTheDocument();

    fireEvent.keyDown(book(), { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Sierra' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Costa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mi carné' })).not.toBeInTheDocument();
    fireEvent.keyDown(book(), { key: 'End' });
    expect(screen.getByRole('heading', { name: 'Pega con código' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Llévalo contigo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    fireEvent.keyDown(book(), { key: 'ArrowLeft' });
    expect(screen.getByRole('heading', { name: 'Cromos especiales' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mi diario' })).toBeInTheDocument();
    fireEvent.keyDown(book(), { key: 'Home' });
    expect(screen.getByRole('heading', { level: 3, name: 'Pasaporte Guambra' })).toBeInTheDocument();
    expect(screen.getByText('Tapa', { selector: '.pg-counter strong' })).toBeInTheDocument();
  });

  it('las pestañas de índice llevan a su pliego y marcan la página abierta', () => {
    view();
    goTab('Galápagos');
    expect(within(index()).getByRole('button', { name: 'Galápagos' })).toHaveAttribute('aria-current', 'page');
    expect(within(index()).getByRole('button', { name: 'Amazonía' })).toHaveClass('is-open');
    expect(screen.getByRole('heading', { name: 'Amazonía' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Galápagos' })).toBeInTheDocument();
    expect(document.querySelectorAll('.pg-slot')).toHaveLength(19 + 12);
    expect(screen.getByText('6–7 de 11', { selector: '.pg-counter strong' })).toBeInTheDocument();
  });

  it('cada casilla muestra su estado honesto y abrir una ficha nunca da más que «visto»', () => {
    mocks.saved = [sierra[5]!.id];
    localStorage.setItem(WALLET_KEY, JSON.stringify({ version: 1, records: [walletRecord(sierra[2]!, 'PRB-ABC234')] }));
    localStorage.setItem(PASSPORT_BOOK_KEY, JSON.stringify({ version: 1, nickname: '', origin: '', exploredIds: [sierra[3]!.id], journal: [] }));
    localStorage.setItem(DEMO_VALIDATIONS_KEY, JSON.stringify([{ code: 'PRB-XYZ789', experienceId: sierra[4]!.id, title: sierra[4]!.title, region: 'sierra', validatedAt: NOW, mode: 'demo' }]));
    view();
    goTab('Sierra');
    expect(document.querySelectorAll('.pg-slot')).toHaveLength(13 + 7);
    expect(slot(sierra[5]!.id)).toHaveAttribute('data-estado', 'en_sobre');
    expect(slot(sierra[5]!.id).getAttribute('aria-label')).toBe(`${albumLabel(sierra[5]!.id)} · ${sierra[5]!.title} · En mi sobre`);
    expect(slot(sierra[2]!.id)).toHaveAttribute('data-estado', 'comprado');
    expect(slot(sierra[2]!.id).getAttribute('aria-label')).toContain('Comprado · por vivir · compra de prueba, sin cobro');
    expect(slot(sierra[2]!.id)).toHaveTextContent(/Comprado.*Prueba/);
    expect(slot(sierra[3]!.id)).toHaveAttribute('data-estado', 'visto');
    expect(slot(sierra[4]!.id)).toHaveAttribute('data-estado', 'pegado_demo');
    expect(slot(sierra[4]!.id).getAttribute('aria-label')).toContain('Pegado de demostración · no cuenta como visita');
    expect(slot(sierra[4]!.id)).toHaveTextContent('Demo');
    expect(slot(sierra[1]!.id)).toHaveAttribute('data-estado', 'album');
    expect(slot(sierra[1]!.id)).toHaveTextContent('Pega aquí');
    expect(document.querySelectorAll('.pg-slot .pg-foil')).toHaveLength(0);

    fireEvent.click(slot(sierra[0]!.id));
    expect(mocks.close).toHaveBeenCalled();
    expect(mocks.select).toHaveBeenCalledWith(sierra[0]!.id);
    const stored = JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!);
    expect(stored.exploredIds).toEqual([sierra[3]!.id, sierra[0]!.id]);
    expect(stored).not.toHaveProperty('verified');
    expect(slot(sierra[0]!.id)).toHaveAttribute('data-estado', 'visto');
    goTab('Carné');
    expect(chip('Pegados')).toBe('0');
    expect(chip('Vistos')).toBe('2');
    expect(chip('Te faltan')).toBe(String(51 - 5));
  });

  it('con sesión, las visitas verificadas del servidor pegan el cromo con brillo foil y fecha', async () => {
    mocks.stampRows = [{ id: 'stamp-1', experience_id: sierra[0]!.id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-10T15:00:00Z' }];
    signedIn();
    view();
    goTab('Sierra');
    await waitFor(() => expect(slot(sierra[0]!.id)).toHaveAttribute('data-estado', 'pegado'));
    expect(slot(sierra[0]!.id).querySelector('.pg-cromo.pg-foil')).not.toBeNull();
    expect(slot(sierra[0]!.id).getAttribute('aria-label')).toMatch(/Pegado · verificado el 10 nov/);
    expect(slot(sierra[0]!.id)).toHaveTextContent(/10 nov/i);
    expect(document.querySelectorAll('.pg-slot .pg-foil')).toHaveLength(1);
    expect(mocks.stampFilters).toEqual([['user_id', 'user-1'], ['stamp_type', 'verified_visit']]);
    goTab('Carné');
    expect(chip('Pegados')).toBe('1');
    expect(screen.getByText('Cuenta conectada: tus pegados vienen del servidor.')).toBeInTheDocument();
    goTab('Especiales');
    const specials = [...document.querySelectorAll<HTMLElement>('.pg-special')];
    expect(specials.find(item => item.textContent?.includes('Huella real'))).toHaveClass('is-foil');
    expect(document.querySelectorAll('.pg-special .pg-foil')).toHaveLength(1);
  });

  it('pega con código: el comprobante de prueba da «Pegado de demostración», sin brillo y nunca visita verificada', async () => {
    localStorage.setItem(WALLET_KEY, JSON.stringify({ version: 1, records: [walletRecord(sierra[1]!, 'PRB-ABC234')] }));
    const user = userEvent.setup();
    view();
    goTab('Sierra');
    expect(slot(sierra[1]!.id)).toHaveAttribute('data-estado', 'comprado');
    goTab('Código');
    await user.type(screen.getByLabelText('Código del comprobante'), 'PRB-NOPE22');
    await user.click(screen.getByRole('button', { name: 'Pegar demo' }));
    expect(screen.getByText('No encontramos PRB-NOPE22 en tu billetera.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Código del comprobante'));
    await user.type(screen.getByLabelText('Código del comprobante'), 'prb-abc234');
    await user.click(screen.getByRole('button', { name: 'Pegar demo' }));
    expect(screen.getByText(`¡Pegado de demostración! ${sierra[1]!.title}. No cuenta como visita.`)).toBeInTheDocument();
    goTab('Sierra');
    expect(slot(sierra[1]!.id)).toHaveAttribute('data-estado', 'pegado_demo');
    expect(slot(sierra[1]!.id).querySelector('.pg-foil')).toBeNull();
    goTab('Carné');
    expect(chip('Pegados')).toBe('0');
    expect(chip('Demo')).toBe('1');
    const stored = JSON.parse(localStorage.getItem(DEMO_VALIDATIONS_KEY)!);
    expect(stored).toEqual([expect.objectContaining({ code: 'PRB-ABC234', experienceId: sierra[1]!.id, mode: 'demo' })]);
    expect(JSON.stringify(stored)).not.toMatch(/verified/);
  });

  it('el diario es privado y local: escribir una nota y confirmar su borrado', async () => {
    const user = userEvent.setup();
    view();
    goTab('Diario');
    expect(screen.getByText('Vive solo en este navegador. Nadie más lo ve.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Título'), 'Mi recuerdo');
    await user.type(screen.getByLabelText('Tu historia'), 'Escuché una historia que quiero conservar.');
    await user.click(screen.getByRole('button', { name: 'Pegar nota' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(1);
    expect(screen.getByText('Nota pegada en tu diario.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Borrar nota Mi recuerdo' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    expect(JSON.parse(localStorage.getItem(PASSPORT_BOOK_KEY)!).journal).toHaveLength(0);
  });

  it('descarga una copia autónoma del pasaporte con el álbum', async () => {
    const blobs: Blob[] = [];
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:pasaporte'; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mocks.saved = [sierra[0]!.id];
    view();
    fireEvent.keyDown(book(), { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar mi pasaporte' }));
    URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke; click.mockRestore();
    expect(screen.getByText('Listo: se descargó. Se abre sin internet.')).toBeInTheDocument();
    const html = await blobs[0]!.text();
    expect(html).toContain('Pasaporte Guambra');
    expect(html).toContain('En mi sobre');
    expect(html).toContain('No acredita visitas reales');
    expect(html).not.toMatch(/<script|<img|<link/i);
  });

  it('el golpe de sello es solo para lo nuevo y queda guardado como visto', () => {
    mocks.saved = [sierra[5]!.id, sierra[6]!.id];
    localStorage.setItem(SEEN_STAMPS_KEY, JSON.stringify([`${sierra[5]!.id}:planned`]));
    view();
    expect(screen.getByText('1 cromo nuevo')).toBeInTheDocument();
    goTab('Sierra');
    expect(slot(sierra[6]!.id)).toHaveClass('is-fresh');
    expect(slot(sierra[5]!.id)).not.toHaveClass('is-fresh');
    expect(JSON.parse(localStorage.getItem(SEEN_STAMPS_KEY)!)).toEqual(expect.arrayContaining([`${sierra[5]!.id}:planned`, `${sierra[6]!.id}:planned`]));
    // jsdom no tiene AnimationEvent: React escucha el nombre con prefijo. Se disparan ambos.
    const face = slot(sierra[6]!.id).querySelector('.pg-cromo')!;
    for (const type of ['animationend', 'webkitAnimationEnd']) fireEvent(face, new Event(type, { bubbles: true }));
    expect(slot(sierra[6]!.id)).not.toHaveClass('is-fresh');
  });

  it('la hoja gira en 3D (rotateY, 480 ms); con movimiento reducido no hay giro 3D, solo un fundido corto', () => {
    const flips: { keyframes: Keyframe[]; options: KeyframeAnimationOptions; finish: () => void }[] = [];
    Element.prototype.animate = vi.fn(function (keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = { onfinish: null as null | (() => void), cancel: vi.fn() };
      flips.push({ keyframes, options, finish: () => animation.onfinish?.() });
      return animation as unknown as Animation;
    }) as unknown as typeof Element.prototype.animate;
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const leaf = document.querySelector('.pg-leaf');
    expect(leaf).toHaveAttribute('data-dir', 'next');
    expect(leaf).toHaveAttribute('aria-hidden', 'true');
    expect(leaf).toHaveAttribute('inert');
    expect(flips[0]!.keyframes).toEqual([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }]);
    expect(flips[0]!.options).toMatchObject({ duration: 480 });
    act(() => flips[0]!.finish());
    expect(document.querySelector('.pg-leaf')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Mi carné' })).toBeInTheDocument();
    cleanup();

    flips.length = 0;
    media(true);
    view();
    expect(document.querySelector('.pg-passport')).toHaveAttribute('data-motion', 'reduced');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.querySelector('.pg-leaf')).toBeNull();
    expect(flips.filter(flip => JSON.stringify(flip.keyframes).includes('rotateY'))).toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Mi carné' })).toBeInTheDocument();
    expect(document.querySelector('.pg-side.is-entering')).not.toBeNull();
  });

  it('vista de lectura: todas las páginas en lista, sin libro', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Vista de lectura' }));
    for (const name of ['Mi carné', 'Mi Ecuador', 'Sierra', 'Costa', 'Amazonía', 'Galápagos', 'Cromos especiales', 'Mi diario', 'Pega con código', 'Llévalo contigo']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 3, name: 'Pasaporte Guambra' })).toBeInTheDocument();
    expect(document.querySelectorAll('.pg-slot')).toHaveLength(51);
    expect(screen.queryByRole('region', { name: /Libro del pasaporte/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver como libro' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('acabado PRO: brillo foil en la tapa; sin PRO, un enlace discreto a planes', () => {
    mocks.premium = true;
    view();
    expect(document.querySelector('.pg-cover')).toHaveClass('is-pro', 'pg-foil');
    fireEvent.keyDown(book(), { key: 'End' });
    expect(screen.getByText('Acabado PRO activo')).toBeInTheDocument();
    cleanup();
    mocks.premium = false;
    view();
    expect(document.querySelector('.pg-cover')).not.toHaveClass('is-pro');
    fireEvent.keyDown(book(), { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: 'Acabado PRO con brillo' }));
    expect(mocks.plans).toHaveBeenCalled();
  });
});
