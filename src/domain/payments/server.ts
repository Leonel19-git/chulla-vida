import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PaymentEnvironment, CheckoutStatus } from './index';

export interface PaymentConfig { enabled: boolean; ready: boolean; provider: 'payphone'; environment: PaymentEnvironment; reason?: string; appUrl: string; token: string; storeId: string; supabaseUrl: string; serviceKey: string }
export function paymentConfig(env: Record<string, string | undefined> = process.env): PaymentConfig {
  const environment: PaymentEnvironment = env.PAYMENTS_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  let appUrl = ''; let supabaseUrl = '';
  const safeUrl = (value: string | undefined) => {
    const url = new URL(value || '');
    if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)
      || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid URL');
    return url.origin;
  };
  try { appUrl = safeUrl(env.PAYMENTS_APP_URL); supabaseUrl = safeUrl(env.SUPABASE_URL); } catch { /* unavailable */ }
  const token = env.PAYPHONE_TOKEN?.trim() || ''; const storeId = env.PAYPHONE_STORE_ID?.trim() || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  const ready = Boolean(appUrl && supabaseUrl && token && storeId && serviceKey && ['sandbox', 'live'].includes(env.PAYMENTS_ENVIRONMENT || 'sandbox')
    && (environment === 'live' ? env.PAYMENTS_LIVE_ENABLED === 'true' : env.PAYPHONE_SANDBOX_CONFIRMED === 'true'));
  const enabled = ready && env.PAYMENTS_ENABLED === 'true';
  return { enabled, ready, provider: 'payphone', environment, appUrl, token, storeId, supabaseUrl, serviceKey,
    ...(!enabled ? { reason: 'Los pagos con tarjeta todavía no están habilitados. Puedes seguir explorando y probar el catálogo de demostración.' } : {}) };
}
export function serviceClient(config: PaymentConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function privateResponse(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
}
export function method(req: VercelRequest, res: VercelResponse, allowed: string): boolean {
  privateResponse(res);
  if (req.method === allowed) return true;
  res.setHeader('Allow', allowed); res.status(405).json({ error: 'Método no permitido.' }); return false;
}
export async function authenticatedUser(req: VercelRequest, client: SupabaseClient): Promise<string | null> {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !/^Bearer \S+$/i.test(header) || header.length > 10000) return null;
  const { data, error } = await client.auth.getUser(header.slice(7));
  return !error && data.user?.email_confirmed_at ? data.user.id : null;
}
export async function providerPost(path: 'Prepare' | 'V2/Confirm', body: Record<string, unknown>, config: PaymentConfig): Promise<unknown> {
  const response = await fetch(`https://pay.payphonetodoesposible.com/api/button/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json', Referer: config.appUrl },
    body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Provider unavailable');
  return response.json();
}

export async function readPaymentStatus(client: SupabaseClient, reference: string, user: string) {
  const { data: checkout,error } = await client.from('payment_checkouts')
    .select('reference,booking_id,state,amount_cents,currency,environment,requires_review').eq('reference',reference).eq('payer_id',user).maybeSingle();
  if (error) throw new Error('Status unavailable');
  if (!checkout) return null;
  const status: CheckoutStatus = checkout.requires_review ? 'review_required' : checkout.state === 'captured' ? 'captured' : checkout.state === 'cancelled' ? 'cancelled' : 'pending';
  const { data: booking } = await client.from('bookings').select('status').eq('id',checkout.booking_id).eq('traveler_id',user).maybeSingle();
  return { reference:checkout.reference,status,amount:Number(checkout.amount_cents)/100,currency:checkout.currency,
    environment:checkout.environment,bookingId:checkout.booking_id,provider:'payphone',requiresReview:checkout.requires_review,bookingStatus:booking?.status };
}
