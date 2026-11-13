import { describe, expect, it, vi } from 'vitest';
import { getWeather, parseWeather, searchWeatherLocalities, weatherAdvice, weatherUrl } from '../../src/domain/weather';
import type { WeatherReference } from '../../src/domain/catalog';

const reference: WeatherReference = { placeName: 'Quito', lat: -0.2, lon: -78.5, precision: 'locality_approx' };
const now = new Date('2026-11-12T17:00:00.000Z');
const raw = () => ({ timezone: 'America/Guayaquil', current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
  current: { time: '2026-11-12T12:00', temperature_2m: 15, apparent_temperature: 13, precipitation: 0, wind_speed_10m: 8 },
  daily: { time: ['2026-11-12'], temperature_2m_min: [10], temperature_2m_max: [18], precipitation_probability_max: [70] },
  hourly: { time: ['2026-11-12T12:00'], temperature_2m: [15], precipitation_probability: [50] } });
describe('clima con procedencia y vigencia', () => {
  it('fija zona horaria de Ecuador y variables explícitas; rechaza coordenadas arbitrarias', () => {
    expect(weatherUrl(reference)).toContain('timezone=America%2FGuayaquil');
    expect(weatherUrl({ ...reference, lon: -90.3 })).toContain('Pacific%2FGalapagos');
    expect(() => weatherUrl({ ...reference, lat: 52 })).toThrow();
    expect(() => weatherUrl(reference, 20)).toThrow();
  });
  it('mantiene consulta, modelo y fuente; diferencia pronóstico de alerta', () => {
    const report = parseWeather(raw(), reference, now.toISOString());
    expect(report).toMatchObject({ source: 'Open-Meteo', kind: 'modelled_forecast', fetchedAt: now.toISOString(), timezone: 'America/Guayaquil', temperatureC: 15 });
    expect(weatherAdvice(report)).toContain('impermeable');
    expect(weatherAdvice(report)).toContain('no confirma accesos');
  });
  it('rechaza respuesta antigua, unidades inesperadas y datos incompletos', () => {
    expect(() => parseWeather(raw(), reference, '2026-11-13T17:00:00.000Z')).toThrow();
    expect(() => parseWeather({ ...raw(), current_units: { temperature_2m: '°F', wind_speed_10m: 'mph' } }, reference, now.toISOString())).toThrow();
    expect(() => parseWeather({ timezone: 'America/Guayaquil' }, reference, now.toISOString())).toThrow();
  });
  it('sin red no consulta ni entrega caché como clima actual', async () => {
    const fetcher = vi.fn();
    await expect(getWeather(reference, { online: false, fetcher })).rejects.toThrow('Sin conexión');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('cachea por 10 minutos conservando la hora original de consulta', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => raw() });
    const first = await getWeather(reference, { now, fetcher });
    const second = await getWeather(reference, { now: new Date(now.getTime() + 60000), fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(second.fetchedAt).toBe(first.fetchedAt);
  });
  it('la búsqueda de localidad filtra Ecuador y devuelve referencias que el usuario debe elegir', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [
      { id: 1, name: 'Baños', country_code: 'EC', admin1: 'Tungurahua', latitude: -1.4, longitude: -78.4 },
      { id: 2, name: 'Baños', country_code: 'PE', latitude: -12, longitude: -75 },
      { id: 3, name: 'Error', country_code: 'EC', latitude: 100, longitude: -78 },
    ] }) });
    const localities = await searchWeatherLocalities('Baños', { fetcher });
    expect(localities).toHaveLength(1); expect(localities[0]).toMatchObject({ province: 'Tungurahua', precision: 'locality_approx' });
    expect(fetcher.mock.calls[0][0]).toContain('countryCode=EC');
    expect(fetcher.mock.calls[0][0]).not.toContain('apikey');
  });
});
