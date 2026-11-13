/* Public application shell only. Never cache API/auth requests or private data. */
const PUBLIC_CACHE = 'chulla-vida-public-v3-20261112';
const SHELL = '/index.html';
const FALLBACK = '/offline.html';
const PUBLIC_PATH = /^\/(?:assets\/|images\/|brand\/|catalogos\/|chulla-vida-logo\.png$|manifest\.webmanifest$|offline\.html$|index\.html$)/;

function publicURL(input) {
  const url = new URL(input, self.location.origin);
  if (url.origin !== self.location.origin || url.search || (url.pathname !== '/' && !PUBLIC_PATH.test(url.pathname))) return null;
  url.hash = '';
  return url;
}
function dependencies(text, base) {
  const urls = [];
  const patterns = [/(?:src|href)=["']([^"']+)["']/g, /["']((?:\.?\.?\/)[^"'\s<>]+\.(?:js|css|woff2?|webp|png|jpe?g|svg))["']/g, /url\(["']?([^"')]+)["']?\)/g];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    try { const url = publicURL(new URL(match[1], base)); if (url && url.pathname.startsWith('/assets/')) urls.push(url.href); } catch { /* Not a public resource URL. */ }
  }
  return urls;
}
async function cachePublicShell(resources = []) {
  const cache = await caches.open(PUBLIC_CACHE);
  const queue = [SHELL, FALLBACK, '/manifest.webmanifest', '/chulla-vida-logo.png', ...resources.slice(0, 120)];
  const seen = new Set();
  let shellSaved = false;
  while (queue.length && seen.size < 160) {
    let url;
    try { url = publicURL(queue.shift()); } catch { continue; }
    if (!url || seen.has(url.href)) continue;
    seen.add(url.href);
    try {
      const alreadySaved = url.pathname.startsWith('/assets/') ? await cache.match(url.href) : undefined;
      const response = alreadySaved || await fetch(url.href, { credentials: 'omit', cache: 'no-cache', signal: AbortSignal.timeout(12000) });
      if (!response.ok || response.type === 'opaque' || Number(response.headers.get('content-length') || 0) > 12000000) continue;
      if (/private|no-store/i.test(response.headers.get('cache-control') || '')) continue;
      await cache.put(url.pathname === '/' ? SHELL : url.href, response.clone());
      if (url.pathname === '/index.html' || url.pathname === '/') shellSaved = true;
      if (/\.(?:html|js|css)$/.test(url.pathname)) queue.push(...dependencies(await response.text(), url.href));
    } catch { /* Public caching is best effort and never blocks a live transaction. */ }
  }
  return shellSaved;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => { await cachePublicShell(); await self.skipWaiting(); })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('chulla-vida-public-') && key !== PUBLIC_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_PUBLIC_SHELL' || !Array.isArray(event.data.urls)) return;
  const resources = event.data.urls.filter(value => typeof value === 'string').slice(0, 120);
  event.waitUntil(cachePublicShell(resources).then(ok => { event.ports[0]?.postMessage({ ok }); }).catch(() => { event.ports[0]?.postMessage({ ok: false }); }));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('authorization')) return;
  const url = publicURL(request.url);
  if (!url) return;
  if (request.mode === 'navigate') {
    if (url.pathname !== '/' && url.pathname !== SHELL) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !/private|no-store/i.test(response.headers.get('cache-control') || '')) {
          const cache = await caches.open(PUBLIC_CACHE); await cache.put(SHELL, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(PUBLIC_CACHE);
        return await cache.match(SHELL) || await cache.match(FALLBACK) || new Response('Sin conexión. Abre CHULLA VIDA con internet antes de salir.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(PUBLIC_CACHE);
    const saved = await cache.match(request);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque' && !/private|no-store/i.test(response.headers.get('cache-control') || '')) await cache.put(request, response.clone());
    return response;
  })());
});
