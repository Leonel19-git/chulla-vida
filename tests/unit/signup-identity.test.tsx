// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AccessFlow } from '../../src/features/auth/AccessFlow';
import { supabaseGateway, type AuthGateway } from '../../src/features/auth/auth-gateway';
import { SIGNUP_IDENTITY_NOTICE, signupIdentity } from '../../src/domain/identity';
import { loadTravelerDocument } from '../../src/features/traveler/profile';

const CEDULA = '0102030400'; // Synthetic checksum fixture, never a verified person.
const EMAIL = 'viajera@example.test';
const INPUT = { email: EMAIL, password: 'Montaña-Verde-2026', displayName: 'Amaru', marketing: false, cedulaLast4: '0400' };
const session = { user: { id: 'user-a', email: EMAIL } };

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function fakeGateway(): AuthGateway {
  const ok = () => Promise.resolve({ error: null });
  return { demo: false, signUp: vi.fn(ok), verifyCode: vi.fn(async () => ({ error: null, signedIn: true })),
    resendCode: vi.fn(ok), signInWithPassword: vi.fn(ok), requestLoginCode: vi.fn(ok), requestRecoveryCode: vi.fn(ok),
    updatePassword: vi.fn(ok), recordMarketingChoice: vi.fn(async () => undefined) };
}
function fillForm(cedula = CEDULA) {
  fireEvent.change(screen.getByLabelText('Cómo te llamas'), { target: { value: 'Amaru' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: EMAIL } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: INPUT.password } });
  fireEvent.change(screen.getByLabelText('Cédula ecuatoriana'), { target: { value: cedula } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
const pasteCode = () => fireEvent.paste(screen.getByLabelText(/Código de 6 dígitos/), { clipboardData: { getData: () => '123456' } });

describe('registro: formato, privacidad y accesibilidad', () => {
  it.each([
    ['', /Escribe tu número/], ['01020', /10 dígitos/], ['2502030400', /provincia/],
    ['0162030400', /tercer dígito/], ['0102030401', /verificador/], ['01O2030400', /solo lleva números/],
  ])('impide registrar con cédula inválida (%s) y enfoca el campo con su explicación', (value, reason) => {
    const gateway = fakeGateway(); render(<AccessFlow gateway={gateway} initialTab="signup" />); fillForm(value); submit();
    const field = screen.getByLabelText('Cédula ecuatoriana');
    expect(field).toHaveFocus(); expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(reason); expect(screen.getByRole('alert')).toHaveTextContent(reason);
    expect(gateway.signUp).not.toHaveBeenCalled();
  });

  it('conserva ceros y separadores, reduce a cuatro dígitos y elimina el número completo al pasar al OTP', async () => {
    const gateway = fakeGateway(); const storage = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log'); const warn = vi.spyOn(console, 'warn'); const error = vi.spyOn(console, 'error');
    render(<AccessFlow gateway={gateway} initialTab="signup" />); fillForm('010 203 040-0');
    const field = screen.getByLabelText('Cédula ecuatoriana');
    expect(field).toBeRequired(); expect(field).toHaveAttribute('type', 'text'); expect(field).toHaveAttribute('inputmode', 'numeric');
    expect(field).toHaveAttribute('autocomplete', 'off'); expect(screen.getByText(SIGNUP_IDENTITY_NOTICE)).toBeInTheDocument();
    submit(); await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' });
    expect(gateway.signUp).toHaveBeenCalledWith(INPUT);
    expect(document.body.innerHTML).not.toContain(CEDULA); expect(document.body.innerHTML).not.toContain('010 203 040-0');
    expect(storage).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    expect(signupIdentity(CEDULA)).toEqual({ last4: '0400', status: 'unverified' });
  });

  it('borra la cédula al salir del registro y no la pide para entrar o recuperar', () => {
    render(<AccessFlow gateway={fakeGateway()} initialTab="signup" />); fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' })); expect(screen.queryByLabelText('Cédula ecuatoriana')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' })); expect(screen.getByLabelText('Cédula ecuatoriana')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Recuperar acceso' })); expect(screen.queryByLabelText('Cédula ecuatoriana')).not.toBeInTheDocument();
  });

  it('recupera errores de red sin exponer texto del error y enlaza el error de OTP al campo', async () => {
    const gateway = fakeGateway(); vi.mocked(gateway.signUp).mockRejectedValueOnce(new Error(`private ${CEDULA}`));
    render(<AccessFlow gateway={gateway} initialTab="signup" />); fillForm(); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Revisa tu conexión/); expect(screen.getByRole('alert')).not.toHaveTextContent(CEDULA);
    submit(); await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' });
    vi.mocked(gateway.verifyCode).mockRejectedValueOnce(new Error('private token'));
    pasteCode(); await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo comprobar el código/));
    expect(screen.getByLabelText(/Código de 6 dígitos/)).toHaveAccessibleDescription(/No se pudo comprobar el código/);
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar código' }));
    await waitFor(() => expect(screen.getByText(/Tu correo quedó confirmado/)).toBeInTheDocument());
  });

  it('bloquea cambio de correo y doble envío mientras comprueba el OTP', async () => {
    const gateway = fakeGateway(); let finish!: (value: { error: null; signedIn: boolean }) => void;
    vi.mocked(gateway.verifyCode).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<AccessFlow gateway={gateway} initialTab="signup" />); fillForm(); submit();
    await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' }); pasteCode();
    expect(screen.getByRole('button', { name: 'Cambiar correo' })).toBeDisabled();
    expect(screen.getByLabelText(/Código de 6 dígitos/)).toBeDisabled();
    fireEvent.submit(screen.getByLabelText(/Código de 6 dígitos/).closest('form')!);
    expect(gateway.verifyCode).toHaveBeenCalledTimes(1); finish({ error: null, signedIn: true });
    await screen.findByText(/Tu correo quedó confirmado/);
  });
});

