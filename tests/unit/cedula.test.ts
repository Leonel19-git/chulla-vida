import { describe, expect, it } from 'vitest';
import { cedulaCheckDigit, ECUADOR_PROVINCES, isMaskedDocument, maskCedula, validateCedula, validatePassport, validateRucPersonaNatural } from '../../src/domain/identity/cedula';

/** Genera una cédula válida con el propio algoritmo: provincia + 7 dígitos + verificador. */
const make = (province: string, body: string) => { const first = `${province}${body}`; return `${first}${cedulaCheckDigit(first)}`; };

describe('cédula ecuatoriana · validación de formato', () => {
  it('acepta cédulas generadas por el algoritmo en todas las provincias y en el exterior', () => {
    for (const code of Object.keys(ECUADOR_PROVINCES)) {
      const value = make(code, '1234567');
      const result = validateCedula(value);
      expect(result, value).toMatchObject({ valid: true, reason: null, provinceCode: code, provinceName: ECUADOR_PROVINCES[code], identityVerified: false });
      expect(result.formatted).toBe(`${value.slice(0, 9)}-${value[9]}`);
    }
  });
  it('calcula el verificador módulo 10 con coeficientes 2-1-2-1-2-1-2-1-2', () => {
    // 0·2 1·1 0·2 2·1 0·2 3·1 0·2 4·1 0·2 = 10 → (10 − 0) mod 10 = 0
    expect(cedulaCheckDigit('010203040')).toBe(0);
    // 1·2 7·1 1·2 0·1 5·2=10→1 4·1 3·2 5·1 1·2=2 → 2+7+2+0+1+4+6+5+2 = 29 → 1
    expect(cedulaCheckDigit('171054351')).toBe(1);
    expect(validateCedula('0102030400')).toMatchObject({ valid: true, provinceName: 'Azuay', formatted: '010203040-0' });
  });
  it('explica los errores típicos', () => {
    expect(validateCedula('')).toMatchObject({ valid: false, code: 'empty' });
    expect(validateCedula('01020')).toMatchObject({ valid: false, code: 'incomplete' });
    expect(validateCedula('01020304001')).toMatchObject({ valid: false, code: 'too_long' });
    expect(validateCedula('01O2030400')).toMatchObject({ valid: false, code: 'not_numeric' });
    expect(validateCedula(make('25', '1234567'))).toMatchObject({ valid: false, code: 'province' });
    expect(validateCedula(make('00', '1234567'))).toMatchObject({ valid: false, code: 'province' });
    expect(validateCedula(make('17', '6234567'))).toMatchObject({ valid: false, code: 'third_digit' });
    const good = make('09', '3456789');
    const wrong = `${good.slice(0, 9)}${(Number(good[9]) + 1) % 10}`;
    expect(validateCedula(wrong)).toMatchObject({ valid: false, code: 'check_digit', provinceName: 'Guayas' });
    expect(validateCedula(wrong).reason).toMatch(/verificador/);
    // Dos dígitos intercambiados casi siempre rompen el verificador.
    const swapped = `${good[1]}${good[0]}${good.slice(2)}`;
    expect(validateCedula(swapped).valid).toBe(false);
  });
  it('tolera guion y espacios al escribir', () => {
    const value = make('01', '0203040');
    expect(validateCedula(`${value.slice(0, 9)}-${value[9]}`).valid).toBe(true);
    expect(validateCedula(` ${value.slice(0, 5)} ${value.slice(5)} `).valid).toBe(true);
  });
  it('valida el RUC de persona natural como cédula + establecimiento', () => {
    const cedula = make('17', '1054351');
    expect(validateRucPersonaNatural(`${cedula}001`)).toMatchObject({ valid: true, establishment: '001' });
    expect(validateRucPersonaNatural(`${cedula}000`).valid).toBe(false);
    expect(validateRucPersonaNatural(`${cedula}01`).valid).toBe(false);
    expect(validateRucPersonaNatural(`${cedula.slice(0, 9)}${(Number(cedula[9]) + 1) % 10}001`).valid).toBe(false);
  });
  it('valida pasaportes con una regla básica alfanumérica', () => {
    expect(validatePassport('ab123456')).toMatchObject({ valid: true, normalized: 'AB123456' });
    expect(validatePassport('A12').valid).toBe(false);
    expect(validatePassport('AB-12$34').valid).toBe(false);
  });
  it('enmascara dejando solo los últimos cuatro caracteres', () => {
    expect(maskCedula('0102030405')).toBe('******0405');
    expect(maskCedula('ab123456')).toBe('****3456');
    expect(isMaskedDocument('******0405')).toBe(true);
    expect(isMaskedDocument('0102030405')).toBe(false);
  });
});
