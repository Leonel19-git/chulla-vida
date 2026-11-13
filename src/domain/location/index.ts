export interface MapReference { lat: number; lon: number; label: string; sourceUrl: string; checkedAt?: string }
export function isEcuadorReference(point: MapReference): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= -6 && point.lat <= 2
    && point.lon >= -92 && point.lon <= -75 && point.label.trim().length > 0;
}
export function osmEmbedUrl(point: MapReference): string {
  if (!isEcuadorReference(point)) throw new Error('La referencia del mapa debe estar en Ecuador.');
  const span = 0.065;
  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set('bbox', [point.lon - span, point.lat - span, point.lon + span, point.lat + span].join(','));
  url.searchParams.set('layer', 'mapnik');
  url.searchParams.set('marker', `${point.lat},${point.lon}`);
  return url.href;
}
export function mapSearchUrl(locality: string, province: string): string {
  const url = new URL('https://www.openstreetmap.org/search');
  url.searchParams.set('query', `${locality}, ${province}, Ecuador`);
  return url.href;
}
export function directionsUrl(origin: string, locality: string, province: string): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${locality}, ${province}, Ecuador`);
  if (origin.trim()) url.searchParams.set('origin', `${origin.trim()}, Ecuador`);
  return url.href;
}
