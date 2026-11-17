// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const mocks = vi.hoisted(() => ({ client: null as unknown, rows: {} as Record<string, Record<string, unknown>[]>, calls: [] as unknown[][], auth: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mocks.client }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => mocks.client, supabaseConfiguration: () => ({ available: true }) }));
import { requestBoundary } from '../../api/_request';
import assistant from '../../api/assistant';
import prepare from '../../api/payments/prepare';
import { loadHostStats, HostDashboard } from '../../src/features/host/HostDashboard';
import { loadBusinessExperiences, saveBusinessExperience, type BusinessExperience } from '../../src/features/cms/api';
import { parseTransfer, receiptUrl, reviewTransfer, saveBankAccount, startTransfer, submitReceipt } from '../../src/features/payments/transferApi';
import { HostVerificationActions } from '../../src/features/host/HostVerificationActions';

const bookingId = '11111111-1111-4111-8111-111111111111';
const idempotencyKey = '22222222-2222-4222-8222-222222222222';
const draft: BusinessExperience = { id: 'exp-1', organization_id: 'org-1', title: 'Borrador propio', summary: 'Resumen', description: 'Descripción', status: 'draft', booking_enabled: false, updated_at: '2026-11-17T00:00:00Z' };
function response() {
  return { code: 200, value: undefined as unknown, headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) { this.headers[name] = value; return this; },
    status(code: number) { this.code = code; return this; }, json(value: unknown) { this.value = value; return this; }, end() { return this; } };
}
function request(headers: Record<string, unknown> = {}, body: unknown = { bookingId, idempotencyKey }) {
  return { method: 'POST', headers, query: {}, body } as unknown as VercelRequest;
}
function query(table: string) {
  const result = () => ({ data: mocks.rows[table] ?? [], error: null });
  const chain = {
    select: (...args: unknown[]) => { mocks.calls.push([table, 'select', ...args]); return chain; },
    update: (value: unknown) => { mocks.calls.push([table, 'update', value]); return chain; },
    upsert: (value: unknown) => { mocks.calls.push([table, 'upsert', value]); return chain; },
    in: (...args: unknown[]) => { mocks.calls.push([table, 'in', ...args]); return chain; },
    eq: (...args: unknown[]) => { mocks.calls.push([table, 'eq', ...args]); return chain; },
    neq: () => chain, order: () => chain, limit: () => chain,
    maybeSingle: async () => ({ data: result().data[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return chain;
}
beforeEach(() => {
  mocks.rows = {}; mocks.calls = []; mocks.auth.mockReset(); mocks.rpc.mockReset();
  mocks.auth.mockResolvedValue({ data: { user: { id: 'owner', email_confirmed_at: '2026-11-17' } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.client = { from: query, rpc: mocks.rpc, auth: { getUser: mocks.auth, getSession: async () => ({ data: { session: { user: { id: 'owner' } } } }) } };
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('PAYMENTS_APP_URL', 'https://chulla.example');
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('límites de entrada antes de consultar servicios', () => {
  it('tolera headers ausentes en pruebas, sin autorizar una sesión', async () => {
    const res = response();
    expect(requestBoundary({ method: 'POST' } as VercelRequest, res as unknown as VercelResponse)).toBe(true);
    vi.stubEnv('ASSISTANT_ENABLED', 'true'); vi.stubEnv('ANTHROPIC_API_KEY', 'test-placeholder'); vi.stubEnv('ANTHROPIC_MODEL', 'test');
    vi.stubEnv('SUPABASE_URL', 'https://db.example'); vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-public');
    await assistant({ method: 'POST', body: { question: 'Hola', consentRemote: true } } as VercelRequest, res as unknown as VercelResponse);
    expect(res.code).toBe(401); expect(mocks.auth).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('rechaza orígenes ajenos, null, arrays y navegación de otro sitio', () => {
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null' }, { origin: ['https://chulla.example'] }, { origin: 'https://chulla.example.evil.example' }, { 'sec-fetch-site': 'cross-site' }]) {
      const res = response(); expect(requestBoundary(request(headers), res as unknown as VercelResponse)).toBe(false); expect(res.code).toBe(403);
    }
    expect(requestBoundary(request({ origin: 'https://chulla.example' }), response() as unknown as VercelResponse)).toBe(true);
  });
  it('limita bytes reales UTF-8, longitud declarada, consultas y tipo JSON', () => {
    for (const [req, expected] of [[request({}, { value: 'é'.repeat(9000) }), 413], [request({ 'content-length': '20000' }), 413],
      [request({ 'content-type': 'text/plain' }), 415], [request({ authorization: 'x'.repeat(10001) }), 401],
      [{ ...request(), query: { value: 'x'.repeat(9000) } }, 414]] as const) {
      const res = response(); expect(requestBoundary(req, res as unknown as VercelResponse)).toBe(false); expect(res.code).toBe(expected);
    }
  });
  it('mantiene disponible el retorno GET público del proveedor', () => {
    expect(requestBoundary({ ...request({ origin: 'https://provider.example', 'sec-fetch-site': 'cross-site' }), method: 'GET', body: undefined }, response() as unknown as VercelResponse, true)).toBe(true);
  });
});

describe('checkout live exige autorización del servidor', () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries({ PAYMENTS_ENABLED: 'true', PAYMENTS_ENVIRONMENT: 'live', PAYMENTS_LIVE_ENABLED: 'true', PAYPHONE_TOKEN: 'test-token', PAYPHONE_STORE_ID: 'test-store', SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'test-service' })) vi.stubEnv(name, value);
  });
  it('rechaza sesión ausente y correo no confirmado sin crear checkout ni contactar proveedor', async () => {
    for (const user of [null, { id: 'owner', email_confirmed_at: null }]) {
      mocks.auth.mockResolvedValue({ data: { user }, error: null });
      const res = response(); await prepare(request(user ? { authorization: 'Bearer test-session' } : {}), res as unknown as VercelResponse);
      expect(res.code).toBe(401);
    }
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('usa al pagador autenticado y oculta errores internos si la reserva es ajena', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'internal-test-marker' } });
    const res = response(); await prepare(request({ authorization: 'Bearer test-session' }), res as unknown as VercelResponse);
    expect(mocks.rpc).toHaveBeenCalledWith('claim_payphone_checkout', { p_booking_id: bookingId, p_payer_id: 'owner', p_idempotency_key: idempotencyKey, p_environment: 'live' });
    expect(res.code).toBe(404); expect(JSON.stringify(res.value)).not.toContain('internal-test-marker'); expect(fetch).not.toHaveBeenCalled();
  });
  it('rechaza importe, rol o pagador del cliente antes de llamar al servidor', async () => {
    for (const extra of [{ amount: 0.01 }, { payerId: 'other' }, { role: 'admin' }]) {
      const res = response(); await prepare(request({ authorization: 'Bearer test-session' }, { bookingId, idempotencyKey, ...extra }), res as unknown as VercelResponse); expect(res.code).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe('datos del negocio y edición con permisos existentes', () => {
  it('cuenta comprobantes enviados y acota cobros por beneficiario; no mezcla monedas', async () => {
    mocks.rows.experiences = [{ ...draft }, { ...draft, organization_id: 'other' }];
    mocks.rows.bookings = [{ organization_id: 'org-1', status: 'awaiting_payment' }];
    mocks.rows.transfer_payments = [{ organization_id: 'org-1', status: 'receipt_submitted' }, { organization_id: 'other', status: 'receipt_submitted' }, { organization_id: 'org-1', status: 'paid' }];
    mocks.rows.payouts = [{ amount: '20', currency: 'USD', status: 'paid', beneficiaries: { organization_id: 'org-1' } }, { amount: '900', currency: 'USD', status: 'paid', beneficiaries: { organization_id: 'other' } }];
    expect(await loadHostStats(mocks.client as SupabaseClient, ['org-1'])).toMatchObject({ experiences: 1, paymentsToReview: 1, payoutsPaid: 20 });
    mocks.rows.payouts.push({ amount: '10', currency: 'EUR', status: 'paid', beneficiaries: { organization_id: 'org-1' } });
    expect((await loadHostStats(mocks.client as SupabaseClient, ['org-1'])).payoutsPaid).toBeNull();
  });
  it('carga experiencias propias y guarda solo contenido con versión, organización y estado', async () => {
    mocks.rows.experiences = [{ ...draft }, { ...draft, id: 'foreign', organization_id: 'other' }];
    expect(await loadBusinessExperiences(mocks.client as SupabaseClient, ['org-1'])).toHaveLength(1);
    await saveBusinessExperience(mocks.client as SupabaseClient, draft);
    expect(mocks.calls).toContainEqual(['experiences', 'update', { title: draft.title, summary: draft.summary, description: draft.description }]);
    expect(mocks.calls).toContainEqual(['experiences', 'eq', 'updated_at', draft.updated_at]);
    expect(mocks.calls).toContainEqual(['experiences', 'eq', 'organization_id', 'org-1']);
    expect(mocks.calls).toContainEqual(['experiences', 'eq', 'status', 'draft']);
    await expect(saveBusinessExperience(mocks.client as SupabaseClient, { ...draft, status: 'published' })).rejects.toThrow();
  });
  it('una propiedad de interfaz forjada tampoco permite guardar el banco', async () => {
    mocks.rows.organizations = [{ owner_id: 'other' }];
    await expect(saveBankAccount('org-1', { bankName: 'Banco de prueba', accountNumber: '1234567890', accountType: 'ahorros', holderName: 'Titular de prueba', holderId: '1234567890' })).rejects.toThrow('Solo el dueño');
    expect(mocks.calls.some(call => call[1] === 'upsert')).toBe(false);
  });
  it('abre comprobantes solo mediante un enlace firmado de 60 segundos y oculta errores de transporte', async () => {
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://db.example/private-test' }, error: null }));
    const from = vi.fn(() => ({ createSignedUrl }));
    (mocks.client as { storage: unknown }).storage = { from };
    expect(await receiptUrl('org/user/transfer/receipt.pdf')).toBe('https://db.example/private-test');
    expect(from).toHaveBeenCalledWith('payment-receipts');
    expect(createSignedUrl).toHaveBeenCalledWith('org/user/transfer/receipt.pdf', 60);
    mocks.rpc.mockRejectedValue(new Error('sensitive-test-diagnostic'));
    await expect(reviewTransfer('test', 'paid')).rejects.toThrow('No se pudo guardar la decisión.');
  });
  it('envía correcciones al RPC existente sin aprobar al negocio desde el navegador', async () => {
    render(createElement(HostVerificationActions, { client: mocks.client as SupabaseClient, application: { id: 'request-1', organization_id: 'org-1', status: 'needs_changes', created_at: '2026-11-17' } }));
    fireEvent.change(screen.getByLabelText('Qué corregiste'), { target: { value: 'Documento corregido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar correcciones' }));
    expect(await screen.findByText('Enviado a revisión humana. Tu negocio aún no está aprobado.')).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith('resubmit_verification_request', { p_request_id: 'request-1', p_note: 'Documento corregido' });
  });
  it('muestra siguiente paso, editor real y banco de solo lectura para quien no es dueño', async () => {
    mocks.rows.experiences = [{ ...draft }];
    render(createElement(HostDashboard, { client: mocks.client as SupabaseClient, session: { user: { id: 'manager', email: 'test@example.test' } } as Session,
      organizations: [{ id: 'org-1', name: 'Negocio de prueba', kind: 'business', verification_status: 'in_review', owner_id: 'owner' }],
      applications: [], documents: [], documentLinks: {}, busy: false, onApply: async () => true, onUpload: vi.fn(), onOpenDocument: vi.fn(), onSignOut: vi.fn() }));
    expect(screen.getByRole('region', { name: 'Siguiente paso' })).toHaveTextContent('Una persona revisará');
    expect(document.querySelector('[data-tour="host"]')).toHaveTextContent('Negocio de prueba');
    expect(screen.getByRole('region', { name: 'Editar experiencias' })).toHaveAttribute('data-tour', 'host-experiences');
    expect(screen.getByRole('region', { name: 'Verificación y cobros' })).toHaveAttribute('data-tour', 'host-requests');
    expect(await screen.findByText('Solo el dueño puede cambiar la cuenta bancaria.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cuenta' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar borrador' }));
    expect(screen.getByLabelText('Título')).toHaveValue(draft.title);
  });
  it('rechaza cantidades inválidas y archivos con firma falsa sin llamar al backend', async () => {
    await expect(startTransfer({ experienceId: 'test', startDate: '2026-12-01', endDate: '2026-12-01', adults: 1, children: 0, amount: 1.001, idempotencyKey })).rejects.toThrow();
    await expect(submitReceipt({ id: 'test', organizationId: 'org-1' }, new Blob(['not a receipt'], { type: 'image/jpeg' }), 'image/jpeg')).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(() => parseTransfer({ id: 'test', reference: 'CV-T-ABC123', status: 'paid', amount: Infinity, currency: 'USD' })).toThrow();
  });
});
