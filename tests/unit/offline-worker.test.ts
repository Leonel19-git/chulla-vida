import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const cached = new Response('<html>Shell público</html>', { headers: { 'Content-Type': 'text/html' } });
  const cache = { match: async (key: string) => key === '/index.html' ? cached.clone() : undefined, put: async () => undefined };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://chullavida.example' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
    URL, Response, Set, AbortSignal, caches: { open: async () => cache }, fetch: async () => { throw new Error('Sin red'); },
  });
  return handlers;
}

describe('límite público del service worker', () => {
  it('no intercepta API, autenticación, búsquedas con parámetros, origen externo ni operaciones de escritura', () => {
    const handlers = worker();
    for (const [url, method, auth] of [
      ['https://chullavida.example/api/weather', 'GET', false],
      ['https://chullavida.example/auth/callback', 'GET', false],
      ['https://chullavida.example/?code=secreto', 'GET', false],
      ['https://spotify.example/track', 'GET', false],
      ['https://chullavida.example/assets/app.js', 'POST', false],
      ['https://chullavida.example/assets/app.js', 'GET', true],
    ] as const) {
      let intercepted = false;
      handlers.fetch({ request: { url, method, headers: { has: () => auth } }, respondWith: () => { intercepted = true; } });
      expect(intercepted).toBe(false);
    }
  });
  it('si la red falla devuelve el shell público previamente guardado para la raíz', async () => {
    const handlers = worker();
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url: 'https://chullavida.example/', method: 'GET', mode: 'navigate', headers: { has: () => false } }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toContain('Shell público');
  });
});
