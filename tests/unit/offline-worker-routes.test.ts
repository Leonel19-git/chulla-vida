import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/** Service worker real en un entorno controlado: caché en memoria y red que se puede cortar. */
function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const store = new Map<string, Response>();
  const fetched: string[] = [];
  let online = true;
  const site: Record<string, [string, string]> = {
    '/index.html': ['<html><script type="module" src="/assets/index-abc.js"></script><link rel="stylesheet" href="/assets/index-abc.css"></html>', 'text/html'],
    '/assets/index-abc.js': ['import("./PlannerDialog-x1.js");', 'text/javascript'],
    '/assets/PlannerDialog-x1.js': ['export const ok = 1;', 'text/javascript'],
    '/assets/index-abc.css': ['body{}', 'text/css'],
    '/offline.html': ['<html>Sin conexión</html>', 'text/html'],
    '/manifest.webmanifest': ['{}', 'application/manifest+json'],
    '/chulla-vida-logo.png': ['png', 'image/png'],
  };
  const key = (input: string | { url: string }) => new URL(typeof input === 'string' ? input : input.url, 'https://chullavida.example').href;
  const cache = {
    match: async (input: string | { url: string }) => store.get(key(input))?.clone(),
    put: async (input: string | { url: string }, response: Response) => { store.set(key(input), response); },
  };
  const fakeFetch = async (input: string | { url: string }) => {
    const url = new URL(key(input));
    fetched.push(url.pathname);
    if (!online) throw new TypeError('Failed to fetch');
    if (url.pathname.startsWith('/api/')) return new Response('{"private":true}', { headers: { 'Cache-Control': 'no-store' } });
    const page = site[url.pathname] ?? (url.pathname.includes('.') ? undefined : site['/index.html']);
    return page ? new Response(page[0], { headers: { 'Content-Type': page[1] } }) : new Response('404', { status: 404 });
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://chullavida.example' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; }, skipWaiting: async () => undefined, clients: { claim: async () => undefined } },
    URL, Response, Set, AbortSignal, caches: { open: async () => cache, keys: async () => [], delete: async () => true }, fetch: fakeFetch,
  });
  const install = async () => { let done: Promise<unknown> | undefined; handlers.install({ waitUntil: (value: Promise<unknown>) => { done = value; } }); await done; };
  const navigate = (path: string, init: { method?: string; auth?: boolean } = {}) => {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url: `https://chullavida.example${path}`, method: init.method ?? 'GET', mode: 'navigate', headers: { has: () => Boolean(init.auth) } }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response;
  };
  const asset = (path: string) => {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url: `https://chullavida.example${path}`, method: 'GET', mode: 'no-cors', headers: { has: () => false } }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response;
  };
  return { install, navigate, asset, store, fetched, offline: () => { online = false; } };
}

describe('la app abre sin conexión después de una visita', () => {
  it('tras instalar, sin red, la raíz y los recursos (incluidos los diferidos) salen de la caché', async () => {
    const sw = worker();
    await sw.install();
    expect([...sw.store.keys()]).toEqual(expect.arrayContaining([
      'https://chullavida.example/index.html', 'https://chullavida.example/assets/index-abc.js',
      'https://chullavida.example/assets/PlannerDialog-x1.js', 'https://chullavida.example/assets/index-abc.css', 'https://chullavida.example/offline.html',
    ]));
    sw.offline();
    expect(await (await sw.navigate('/'))!.text()).toContain('/assets/index-abc.js');
    expect(await (await sw.asset('/assets/PlannerDialog-x1.js'))!.text()).toBe('export const ok = 1;');
  });
  it('los enlaces profundos (/experiencias/…, /mi-viaje, /legal/…) abren el shell sin red', async () => {
    const sw = worker();
    await sw.install();
    sw.offline();
    for (const path of ['/experiencias/gen-02-quilotoa-shalala', '/mi-viaje', '/sin-senal', '/legal/terminos']) {
      const response = sw.navigate(path);
      expect(response, path).toBeDefined();
      expect(await (await response!).text()).toContain('/assets/index-abc.js');
    }
  });
  it('con red, un enlace profundo no reemplaza el shell guardado de la raíz', async () => {
    const sw = worker();
    await sw.install();
    const before = await sw.store.get('https://chullavida.example/index.html')!.clone().text();
    await (await sw.navigate('/experiencias/gen-02-quilotoa-shalala'))!.text();
    expect(await sw.store.get('https://chullavida.example/index.html')!.clone().text()).toBe(before);
  });
  it('nunca intercepta ni guarda /api, autenticación, parámetros, escrituras ni archivos', async () => {
    const sw = worker();
    await sw.install();
    for (const path of ['/api/payments', '/api/', '/auth/v1/callback', '/rest/v1/x', '/?code=secreto', '/cuenta?code=abc', '/legal/aviso.pdf', '/images/CREDITS.md']) expect(sw.navigate(path), path).toBeUndefined();
    expect(sw.navigate('/mi-viaje', { method: 'POST' })).toBeUndefined();
    expect(sw.navigate('/mi-viaje', { auth: true })).toBeUndefined();
    expect(sw.asset('/api/weather')).toBeUndefined();
    expect([...sw.store.keys()].some(url => /\/api\/|\/auth\//.test(url))).toBe(false);
  });
});
