export const PASSPORT_BOOK_KEY = 'chullavida:passport-book:v1';
export const PASSPORT_PAGES = [
  { id: 'cover', label: 'Portada' },
  { id: 'profile', label: 'Mi perfil y mi Ecuador' },
  { id: 'sierra', label: 'Sierra' },
  { id: 'costa', label: 'Costa' },
  { id: 'amazonia', label: 'Amazonía' },
  { id: 'galapagos', label: 'Galápagos' },
  { id: 'journal', label: 'Mi diario de viaje' },
  { id: 'back', label: 'Recuerdos y contraportada' },
] as const;

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
export function nextPassportPage(current: number, direction: -1 | 1): number {
  if (!Number.isInteger(current)) return 0;
  return Math.min(PASSPORT_PAGES.length - 1, Math.max(0, current + direction));
}
export function toggleVirtualExploration(state: PassportBookState, destinationId: string, allowedIds: readonly string[]): PassportBookState {
  if (!allowedIds.includes(destinationId)) return state;
  const exploredIds = state.exploredIds.includes(destinationId) ? state.exploredIds.filter(id => id !== destinationId)
    : [...state.exploredIds, destinationId].slice(-1000);
  return { ...state, exploredIds };
}
export function addJournalEntry(state: PassportBookState, input: { title: string; text: string; destinationId?: string | null }, now = new Date(), id = crypto.randomUUID()): PassportBookState {
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
export function passportExportHtml(state: PassportBookState, destinations: readonly { id: string; title: string; region: string }[], savedIds: readonly string[], exportedAt = new Date()): string {
  const e = escapeHtml;
  const planned = destinations.filter(destination => savedIds.includes(destination.id));
  const explored = destinations.filter(destination => state.exploredIds.includes(destination.id));
  const list = (items: typeof planned) => items.length ? `<ul>${items.map(item => `<li>${e(item.title)} · ${e(item.region)}</li>`).join('')}</ul>` : '<p>Todavía por descubrir.</p>';
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pasaporte Guambra · CHULLA VIDA</title><style>body{margin:0;background:#eae3cf;color:#15384c;font:16px/1.8 Georgia,serif}main{max-width:780px;margin:36px auto;background:#fffaf0;padding:clamp(24px,5vw,60px);border:1px solid #c9bb97}h1{font-size:42px;line-height:1.15}h2{margin-top:38px;color:#116b70}p,li{overflow-wrap:anywhere}article{border-top:1px solid #c9bb97;padding-top:18px;margin-top:24px}.note{font:14px/1.7 sans-serif;color:#5a624e}.entry{white-space:pre-wrap}@media print{body{background:white}main{margin:0;border:0}article{break-inside:avoid}}</style><main><p>CHULLA VIDA · ECUADOR</p><h1>Pasaporte Guambra</h1><p>Colecciona historias, no solo sellos.</p><h2>${e(state.nickname || 'Mi viaje, mi historia')}</h2><p>${e(state.origin || 'Punto de partida por elegir')}</p><p class="note">Copia privada descargada el ${e(exportedAt.toISOString())}. Contiene tus notas: cuida este archivo en dispositivos compartidos. No acredita visitas reales, reservas, sellos oficiales ni pagos. Se puede leer sin internet.</p><h2>Ideas planeadas</h2>${list(planned)}<h2>Exploración virtual</h2>${list(explored)}<p class="note">Explorar una ficha o guardarla nunca se convierte en una visita verificada.</p><h2>Diario personal</h2>${state.journal.length ? state.journal.map(entry => `<article><h3>${e(entry.title)}</h3><p class="note">${e(entry.createdAt)}</p><p class="entry">${e(entry.text)}</p></article>`).join('') : '<p>Las páginas están listas para tu próxima historia.</p>'}<h2>Una buena huella</h2><p>Pregunta antes de fotografiar, respeta los protocolos de cada comunidad y confirma el acceso con sus organizadores. Los lugares de este pasaporte son referencias, no ofertas reservables.</p></main></html>`;
}
