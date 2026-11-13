import type { VercelRequest, VercelResponse } from '@vercel/node';
import { method, paymentConfig } from '../../src/domain/payments/server.js';
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!method(req,res,'GET')) return;
  const { enabled,provider,environment,reason } = paymentConfig();
  return res.status(200).json({ enabled,provider,environment,...(reason ? { reason } : {}) });
}
