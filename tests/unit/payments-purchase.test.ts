import { describe, expect, it } from 'vitest';
import { getExperienceById, type Experience } from '../../src/domain/catalog';
import { clampChoice, isWalletRecord, maskEmail, parseWallet, purchasePlan, stopStatus, testReceiptText, TEST_RECEIPT_LABEL, tripTotals, type WalletRecord } from '../../src/domain/payments/purchase';

const exp = (id: string) => getExperienceById(id) as Experience;
const record = (patch: Partial<WalletRecord> = {}): WalletRecord => ({ id: crypto.randomUUID(), code: 'PRB-ABC234', kind: 'test_purchase', status: 'test_approved', mode: 'test', experienceId: 'gen-01-saraguro-ancestral', title: 'Saraguro', province: 'Loja', date: '2099-01-02', people: 2, currency: 'USD', unitCents: 4500, totalCents: 9000, priceNote: 'Precio referencial', buyer: { name: 'Ana Pérez', emailMasked: maskEmail('ana@correo.ec'), documentType: 'cedula', documentMasked: '******5431' }, trip: 'Compras sueltas', batchId: null, attempts: 1, createdAt: '2099-01-01T00:00:00.000Z', updatedAt: '2099-01-01T00:00:00.000Z', ...patch });

describe('qué se compra y qué se cotiza', () => {
  it('precio fijo en USD: una opción en centavos', () => {
    const plan = purchasePlan(exp('gen-01-saraguro-ancestral'));
    expect(plan).toMatchObject({ kind: 'buy', currency: 'USD', choices: [{ minCents: 4500, maxCents: 4500, fixedPeople: null }] });
  });
  it('rango de la fuente: el valor elegido queda dentro del rango', () => {
    const plan = purchasePlan(exp('gal-01-bartolome-y-bahia-sullivan'));
    if (plan.kind !== 'buy') throw new Error('debe comprarse');
    const [choice] = plan.choices;
    expect([choice.minCents, choice.maxCents]).toEqual([27000, 31500]);
    expect(clampChoice(choice, 10)).toBe(27000);
    expect(clampChoice(choice, 99999999)).toBe(31500);
    expect(clampChoice(choice, 30000)).toBe(30000);
  });
  it('«desde» sin máximo: se fija en el mínimo', () => {
    const plan = purchasePlan(exp('gal-03-plaza-sur-y-punta-carrion'));
    if (plan.kind !== 'buy') throw new Error('debe comprarse');
    expect(clampChoice(plan.choices[0], 50000)).toBe(27000);
  });
  it('tarifa por tamaño de grupo: una opción por grupo con las personas fijadas', () => {
    const plan = purchasePlan(exp('gal-09-isabela-en-4-dias-tierra-firme'));
    if (plan.kind !== 'buy') throw new Error('debe comprarse');
    expect(plan.choices.map(choice => [choice.fixedPeople, choice.minCents])).toEqual([[2, 113500], [3, 101000], [4, 91500], [5, 88000], [6, 85500]]);
  });
  it('opciones por persona de la fuente; las de unidad desconocida no se venden', () => {
    const plan = purchasePlan(exp('amz-01-reserva-cuyabeno'));
    expect(plan.kind === 'buy' && plan.choices.length).toBe(3);
    expect(purchasePlan(exp('amz-03-laguna-panacocha')).kind).toBe('quote');
  });
  it('EUR o sin precio: solicitar cotización, sin convertir moneda', () => {
    const plan = purchasePlan(exp('gal-07-volcan-sierra-negra-y-volcan-chico'));
    expect(plan.kind).toBe('quote');
    expect(plan.kind === 'quote' && plan.reason).toMatch(/EUR/);
  });
});

describe('billetera local', () => {
  it('rechaza registros con documento o correo completos', () => {
    expect(isWalletRecord(record())).toBe(true);
    expect(isWalletRecord(record({ buyer: { ...record().buyer, documentMasked: '1710543511' } }))).toBe(false);
    expect(isWalletRecord(record({ buyer: { ...record().buyer, emailMasked: 'ana@correo.ec' } }))).toBe(false);
    expect(isWalletRecord({ ...record(), mode: 'live' })).toBe(false);
    expect(parseWallet({ version: 1, records: [record(), { nope: true }] }).records).toHaveLength(1);
    expect(parseWallet({ version: 99, records: [record()] }).records).toEqual([]);
  });
  it('estado de parada y totales del viaje separados', () => {
    const stops = [exp('gen-01-saraguro-ancestral'), exp('gen-02-quilotoa-shalala'), exp('gal-07-volcan-sierra-negra-y-volcan-chico')];
    const records = [record()];
    expect(stopStatus(stops[0].id, records)).toBe('test_purchase');
    expect(stopStatus(stops[1].id, records)).toBe('none');
    expect(stopStatus(stops[1].id, records, [stops[1].id])).toBe('paid');
    expect(stopStatus(stops[2].id, [record({ kind: 'request', status: 'requested', experienceId: stops[2].id, totalCents: null, unitCents: null })])).toBe('request');
    expect(tripTotals(stops, 2, records)).toEqual({ boughtCents: 9000, pendingCents: 7600, incomparable: 1, boughtCount: 1, pendingCount: 1 });
  });
  it('el comprobante de prueba lleva el rótulo al principio y al final', () => {
    const text = testReceiptText({ code: 'PRB-ABC234', buyerName: 'Ana', emailMasked: 'an*@correo.ec', documentMasked: '******5431', createdAt: 'hoy', lines: [{ title: 'Saraguro', date: '2099-01-02', people: 2, unitCents: 4500, totalCents: 9000, currency: 'USD', note: '' }] });
    const lines = text.split('\n');
    expect(lines[0]).toBe(TEST_RECEIPT_LABEL);
    expect(lines.at(-1)).toBe(TEST_RECEIPT_LABEL);
    expect(text).toMatch(/NO SE COBRÓ NADA/);
  });
});
