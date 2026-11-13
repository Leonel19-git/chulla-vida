import { describe, expect, it } from 'vitest';
import { directionsUrl, isEcuadorReference, mapSearchUrl, osmEmbedUrl } from '../../src/domain/location';

describe('referencias de ubicación y mapas', () => {
  it('construye un marcador explícito solo en coordenadas válidas de Ecuador', () => {
    const point = { lat: -1.04, lon: -77.67, label: 'Misahuallí', sourceUrl: 'https://example.ec' };
    const url = new URL(osmEmbedUrl(point));
    expect(url.hostname).toBe('www.openstreetmap.org');
    expect(url.searchParams.get('marker')).toBe('-1.04,-77.67');
    expect(isEcuadorReference({ ...point, lat: NaN })).toBe(false);
    expect(() => osmEmbedUrl({ ...point, lon: 0 })).toThrow();
  });
  it('mantiene búsquedas por localidad y escapa nombres sin fabricar una ruta', () => {
    const url = new URL(directionsUrl('Quito & valle', 'Puerto Misahuallí', 'Napo'));
    expect(url.searchParams.get('origin')).toBe('Quito & valle, Ecuador');
    expect(url.searchParams.get('destination')).toContain('Puerto Misahuallí');
    expect(new URL(mapSearchUrl('A & B', 'Napo')).searchParams.get('query')).toBe('A & B, Napo, Ecuador');
  });
});
