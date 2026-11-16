import type { Experience } from '../../domain/catalog/types';
import { normalizeQuestion, retrieveExperiences } from './knowledge';
export type VoiceNavigation = 'plan' | 'culture' | 'passport' | 'downloads' | 'account' | 'alerts';
export function navigationFromVoice(question: string): VoiceNavigation | null {
  const q = normalizeQuestion(question);
  if (!/\b(abre|abrir|muestra|muestrame|llevame|ver)\b/.test(q)) return null;
  if (/pasaporte|mis sellos/.test(q)) return 'passport';
  if (/cultura|fiestas|tradiciones/.test(q)) return 'culture';
  if (/descarga|sin senal|sin internet|biblioteca/.test(q)) return 'downloads';
  if (/cuenta|registr|perfil|negocio/.test(q)) return 'account';
  if (/alertas|notificaciones|avisos/.test(q)) return 'alerts';
  if (/plan|itinerario|mi viaje|ruta/.test(q)) return 'plan';
  return null;
}
export const isWeatherQuestion = (question: string) => /clima|lluev|lluvia|temperatura|pronostico|tiempo hace|tiempo hay/.test(normalizeQuestion(question));
/** Places people name by voice; also the vocabulary that fixes on-device transcripts (see correctPlaceNames). */
export const VOICE_PLACES = ['Cuyabeno', 'Saraguro', 'Cotopaxi', 'Quilotoa', 'Mindo', 'Galápagos', 'Chimborazo', 'Montañita', 'Yasuní', 'Ingapirca', 'Vilcabamba', 'Papallacta', 'Podocarpus', 'Esmeraldas', 'Ambato', 'Latacunga', 'Ibarra', 'Tulcán', 'Machala', 'Portoviejo', 'Mompiche', 'Sangay', 'Cayambe', 'Isabela', 'Santa Cruz', 'MIJIN'];
const cities = ['Baños de Agua Santa', 'Puerto Misahuallí', 'San Cristóbal', 'Puerto Ayora', 'Lago Agrio', 'Nueva Loja', 'Shushufindi', 'Riobamba', 'Guayaquil', 'Cotacachi', 'Archidona', 'Saraguro', 'Otavalo', 'Cuyabeno', 'Misahuallí', 'Nangaritza', 'Cuenca', 'Zamora', 'Macas', 'Manta', 'Quito', 'Salinas', 'Tena', 'Puyo', 'Coca', 'Loja', 'Baños'];
export const voicePlaceNames = () => [...VOICE_PLACES, ...cities];
export function weatherLocalityFromVoice(question: string, catalog: Experience[]): string | null {
  const q = normalizeQuestion(question);
  const named = cities.find(city => new RegExp(`(^|[^a-z])${normalizeQuestion(city)}([^a-z]|$)`).test(q));
  if (named) return named;
  const matched = retrieveExperiences(question, catalog, 1)[0];
  if (matched?.weatherReference) return matched.weatherReference.placeName;
  const after = /(?:clima|pronostico|temperatura)(?:\s+(?:de|en|para|hoy|manana))*\s+(.+)/.exec(q)?.[1]?.replace(/\b(hoy|manana|ahora|por favor)\b/g, '').replace(/[^a-z ]/g, '').trim();
  return after && after.length > 2 && after.length < 70 ? after : null;
}

/** Outcome of asking the browser for the microphone before starting speech recognition. */
export type MicrophoneResult = 'granted' | 'denied' | 'no-device' | 'busy' | 'insecure' | 'unavailable' | 'error';
interface MicrophoneEnvironment { mediaDevices?: Pick<MediaDevices, 'getUserMedia'> | undefined; secure?: boolean }
const defaultEnvironment = (): MicrophoneEnvironment => ({ mediaDevices: typeof navigator === 'undefined' ? undefined : navigator.mediaDevices, secure: typeof window === 'undefined' ? false : window.isSecureContext !== false });
/**
 * Asks for an explicit microphone permission and releases it at once: the tracks are stopped before returning,
 * nothing is recorded or kept. `unavailable` means the browser has no getUserMedia (recognition may still ask on its own).
 */
