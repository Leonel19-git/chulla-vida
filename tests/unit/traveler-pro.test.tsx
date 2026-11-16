// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthPanel } from '../../src/features/auth/AuthPanel';
import { roleStore } from '../../src/features/roles/role';

const mocks = vi.hoisted(() => ({ membership: null as null | { isActive: boolean; plan?: { label: string }; access: string[] } }));
function builder(table: string) {
  const rows = table === 'profiles' ? [{ id: 'u-1', display_name: 'Inti', home_country: '', home_city: '', travel_preferences: {}, marketing_consent_at: null }] : [];
  const chain = {
    select: () => chain, order: () => chain, limit: () => chain, eq: () => chain, in: () => chain,
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return chain;
}
const client = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: { user: { id: 'u-1', email: 'inti@example.com', user_metadata: { display_name: 'Inti' } } } }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(),
  },
  rpc: vi.fn(), from: vi.fn((table: string) => builder(table)),
};
vi.mock('../../src/lib/supabase', () => ({ supabaseConfiguration: () => ({ available: true }), getSupabase: () => client }));
vi.mock('../../src/context/MembershipContext', () => ({
  useMembership: () => {
    if (!mocks.membership) throw new Error('MembershipProvider is required');
    const value = mocks.membership;
    return { isActive: value.isActive, plan: value.plan, hasAccess: (feature: string) => value.isActive && value.access.includes(feature) };
  },
}));

const wrap = (node: ReactNode) => render(<>{node}</>);
beforeEach(() => { localStorage.clear(); roleStore.reset(); mocks.membership = null; });
afterEach(() => cleanup());

describe('perfil con plan PRO', () => {
  it('con membresía activa: insignia PRO, marco dorado y beneficios en iconos', async () => {
    mocks.membership = { isActive: true, plan: { label: 'Anual' }, access: ['offline', 'community', 'premium-passport'] };
    wrap(<AuthPanel />);
    const badge = await screen.findByLabelText('Plan PRO activo');
    expect(badge).toHaveTextContent('PRO');
    const card = badge.closest('header')!;
    expect(card).toHaveClass('traveler-card', 'is-pro');
    expect(card).toHaveTextContent('Anual de prueba');
    const benefits = within(card).getByRole('list', { name: 'Beneficios PRO' });
    expect(within(benefits).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Sin conexión', 'Comunidad', 'Pasaporte premium']);
  });

  it('el plan mensual no lista el pasaporte premium (solo es del anual)', async () => {
    mocks.membership = { isActive: true, plan: { label: 'Mensual' }, access: ['offline', 'community'] };
    wrap(<AuthPanel />);
    const benefits = await screen.findByRole('list', { name: 'Beneficios PRO' });
    expect(benefits).not.toHaveTextContent('Pasaporte premium');
  });

  it('sin membresía (o sin proveedor) el perfil se ve normal, sin PRO', async () => {
    wrap(<AuthPanel />);
    await screen.findByRole('heading', { name: 'Tu cuenta viajera' });
    await screen.findByText('Cuenta de viajero');
    expect(screen.queryByLabelText('Plan PRO activo')).not.toBeInTheDocument();
    expect(document.querySelector('.traveler-card')).not.toHaveClass('is-pro');
    mocks.membership = { isActive: false, access: [] };
    cleanup(); wrap(<AuthPanel />);
    await screen.findByText('Cuenta de viajero');
    expect(screen.queryByText('PRO')).not.toBeInTheDocument();
  });
});
