let registration: Promise<ServiceWorkerRegistration> | undefined;
let preparation: Promise<void> | undefined;
export function supportsOfflineStartup(): boolean {
  return import.meta.env.PROD && typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator;
}
export function registerOfflineSupport(): void {
  if (!supportsOfflineStartup() || registration) return;
  registration = navigator.serviceWorker.register('/sw.js', { scope: '/' });
  void registration.then(() => preparePublicShell()).catch(() => { registration = undefined; });
}
function readyWorker(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('No se pudo preparar la apertura sin conexión.')), 8000);
    navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export async function preparePublicShell(): Promise<void> {
  if (!supportsOfflineStartup()) return;
  if (preparation) return preparation;
  preparation = cacheShell().finally(() => { preparation = undefined; });
  return preparation;
}
async function cacheShell(): Promise<void> {
  if (!registration) registerOfflineSupport();
  await registration;
  const registered = await readyWorker();
  const worker = registered.active;
  if (!worker) throw new Error('El soporte sin conexión aún no está activo.');
  const urls = performance.getEntriesByType('resource').map(entry => entry.name).filter(value => {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && /^\/(assets|images|brand)\//.test(url.pathname) && !url.search;
  });
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => { channel.port1.close(); reject(new Error('La descarga de la aplicación está tardando. Reintenta con conexión.')); }, 12000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      if (event.data?.ok === true) resolve(); else reject(new Error('No se pudo guardar la aplicación para abrirla sin conexión.'));
    };
    worker.postMessage({ type: 'CACHE_PUBLIC_SHELL', urls }, [channel.port2]);
  });
}