export async function requestMicrophone(environment: MicrophoneEnvironment = defaultEnvironment()): Promise<MicrophoneResult> {
  const { result, stream } = await openMicrophone(environment, { audio: true });
  stream?.getTracks().forEach(track => { try { track.stop(); } catch { /* already stopped */ } });
  return result;
}
function classifyMediaError(error: unknown, secure: boolean): MicrophoneResult {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'SecurityError') return secure ? 'denied' : 'insecure';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'no-device';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  return 'error';
}
/** Opens the microphone and KEEPS the stream (on-device recognition records from it); the caller must stop its tracks. */
export async function openMicrophone(environment: MicrophoneEnvironment = defaultEnvironment(), constraints: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }): Promise<{ result: MicrophoneResult; stream?: MediaStream }> {
  const { mediaDevices, secure = true } = environment;
  if (!secure) return { result: 'insecure' };
  if (!mediaDevices?.getUserMedia) return { result: 'unavailable' };
  try { return { result: 'granted', stream: await mediaDevices.getUserMedia(constraints) }; }
  catch (error) { return { result: classifyMediaError(error, secure) }; }
}
/** Current microphone permission without prompting; `unknown` where the Permissions API does not know «microphone» (Firefox, Safari antiguos). */
export async function microphonePermission(permissions: Pick<Permissions, 'query'> | undefined = typeof navigator === 'undefined' ? undefined : navigator.permissions): Promise<PermissionState | 'unknown'> {
  if (!permissions?.query) return 'unknown';
  try { return (await permissions.query({ name: 'microphone' as PermissionName })).state; } catch { return 'unknown'; }
}
export const microphoneMessages: Record<Exclude<MicrophoneResult, 'granted' | 'unavailable'>, string> = {
  denied: 'El micrófono está bloqueado para esta página. Actívalo así y vuelve a intentarlo:',
  'no-device': 'No encontré un micrófono en este dispositivo. Conecta uno y toca «Reintentar», o escríbeme abajo: te respondo igual.',
  busy: 'Otra aplicación está usando el micrófono (una videollamada, por ejemplo). Ciérrala y toca «Reintentar».',
  insecure: 'El micrófono solo funciona en una página segura (https). Abre CHULLA VIDA desde su dirección https o escríbeme abajo.',
  error: 'No pude encender el micrófono esta vez. Toca «Reintentar» o escríbeme abajo.',
};
/** Steps shown when the permission is denied. */
export const microphoneUnblockSteps = ['Toca el ícono del candado (o de ajustes) a la izquierda de la dirección web.', 'Busca «Micrófono» y elige «Permitir».', 'Vuelve aquí y pulsa «Reintentar». Si no cambia, recarga la página.'];
/** Text shown while the browser displays its own permission prompt. */
export function permissionPromptMessage(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent, touch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches): string {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /OPR\//.test(userAgent) ? 'Opera' : /Chrome\/|CriOS\//.test(userAgent) ? 'Chrome' : 'Tu navegador';
  return touch ? `${browser} te pide permiso en un aviso de la pantalla: pulsa Permitir.` : `${browser} te pide permiso arriba, junto a la barra de direcciones: pulsa Permitir.`;
}
/**
 * Opt-in diagnostics: `window.__mijinVoiceDebug = true` prints recognition and synthesis events with console.debug.
 * Only event names, codes, languages and counts are logged — never what the person said. Everything is printed as
 * plain text (`error code=network lang=es-EC`) so a copied console line never shows a collapsed «Object».
 */
export function formatVoiceDetail(detail: Record<string, string | number | boolean | null | undefined>): string {
  return Object.entries(detail).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${typeof value === 'string' && /\s/.test(value) ? JSON.stringify(value) : String(value)}`).join(' ');
}
export function voiceDebug(event: string, detail: Record<string, string | number | boolean | null | undefined> = {}) {
  if (typeof window === 'undefined' || (window as unknown as { __mijinVoiceDebug?: unknown }).__mijinVoiceDebug !== true) return;
  console.debug(`[MIJIN voz] ${event}`, formatVoiceDetail(detail));
}
