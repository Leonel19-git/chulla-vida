import { expect, it } from 'vitest';
import configuration from '../../vercel.json';

it('SPA navigation preserves payment callbacks and authenticated API routes', () => {
  const routes = configuration.rewrites.map(rule => new RegExp(`^${rule.source}$`));
  for (const path of ['/api/payments/return', '/api/payments/prepare', '/api/payments/status', '/api/payments/refund-request', '/api/weather', '/api/assistant']) {
    expect(routes.some(route => route.test(path))).toBe(false);
  }
  for (const path of ['/', '/explorar', '/viaje/guardado']) expect(routes.some(route => route.test(path))).toBe(true);
});

it('publica una Content-Security-Policy estricta para scripts y acotada a los servicios que la app usa', () => {
  const global = configuration.headers.find(rule => rule.source === '/(.*)');
  const csp = global?.headers.find(header => header.key === 'Content-Security-Policy')?.value ?? '';
  const directives = Object.fromEntries(csp.split(';').map(part => part.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  expect(directives['script-src']).toEqual(["'self'"]);
  expect(csp).not.toMatch(/unsafe-eval/);
  expect(directives['object-src']).toEqual(["'none'"]);
  expect(directives['frame-ancestors']).toEqual(["'self'"]);
  expect(directives['base-uri']).toEqual(["'self'"]);
  expect(directives['connect-src']).toEqual(expect.arrayContaining(["'self'", 'https://*.supabase.co', 'https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com']));
  expect(directives['frame-src']).toEqual(['https://open.spotify.com', 'https://www.openstreetmap.org']);
  expect(directives['img-src']).toEqual(expect.arrayContaining(["'self'", 'data:', 'blob:']));
});