function clientHarness() {
  const auth = { signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    verifyOtp: vi.fn(async () => ({ data: { session }, error: null })) };
  const rpc = vi.fn(async () => ({ error: null }));
  return { auth, rpc, gateway: supabaseGateway({ auth, rpc } as unknown as SupabaseClient) };
}

describe('resumen autorizado después de abrir sesión', () => {
  it('no envía documentos ni resumen a metadata y espera el OTP antes de llamar al RPC', async () => {
    const { auth, rpc, gateway } = clientHarness(); await gateway.signUp(INPUT);
    expect(rpc).not.toHaveBeenCalled();
    const payload = JSON.stringify(auth.signUp.mock.calls);
    expect(payload).not.toContain(CEDULA); expect(payload).not.toContain('0400'); expect(payload).not.toMatch(/cedula|identity/);
    await gateway.verifyCode(EMAIL, '123456', 'signup');
    expect(rpc).toHaveBeenCalledExactlyOnceWith('record_signup_identity', { p_last4: '0400' });
    await gateway.verifyCode(EMAIL, '123456', 'signup'); expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('guarda también con sesión inmediata y nunca bloquea el resultado por un RPC lento', async () => {
    const { auth, rpc, gateway } = clientHarness();
    auth.signUp.mockResolvedValue({ data: { session: session as never }, error: null });
    rpc.mockImplementation(() => new Promise(() => undefined));
    await expect(gateway.signUp(INPUT)).resolves.toEqual({ error: null, signedIn: true });
    expect(rpc).toHaveBeenCalledWith('record_signup_identity', { p_last4: '0400' });
  });

  it.each(['error', 'throw', 'slow'])('el OTP sigue siendo correcto aunque falle el resumen: %s', async mode => {
    const { rpc, gateway } = clientHarness();
    if (mode === 'error') rpc.mockResolvedValue({ error: { code: 'PGRST202' } as never });
    if (mode === 'throw') rpc.mockRejectedValue(new Error('network'));
    if (mode === 'slow') rpc.mockImplementation(() => new Promise(() => undefined));
    await gateway.signUp(INPUT);
    await expect(gateway.verifyCode(EMAIL, '123456', 'signup')).resolves.toEqual({ error: null, signedIn: true });
  });

  it('no escribe sin sesión ni con OTP incorrecto, recuperación o correo de otra cuenta', async () => {
    const { auth, rpc, gateway } = clientHarness(); await gateway.signUp(INPUT);
    auth.verifyOtp.mockResolvedValueOnce({ data: { session: null as never }, error: null });
    await gateway.verifyCode(EMAIL, '123456', 'signup'); expect(rpc).not.toHaveBeenCalled();
    auth.verifyOtp.mockResolvedValueOnce({ data: { session }, error: { code: 'otp_expired' } as never });
    await gateway.verifyCode(EMAIL, '123456', 'signup'); expect(rpc).not.toHaveBeenCalled();
    await gateway.verifyCode(EMAIL, '123456', 'recovery'); expect(rpc).not.toHaveBeenCalled();
    auth.verifyOtp.mockResolvedValueOnce({ data: { session: { user: { id: 'b', email: 'b@example.test' } } }, error: null });
    await gateway.verifyCode(EMAIL, '123456', 'signup'); expect(rpc).not.toHaveBeenCalled();
  });

  it('rechaza que un llamador pase el número completo como resumen antes de llamar Auth', async () => {
    const { auth, rpc, gateway } = clientHarness();
    expect((await gateway.signUp({ ...INPUT, cedulaLast4: CEDULA })).error).not.toBeNull();
    expect(auth.signUp).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
});

describe('lectura de resumen del viajero', () => {
  it('usa solo columnas mínimas de la fila propia y tolera una migración aún no desplegada', async () => {
    const seen: unknown[] = []; let missing = false;
    const client = { from: (table: string) => ({ select: (columns: string) => ({ eq: (key: string, value: string) => {
      seen.push({ table, columns, key, value });
      return { maybeSingle: async () => table === 'signup_identity'
        ? { data: { last4: '0400', status: 'unverified' }, error: missing ? { code: '42P01' } : null }
        : { data: null, error: null } };
    } }) }) } as unknown as SupabaseClient;
    expect(await loadTravelerDocument(client, 'user-a')).toEqual({ type: 'cedula', last4: '0400' });
    expect(seen).toContainEqual({ table: 'signup_identity', columns: 'last4,status', key: 'user_id', value: 'user-a' });
    missing = true; expect(await loadTravelerDocument(client, 'user-a')).toBeNull();
  });
});
