import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeBooking, getPaymentConfiguration, getPaymentStatus, getRefundReview, paymentReference, PaymentRequestError, preparePayment, reconcilePaymentStatus, requestBooking, safeCheckoutURL, submitRefundReview, type ConnectedBooking, type PaymentResult, type RefundReviewRequest } from '../../src/features/payments/api';

const connection = vi.hoisted(() => ({ configured: false, from: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => connection.configured ? { from: connection.from, rpc: connection.rpc } : null }));
const reference = '10000000-0000-4000-8000-000000000001';
const bookingId = '20000000-0000-4000-8000-000000000002';
const key = '30000000-0000-4000-8000-000000000003';
const checkoutUrl = 'https://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=provider-id';
const result: PaymentResult = { reference, bookingId, provider: 'payphone', environment: 'sandbox', currency: 'USD', amount: 42.50, status: 'pending', requiresReview: false };
const review: RefundReviewRequest = { id: key, bookingId, status: 'requested', amount: 42.5, currency: 'USD', reason: 'Motivo de revisión.', createdAt: '2026-11-13T12:00:00Z', environment: 'sandbox' };
const fetchMock = vi.fn();
function respond(data: unknown, status = 200) { fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => data }); }
beforeEach(() => { connection.configured = false; connection.from.mockReset(); connection.rpc.mockReset(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('contratos del cliente de pagos', () => {
  it('solo extrae una referencia UUID y nunca toma el estado del regreso como aprobación', () => {
    expect(paymentReference(`?payment=${reference}&transactionStatus=Approved&paid=true`)).toBe(reference);
    expect(paymentReference('?payment=Approved&paid=true')).toBeNull();
    expect(paymentReference('?payment=%3Cscript%3Ealert(1)%3C/script%3E')).toBeNull();
    expect(paymentReference('?id=123&transactionStatus=Approved')).toBeNull();
  });
  it('acepta únicamente enlaces HTTPS del host de pago permitido', () => {
    expect(safeCheckoutURL(checkoutUrl)).toBe(checkoutUrl);
    for (const value of [null, '//pay.payphonetodoesposible.com/checkout', 'javascript:alert(1)', 'http://pay.payphonetodoesposible.com/checkout', 'https://evil.example/checkout', 'https://pay.payphonetodoesposible.com.evil.example/checkout', 'https://pay.payphonetodoesposible.com@evil.example/checkout', 'https://attacker:secret@pay.payphonetodoesposible.com/checkout', 'https://pay.payphonetodoesposible.com:8443/checkout']) expect(() => safeCheckoutURL(value)).toThrow();
  });
  it('prepara enviando solo reserva e idempotencia, con sesión y sin importe del navegador', async () => {
    respond({ checkoutUrl, clientTransactionId: reference });
    expect(await preparePayment(bookingId, key, 'access-token')).toEqual({ checkoutUrl, reference });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/payments/prepare');
    expect(options).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store', headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' } });
    expect(JSON.parse(options.body)).toEqual({ bookingId, idempotencyKey: key });
  });
  it('rechaza una redirección maliciosa aun cuando prepare devuelva HTTP 200', async () => {
    respond({ checkoutUrl: 'https://evil.example/pay', clientTransactionId: reference });
    await expect(preparePayment(bookingId, key, 'token')).rejects.toThrow(/no pertenece/);
  });
  it('consulta el estado autenticado al servidor sin enviar estado, importe ni datos de tarjeta', async () => {
    respond(result);
    expect(await getPaymentStatus(reference, 'token')).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(`/api/payments/status?reference=${reference}`, expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer token' }, cache: 'no-store' }));
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('body');
  });
  it('rechaza enlaces del mismo host fuera del formulario, sin paymentId o con fragmento', () => {
    for (const value of ['https://pay.payphonetodoesposible.com/checkout?paymentId=x', 'https://pay.payphonetodoesposible.com/Anonymous/Index', checkoutUrl + '#redirect']) expect(() => safeCheckoutURL(value)).toThrow();
  });
  it('exige una referencia verificable en prepare y recupera la referencia de un fallo incierto', async () => {
    respond({ checkoutUrl });
    await expect(preparePayment(bookingId, key, 'token')).rejects.toThrow(/referencia del intento/);
    respond({ error: 'upstream private detail', reference }, 503);
    try { await preparePayment(bookingId, key, 'token'); throw new Error('Expected rejection'); }
    catch (error) { expect(error).toBeInstanceOf(PaymentRequestError); expect(error).toMatchObject({ reference }); expect((error as Error).message).not.toContain('upstream private detail'); }
  });
  it('reconcilia únicamente una referencia autenticada y valida nuevamente el resultado', async () => {
    respond(result);
    expect(await reconcilePaymentStatus(reference, 'token')).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/payments/reconcile', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) }));
    respond({ ...result, status: 'Approved' });
    await expect(reconcilePaymentStatus(reference, 'token')).rejects.toThrow(/no se da el pago por aprobado/);
  });
  it('rechaza referencias inválidas antes de consultar al servidor', async () => {
    await expect(getPaymentStatus('Approved', 'token')).rejects.toThrow(/no es válida/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { reference: bookingId }, { bookingId: 'bad' }, { provider: 'other' }, { environment: 'production' },
    { currency: 'EUR' }, { amount: '42.50' }, { amount: 0 }, { amount: -1 }, { amount: Number.NaN },
    { status: 'Approved' }, { requiresReview: 'false' }, { status: undefined },
  ])('no da por verificado un resultado con campos inválidos: %j', async patch => {
    respond({ ...result, ...patch });
    await expect(getPaymentStatus(reference, 'token')).rejects.toThrow(/no se da el pago por aprobado/);
  });
  it('comprueba la configuración y rechaza una respuesta inválida de disponibilidad', async () => {
    respond({ enabled: false, provider: 'payphone', environment: 'sandbox' });
    expect(await getPaymentConfiguration()).toEqual({ enabled: false, provider: 'payphone', environment: 'sandbox' });
    respond({ enabled: 'true', provider: 'payphone', environment: 'sandbox' });
    await expect(getPaymentConfiguration()).rejects.toThrow(/disponibilidad/);
  });
  it.each([401, 409, 503])('no transforma HTTP %i en un pago aprobado aunque el cuerpo lo afirme', async status => {
    respond({ ...result, status: 'captured' }, status);
    await expect(getPaymentStatus(reference, 'token')).rejects.toThrow();
  });
  it('distingue fallos de red y respuestas que no son JSON sin exponer la respuesta cruda', async () => {
    fetchMock.mockRejectedValueOnce(new Error('secret upstream detail'));
    await expect(getPaymentConfiguration()).rejects.toThrow(/Comprueba tu conexión/);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error('private html'); } });
    await expect(getPaymentConfiguration()).rejects.toThrow(/todavía no está disponible/);
  });
  it('solicita cupos por RPC sin enviar precios o estados y conserva idempotencia', async () => {
    connection.configured = true; connection.rpc.mockResolvedValue({ error: null });
    await requestBooking({ id: 'slot-a', experienceId: 'exp-a', title: 'Ruta', startsAt: '2030-01-01T12:00:00Z', available: 5, price: 999 }, 2, key);
    expect(connection.rpc).toHaveBeenCalledWith('request_booking', { p_experience_id: 'exp-a', p_slot_id: 'slot-a', p_participants: 2, p_idempotency_key: key });
  });
  it('actualiza solo el estado y exige que la reserva siga en el estado observado', async () => {
    connection.configured = true;
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => ({ data: { id: bookingId }, error: null })) };
    query.update.mockReturnValue(query); query.eq.mockReturnValue(query); query.select.mockReturnValue(query); connection.from.mockReturnValue(query);
    await changeBooking({ id: bookingId, status: 'requested', total_amount: 999 } as ConnectedBooking, 'confirmed');
    expect(query.update).toHaveBeenCalledWith({ status: 'confirmed' });
    expect(query.eq.mock.calls).toEqual([['id', bookingId], ['status', 'requested']]);
  });
});

