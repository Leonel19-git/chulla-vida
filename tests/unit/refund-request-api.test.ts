import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../api/payments/refund-request';

const mocks = vi.hoisted(() => ({ ready: true, user: 'user-a' as string | null, rpc: vi.fn() }));
vi.mock('../../src/domain/payments/server', () => ({
  privateResponse: (res: VercelResponse) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); },
  paymentConfig: () => ({ ready: mocks.ready, enabled: false, environment: 'sandbox' }),
  authenticatedUser: async () => mocks.user,
  serviceClient: () => ({ rpc: mocks.rpc }),
}));

const booking = '11111111-1111-4111-8111-111111111111';
const key = '22222222-2222-4222-8222-222222222222';
const review = { id: '33333333-3333-4333-8333-333333333333', bookingId: booking, status: 'requested', amount: 24.68, currency: 'USD', reason: 'Cambio de fechas', createdAt: '2026-11-13T12:00:00Z', environment: 'sandbox' };
function response() {
  return { statusCode: 200, payload: undefined as unknown, headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) { this.headers[name] = value; return this; },
    status(value: number) { this.statusCode = value; return this; }, json(value: unknown) { this.payload = value; return this; },
  };
}
async function call(method: string, body?: unknown, query: Record<string, unknown> = {}) {
  const result = response();
  await handler({ method, body, query, headers: {} } as unknown as VercelRequest, result as unknown as VercelResponse);
  return result;
}
beforeEach(() => {
  mocks.ready = true; mocks.user = 'user-a'; mocks.rpc.mockReset(); mocks.rpc.mockResolvedValue({ data: review, error: null });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('refund review API never performs a refund', () => {
  it('passes canonical booking and authenticated payer to the server RPC without an amount', async () => {
    const result = await call('POST', { bookingId: booking, reason: '  Cambio de fechas  ', idempotencyKey: key });
    expect(result.statusCode).toBe(200); expect(result.payload).toEqual({ request: review });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('request_refund_review', {
      p_booking_id: booking, p_payer_id: 'user-a', p_environment: 'sandbox', p_reason: 'Cambio de fechas', p_idempotency_key: key,
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.headers['Cache-Control']).toBe('no-store');
  });
  it('supports review even when new checkout has been disabled', async () => {
    expect((await call('POST', { bookingId: booking, reason: 'Cambio de fechas', idempotencyKey: key })).statusCode).toBe(200);
  });
  it('rejects client supplied amount, status, payer and malformed reasons', async () => {
    for (const extra of [{ amount: 1 }, { status: 'succeeded' }, { payerId: 'other' }, { reason: ' ' }, { reason: 'x'.repeat(1001) }, { idempotencyKey: 'not-a-uuid' }]) {
      expect((await call('POST', { bookingId: booking, reason: 'Cambio del viaje', idempotencyKey: key, ...extra })).statusCode).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('requires a confirmed authenticated user', async () => {
    mocks.user = null;
    expect((await call('POST', { bookingId: booking, reason: 'Cambio del viaje', idempotencyKey: key })).statusCode).toBe(401);
    expect((await call('GET', undefined, { bookingId: booking })).statusCode).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('reads only the authenticated payer booking and returns null without inventing a request', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const result = await call('GET', undefined, { bookingId: booking });
    expect(result.statusCode).toBe(200); expect(result.payload).toEqual({ request: null });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('read_refund_review_request', { p_booking_id: booking, p_payer_id: 'user-a', p_environment: 'sandbox' });
  });
  it('hides foreign booking details and reports conflicting state without raw database errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'private booking details' } });
    const forbidden = await call('GET', undefined, { bookingId: booking }); expect(forbidden.statusCode).toBe(404);
    expect(JSON.stringify(forbidden.payload)).not.toContain('private');
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'environment mismatch' } });
    expect((await call('POST', { bookingId: booking, reason: 'Cambio del viaje', idempotencyKey: key })).statusCode).toBe(409);
  });
  it('rejects invalid methods and query IDs and fails safely when unavailable', async () => {
    const unsupported = await call('DELETE'); expect(unsupported.statusCode).toBe(405); expect(unsupported.headers.Allow).toBe('GET, POST');
    expect((await call('GET', undefined, { bookingId: [booking, booking] })).statusCode).toBe(400);
    mocks.ready = false;
    expect((await call('GET', undefined, { bookingId: booking })).statusCode).toBe(503); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('never claims success if saving returns no record or the database fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect((await call('POST', { bookingId: booking, reason: 'Cambio del viaje', idempotencyKey: key })).statusCode).toBe(503);
    mocks.rpc.mockRejectedValue(new Error('database unavailable'));
    const failure = await call('GET', undefined, { bookingId: booking }); expect(failure.statusCode).toBe(503);
    expect(JSON.stringify(failure.payload)).toContain('No se ha confirmado ningún reembolso');
    expect(fetch).not.toHaveBeenCalled();
  });
});
