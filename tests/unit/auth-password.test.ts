// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PASSWORD_MAX, PASSWORD_MIN, PASSWORD_REQUIREMENTS, isStrongPassword, passwordRules, serverAcceptsPassword, translateAuthError } from '../../src/features/auth/auth-flow';
import { supabaseGateway } from '../../src/features/auth/auth-gateway';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Réplica independiente de GoTrue (internal/api/password.go): bytes UTF-8 y conjuntos ASCII. */
function gotrue(password: string, min: number, requirement: string): boolean {
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes < min || bytes > 72) return false;
  const sets = requirement === 'lower_upper_letters_digits' ? ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789'] : [];
  return sets.every(set => [...password].some(char => set.includes(char)));
}

describe('contraseña: el cliente usa exactamente la regla del proyecto Supabase', () => {
  const config = readFileSync(resolve('supabase/config.toml'), 'utf8');
  const min = Number(/minimum_password_length\s*=\s*(\d+)/.exec(config)?.[1]);
  const requirement = /password_requirements\s*=\s*"([^"]+)"/.exec(config)?.[1] ?? '';

  it('lee 10 y lower_upper_letters_digits del config.toml y el cliente usa los mismos valores', () => {
    expect(min).toBe(10); expect(requirement).toBe('lower_upper_letters_digits');
    expect(PASSWORD_MIN).toBe(min); expect(PASSWORD_REQUIREMENTS).toBe(requirement); expect(PASSWORD_MAX).toBe(72);
  });

  it('coincide con GoTrue en casos límite (bytes, ñ, tildes, símbolos, solo minúsculas)', () => {
    const cases = ['Montaña-Verde-2026', 'montaña-verde-2026', 'MONTAÑA-2026', 'Abcdefgh1', 'Abcdefghi1', 'ñandú-Ñandú-1', 'Ñandúes2026', 'ÁÉÍÓÚáéíóú1',
      'abcdefghij', 'ABCDEFGHIJ1', 'abcdefghij1', 'Abc-def-ghi', `Aa1${'x'.repeat(69)}`, `Aa1${'x'.repeat(70)}`, `Aa1${'ñ'.repeat(35)}`, '          Aa1'];
    for (const value of cases) expect([value, serverAcceptsPassword(value)]).toEqual([value, gotrue(value, min, requirement)]);
  });

  it('nunca acepta en el cliente una contraseña que el servidor rechazaría (prueba con 3000 cadenas aleatorias)', () => {
    const alphabet = 'abcxyzABCXYZ0189ñÑáÉ-_.!@ ';
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let index = 0; index < 3000; index++) {
      const length = 6 + Math.floor(random() * 70);
      const value = Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
      if (isStrongPassword(value)) expect(gotrue(value, min, requirement)).toBe(true);
    }
  });

  it('muestra los requisitos uno por uno, marcando cuáles exige el servidor', () => {
    const rules = passwordRules('montaña-verde');
    expect(rules.map(rule => rule.label)).toEqual(['Al menos 10 caracteres', 'Una letra minúscula (a-z)', 'Una letra mayúscula (A-Z)', 'Un número (0-9)', 'No es tu correo ni una clave muy común']);
    expect(rules.filter(rule => rule.server).map(rule => rule.id)).toEqual(['length', 'lower', 'upper', 'number']);
    expect(rules.find(rule => rule.id === 'upper')?.ok).toBe(false);
    expect(isStrongPassword('montaña-verde-2026')).toBe(false); // antes el símbolo bastaba; Supabase la rechaza
    expect(isStrongPassword('Montaña-Verde-2026')).toBe(true);
  });
});

describe('errores de registro traducidos', () => {
  it('weak_password explica la regla y usa los motivos del servidor', () => {
    expect(translateAuthError({ code: 'weak_password' }, 'signup')).toMatch(/minúscula \(a-z\), una mayúscula \(A-Z\) y un número/);
    expect(translateAuthError({ code: 'weak_password', reasons: ['length'] }, 'signup')).toMatch(/muy corta/);
    expect(translateAuthError({ code: 'weak_password', reasons: ['pwned'] }, 'signup')).toMatch(/filtraciones/);
  });
  it('over_email_send_rate_limit, email_address_invalid y user_already_exists', () => {
    expect(translateAuthError({ code: 'over_email_send_rate_limit', status: 429 }, 'signup')).toMatch(/varios correos seguidos/);
    expect(translateAuthError({ code: 'email_address_invalid', status: 400 }, 'signup')).toMatch(/No podemos enviar el código a ese correo/);
    expect(translateAuthError({ code: 'user_already_exists', status: 422 }, 'signup')).toMatch(/ya tiene una cuenta/);
  });
  it('el gateway conserva los motivos de AuthWeakPasswordError sin pasar texto crudo', async () => {
    const weak = Object.assign(new Error('Password should contain at least one character of each: abc...'), { name: 'AuthWeakPasswordError', code: 'weak_password', status: 422, reasons: ['characters'] });
    const client = { auth: { signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: weak })) } } as unknown as SupabaseClient;
    const result = await supabaseGateway(client).signUp({ email: 'a@b.ec', password: 'x', displayName: 'A', marketing: false });
    expect(result.error).toMatchObject({ code: 'weak_password', reasons: ['characters'] });
    expect(translateAuthError(result.error, 'signup')).not.toMatch(/abc/);
  });
});
