// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MembershipProvider, useMembership } from '../../src/context/MembershipContext';
import { createDemoMembership, MEMBERSHIP_KEY } from '../../src/lib/membership';

vi.mock('../../src/context/AppContext', () => ({
  useApp: () => ({ role: 'turista' }), CURRENT_TRAVELER_EMAIL: 'demo@example.test',
}));
function AccessProbe() {
  const membership = useMembership();
  return <><output>{membership.hasAccess('premium-passport') ? 'unlocked' : 'locked'}</output>
    <button onClick={() => membership.activateDemoPlan('annual')}>Activate</button></>;
}
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllEnvs(); });
describe('production membership boundary', () => {
  it('ignores a forged local plan and cannot activate the simulation in a published build', () => {
    vi.stubEnv('DEV', false);
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(createDemoMembership('annual', 'demo@example.test')));
    render(<MembershipProvider><AccessProbe /></MembershipProvider>);
    expect(screen.getByText('locked')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    expect(screen.getByText('locked')).toBeTruthy();
  });
  it('retains the explicitly local development simulation', () => {
    vi.stubEnv('DEV', true);
    render(<MembershipProvider><AccessProbe /></MembershipProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    expect(screen.getByText('unlocked')).toBeTruthy();
  });
});
