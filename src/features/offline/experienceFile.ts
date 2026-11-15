import QRCode from 'qrcode';
import { formatExperiencePrice, getExperienceById, priceDisclaimer, REGION_LABELS, type Experience } from '../../domain/catalog';
import { isJourney, JOURNEY_KEY, PACKING_LIST, summarizeJourney, type JourneyDraft } from '../../domain/itinerary';
import { escapeRouteHtml } from '../../lib/offline-route';

/** Ficha online pública a la que apunta el QR y el enlace del archivo. */
export const PUBLIC_SITE = 'https://chulla-vida.vercel.app';
export const experienceOnlineUrl = (experience: Pick<Experience, 'id'>) => `${PUBLIC_SITE}/experiencias/${encodeURIComponent(experience.id)}`;
export const experienceFileName = (experience: Pick<Experience, 'id' | 'slug'>) => `chulla-vida-${safeSlug(experience.slug || experience.id)}.html`;
export const TRIP_FILE_NAME = 'chulla-vida-mi-viaje.html';
const safeSlug = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'ficha';

export interface FileAssets { photo?: string | null; qrSvg?: string | null }
const e = escapeRouteHtml;
const DATA_IMAGE = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const dateLabel = (iso: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(iso));
const list = (items: string[], empty?: string) => items.length ? `<ul>${items.map(item => `<li>${e(item)}</li>`).join('')}</ul>` : empty ? `<p class="muted">${e(empty)}</p>` : '';
const safeHttp = (value: string) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; } };
/** Acepta solo el SVG que genera la librería de QR: sin scripts, eventos ni referencias externas. */
const safeQr = (svg: string | null | undefined) => svg && svg.startsWith('<svg') && !/<script|\son\w+=|href=|<foreignObject/i.test(svg) && svg.length < 60000 ? svg : '';

const STYLE = `*{box-sizing:border-box}body{margin:0;background:#f8f3e6;color:#10385f;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:860px;margin:0 auto;padding:28px 18px 48px}
.brand{font-weight:800;letter-spacing:.14em;font-size:13px;color:#0b7c84}h1{font:700 clamp(28px,6vw,44px)/1.12 Georgia,serif;margin:10px 0 6px}h2{font:700 22px/1.25 Georgia,serif;margin:28px 0 10px;color:#103452}h3{font-size:17px;margin:18px 0 6px}
.meta{color:#4a5f6e;margin:0 0 14px}.pill{display:inline-block;background:#ffd76a;color:#3d2a00;border-radius:999px;padding:3px 12px;font-size:13px;font-weight:700;margin:0 6px 6px 0}.pill.ok{background:#d8f2e6;color:#0b5c48}
figure{margin:16px 0;border-radius:18px;overflow:hidden;background:#dfe8e0}figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover}figcaption{font-size:12px;padding:8px 12px;color:#3c4b45;background:#eef1ea}
.price{background:#fffdf6;border:2px solid #103452;border-radius:16px;padding:16px 18px;margin:18px 0}.price strong{display:block;font:700 26px/1.2 Georgia,serif}.price small{display:block;color:#4a5f6e;margin-top:6px;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:#fffdf6;border-radius:14px;padding:12px 16px;border:1px solid #d9e0d2}ul{padding-left:20px;margin:6px 0}li{margin:3px 0}.muted{color:#5a6b63}
.sos{background:#7a1f1f;color:#fff;border-radius:16px;padding:16px 18px;margin:24px 0}.sos strong{font-size:30px;display:block}.sos a{color:#fff}
.qr{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:24px}.qr svg{width:132px;height:132px;background:#fffdf6;border-radius:10px}
.stop{border-top:3px solid #0b7c84;padding-top:6px;margin-top:34px;page-break-inside:avoid}.total{font:700 22px/1.3 Georgia,serif}a{color:#00646b;word-break:break-word}
footer{margin-top:36px;font-size:13px;color:#4a5f6e;border-top:1px solid #cfd8c9;padding-top:12px}
@media(max-width:560px){.grid{grid-template-columns:1fr}main{padding:20px 16px 40px}}
@media print{body{background:#fff}main{max-width:none;padding:0}.sos{background:#fff;color:#7a1f1f;border:2px solid #7a1f1f}.sos a{color:#7a1f1f}figure img{max-height:300px}a{color:#10385f}}`;

