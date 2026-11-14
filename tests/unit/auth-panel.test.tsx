// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPanel } from '../../src/features/auth/AuthPanel';

type Listener = (event: string, session: unknown) => void;
const mocks = vi.hoisted(() => ({
  configured: false, failedLoad: false,
  session: null as null | { user: { id: string; email: string } },
  listener: null as null | ((event: string, session: unknown) => void),
  auth: {
    signUp: vi.fn(), verifyOtp: vi.fn(), resend: vi.fn(), signInWithPassword: vi.fn(), signInWithOtp: vi.fn(),
    resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(),
  },
  rpc: vi.fn(),
}));
const client = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
    onAuthStateChange: vi.fn((listener: Listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: mocks.auth.unsubscribe } } }; }),
    signUp: mocks.auth.signUp, verifyOtp: mocks.auth.verifyOtp, resend: mocks.auth.resend, signInWithPassword: mocks.auth.signInWithPassword,
    signInWithOtp: mocks.auth.signInWithOtp, resetPasswordForEmail: mocks.auth.resetPasswordForEmail, updateUser: mocks.auth.updateUser, signOut: mocks.auth.signOut,
  },
  rpc: mocks.rpc,
  from: vi.fn((table: string) => {
    const rows = table === 'user_roles' ? [{ role: 'admin' }]
      : table === 'organizations' ? [{ id: 'org-a', name: 'Organización privada A', kind: 'business', verification_status: 'in_review' }]
        : table === 'merchant_verification_requests' ? [{ id: 'request-a', organization_id: 'org-a', status: 'submitted', created_at: '2026-11-12' }]
          : table === 'experience_requests' ? [{ id: 'inquiry-a', experience_id: 'source-1', message: 'Consulta privada A', status: 'requested', created_at: '2026-11-12' }] : [];
    const response = Promise.resolve({ data: mocks.failedLoad ? null : rows, error: mocks.failedLoad ? new Error('network unavailable') : null });
    return Object.assign(response, { select: () => response, order: () => response, limit: () => response });
  }),
};
vi.mock('../../src/lib/supabase', () => ({
  supabaseConfiguration: () => mocks.configured ? { available: true, url: 'https://example.supabase.co', key: 'public' }
    : { available: false, reason: 'Falta conectar Supabase. Las cuentas y solicitudes en línea todavía no están disponibles.' },
  getSupabase: () => mocks.configured ? client : null,
}));

