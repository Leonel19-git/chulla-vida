import type { VercelRequest,VercelResponse } from '@vercel/node';
import { checkProviderConfirmation,isPaymentReference } from '../../src/domain/payments/index';
import { authenticatedUser,method,paymentConfig,providerPost,readPaymentStatus,serviceClient } from '../../src/domain/payments/server';

/** Retry verification of the provider return; does not create or repeat a charge. */
export default async function handler(req: VercelRequest,res: VercelResponse) {
  if (!method(req,res,'POST')) return;
  const body = req.body;
  if (!body || typeof body !== 'object' || !isPaymentReference(body.reference) || Object.keys(body).some(key => key !== 'reference'))
    return res.status(400).json({error:'Referencia no válida.'});
  const config = paymentConfig();
  if (!config.ready) return res.status(503).json({error:'El servicio de pagos todavía no está conectado.'});
  try {
    const client = serviceClient(config);const user = await authenticatedUser(req,client);
    if (!user) return res.status(401).json({error:'Inicia sesión para revisar tu pago.'});
    const {data:checkout,error} = await client.from('payment_checkouts')
      .select('reference,state,return_candidate_id,amount_cents,environment').eq('reference',body.reference).eq('payer_id',user).maybeSingle();
    if (error || !checkout) return res.status(404).json({error:'No encontramos ese pago en tu cuenta.'});
    if (checkout.environment !== config.environment) return res.status(409).json({error:'Este pago pertenece a otro entorno y necesita revisión.'});
    if (checkout.state !== 'captured' && checkout.return_candidate_id && ['prepared','uncertain','cancelled'].includes(checkout.state)) {
      const transactionId = Number(checkout.return_candidate_id);
      const confirmation = checkProviderConfirmation(await providerPost('V2/Confirm',{id:transactionId,clientTxId:body.reference},config),{
        transactionId,reference:body.reference,cents:Number(checkout.amount_cents),
      });
      const result = await client.rpc('record_payphone_confirmation',{
        p_reference:body.reference,p_transaction_id:confirmation.transactionId,p_amount_cents:confirmation.amount,p_currency:confirmation.currency,
        p_outcome:confirmation.outcome,p_card_brand:confirmation.cardBrand,p_card_last4:confirmation.cardLast4,
      });
      if(result.error) throw new Error('Verification persistence unavailable');
    }
    return res.status(200).json(await readPaymentStatus(client,body.reference,user));
  } catch {return res.status(503).json({error:'El proveedor todavía no confirmó el resultado. Evita repetir el cobro; puedes volver a revisar este mismo intento.'});}
}
