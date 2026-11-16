// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuthPanel, ownOrganizationIds } from '../../src/features/auth/AuthPanel';
import { ROLE_EVENT, computeRole, isHostMode, isTravelerMode, roleStore, type RoleState } from '../../src/features/roles/role';
import { loadHostStats } from '../../src/features/host/HostDashboard';

type Row = Record<string, unknown>;
const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string; user_metadata?: Record<string, unknown> } },
  tables: {} as Record<string, Row[]>,
  inCalls: [] as [string, string, string[]][],
}));
function builder(table: string) {
  const filters: [string, unknown][] = [];
  let inFilter: [string, string[]] | null = null;
  const result = () => {
    const rows = (mocks.tables[table] ?? []).filter(row => filters.every(([column, value]) => !(column in row) || row[column] === value))
      .filter(row => !inFilter || inFilter[1].includes(String(row[inFilter[0]])));
    return { data: rows, error: null };
  };
  const chain = {
    select: () => chain, order: () => chain, limit: () => chain,
    eq: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
    in: (column: string, values: string[]) => { inFilter = [column, values]; mocks.inCalls.push([table, column, values]); return chain; },
    maybeSingle: async () => { const value = result(); return { data: value.data[0] ?? null, error: null }; },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
  };
  return chain;
}
const client = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signUp: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(), resend: vi.fn(), signInWithPassword: vi.fn(), signInWithOtp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
  },
  rpc: vi.fn(async () => ({ data: 'ok', error: null })),
  from: vi.fn((table: string) => builder(table)),
};
vi.mock('../../src/lib/supabase', () => ({
  supabaseConfiguration: () => ({ available: true, url: 'https://example.supabase.co', key: 'public' }),
  getSupabase: () => client,
}));

const base: RoleState = { welcomePath: null, server: null, prefs: { mode: null, hostIntent: false, travelerIntent: false } };
const signed = (hostOrganizations: number) => ({ userId: 'u', hostOrganizations, admin: false });
const user = { user: { id: 'u-1', email: 'quilla@example.com', user_metadata: { display_name: 'Quilla' } } };
const profile = { id: 'u-1', display_name: 'Quilla', home_country: '', home_city: '', travel_preferences: {}, marketing_consent_at: null };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); roleStore.reset();
  mocks.session = null; mocks.inCalls = [];
  mocks.tables = { profiles: [profile] };
});
afterEach(() => { cleanup(); });

describe('cálculo del rol', () => {
  it('sin sesión: invitado, o lo que eligió en la bienvenida', () => {
    expect(computeRole(base)).toBe('guest');
    expect(computeRole({ ...base, welcomePath: 'explore' })).toBe('guest');
    expect(computeRole({ ...base, welcomePath: 'traveler' })).toBe('traveler');
    expect(computeRole({ ...base, welcomePath: 'host' })).toBe('host');
  });
  it('con sesión: viajero por defecto, negocio si es dueño o miembro activo, ambos si también viaja', () => {
    expect(computeRole({ ...base, server: signed(0) })).toBe('traveler');
    expect(computeRole({ ...base, server: signed(2) })).toBe('host');
    expect(computeRole({ ...base, server: signed(1), welcomePath: 'traveler' })).toBe('both');
    expect(computeRole({ ...base, server: signed(1), prefs: { mode: null, hostIntent: false, travelerIntent: true } })).toBe('both');
    expect(computeRole({ ...base, server: signed(0), welcomePath: 'traveler', prefs: { mode: null, hostIntent: true, travelerIntent: false } })).toBe('both');
  });
  it('isTravelerMode / isHostMode: un invitado no está en ningún modo; ambos roles siguen el interruptor', () => {
    expect(isTravelerMode({ role: 'guest', mode: null })).toBe(false);
    expect(isHostMode({ role: 'guest', mode: null })).toBe(false);
    expect(isTravelerMode({ role: 'traveler', mode: 'traveler' })).toBe(true);
    expect(isHostMode({ role: 'host', mode: 'host' })).toBe(true);
    expect(isHostMode({ role: 'both', mode: 'traveler' })).toBe(false);
    expect(isHostMode({ role: 'both', mode: 'host' })).toBe(true);
  });
  it('emite cv3:role-changed y guarda solo la preferencia de vista, sin datos de la cuenta', () => {
    const heard: unknown[] = [];
    const listen = (event: Event) => heard.push((event as CustomEvent).detail);
    window.addEventListener(ROLE_EVENT, listen);
    roleStore.setServer({ userId: 'secret-user-id', hostOrganizations: 1, admin: false });
    roleStore.requestTraveler();
    window.removeEventListener(ROLE_EVENT, listen);
    expect(heard).toEqual([{ role: 'host', mode: 'host' }, { role: 'both', mode: 'traveler' }]);
    expect(isTravelerMode()).toBe(true);
    const stored = Object.keys(localStorage).map(key => localStorage.getItem(key)).join('|');
    expect(stored).not.toContain('secret-user-id');
    expect(JSON.parse(localStorage.getItem('chullavida:v3:role')!)).toEqual({ mode: 'traveler', hostIntent: false, travelerIntent: true });
  });
  it('organizaciones propias: dueña o miembro activo; un administrador no se vuelve anfitrión por ver todas', () => {
    const orgs = [{ id: 'a', name: 'A', kind: 'business', verification_status: 'in_review', owner_id: 'u' }, { id: 'b', name: 'B', kind: 'business', verification_status: 'in_review', owner_id: 'otra' }];
    expect(ownOrganizationIds('u', orgs, [{ organization_id: 'c', user_id: 'u', status: 'active' }, { organization_id: 'd', user_id: 'u', status: 'revoked' }])).toEqual(['a', 'c']);
    expect(ownOrganizationIds('admin', orgs, [])).toEqual([]);
  });
});

