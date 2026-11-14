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
describe('casillas del código', () => {
  it('pegar reparte los dígitos y completa; teclear avanza; borrar retrocede', () => {
    const onComplete = vi.fn(); render(<Harness onComplete={onComplete} />);
    const boxes = screen.getAllByLabelText(/Dígito \d de 6/);
    expect(boxes).toHaveLength(6); expect(screen.getByRole('group', { name: 'Código' })).toBeInTheDocument();
    fireEvent.change(boxes[0], { target: { value: '4' } });
    expect(document.activeElement).toBe(boxes[1]);
    fireEvent.change(boxes[1], { target: { value: '2' } });
    expect(screen.getByRole('status')).toHaveTextContent('42');
    fireEvent.keyDown(boxes[2], { key: 'Backspace' });
    expect(screen.getByRole('status')).toHaveTextContent(/^4$/); expect(document.activeElement).toBe(boxes[1]);
    fireEvent.paste(boxes[0], { clipboardData: { getData: () => '987 654' } });
    expect(onComplete).toHaveBeenCalledWith('987654');
    expect(boxes.map(box => (box as HTMLInputElement).value).join('')).toBe('987654');
  });
  it('el autocompletado del sistema (todo el código en la primera casilla) también funciona', () => {
    const onComplete = vi.fn(); render(<Harness onComplete={onComplete} />);
    fireEvent.change(screen.getAllByLabelText(/Dígito \d de 6/)[0], { target: { value: '135790' } });
    expect(onComplete).toHaveBeenCalledWith('135790');
  });
});
