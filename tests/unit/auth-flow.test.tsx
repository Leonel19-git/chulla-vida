// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OTP_EXPIRY_SECONDS, TERMS_VERSION, isEmail, isStrongPassword, passwordRules, sanitizeOtp, translateAuthError } from '../../src/features/auth/auth-flow';
import { demoGateway } from '../../src/features/auth/auth-gateway';
import { OtpInput } from '../../src/features/auth/OtpInput';

afterEach(cleanup);

describe('reglas de contraseña y correo', () => {
  it('exige 10 caracteres, letras, números, mezcla y nada personal o común', () => {
    expect(isStrongPassword('Corta1')).toBe(false);
    expect(isStrongPassword('solominusculas123')).toBe(false);
    expect(isStrongPassword('Montaña-Verde-2026')).toBe(true);
    expect(isStrongPassword('Amaru-2026-Viaje', 'amaru@example.com')).toBe(false);
    expect(isStrongPassword('Clave1234567890')).toBe(false);
    expect(passwordRules('x'.repeat(73) + 'A1').find(rule => rule.id === 'length')?.ok).toBe(false);
    expect(isEmail('nombre@correo.com')).toBe(true); expect(isEmail('nombre@correo')).toBe(false);
  });
  it('limpia cualquier texto pegado a 6 dígitos y versiona los términos con hash', () => {
    expect(sanitizeOtp('Código: 123-456 7')).toBe('123456');
    expect(TERMS_VERSION).toMatch(/^terms-[\d.]+-[0-9a-f]{12}$/);
  });
});

describe('errores de Supabase traducidos', () => {
  it('distingue código vencido de código que no coincide por el tiempo transcurrido', () => {
    const error = { code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' };
    const sentAt = 1_000_000;
    expect(translateAuthError(error, 'verify', { sentAt, now: sentAt + 30_000 })).toMatch(/no coincide/);
    expect(translateAuthError(error, 'verify', { sentAt, now: sentAt + (OTP_EXPIRY_SECONDS + 5) * 1000 })).toMatch(/venció/);
  });
  it('cubre límites, correo ya registrado, red y nunca devuelve el texto crudo', () => {
    expect(translateAuthError({ status: 429, message: 'x' }, 'resend')).toMatch(/Demasiados intentos/);
    expect(translateAuthError({ code: 'over_email_send_rate_limit' }, 'resend')).toMatch(/varios correos/);
    expect(translateAuthError({ code: 'email_exists' }, 'signup')).toMatch(/ya tiene una cuenta/);
    expect(translateAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'login')).toMatch(/conexión/);
    expect(translateAuthError({ message: 'SQLSTATE secret detail' }, 'signup')).not.toMatch(/SQLSTATE/);
  });
});

describe('demostración sin servidor', () => {
  it('solo acepta 123456 y no usa la red', async () => {
    const network = vi.fn(); vi.stubGlobal('fetch', network);
    const demo = demoGateway();
    expect((await demo.verifyCode('a@b.co', '000000', 'signup')).error).not.toBeNull();
    expect((await demo.verifyCode('a@b.co', '123456', 'signup')).error).toBeNull();
    expect(network).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
});

function Harness({ onComplete }: { onComplete: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <><span id="otp-label">Código</span><OtpInput value={value} onChange={setValue} onComplete={onComplete} labelledBy="otp-label" /><output>{value}</output></>;
}
describe('campo único del código (autocompletado de iOS y Android)', () => {
  it('es UN solo input con one-time-code, teclado numérico y 6 caracteres; se dibujan 6 celdas', () => {
    render(<Harness onComplete={vi.fn()} />);
    const input = screen.getByLabelText(/Código de 6 dígitos/);
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('pattern', '[0-9]*');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(document.querySelectorAll('.otp-cell')).toHaveLength(6);
    expect(screen.getByLabelText(/^Código Código de 6 dígitos$/)).toBe(input);
  });
  it('pegar 6 dígitos (aunque vengan con texto) completa; teclear y borrar actualizan las celdas', () => {
    const onComplete = vi.fn(); render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText(/Código de 6 dígitos/);
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.change(input, { target: { value: '42' } });
    expect(screen.getByRole('status')).toHaveTextContent('42');
    expect([...document.querySelectorAll('.otp-cell')].map(cell => cell.textContent).join('')).toBe('42');
    fireEvent.change(input, { target: { value: '4' } });
    expect(screen.getByRole('status')).toHaveTextContent(/^4$/);
    fireEvent.paste(input, { clipboardData: { getData: () => 'Tu código de CHULLA VIDA es 987 654' } });
    expect(onComplete).toHaveBeenCalledWith('987654');
    expect(input).toHaveValue('987654');
  });
  it('el autocompletado del sistema entrega el código completo de una vez', () => {
    const onComplete = vi.fn(); render(<Harness onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText(/Código de 6 dígitos/), { target: { value: '135790' } });
    expect(onComplete).toHaveBeenCalledWith('135790');
  });
  it('ignora letras', () => {
    const onComplete = vi.fn(); render(<Harness onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText(/Código de 6 dígitos/), { target: { value: 'ab1' } });
    expect(screen.getByRole('status')).toHaveTextContent(/^1$/);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
