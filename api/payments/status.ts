import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isPaymentReference } from '../../src/domain/payments/index';
import { authenticatedUser, method, paymentConfig, readPaymentStatus, serviceClient } from '../../src/domain/payments/server';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,'GET')) return;
  const reference = req.query.reference;
  if (!isPaymentReference(reference)) return res.status(400).json({ error: 'Referencia no válida.' });
  const config = paymentConfig();
  if (!config.ready) return res.status(503).json({ error: 'El servicio de pagos todavía no está conectado.' });
  try {
    const client = serviceClient(config); const user = await authenticatedUser(req,client);
    if (!user) return res.status(401).json({ error: 'Inicia sesión para consultar tu pago.' });
    const status = await readPaymentStatus(client,reference,user);
    if (!status) return res.status(404).json({ error: 'No encontramos ese pago en tu cuenta.' });
    return res.status(200).json(status);
  } catch { return res.status(503).json({ error: 'No pudimos consultar el pago. No repitas el cobro mientras se revisa.' }); }
}
