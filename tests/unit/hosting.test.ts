import { expect, it } from 'vitest';
import configuration from '../../vercel.json';

it('SPA navigation preserves payment callbacks and authenticated API routes', () => {
  const routes = configuration.rewrites.map(rule => new RegExp(`^${rule.source}$`));
  for (const path of ['/api/payments/return', '/api/payments/prepare', '/api/payments/status', '/api/payments/refund-request', '/api/weather', '/api/assistant']) {
    expect(routes.some(route => route.test(path))).toBe(false);
  }
  for (const path of ['/', '/explorar', '/viaje/guardado']) expect(routes.some(route => route.test(path))).toBe(true);
});
