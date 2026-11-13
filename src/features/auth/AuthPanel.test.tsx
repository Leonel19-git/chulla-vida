// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPanel } from './AuthPanel';

const mocks = vi.hoisted(() => ({ configured: false, signUp: vi.fn(), reset: vi.fn(), unsubscribe: vi.fn(),
  session: null as null | { user: { id: string; email: string } }, failedLoad: false,
  listener: null as null | ((event: string, session: unknown) => void),
}));
const client = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
    onAuthStateChange: vi.fn((listener: (event: string, session: unknown) => void) => {
      mocks.listener = listener; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    }),
    signUp: mocks.signUp,
    resetPasswordForEmail: mocks.reset,
  },
  from: vi.fn((table: string) => {
    const rows = table === 'user_roles' ? [{ role: 'admin' }]
      : table === 'organizations' ? [{ id: 'org-a', name: 'Organización privada A', kind: 'business', verification_status: 'in_review' }]
        : table === 'merchant_verification_requests' ? [{ id: 'request-a', organization_id: 'org-a', status: 'submitted', created_at: '2026-11-12' }]
          : table === 'experience_requests' ? [{ id: 'inquiry-a', experience_id: 'source-1', message: 'Consulta privada A', status: 'requested', created_at: '2026-11-12' }] : [];
    const response = Promise.resolve({ data: mocks.failedLoad ? null : rows, error: mocks.failedLoad ? new Error('network unavailable') : null });
    return Object.assign(response, { select: () => response, order: () => response, limit: () => response });
  }),
};
vi.mock('../../lib/supabase', () => ({
  supabaseConfiguration: () => mocks.configured ? { available: true, url: 'https://example.supabase.co', key: 'public' }
    : { available: false, reason: 'Falta conectar Supabase. Las cuentas y solicitudes en línea todavía no están disponibles.' },
  getSupabase: () => mocks.configured ? client : null,
}));

beforeEach(() => { mocks.configured = false; mocks.session = null; mocks.failedLoad = false; mocks.listener = null; mocks.signUp.mockReset(); mocks.reset.mockReset(); });
afterEach(cleanup);

describe('cuentas conectadas', () => {
  it('no recoge credenciales ni documentos cuando Supabase no está conectado', () => {
    render(<AuthPanel />);
    expect(screen.getByText(/Falta conectar Supabase/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
    expect(screen.queryByText('Solicitar revisión')).not.toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('exige una acción explícita de reconocimiento para enviar el alta', async () => {
    mocks.configured = true;
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const submit = screen.getByRole('button', { name: 'Crear cuenta y confirmar correo' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajero@example.com');
    await user.type(screen.getByLabelText('Cómo te llamas'), 'Viajero');
    await user.type(screen.getByLabelText('Contraseña'), 'contraseña-segura');
    await user.click(screen.getByRole('checkbox'));
    await user.click(submit);
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'viajero@example.com',
      options: expect.objectContaining({ data: { display_name: 'Viajero', draft_terms_acknowledged: true } }) }));
    expect(await screen.findByText(/Revisa tu correo para confirmar/)).toBeInTheDocument();
  });
  it('la recuperación no confirma públicamente que una cuenta existe', async () => {
    mocks.configured = true;
    mocks.reset.mockResolvedValue({ error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.click(screen.getByRole('button', { name: 'Recuperar acceso' }));
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajero@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));
    expect(await screen.findByText(/Si existe una cuenta con ese correo/)).toBeInTheDocument();
  });
  it('retira los datos privados de A al entrar B aunque la nueva carga falle', async () => {
    mocks.configured = true; mocks.session = { user: { id: 'user-a', email: 'a@example.com' } };
    render(<AuthPanel />);
    expect(await screen.findByText('Organización privada A')).toBeInTheDocument();
    expect(screen.getByText('Consulta privada A')).toBeInTheDocument();
    mocks.failedLoad = true;
    await act(async () => mocks.listener?.('SIGNED_IN', { user: { id: 'user-b', email: 'b@example.com' } }));
    await waitFor(() => expect(screen.getByText(/no se pudo cargar el servicio/)).toBeInTheDocument());
    expect(screen.queryByText('Organización privada A')).not.toBeInTheDocument();
    expect(screen.queryByText('Consulta privada A')).not.toBeInTheDocument();
    expect(screen.queryByText('Administrador autorizado por el servidor.')).not.toBeInTheDocument();
  });
});
