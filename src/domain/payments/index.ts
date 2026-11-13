export type PaymentEnvironment = 'sandbox' | 'live';
export type CheckoutStatus = 'pending' | 'captured' | 'failed' | 'cancelled' | 'review_required';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isPaymentReference = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value);

/** Decimal amounts from PostgreSQL are converted without floating-point rounding. */
export function amountInCents(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid amount');
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error('Invalid amount');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Invalid amount');
  return cents;
}

/** Only the provider's documented hosted card origin/path can be returned to a browser. */
export function checkedCheckoutUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid checkout URL');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'pay.payphonetodoesposible.com' || url.port || url.username || url.password
    || url.pathname !== '/Anonymous/Index' || !url.searchParams.get('paymentId') || url.hash) throw new Error('Invalid checkout URL');
  return url.toString();
}

export interface ProviderConfirmation {
  transactionId: number; clientTransactionId: string; amount: number; currency: 'USD';
  outcome: 'captured' | 'cancelled'; cardBrand: string | null; cardLast4: string | null;
}
/** The callback parameters alone never establish that money was received. */
export function checkProviderConfirmation(value: unknown, expected: { transactionId: number; reference: string; cents: number }): ProviderConfirmation {
  if (!value || typeof value !== 'object') throw new Error('Invalid provider response');
  const data = value as Record<string, unknown>;
  if (data.transactionId !== expected.transactionId || data.clientTransactionId !== expected.reference
    || data.amount !== expected.cents || data.currency !== 'USD' || ![2, 3].includes(Number(data.statusCode))) throw new Error('Payment verification mismatch');
  if (data.statusCode !== 2 && data.statusCode !== 3) throw new Error('Invalid payment status');
  return {
    transactionId: expected.transactionId, clientTransactionId: expected.reference, amount: expected.cents, currency: 'USD',
    outcome: data.statusCode === 3 ? 'captured' : 'cancelled',
    cardBrand: typeof data.cardBrand === 'string' ? data.cardBrand.slice(0, 40) : null,
    cardLast4: typeof data.lastDigits === 'string' && /^\d{4}$/.test(data.lastDigits) ? data.lastDigits : null,
  };
}