const shell = (title: string, body: string) => `<!doctype html><html lang="es-EC"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><meta name="color-scheme" content="light"><title>${e(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

const SOS = `<section class="sos" aria-label="Emergencias"><span>Emergencias en Ecuador (ECU 911)</span><strong><a href="tel:911">911</a></strong><span>Policía, bomberos y ambulancia. Gratis desde cualquier teléfono, incluso sin saldo.</span></section>`;

function experienceSection(experience: Experience, assets: FileAssets, heading: 'h1' | 'h2') {
  const media = experience.media[0];
  const photo = assets.photo && DATA_IMAGE.test(assets.photo) && media
    ? `<figure><img src="${assets.photo}" alt="${e(media.alt)}"><figcaption>Foto: ${e(media.credit)} · ${e(media.license)}${media.depictsThisPlace ? '' : ' · Imagen de referencia, no es el lugar exacto'}</figcaption></figure>` : '';
  const policy = experience.petPolicy;
  const location = experience.locationInfo;
  const transport = location?.transportOptions.map(option => `${option.label}${option.durationLabel ? ` · ${option.durationLabel}` : ''}${option.priceLabel ? ` · ${option.priceLabel}` : ''}${option.notes ? `. ${option.notes}` : ''}`) ?? [];
  const references = location?.references.map(reference => { const url = safeHttp(reference.url); return url ? `<li><a href="${e(url)}">${e(reference.title)}</a> · revisado ${e(reference.checkedAt)}</li>` : ''; }).join('') ?? '';
  const separate = experience.price.separateCosts?.map(cost => `${cost.concept}: ${cost.min === null ? 'por confirmar' : `${cost.currency} ${cost.min}${cost.max !== null && cost.max !== cost.min ? `–${cost.max}` : ''}`}. ${cost.detail}`) ?? [];
  const tag = heading;
  return `<${tag}>${e(experience.title)}</${tag}>${experience.experienceName ? `<p class="meta">${e(experience.experienceName)}</p>` : ''}
<p class="meta">${e(REGION_LABELS[experience.localizedRegion])} · ${e(experience.province)} · ${e(experience.locality)}</p>
<span class="pill">${e(experience.duration.label)}</span><span class="pill">Dificultad: ${e(experience.difficultyLabel)}</span>${experience.capacity.label ? `<span class="pill">${e(experience.capacity.label)}</span>` : ''}
${photo}${experience.description.startsWith(experience.summary) ? '' : `<p>${e(experience.summary)}</p>`}<p>${e(experience.description)}</p>${experience.context ? `<h3>Historia y contexto</h3><p>${e(experience.context)}</p>` : ''}
<div class="price"><span>Precio de referencia</span><strong>${e(formatExperiencePrice(experience))}</strong><small>${e(experience.price.originalLabel)}</small><small>${e(priceDisclaimer(experience))}</small></div>
<div class="grid"><div class="card"><h3>Qué incluye</h3>${list(experience.price.includes, 'La fuente no detalla qué incluye. Confírmalo con el anfitrión.')}</div><div class="card"><h3>Qué no incluye</h3>${list([...experience.price.excludes, ...separate], 'La fuente no lo detalla: cuenta con transporte, comida y entradas aparte hasta confirmar.')}</div></div>
${experience.activities.length ? `<h3>Qué vas a hacer</h3>${list(experience.activities)}` : ''}${experience.attractions.length ? `<h3>Lugares para conocer</h3>${list(experience.attractions)}` : ''}
${experience.itinerary.length ? `<h3>Programa tentativo</h3><ul>${experience.itinerary.map(step => `<li>${step.time ? `<strong>${e(step.time)}</strong> · ` : ''}${e(step.text)}</li>`).join('')}</ul>` : ''}
${location || experience.meetingPoint ? `<h3>Cómo llegar</h3>${experience.meetingPoint ? `<p>Punto de encuentro: ${e(experience.meetingPoint)}</p>` : ''}${location ? `<p>${e(location.accessSummary)}</p>${list(transport)}${references ? `<ul>${references}</ul>` : ''}` : ''}` : ''}
${experience.recommendations.length ? `<h3>Recomendaciones</h3>${list(experience.recommendations)}` : ''}${experience.conditions.length ? `<h3>Condiciones de la fuente</h3>${list(experience.conditions)}` : ''}
${experience.warnings.length ? `<h3>Avisos históricos</h3><ul>${experience.warnings.map(warning => `<li>${e(warning.text)}${warning.asOf ? ` (a ${e(warning.asOf)})` : ''}</li>`).join('')}</ul>` : ''}
<h3>Mascotas</h3><p>${e(policy.note)}</p>
<p class="muted">Fuente: ${e(experience.originalDocument)} · revisada ${e(experience.sourceCheckedAt)} · versión ${e(experience.contentVersion)}. Operador sin verificar por CHULLA VIDA: confirma horarios, acceso y precio antes de salir.</p>`;
}

/** Documento autónomo de una ficha: sin scripts ni recursos externos; todo el texto escapado. */
export function experienceFileHtml(experience: Experience, assets: FileAssets = {}, downloadedAt = new Date().toISOString()): string {
  const online = experienceOnlineUrl(experience);
  const qr = safeQr(assets.qrSvg);
  return shell(`${experience.title} · CHULLA VIDA`, `<div class="brand">CHULLA VIDA · FICHA SIN SEÑAL</div>${experienceSection(experience, assets, 'h1')}${SOS}
