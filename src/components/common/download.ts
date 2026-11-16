/**
 * Descargas que también funcionan en iPhone y iPad.
 *
 * - El enlace se añade al documento antes del clic: Safari ignora el clic en un enlace suelto en algunas versiones.
 * - La URL del Blob se libera después de un minuto, no enseguida: si se revoca al instante, WebKit
 *   puede abrir una pestaña en blanco o no bajar nada.
 * - En iOS, Safari puede abrir un .html o .txt en una pestaña nueva en vez de guardarlo. No lo podemos
 *   evitar desde la página, así que se avisa cómo guardarlo (Compartir → Guardar en Archivos).
 */

export const IOS_DOWNLOAD_HINT = 'En iPhone o iPad, Safari puede abrir el archivo en una pestaña nueva: toca Compartir y luego «Guardar en Archivos» para conservarlo.';

/** Tiempo antes de liberar la URL del Blob. */
export const BLOB_URL_LIFETIME_MS = 60_000;

interface NavigatorLike { userAgent?: string; platform?: string; maxTouchPoints?: number }

/** iPhone, iPod o iPad (el iPad con iPadOS 13+ se presenta como «MacIntel» con pantalla táctil). */
export function isIosDevice(nav: NavigatorLike | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? '';
  if (/\b(iPhone|iPad|iPod)\b/.test(ua)) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

/** Añade el aviso de iOS a un mensaje de descarga solo cuando hace falta. */
export function withIosDownloadHint(message: string, nav?: NavigatorLike): string {
  return isIosDevice(nav ?? (typeof navigator === 'undefined' ? undefined : navigator)) ? `${message} ${IOS_DOWNLOAD_HINT}` : message;
}

/** Baja un archivo generado en el navegador. Devuelve false si el navegador no lo permite. */
export function saveFile(content: Blob | string, filename: string, type = 'text/plain;charset=utf-8'): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); }
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
  return true;
}
