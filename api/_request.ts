import { Buffer } from 'node:buffer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Bounds checked before auth, database or provider work. Provider navigation returns allow cross-origin GET. */
export function requestBoundary(req: VercelRequest, res: VercelResponse, allowCrossOrigin = false): boolean {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reject = (code: number, error: string) => { res.status(code).json({ error }); return false; };
  const headers = req.headers ?? {};
  const authorization = headers.authorization;
  if (authorization !== undefined && (typeof authorization !== 'string' || authorization.length > 10000))
    return reject(401, 'La sesión no es válida. Vuelve a entrar.');
  const length = headers['content-length'];
  if (length !== undefined && (typeof length !== 'string' || !/^\d{1,8}$/.test(length) || Number(length) > 16384))
    return reject(413, 'La solicitud es demasiado grande.');
  try {
    if (req.body !== undefined && Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body), 'utf8') > 16384)
      return reject(413, 'La solicitud es demasiado grande.');
    if (Object.keys(req.query ?? {}).length > 16 || Buffer.byteLength(JSON.stringify(req.query ?? {}), 'utf8') > 8192)
      return reject(414, 'La dirección de la consulta es demasiado larga.');
  } catch { return reject(400, 'La solicitud no es válida.'); }
  if (!allowCrossOrigin) {
    if (headers['sec-fetch-site'] === 'cross-site') return reject(403, 'Abre esta acción desde CHULLA VIDA.');
    const origin = headers.origin;
    if (origin !== undefined) {
      try {
        if (typeof origin !== 'string' || origin.length > 2048) throw new Error('Invalid origin');
        const parsed = new URL(origin);
        const configured = process.env.PAYMENTS_APP_URL;
        const sameOrigin = configured ? origin === new URL(configured).origin
          : parsed.host === headers.host && (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname)));
        if (parsed.origin !== origin || !sameOrigin) throw new Error('Invalid origin');
      } catch { return reject(403, 'Abre esta acción desde CHULLA VIDA.'); }
    }
  }
  if (req.method === 'POST' && headers['content-type'] !== undefined
    && (typeof headers['content-type'] !== 'string' || !/^application\/json(?:\s*;.*)?$/i.test(headers['content-type'])))
    return reject(415, 'Envía la solicitud como JSON.');
  return true;
}
