import { isPaymentReference } from '../../domain/payments';

/** A return reference only opens the status view; it never establishes approval. */
export function paymentReference(search: string): string | null {
  const reference = new URLSearchParams(search).get('payment');
  return isPaymentReference(reference) ? reference : null;
}
