import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeather, weatherUrl } from '../src/domain/weather/index.js';
import { requestBoundary } from './_request.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Solo consultas GET.' }); }
  if (!requestBoundary(req, res, true)) return;
  if (process.env.WEATHER_ENABLED !== 'true') return res.status(503).json({ error: 'Proveedor de clima pendiente de habilitar y revisar licencia de uso.' });
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const days = req.query.days === undefined ? 3 : Number(req.query.days);
  const placeName = typeof req.query.place === 'string' ? req.query.place.slice(0, 100) : 'Localidad aproximada';
  if (typeof req.query.lat !== 'string' || !req.query.lat.trim() || typeof req.query.lon !== 'string' || !req.query.lon.trim()
    || (req.query.days !== undefined && typeof req.query.days !== 'string')
    || (req.query.place !== undefined && typeof req.query.place !== 'string')) return res.status(400).json({ error: 'Revisa la localidad y los días.' });
  try { weatherUrl({ lat, lon, placeName, precision: 'locality_approx' }, days); }
  catch { return res.status(400).json({ error: 'Revisa la localidad y los días.' }); }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  try { return res.status(200).json(await getWeather({ lat, lon, placeName, precision: 'locality_approx' }, { days })); }
  catch { return res.status(503).json({ error: 'No tengo el clima actualizado. Revisa coordenadas, conexión y proveedor.' }); }
}