<div class="qr">${qr}<p>Ficha online actualizada:<br><a href="${e(online)}">${e(online)}</a><br><span class="muted">Necesita internet. Este archivo funciona sin conexión y se puede imprimir como PDF.</span></p></div>
<footer>Descargada el ${e(dateLabel(downloadedAt))} · Los datos no se actualizan solos. No es una reserva ni una cotización.</footer>`);
}

export interface TripFileInput { experiences: Experience[]; journey: JourneyDraft | null; photos?: Record<string, string | null>; downloadedAt?: string }
/** Un solo HTML con el itinerario de «Mi viaje» y todas las fichas guardadas. */
export function tripFileHtml({ experiences, journey, photos = {}, downloadedAt = new Date().toISOString() }: TripFileInput): string {
  const unique = experiences.filter((item, index) => experiences.findIndex(other => other.id === item.id) === index);
  const summary = journey ? summarizeJourney(journey, unique) : null;
  const itinerary = journey && summary ? `<h2>Mi viaje</h2><p class="meta">Desde ${e(journey.origin || 'Ecuador')} · ${journey.date ? e(journey.date) : 'fecha por definir'} · ${journey.people} ${journey.people === 1 ? 'persona' : 'personas'} · ${journey.days} ${journey.days === 1 ? 'día' : 'días'} · presupuesto del grupo USD ${journey.budget}</p>
${summary.stops.length ? `<ol>${summary.stops.map(stop => `<li><a href="#ficha-${e(safeSlug(stop.id))}">${e(stop.title)}</a> · ${e(stop.province)} · ${e(stop.duration.label)} · ${e(formatExperiencePrice(stop))}</li>`).join('')}</ol>` : '<p class="muted">Todavía no hay paradas en tu borrador.</p>'}
<p class="total">Base conocida de experiencias: USD ${summary.experienceBase.toFixed(2)}</p><p class="muted">${summary.missingPrice ? 'Hay precios en euros o sin confirmar que no se sumaron. ' : ''}Total del viaje por confirmar: faltan transporte, comida, alojamiento, tasas e imprevistos.</p>
${summary.exceedsBudget ? '<p><strong>Ojo:</strong> la base de experiencias ya supera tu presupuesto.</p>' : ''}
<h3>Antes de cerrar la mochila</h3><ul>${PACKING_LIST.map(item => `<li>${journey.checked.includes(item) ? '☑' : '☐'} ${e(item)}</li>`).join('')}</ul>${journey.notes ? `<h3>Mis notas</h3><p>${e(journey.notes).replace(/\n/g, '<br>')}</p>` : ''}` : '';
  const fichas = unique.map(experience => `<section class="stop" id="ficha-${e(safeSlug(experience.id))}">${experienceSection(experience, { photo: photos[experience.id] ?? null }, 'h2')}<p><a href="${e(experienceOnlineUrl(experience))}">Ver ficha online</a></p></section>`).join('');
  return shell('Mi viaje · CHULLA VIDA', `<div class="brand">CHULLA VIDA · MI VIAJE SIN SEÑAL</div><h1>Tu viaje, aunque se vaya la señal.</h1><p class="meta">${unique.length} ${unique.length === 1 ? 'ficha' : 'fichas'} · descargado el ${e(dateLabel(downloadedAt))}</p>${itinerary}${SOS}${fichas ? `<h2>Tus fichas</h2>${fichas}` : '<p class="muted">Aún no guardas fichas. Descarga alguna desde su detalle.</p>'}