describe('solicitudes de revisión de pagos', () => {
  it('consulta con sesión y solo habilita una nueva solicitud con respuesta explícita sin solicitud anterior', async () => {
    respond({ request: null });
    expect(await getRefundReview(bookingId, 'token')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(`/api/payments/refund-request?bookingId=${bookingId}`, expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer token' }, cache: 'no-store' }));
    respond({});
    await expect(getRefundReview(bookingId, 'token')).rejects.toThrow(/comprobar tu solicitud/);
  });
  it('envía únicamente reserva, motivo e idempotencia, sin importe ni información bancaria', async () => {
    respond({ request: review });
    expect(await submitRefundReview(bookingId, '  Motivo de revisión.  ', key, 'token')).toEqual(review);
    expect(fetchMock).toHaveBeenCalledWith('/api/payments/refund-request', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' } }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ bookingId, reason: 'Motivo de revisión.', idempotencyKey: key });
  });
  it.each([
    { bookingId: reference }, { id: 'invalid' }, { status: 'refunded' }, { amount: 0 }, { amount: '42.50' },
    { currency: 'EUR' }, { reason: null }, { createdAt: 'ayer' }, { environment: 'production' },
  ])('rechaza una solicitud malformada o de otra reserva: %j', async patch => {
    respond({ request: { ...review, ...patch } });
    await expect(getRefundReview(bookingId, 'token')).rejects.toThrow(/comprobar tu solicitud/);
    await expect(submitRefundReview(bookingId, review.reason, key, 'token')).rejects.toThrow(/comprobar tu solicitud/);
  });
  it('un POST sin solicitud registrada no se presenta como guardado ni reembolso realizado', async () => {
    respond({ request: null });
    await expect(submitRefundReview(bookingId, review.reason, key, 'token')).rejects.toThrow(/No se pudo registrar/);
  });
  it('rechaza una consulta con reserva inválida antes de llamar al servidor', async () => {
    await expect(getRefundReview('invalid', 'token')).rejects.toThrow(/reserva no es válida/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
