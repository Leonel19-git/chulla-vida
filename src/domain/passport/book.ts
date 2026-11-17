import type { CromoEstado } from '../album';

/** Libro personal (apodo, ciudad, exploraciones y diario). Vive solo en este navegador. Páginas del libro: ./pages.ts */
export const PASSPORT_BOOK_KEY = 'chullavida:passport-book:v1';

export interface JournalEntry { id: string; title: string; text: string; destinationId: string | null; createdAt: string }
export interface PassportBookState {
  version: 1;
  nickname: string;
  origin: string;
  exploredIds: string[];
  journal: JournalEntry[];
}
export const emptyPassportBook = (): PassportBookState => ({ version: 1, nickname: '', origin: '', exploredIds: [], journal: [] });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
export function isPassportBook(value: unknown): value is PassportBookState {
  if (!record(value) || value.version !== 1 || !text(value.nickname, 64) || !text(value.origin, 80)) return false;
  if (!Array.isArray(value.exploredIds) || value.exploredIds.length > 1000 || !value.exploredIds.every(id => text(id, 160))) return false;
  if (new Set(value.exploredIds).size !== value.exploredIds.length || !Array.isArray(value.journal) || value.journal.length > 200) return false;
  return value.journal.every(entry => record(entry) && text(entry.id, 160) && Boolean(entry.id) && text(entry.title, 100)
    && text(entry.text, 5000) && (entry.destinationId === null || text(entry.destinationId, 160))
    && typeof entry.createdAt === 'string' && Number.isFinite(Date.parse(entry.createdAt)))
    && new Set(value.journal.map(entry => entry.id)).size === value.journal.length;
}
export function readPassportBook(storage?: Pick<Storage, 'getItem'>): PassportBookState {
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const raw = target?.getItem(PASSPORT_BOOK_KEY);
    if (!raw || raw.length > 1200000) return emptyPassportBook();
    const value: unknown = JSON.parse(raw);
    return isPassportBook(value) ? value : emptyPassportBook();
  } catch { return emptyPassportBook(); }
}
export function savePassportBook(state: PassportBookState, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!isPassportBook(state)) return false;
  try {
    const target = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!target) return false;
    target.setItem(PASSPORT_BOOK_KEY, JSON.stringify(state)); return true;
  } catch { return false; }
}
export function toggleVirtualExploration(state: PassportBookState, destinationId: string, allowedIds: readonly string[]): PassportBookState {
  if (!allowedIds.includes(destinationId)) return state;
  const exploredIds = state.exploredIds.includes(destinationId) ? state.exploredIds.filter(id => id !== destinationId)
    : [...state.exploredIds, destinationId].slice(-1000);
  return { ...state, exploredIds };
}
/** Marca (sin desmarcar) una ficha como explorada virtualmente: se usa al abrir una ficha. */
export function markExplored(state: PassportBookState, destinationId: string, allowedIds: readonly string[]): PassportBookState {
  if (!allowedIds.includes(destinationId) || state.exploredIds.includes(destinationId)) return state;
  return { ...state, exploredIds: [...state.exploredIds, destinationId].slice(-1000) };
}
export function addJournalEntry(state: PassportBookState, input: { title: string; text: string; destinationId?: string | null }, now = new Date(), id: string = crypto.randomUUID()): PassportBookState {
  if (!input.title.trim() || !input.text.trim() || input.title.length > 100 || input.text.length > 5000 || !Number.isFinite(now.getTime()) || !id || state.journal.some(entry => entry.id === id)) return state;
  return { ...state, journal: [{ id, title: input.title.trim(), text: input.text.trim(), destinationId: input.destinationId || null, createdAt: now.toISOString() }, ...state.journal].slice(0, 200) };
}
export function passportProgress(state: PassportBookState, savedIds: readonly string[], availableIds: readonly string[], validatedDemoIds: readonly string[] = []) {
  const available = new Set(availableIds);
  return { explored: state.exploredIds.filter(id => available.has(id)).length,
    planned: new Set(savedIds.filter(id => available.has(id))).size,
    total: available.size, validatedDemo: new Set(validatedDemoIds).size, verifiedRealVisits: 0 as const };
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

/** Casilla del álbum para la copia descargable (en español, como el resto del archivo). */
export interface ExportSlot { label: string; title: string; region: string; regionId?: string; estado: CromoEstado; fecha?: string | null; prueba?: boolean }
const EXPORT_STATE: Readonly<Record<CromoEstado, string>> = {
  album: 'Te falta', visto: 'Visto', en_sobre: 'En mi sobre', comprado: 'Comprado · por vivir', pegado_demo: 'Pegado de demostración', pegado: 'Pegado · visita verificada',
};
const EXPORT_INK: Readonly<Record<string, string>> = { sierra: '#1d6fe0', costa: '#0a7f7a', amazonia: '#177a40', galapagos: '#18222d' };
const EXPORT_CSS = ':root{--ink:#012960;--ink2:#36507e;--maiz:#ffc83d;--paper:#fff;--paper2:#f1f5fa;--line:#d5deea;--rojo:#d11f3a}*{box-sizing:border-box}'
  + 'body{margin:0;background:var(--paper2) radial-gradient(circle at 1px 1px,rgb(1 41 96/.13) 1px,transparent 1.6px) 0 0/8px 8px;color:var(--ink);font:16px/1.5 Archivo,"Arial Narrow","Roboto Condensed",system-ui,sans-serif}'
  + 'main{max-width:880px;margin:28px auto;background:var(--paper);border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgb(1 41 96/.08),0 14px 28px -14px rgb(1 41 96/.45)}'
  + '.cover{background:var(--ink);color:#fff;padding:28px 28px 0}.cover p{margin:0}.brand{font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:14px}'
  + 'h1{font-size:clamp(44px,10vw,76px);line-height:.9;font-weight:900;font-stretch:62%;text-transform:uppercase;margin:14px 0 8px}'
  + '.who{display:inline-block;margin:12px 0 0;padding:8px 14px;border-radius:8px;background:#ffffff1f;font-weight:800;text-transform:uppercase;letter-spacing:.03em}'
  + '.stripes{height:30px;margin:24px -28px 0;border-top:14px solid var(--maiz);border-bottom:5px solid var(--maiz)}'
  + '.body{padding:24px 28px 32px}h2{font-size:30px;line-height:.95;font-weight:900;font-stretch:62%;text-transform:uppercase;margin:30px 0 12px}'
  + '.totals{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0;list-style:none}.totals li{border:2px solid var(--ink);border-radius:999px;padding:4px 12px;font-weight:700}'
  + '.region h2{color:#fff;background:var(--c);padding:10px 14px;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:0;margin:0;list-style:none}'
  + '.cell{border:2px dashed var(--c);border-radius:8px;padding:8px 10px;min-height:70px;break-inside:avoid}.cell b{display:block;font-size:24px;line-height:1;font-weight:900;font-stretch:75%;font-variant-numeric:tabular-nums}'
  + '.cell span{display:block;font-size:13px;font-weight:800;text-transform:uppercase}.cell small{display:block;font-size:13px;overflow-wrap:anywhere}'
  + '.visto{border-style:solid;border-color:var(--line)}.en_sobre{border-style:solid;border-color:var(--rojo)}.comprado{border:3px double var(--rojo)}.comprado span{color:var(--rojo)}'
  + '.pegado_demo{border-style:solid;border-color:var(--ink2);background:var(--paper2)}.pegado{border:3px solid var(--ink);background:var(--maiz)}'
  + 'p,li{overflow-wrap:anywhere}article{border-top:2px solid var(--line);padding-top:14px;margin-top:18px}.note{font-size:14px;color:var(--ink2)}.entry{white-space:pre-wrap}'
  + '@media print{body{background:#fff}main{margin:0;box-shadow:none;border-radius:0}article,.cell{break-inside:avoid}}';

/**
 * Copia privada y autónoma del pasaporte (sin scripts, imágenes ni recursos externos): carné, álbum de 51 casillas
 * con su estado honesto y el diario. Con `slots` vacío muestra las listas de lo guardado y lo explorado.
 */
export function passportExportHtml(state: PassportBookState, destinations: readonly { id: string; title: string; region: string }[], savedIds: readonly string[], exportedAt = new Date(), slots: readonly ExportSlot[] = []): string {
  const e = escapeHtml;
  const planned = destinations.filter(destination => savedIds.includes(destination.id));
  const explored = destinations.filter(destination => state.exploredIds.includes(destination.id));
  const list = (items: typeof planned) => items.length ? `<ul>${items.map(item => `<li>${e(item.title)} · ${e(item.region)}</li>`).join('')}</ul>` : '<p>Todavía por descubrir.</p>';
  const count = (estado: CromoEstado) => slots.filter(slot => slot.estado === estado).length;
  const regions = [...new Set(slots.map(slot => slot.region))];
  const album = slots.length ? `<h2>Mi álbum</h2><ul class="totals"><li>Pegados: ${count('pegado')}</li><li>Demo: ${count('pegado_demo')}</li><li>Comprados: ${count('comprado')}</li><li>En mi sobre: ${count('en_sobre')}</li><li>Vistos: ${count('visto')}</li><li>Te faltan: ${count('album')}</li></ul>`
    + regions.map(region => {
      const local = slots.filter(slot => slot.region === region);
      const ink = EXPORT_INK[local[0]?.regionId ?? ''] ?? '#012960';
      return `<section class="region" style="--c:${ink}"><h2>${e(region)} · ${e(local[0]?.label ?? '')}–${e(local[local.length - 1]?.label ?? '')}</h2><ul class="grid">${local.map(slot => `<li class="cell ${slot.estado}"><b>${e(slot.label)}</b><span>${e(EXPORT_STATE[slot.estado])}${slot.estado === 'comprado' && slot.prueba ? ' · de prueba' : ''}</span><small>${e(slot.title)}${slot.fecha ? ` · ${e(slot.fecha.slice(0, 10))}` : ''}</small></li>`).join('')}</ul></section>`;
    }).join('')
    : `<h2>En mi sobre</h2>${list(planned)}<h2>Vistos</h2>${list(explored)}`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pasaporte Guambra · CHULLA VIDA</title><style>${EXPORT_CSS}</style>`
    + `<main><div class="cover"><p class="brand">CHULLA VIDA · Ecuador 2026</p><h1>Pasaporte Guambra</h1><p>Tu álbum del Ecuador</p><p class="who">${e(state.nickname || 'Viajero/a')}${state.origin ? ` · ${e(state.origin)}` : ''}</p><div class="stripes"></div></div>`
    + `<div class="body"><p class="note">Copia privada descargada el ${e(exportedAt.toISOString())}. Contiene tus notas: cuida este archivo en dispositivos compartidos. No acredita visitas reales, reservas, sellos oficiales ni pagos. Se puede leer sin internet.</p>`
    + `${album}<p class="note">Solo una visita verificada por el servidor pega el cromo. Guardar, comprar, ver una ficha o validar un comprobante de prueba no lo hacen.</p>`
    + `<h2>Mi diario</h2>${state.journal.length ? state.journal.map(entry => `<article><h3>${e(entry.title)}</h3><p class="note">${e(entry.createdAt)}</p><p class="entry">${e(entry.text)}</p></article>`).join('') : '<p>Las páginas están listas para tu próxima historia.</p>'}`
    + `</div></main></html>`;
}
