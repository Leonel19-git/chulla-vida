import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isPaymentReference } from '../../src/domain/payments/index.js';
import { authenticatedUser, paymentConfig, privateResponse, serviceClient } from '../../src/domain/payments/server.js';

/** A request for human review only. This handler never invokes a provider refund operation. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  privateResponse(res);
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Método no permitido.' });
  }
  const body = req.body as Record<string, unknown> | undefined;
  const bookingId = req.method === 'GET' ? req.query.bookingId : body?.bookingId;
  if (!isPaymentReference(bookingId)) return res.status(400).json({ error: 'Reserva no válida.' });
  if (req.method === 'POST' && (!body || typeof body !== 'object' || Array.isArray(body)
    || !isPaymentReference(body.idempotencyKey) || typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.trim().length > 1000
    || Object.keys(body).some(key => !['bookingId', 'reason', 'idempotencyKey'].includes(key)))) {
    return res.status(400).json({ error: 'Escribe un motivo de entre 3 y 1000 caracteres.' });
  }
  const config = paymentConfig();
  // Disabling new checkout must not hide the review route for an existing captured payment.
  if (!config.ready) return res.status(503).json({ error: 'El servicio de pagos todavía no está conectado.' });
  try {
    const client = serviceClient(config); const user = await authenticatedUser(req, client);
    if (!user) return res.status(401).json({ error: 'Inicia sesión con el correo confirmado para revisar tu pago.' });
    const { data, error } = await client.rpc(req.method === 'GET' ? 'read_refund_review_request' : 'request_refund_review', {
      p_booking_id: bookingId, p_payer_id: user, p_environment: config.environment,
      ...(req.method === 'POST' ? { p_reason: (body!.reason as string).trim(), p_idempotency_key: body!.idempotencyKey } : {}),
    });
    if (error) return res.status(error.code === '42501' ? 404 : 409).json({ error: error.code === '42501'
      ? 'No encontramos esa reserva en tu cuenta.' : 'No se pudo registrar una nueva solicitud. Consulta el estado de tu pago antes de reintentar.' });
    if (req.method === 'POST' && !data) return res.status(503).json({ error: 'No pudimos verificar el registro. Consulta el estado antes de reintentar.' });
    return res.status(200).json({ request: data ?? null });
  } catch { return res.status(503).json({ error: 'No se pudo consultar la revisión. No se ha confirmado ningún reembolso.' }); }
}
