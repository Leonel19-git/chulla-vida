import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkedCheckoutUrl, isPaymentReference } from '../../src/domain/payments/index';
import { authenticatedUser, method, paymentConfig, providerPost, serviceClient } from '../../src/domain/payments/server';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,'POST')) return;
  const config = paymentConfig();
  if (!config.enabled) return res.status(503).json({ error: config.reason });
  const body = req.body;
  if (!body || typeof body !== 'object' || !isPaymentReference(body.bookingId) || !isPaymentReference(body.idempotencyKey)
    || Object.keys(body).some(key => !['bookingId','idempotencyKey'].includes(key))) return res.status(400).json({ error: 'Revisa la reserva y la referencia de intento.' });
  const client = serviceClient(config);
  try {
    const user = await authenticatedUser(req,client);
    if (!user) return res.status(401).json({ error: 'Inicia sesión con tu correo confirmado para pagar.' });
    const { data: checkout,error } = await client.rpc('claim_payphone_checkout',{
      p_booking_id: body.bookingId,p_payer_id: user,p_idempotency_key: body.idempotencyKey,p_environment: config.environment,
    });
    if (error || !checkout) return res.status(error?.code === '42501' ? 404 : 409).json({ error: 'Esta reserva no está disponible para pagar o ya tiene un intento. Revisa tus pagos.' });
    if (!checkout.claimed) {
      if (checkout.environment === config.environment && checkout.state === 'prepared' && Date.parse(checkout.expires_at) > Date.now()) {
        return res.status(200).json({ checkoutUrl: checkedCheckoutUrl(checkout.checkout_url),clientTransactionId: checkout.reference,environment: checkout.environment });
      }
      return res.status(409).json({ error: 'Este intento ya está en curso o necesita revisión. No se ha creado otro cobro.',reference: checkout.reference });
    }
    try {
      const raw = await providerPost('Prepare',{
        ...checkout.prepare_components,amount: Number(checkout.amount_cents),currency: 'USD',
        clientTransactionId: checkout.reference,storeId: config.storeId,reference: `CHULLA VIDA ${checkout.reference}`,
        responseUrl: `${config.appUrl}/api/payments/return`,cancellationUrl: `${config.appUrl}/?payment=${checkout.reference}`,timeZone: -5,
      },config) as Record<string, unknown>;
      const checkoutUrl = checkedCheckoutUrl(raw.payWithCard);
      if (typeof raw.paymentId !== 'string' || raw.paymentId.length > 200 || !raw.paymentId) throw new Error('Invalid payment identity');
      if (new URL(checkoutUrl).searchParams.get('paymentId') !== raw.paymentId) throw new Error('Provider payment mismatch');
      const result = await client.rpc('finish_payphone_prepare',{ p_reference: checkout.reference,p_checkout_url: checkoutUrl,p_provider_prepare_id: raw.paymentId });
      if (result.error) throw new Error('Could not persist checkout');
      return res.status(200).json({ checkoutUrl,clientTransactionId: checkout.reference,environment: checkout.environment });
    } catch {
      await client.from('payment_checkouts').update({ state: 'uncertain' }).eq('reference',checkout.reference).eq('state','preparing');
      return res.status(503).json({ error: 'No pudimos abrir el pago. El intento quedó para revisión; evita repetirlo hasta consultar su estado.',reference: checkout.reference });
    }
  } catch { return res.status(503).json({ error: 'El servicio de pagos no está disponible. Inténtalo más tarde.' }); }
}