describe('cuenta separada por rol', () => {
  it('una cuenta viajera no ve nada de negocios ni anfitriones', async () => {
    mocks.session = user;
    render(<AuthPanel />);
    expect(await screen.findByRole('heading', { name: 'Tu cuenta viajera' })).toBeInTheDocument();
    await screen.findByLabelText('Nombre visible');
    expect(screen.queryByRole('radiogroup', { name: /Cómo quieres usar tu cuenta/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/negocio|anfitri|Solicitar revisión|Cobrado/i);
  });

  it('un negocio ve solo lo suyo: experiencias, solicitudes, pagos por revisar y cobros', async () => {
    mocks.session = user;
    mocks.tables = {
      profiles: [profile],
      organizations: [{ id: 'org-1', name: 'Tejidos Salasaka', kind: 'community', verification_status: 'in_review', owner_id: 'u-1' }],
      merchant_verification_requests: [{ id: 'req-1aaaaaaa', organization_id: 'org-1', status: 'submitted', created_at: '2026-11-15' }],
      experiences: [{ id: 'tejer', organization_id: 'org-1', status: 'draft' }, { id: 'otra', organization_id: 'org-x', status: 'published' }],
      experience_requests: [{ id: 'q1', organization_id: 'org-1', status: 'requested' }, { id: 'q2', organization_id: 'org-1', status: 'acknowledged' }],
      bookings: [{ id: 'b1', organization_id: 'org-1', status: 'awaiting_payment' }, { id: 'b2', organization_id: 'org-1', status: 'awaiting_merchant_confirmation' }],
      payouts: [{ amount: '30.50', currency: 'USD', status: 'paid' }, { amount: '12', currency: 'USD', status: 'scheduled' }],
    };
    render(<AuthPanel />);
    expect(await screen.findByRole('heading', { name: 'Tu cuenta de negocio' })).toBeInTheDocument();
    const tiles = await screen.findByRole('list', { name: 'Resumen de tu negocio' });
    await waitFor(() => expect(within(tiles).getByText('Experiencias').previousSibling).toHaveTextContent('1'));
    expect(within(tiles).getByText('Solicitudes').previousSibling).toHaveTextContent('2');
    expect(within(tiles).getByText('Pagos por revisar').previousSibling).toHaveTextContent('1');
    expect(within(tiles).getByText('Cobrado').previousSibling).toHaveTextContent('30,50');
    expect(tiles).toHaveTextContent(/12,00.*en camino/);
    expect(screen.getByText('Tejidos Salasaka', { selector: 'strong' })).toBeInTheDocument();
    // Nada del lado viajero.
    expect(screen.queryByRole('heading', { name: 'Mis compras y reservas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mi pasaporte/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre visible')).not.toBeInTheDocument();
    expect(mocks.inCalls).toContainEqual(['experiences', 'organization_id', ['org-1']]);
  });

  it('con ambos roles aparece el interruptor «Modo viajero / Modo negocio»', async () => {
    mocks.session = user;
    mocks.tables = { profiles: [profile], organization_members: [{ organization_id: 'org-9', user_id: 'u-1', status: 'active' }], organizations: [] };
    render(<AuthPanel />);
    await screen.findByRole('heading', { name: 'Tu cuenta de negocio' });
    fireEvent.click(screen.getByRole('button', { name: /También viajo/ }));
    const toggle = await screen.findByRole('radiogroup', { name: /Cómo quieres usar tu cuenta/ });
    expect(within(toggle).getByRole('radio', { name: 'Modo viajero' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('heading', { name: 'Tu cuenta viajera' })).toBeInTheDocument();
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Modo negocio' }));
    expect(await screen.findByRole('heading', { name: 'Tu cuenta de negocio' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mis compras y reservas' })).not.toBeInTheDocument();
  });

  it('al cerrar sesión el rol vuelve a calcularse sin servidor', async () => {
    roleStore.setServer({ userId: 'u-1', hostOrganizations: 1, admin: false });
    expect(roleStore.get().role).toBe('host');
    act(() => roleStore.setServer(null));
    expect(roleStore.get().role).toBe('guest');
  });
});

describe('cifras del negocio', () => {
  it('sin organizaciones devuelve ceros sin consultar; con error devuelve «sin dato», nunca un número inventado', async () => {
    expect(await loadHostStats(client as never, [])).toMatchObject({ experiences: 0, requests: 0, paymentsToReview: 0 });
    const failing = { from: () => ({ select: () => ({ in: () => Promise.resolve({ data: null, error: new Error('rls') }), then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: new Error('rls') }).then(r) }) }) };
    expect(await loadHostStats(failing as never, ['org-1'])).toMatchObject({ experiences: null, requests: null, paymentsToReview: null, payoutsPaid: null });
  });
});