const STRONG = 'Montaña-Verde-2026';
const expiredOrInvalid = { code: 'otp_expired', status: 403, message: 'Token has expired or is invalid', name: 'AuthApiError' };
beforeEach(() => {
  mocks.configured = true; mocks.session = null; mocks.failedLoad = false; mocks.listener = null;
  Object.values(mocks.auth).forEach(fn => fn.mockReset()); mocks.rpc.mockReset(); mocks.rpc.mockResolvedValue({ data: 'id', error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function codeBoxes() { return screen.getAllByLabelText(/Dígito \d de 6/); }
function pasteCode(code: string) {
  fireEvent.paste(codeBoxes()[0], { clipboardData: { getData: () => code } });
}
async function fillSignup(user: ReturnType<typeof userEvent.setup>, options: { terms?: boolean } = {}) {
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  await user.type(screen.getByLabelText('Cómo te llamas'), 'Amaru');
  await user.type(screen.getByLabelText('Correo electrónico'), 'viajera@example.com');
  await user.type(screen.getByLabelText('Contraseña'), STRONG);
  if (options.terms !== false) await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
}

describe('cuenta sin servidor: explicación y recorrido de demostración', () => {
  it('no pide credenciales hasta que la persona elige la demostración, y la demo no llama a la red', async () => {
    mocks.configured = false; const network = vi.fn(); vi.stubGlobal('fetch', network);
    const user = userEvent.setup(); render(<AuthPanel />);
    expect(screen.getByText(/Falta conectar Supabase/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
    expect(screen.queryByText('Solicitar revisión')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver recorrido de demostración' }));
    expect(screen.getByText(/nada sale de tu navegador/)).toBeInTheDocument();
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    expect(await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' })).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    pasteCode('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent(/no coincide/);
    pasteCode('123456');
    expect(await screen.findByRole('heading', { name: '¡Así se activa tu cuenta!' })).toBeInTheDocument();
    expect(screen.getByText(/no se creó ninguna cuenta/)).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled(); expect(mocks.auth.signUp).not.toHaveBeenCalled();
  });
});

describe('registro con código de 6 dígitos', () => {
  it('exige contraseña fuerte y Términos sin premarcar; guarda versión y marketing por separado', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const submit = screen.getByRole('button', { name: 'Crear cuenta y recibir código' });
    const terms = screen.getByRole('checkbox', { name: /Acepto los Términos/ });
    const marketing = screen.getByRole('checkbox', { name: /novedades/ });
    expect(terms).not.toBeChecked(); expect(marketing).not.toBeChecked(); expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajera@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'corta1');
    expect(screen.getByText('Al menos 10 caracteres')).toHaveTextContent(/pendiente/);
    await user.click(terms); expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText('Contraseña')); await user.type(screen.getByLabelText('Contraseña'), STRONG);
    expect(screen.getByText('Al menos 10 caracteres')).toHaveTextContent(/cumplida/);
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'viajera@example.com', password: STRONG,
      options: expect.objectContaining({ data: expect.objectContaining({ terms_version: expect.stringMatching(/^terms-/), privacy_version: expect.stringMatching(/^privacy-/), marketing_opt_in: false }) }) }));
    expect(await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' })).toBeInTheDocument();
    expect(screen.queryByText('123456')).not.toBeInTheDocument();
    for (const box of codeBoxes()) { expect(box).toHaveAttribute('inputmode', 'numeric'); }
    expect(codeBoxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('código incorrecto muestra error; el correcto llama a verifyOtp(signup), abre sesión y registra el consentimiento de marketing', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    mocks.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: expiredOrInvalid })
      .mockImplementationOnce(async () => { const session = { user: { id: 'u1', email: 'viajera@example.com' } }; mocks.listener?.('SIGNED_IN', session); return { data: { session }, error: null }; });
    const user = userEvent.setup(); render(<AuthPanel />);
    await fillSignup(user);
    await user.click(screen.getByRole('checkbox', { name: /novedades/ }));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' });
    pasteCode('111 111');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese código no coincide');
    expect(mocks.auth.verifyOtp).toHaveBeenLastCalledWith({ email: 'viajera@example.com', token: '111111', type: 'signup' });
    expect(codeBoxes()[0]).toHaveValue('');
    pasteCode('Tu código: 482-913');
    await waitFor(() => expect(mocks.auth.verifyOtp).toHaveBeenLastCalledWith({ email: 'viajera@example.com', token: '482913', type: 'signup' }));
    expect(await screen.findByRole('heading', { name: 'Tu cuenta conectada' })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith('record_consent', expect.objectContaining({ p_category: 'email_marketing', p_granted: true, p_method: 'signup' }));
  });

  it('traduce correo ya registrado, límite de intentos del servidor y bloquea tras 5 intentos locales', async () => {
    mocks.auth.signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { code: 'user_already_exists', status: 422, message: 'User already registered' } })
      .mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await fillSignup(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este correo ya tiene una cuenta');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' });
    mocks.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { code: 'over_request_rate_limit', status: 429, message: 'rate limit' } });
    pasteCode('222222');
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos en poco tiempo');
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: expiredOrInvalid });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await waitFor(() => expect(codeBoxes()[0]).toBeEnabled());
      pasteCode('333333'); await waitFor(() => expect(mocks.auth.verifyOtp).toHaveBeenCalledTimes(attempt + 2));
    }
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Demasiados intentos con este código'));
    await waitFor(() => expect(codeBoxes()[0]).toBeEnabled());
    pasteCode('444444');
    expect(mocks.auth.verifyOtp).toHaveBeenCalledTimes(5);
  });

  it('el reenvío espera 60 s, usa auth.resend y después vuelve a bloquearse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    mocks.auth.resend.mockResolvedValue({ data: {}, error: null });
    render(<AuthPanel />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'viajera@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: STRONG } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const resend = () => screen.getByRole('button', { name: /Reenviar código/ });
    expect(resend()).toHaveTextContent('Reenviar código en 60 s'); expect(resend()).toBeDisabled();
    fireEvent.click(resend()); expect(mocks.auth.resend).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(resend()).toHaveTextContent('Reenviar código en 30 s');
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(resend()).toBeEnabled();
    fireEvent.click(resend());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mocks.auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'viajera@example.com' }));
    expect(resend()).toBeDisabled();
    expect(screen.getByText(/Te enviamos un código nuevo/)).toHaveAttribute('role', 'status');
  });
});

describe('acceso y recuperación', () => {
  it('«Entrar con un código» no crea cuentas y verifica con type email', async () => {
    mocks.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    mocks.auth.verifyOtp.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajera@example.com');
    await user.click(screen.getByRole('button', { name: 'Entrar con un código' }));
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'viajera@example.com', options: { shouldCreateUser: false } });
    await screen.findByRole('heading', { name: 'Te enviamos un código para entrar' });
    pasteCode('654321');
    await waitFor(() => expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ email: 'viajera@example.com', token: '654321', type: 'email' }));
  });

  it('contraseña equivocada se explica sin texto crudo del servidor', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajera@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'algo-incorrecto');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El correo o la contraseña no coinciden');
    expect(screen.queryByText(/Invalid login/)).not.toBeInTheDocument();
  });

  it('recupera por código: resetPasswordForEmail → verifyOtp(recovery) → updateUser', async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    mocks.auth.verifyOtp.mockImplementation(async () => { const session = { user: { id: 'u1', email: 'viajera@example.com' } }; mocks.listener?.('PASSWORD_RECOVERY', session); return { data: { session }, error: null }; });
    mocks.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup(); render(<AuthPanel />);
    await user.click(screen.getByRole('button', { name: 'Recuperar acceso' }));
    await user.type(screen.getByLabelText('Correo electrónico'), 'viajera@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviarme un código' }));
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith('viajera@example.com', expect.objectContaining({ redirectTo: expect.stringContaining('#cuenta') }));
    expect(await screen.findByText(/Si el correo tiene una cuenta/)).toBeInTheDocument();
    pasteCode('777777');
    expect(await screen.findByRole('heading', { name: /Elige tu contraseña nueva/ })).toBeInTheDocument();
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ email: 'viajera@example.com', token: '777777', type: 'recovery' });
    await user.type(screen.getByLabelText('Nueva contraseña'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ password: STRONG });
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu cuenta conectada' })).toBeInTheDocument();
  });

  it('retira los datos privados de A al entrar B aunque la nueva carga falle', async () => {
    mocks.session = { user: { id: 'user-a', email: 'a@example.com' } };
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
