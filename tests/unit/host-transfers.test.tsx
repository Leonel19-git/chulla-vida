// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  loadBankAccount: vi.fn(async () => null),
  saveBankAccount: vi.fn(async () => undefined),
  loadTransfersToReview: vi.fn(async () => []),
  receiptUrl: vi.fn(),
  reviewTransfer: vi.fn(),
}));
vi.mock('../../src/features/payments/transferApi', () => api);
import { HostDashboard } from '../../src/features/host/HostDashboard';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function fakeClient(): SupabaseClient {
  const query = { in: () => Promise.resolve({ data: [], error: null }), then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) };
  return { from: () => ({ select: () => query }) } as unknown as SupabaseClient;
}

describe('panel de negocio: cobros por transferencia', () => {
  it('cada negocio registra su cuenta y revisa comprobantes desde su panel', async () => {
    const user = userEvent.setup();
    render(<HostDashboard client={fakeClient()} session={{ user: { id: 'u1', email: 'host@example.test' } } as unknown as Session}
      organizations={[{ id: 'org-1', name: 'Hostal Andino', kind: 'business', verification_status: 'unverified' }]} applications={[]} documents={[]} documentLinks={{}} busy={false}
      onApply={async () => true} onUpload={vi.fn()} onOpenDocument={vi.fn()} onSignOut={vi.fn()} />);
    await user.click(screen.getByText('Cobros por transferencia'));
    expect(screen.getByRole('heading', { name: /Cuenta para transferencias/ })).toBeInTheDocument();
    await waitFor(() => expect(api.loadBankAccount).toHaveBeenCalledWith('org-1'));
    await waitFor(() => expect(api.loadTransfersToReview).toHaveBeenCalledWith('org-1'));
  });
});
