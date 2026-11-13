import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkProviderConfirmation, isPaymentReference } from '../../src/domain/payments/index';
import { method, paymentConfig, providerPost, serviceClient } from '../../src/domain/payments/server';

/** Public provider return: query values only identify the transaction to verify server-side. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,'GET')) return;
  const reference = req.query.clientTransactionId;
  const id = req.query.id;
  const validReference = isPaymentReference(reference);
  const redirect = () => { res.setHeader('Location',validReference ? `/?payment=${encodeURIComponent(reference)}` : '/?payment_error=invalid_return'); return res.status(303).end(); };
  if (!validReference || typeof id !== 'string' || !/^\d{1,15}$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return redirect();
  const config = paymentConfig();
  // Finishing an in-flight transaction remains available if new checkouts were disabled.
  if (!config.ready) return redirect();
  try {
    const client = serviceClient(config);
    const { data: checkout,error } = await client.from('payment_checkouts').select('reference,amount_cents,environment,state,provider_transaction_id')
      .eq('reference',reference).maybeSingle();
    if (error || !checkout || checkout.environment !== config.environment || checkout.state === 'captured'
      || !['prepared','uncertain','cancelled'].includes(checkout.state)) return redirect();
    if (checkout.provider_transaction_id !== null && Number(checkout.provider_transaction_id) !== Number(id)) return redirect();
    // An untrusted retry hint, never payment evidence; always checked with the provider.
    await client.from('payment_checkouts').update({ return_candidate_id: Number(id) }).eq('reference',reference).neq('state','captured');
    const confirmation = checkProviderConfirmation(await providerPost('V2/Confirm',{ id: Number(id),clientTxId: reference },config),{
      transactionId: Number(id),reference,cents: Number(checkout.amount_cents),
    });
    const result = await client.rpc('record_payphone_confirmation',{
      p_reference: reference,p_transaction_id: confirmation.transactionId,p_amount_cents: confirmation.amount,p_currency: confirmation.currency,
      p_outcome: confirmation.outcome,p_card_brand: confirmation.cardBrand,p_card_last4: confirmation.cardLast4,
    });
    if (result.error) return redirect();
  } catch { /* No success state is invented when the provider or database cannot be reached. */ }
  return redirect();
}
