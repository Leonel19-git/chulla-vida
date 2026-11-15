import { describe, expect, it } from 'vitest';
import {
  cardLabel, checkTestCard, detectBrand, expiryState, formatCardNumber, formatExpiry, isCardSummary, luhn, REAL_CARD_MESSAGE, TEST_CARDS,
} from '../../src/domain/payments/card';
import { isWalletRecord, testReceiptText, type WalletRecord } from '../../src/domain/payments/purchase';

const NOW = new Date(2026, 10, 14);
const ok = { expiry: '12/29', cvv: '123', holder: 'ANA PÉREZ' };
/** Completa un prefijo con el dígito de Luhn correcto: un número con forma real que NO es de prueba. */
function withLuhn(prefix: string) { for (let digit = 0; digit < 10; digit++) if (luhn(`${prefix}${digit}`)) return `${prefix}${digit}`; throw new Error('sin dígito'); }

describe('marca de la tarjeta', () => {
  it.each([
    ['4242424242424242', 'visa'], ['4', 'visa'], ['5555555555554444', 'mastercard'], ['2221000000000009', 'mastercard'], ['51', 'mastercard'],
    ['378282246310005', 'amex'], ['34', 'amex'], ['30569309025904', 'diners'], ['36', 'diners'], ['6011111111111117', 'discover'], ['65', 'discover'],
  ])('%s → %s', (number, brand) => expect(detectBrand(number)).toBe(brand));
  it('no inventa una marca', () => { expect(detectBrand('')).toBeNull(); expect(detectBrand('9999')).toBeNull(); expect(detectBrand('1234')).toBeNull(); });
});

describe('Luhn y formato', () => {
  it('valida todas las tarjetas de prueba y rechaza un dígito cambiado', () => {
    for (const card of TEST_CARDS) expect(luhn(card.number)).toBe(true);
    expect(luhn('4242424242424241')).toBe(false);
    expect(luhn('123')).toBe(false);
  });
  it('agrupa según la marca', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatCardNumber('30569309025904')).toBe('3056 930902 5904');
    expect(formatCardNumber('42a42-42')).toBe('4242 42');
  });
  it('vencimiento MM/AA no vencido', () => {
    expect(formatExpiry('1229')).toBe('12/29');
    expect(formatExpiry('3')).toBe('03/');
    expect(expiryState('12/29', NOW)).toBe('valid');
    expect(expiryState('11/26', NOW)).toBe('valid');
    expect(expiryState('10/26', NOW)).toBe('expired');
    expect(expiryState('13/29', NOW)).toBe('invalid');
    expect(expiryState('1/2', NOW)).toBe('incomplete');
  });
});

describe('solo tarjetas de prueba', () => {
  it('aprueba y rechaza según el número de prueba, y solo devuelve marca + últimos 4', () => {
    const approved = checkTestCard({ number: '4242 4242 4242 4242', ...ok }, NOW);
    expect(approved).toEqual({ ok: true, summary: { brand: 'visa', last4: '4242' }, outcome: 'approved', reason: '' });
    const declined = checkTestCard({ number: '4000000000000002', ...ok }, NOW);
    expect(declined).toMatchObject({ ok: true, outcome: 'declined', summary: { brand: 'visa', last4: '0002' } });
    expect(JSON.stringify(approved)).not.toContain('4242424242424242');
    expect(JSON.stringify(approved)).not.toContain('12/29');
    expect(checkTestCard({ number: '378282246310005', ...ok, cvv: '1234' }, NOW)).toMatchObject({ ok: true, summary: { brand: 'amex', last4: '0005' } });
  });
  it('no procesa una tarjeta que no es de prueba', () => {
    const real = withLuhn('453201511283036');
    expect(luhn(real)).toBe(true);
    expect(checkTestCard({ number: real, ...ok }, NOW)).toEqual({ ok: false, field: 'number', message: REAL_CARD_MESSAGE, realCard: true });
  });
  it('explica cada error', () => {
    expect(checkTestCard({ number: '4242424242424241', ...ok }, NOW)).toMatchObject({ ok: false, field: 'number', message: expect.stringMatching(/verificación/) });
    expect(checkTestCard({ number: '4242', ...ok }, NOW)).toMatchObject({ field: 'number', message: expect.stringMatching(/faltan dígitos/) });
    expect(checkTestCard({ number: '4242424242424242', ...ok, expiry: '01/20' }, NOW)).toMatchObject({ field: 'expiry', message: expect.stringMatching(/venció/) });
    expect(checkTestCard({ number: '4242424242424242', ...ok, cvv: '12' }, NOW)).toMatchObject({ field: 'cvv' });
    expect(checkTestCard({ number: '378282246310005', ...ok, cvv: '123' }, NOW)).toMatchObject({ field: 'cvv', message: expect.stringMatching(/4 dígitos/) });
    expect(checkTestCard({ number: '4242424242424242', ...ok, holder: 'A' }, NOW)).toMatchObject({ field: 'holder' });
  });
});

describe('lo único que se guarda', () => {
  it('el resumen de tarjeta admite solo marca y últimos 4', () => {
    expect(isCardSummary({ brand: 'visa', last4: '4242' })).toBe(true);
    expect(isCardSummary({ brand: 'visa', last4: '4242', number: '4242424242424242' })).toBe(false);
    expect(isCardSummary({ brand: 'visa', last4: '424242' })).toBe(false);
    expect(isCardSummary({ brand: 'elo', last4: '4242' })).toBe(false);
    expect(cardLabel({ brand: 'visa', last4: '4242' })).toBe('Visa •••• 4242');
    expect(cardLabel({ brand: 'amex', last4: '0005' })).toBe('American Express •••• 0005');
  });
  it('la billetera rechaza un registro con datos de tarjeta de más', () => {
    const base: WalletRecord = { id: 'a', code: 'PRB-AAAAAA', kind: 'test_purchase', status: 'test_approved', mode: 'test', experienceId: 'x', title: 'X', province: 'Pichincha', date: '2099-01-01', people: 1, currency: 'USD', unitCents: 100, totalCents: 100, priceNote: '', buyer: { name: 'Ana', emailMasked: 'an**@correo.ec', documentType: null, documentMasked: null }, trip: 'T', batchId: null, attempts: 1, card: { brand: 'visa', last4: '4242' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    expect(isWalletRecord(base)).toBe(true);
    expect(isWalletRecord({ ...base, card: undefined })).toBe(true);
    expect(isWalletRecord({ ...base, card: { brand: 'visa', last4: '4242', cvv: '123' } })).toBe(false);
  });
  it('el comprobante dice marca y últimos 4', () => {
    const text = testReceiptText({ code: 'PRB-AAAAAA', buyerName: 'Ana', emailMasked: '', documentMasked: null, createdAt: '2026-11-14', lines: [], card: { brand: 'mastercard', last4: '4444' } });
    expect(text).toContain('Método de pago: Mastercard •••• 4444 · tarjeta de prueba, sin cobro');
  });
});
