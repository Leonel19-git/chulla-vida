import type { WeatherReference } from '../catalog/types.js';

export interface WeatherDay { date: string; minC: number; maxC: number; rainProbability: number | null }
export interface WeatherHour { time: string; temperatureC: number; rainProbability: number | null }
export interface WeatherReport {
  place: string;
  temperatureC: number;
  apparentC: number;
  precipitationMm: number;
  windKmh: number;
  modelTime: string;
  fetchedAt: string;
  timezone: string;
  source: 'Open-Meteo';
  sourceUrl: string;
  kind: 'modelled_forecast';
  days: WeatherDay[];
  hours: WeatherHour[];
}
export class WeatherUnavailableError extends Error {
  constructor(message = 'No tengo el clima actualizado. Reintenta con conexión y consulta avisos oficiales.') { super(message); this.name = 'WeatherUnavailableError'; }
}
export interface WeatherLocality extends WeatherReference { id: number; province: string }
/** Geocodificación pública con elección explícita: no asume que dos localidades homónimas son la misma. */
export async function searchWeatherLocalities(query: string, options: { fetcher?: typeof fetch; online?: boolean } = {}): Promise<WeatherLocality[]> {
  const name = query.trim();
  if (options.online === false || name.length < 2 || name.length > 80) throw new WeatherUnavailableError('Escribe una localidad de Ecuador y revisa la conexión.');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name); url.searchParams.set('countryCode', 'EC');
  url.searchParams.set('count', '8'); url.searchParams.set('language', 'es');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await (options.fetcher ?? fetch)(url.href, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new WeatherUnavailableError();
    const value = await response.json() as { results?: unknown[] };
    return (Array.isArray(value.results) ? value.results : []).flatMap(item => {
      const place = item as Record<string, unknown>;
      if (!place || place.country_code !== 'EC' || typeof place.name !== 'string' || typeof place.id !== 'number'
        || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') return [];
      const reference: WeatherLocality = { id: place.id, placeName: place.name, province: typeof place.admin1 === 'string' ? place.admin1 : 'Provincia sin dato', lat: place.latitude, lon: place.longitude, precision: 'locality_approx' };
      try { weatherUrl(reference); return [reference]; } catch { return []; }
    });
  } catch (error) { if (error instanceof WeatherUnavailableError) throw error; throw new WeatherUnavailableError('No se pudo buscar la localidad. Puedes reintentar; no se inventan coordenadas.'); }
  finally { clearTimeout(timer); }
}
export function weatherUrl(reference: WeatherReference, days = 3): string {
  if (!Number.isFinite(reference.lat) || !Number.isFinite(reference.lon) || reference.lat < -6 || reference.lat > 2 || reference.lon < -92 || reference.lon > -75 || !Number.isInteger(days) || days < 1 || days > 7) throw new WeatherUnavailableError('La consulta de clima requiere una localidad de Ecuador y de 1 a 7 días.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(reference.lat));
  url.searchParams.set('longitude', String(reference.lon));
  url.searchParams.set('timezone', reference.lon < -89 ? 'Pacific/Galapagos' : 'America/Guayaquil');
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
  url.searchParams.set('forecast_days', String(days));
  return url.href;
}
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const probability = (value: unknown) => numeric(value) && value >= 0 && value <= 100 ? value : null;
export function parseWeather(data: unknown, reference: WeatherReference, fetchedAt = new Date().toISOString()): WeatherReport {
  const raw = data as Record<string, any> | null;
  if (!raw || typeof raw !== 'object' || typeof raw.timezone !== 'string' || !raw.current || typeof raw.current.time !== 'string' || !['temperature_2m', 'apparent_temperature', 'precipitation', 'wind_speed_10m'].every(key => numeric(raw.current[key]))) throw new WeatherUnavailableError();
  const expectedTimezone = reference.lon < -89 ? 'Pacific/Galapagos' : 'America/Guayaquil';
  if (raw.timezone !== expectedTimezone || raw.current_units?.temperature_2m !== '°C' || raw.current_units?.wind_speed_10m !== 'km/h') throw new WeatherUnavailableError();
  const offsetHours = expectedTimezone === 'Pacific/Galapagos' ? '-06:00' : '-05:00';
  const modelMs = Date.parse(raw.current.time + offsetHours);
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(modelMs) || !Number.isFinite(fetchedMs) || fetchedMs - modelMs > 3 * 60 * 60 * 1000 || modelMs - fetchedMs > 60 * 60 * 1000) throw new WeatherUnavailableError('La respuesta meteorológica es antigua o no tiene una hora válida; no se muestra como actual.');
  const days: WeatherDay[] = (Array.isArray(raw.daily?.time) ? raw.daily.time : []).flatMap((date: unknown, i: number) => typeof date === 'string' && numeric(raw.daily.temperature_2m_min?.[i]) && numeric(raw.daily.temperature_2m_max?.[i]) ? [{ date, minC: raw.daily.temperature_2m_min[i], maxC: raw.daily.temperature_2m_max[i], rainProbability: probability(raw.daily.precipitation_probability_max?.[i]) }] : []);
  const hours: WeatherHour[] = (Array.isArray(raw.hourly?.time) ? raw.hourly.time : []).flatMap((time: unknown, i: number) => typeof time === 'string' && numeric(raw.hourly.temperature_2m?.[i]) && Date.parse(time + offsetHours) >= modelMs ? [{ time, temperatureC: raw.hourly.temperature_2m[i], rainProbability: probability(raw.hourly.precipitation_probability?.[i]) }] : []).slice(0, 12);
  return { place: reference.placeName, temperatureC: raw.current.temperature_2m, apparentC: raw.current.apparent_temperature, precipitationMm: raw.current.precipitation, windKmh: raw.current.wind_speed_10m, modelTime: raw.current.time, fetchedAt, timezone: raw.timezone, source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/en/docs', kind: 'modelled_forecast', days, hours };
}
const cache = new Map<string, { expires: number; report: WeatherReport }>();
export async function getWeather(reference: WeatherReference, options: { fetcher?: typeof fetch; online?: boolean; now?: Date; days?: number } = {}): Promise<WeatherReport> {
  if (options.online === false) throw new WeatherUnavailableError('Sin conexión: no hay clima actual. El último dato descargado puede estar desactualizado.');
  const url = weatherUrl(reference, options.days ?? 3);
  const now = options.now ?? new Date();
  const cached = cache.get(url);
  if (cached && cached.expires > now.getTime()) return { ...cached.report, place: reference.placeName };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await (options.fetcher ?? fetch)(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new WeatherUnavailableError();
    const report = parseWeather(await response.json(), reference, now.toISOString());
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(url, { expires: now.getTime() + 10 * 60 * 1000, report });
    return report;
  } catch (error) { if (error instanceof WeatherUnavailableError) throw error; throw new WeatherUnavailableError(); }
  finally { clearTimeout(timer); }
}
export function weatherAdvice(report: WeatherReport): string {
  const tips = ['Pronóstico modelado; no confirma accesos ni sustituye alertas oficiales.'];
  if (report.days.some(day => (day.rainProbability ?? 0) >= 50) || report.precipitationMm > 0) tips.push('Lleva impermeable y revisa condiciones con el operador antes de actividades al aire libre.');
  if (report.temperatureC < 12) tips.push('Lleva capas de abrigo.');
  if (report.temperatureC >= 26) tips.push('Lleva agua, protección solar y pausas a la sombra.');
  if (report.windKmh >= 30) tips.push('Consulta al operador antes de navegación o actividades expuestas.');
  return tips.join(' ');
}