<footer>Archivo autónomo: funciona sin internet y se puede imprimir como PDF. Precios referenciales; nada de esto es una reserva ni un pago.</footer>`);
}

/* ───────── Navegador: foto local en base64, QR y descarga real del archivo ───────── */

/** Lee la foto local -640.webp de la ficha y la incrusta. Solo rutas propias bajo /images/. */
export async function photoDataUrl(experience: Experience): Promise<string | null> {
  const src = experience.media[0]?.src;
  if (!src || !/^\/images\/[\w./-]+\.(?:webp|jpe?g|png)$/.test(src) || src.includes('..')) return null;
  try {
    const response = await fetch(src.replace(/-1280\.webp$/, '-640.webp'), { credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size > 900000 || !/^image\/(?:webp|jpeg|png)$/.test(blob.type)) return null;
    const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    return DATA_IMAGE.test(url) ? url : null;
  } catch { return null; }
}
async function qrFor(experience: Experience) {
  try { return await QRCode.toString(experienceOnlineUrl(experience), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#103452', light: '#fffdf6' } }); } catch { return null; }
}
/** Dispara la descarga de un archivo en el dispositivo. */
export function saveHtmlFile(fileName: string, html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = fileName; link.rel = 'noopener'; link.style.display = 'none';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export interface DownloadResult { fileName: string; savedOffline: boolean; message: string }
/**
 * «Descargar ficha»: baja chulla-vida-<slug>.html al dispositivo y además la guarda en la biblioteca sin señal.
 * Si la biblioteca falla, el archivo igual se descarga y el mensaje lo dice. Solo fichas del catálogo público.
 */
export async function downloadExperienceFile(experience: Experience): Promise<DownloadResult> {
  const canonical = getExperienceById(experience.id);
  if (!canonical) throw new Error('Esta ficha no se puede descargar. Vuelve al catálogo y reintenta.');
  const [photo, qrSvg] = await Promise.all([photoDataUrl(canonical), qrFor(canonical)]);
  const fileName = experienceFileName(canonical);
  saveHtmlFile(fileName, experienceFileHtml(canonical, { photo, qrSvg }));
  let savedOffline = true;
  try { const { saveExperienceOffline } = await import('./library'); await saveExperienceOffline(canonical); window.dispatchEvent(new Event('cv3:library')); }
  catch { savedOffline = false; }
  return { fileName, savedOffline, message: savedOffline
    ? `Listo: se descargó ${fileName} y la ficha quedó guardada para usarla sin señal.`
    : `Listo: se descargó ${fileName}. No pudimos guardarla también en la biblioteca sin señal de este navegador; el archivo sí te sirve sin internet.` };
}
export function readJourneyDraft(): JourneyDraft | null {
  try { const value: unknown = JSON.parse(localStorage.getItem(JOURNEY_KEY) || 'null'); return isJourney(value) ? value : null; } catch { return null; }
}
/** «Descargar mi viaje»: un único HTML con el itinerario de Mi viaje y todas las fichas guardadas sin señal. */
export async function downloadTripFile(saved: Experience[], journey: JourneyDraft | null = readJourneyDraft()): Promise<DownloadResult & { count: number }> {
  const stops = (journey?.stops ?? []).map(id => saved.find(item => item.id === id) ?? getExperienceById(id)).filter((item): item is Experience => Boolean(item));
  const all = [...stops, ...saved].filter((item, index, array) => array.findIndex(other => other.id === item.id) === index);
  const photos: Record<string, string | null> = {};
  await Promise.all(all.map(async item => { photos[item.id] = await photoDataUrl(item); }));
  saveHtmlFile(TRIP_FILE_NAME, tripFileHtml({ experiences: all, journey, photos }));
  return { fileName: TRIP_FILE_NAME, savedOffline: true, count: all.length, message: `Listo: se descargó ${TRIP_FILE_NAME} con ${all.length} ${all.length === 1 ? 'ficha' : 'fichas'}${journey?.stops.length ? ' y tu itinerario' : ''}. Ábrelo sin internet o imprímelo como PDF.` };
}
