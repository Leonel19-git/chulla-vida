import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeather } from '../src/domain/weather/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Solo consultas GET.' }); }
  if (process.env.WEATHER_ENABLED !== 'true') return res.status(503).json({ error: 'Proveedor de clima pendiente de habilitar y revisar licencia de uso.' });
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const days = req.query.days === undefined ? 3 : Number(req.query.days);
  const placeName = typeof req.query.place === 'string' ? req.query.place.slice(0, 100) : 'Localidad aproximada';
  if (req.query.lat === undefined || req.query.lon === undefined) return res.status(400).json({ error: 'Falta localidad.' });
  try { return res.status(200).json(await getWeather({ lat, lon, placeName, precision: 'locality_approx' }, { days })); }
  catch { return res.status(503).json({ error: 'No tengo el clima actualizado. Revisa coordenadas, conexión y proveedor.' }); }
}
