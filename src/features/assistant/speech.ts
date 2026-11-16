/** Browser speech helpers for MIJIN: recognition errors, Spanish voice choice and chunked synthesis. No network of its own. */
export const RECOGNITION_LANG = 'es-EC';
export const RECOGNITION_FALLBACK_LANG = 'es-ES';
/** Order tried when the engine rejects a variant or never starts: Ecuador, Spain, US Spanish. */
export const RECOGNITION_LANGS = [RECOGNITION_LANG, RECOGNITION_FALLBACK_LANG, 'es-US'] as const;
/** Safety net in case the browser never fires the silence end. */
export const MAX_LISTEN_MS = 15000;
/** If neither `start` nor `audiostart` arrives in this time after `start()`, the engine is considered silent. */
export const START_WATCHDOG_MS = 2500;
/** After asking the engine to stop, wait this long for `end` before closing the turn ourselves. */
export const END_GRACE_MS = 1500;
export const VOICE_NOTICE_KEY = 'chullavida:mijin-voice-notice';
export type SpeechRate = 0.85 | 1 | 1.2;
export const speechRates: { value: SpeechRate; label: string }[] = [{ value: 0.85, label: 'Pausada' }, { value: 1, label: 'Normal' }, { value: 1.2, label: 'Ágil' }];

/** Preference order: Ecuador, US Spanish, Mexico, Latin America, Spain, then any Spanish voice. */
const PREFERRED = ['es-ec', 'es-us', 'es-mx', 'es-419', 'es-es'];
const plain = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * Within one variant, natural/online engines («Google español», «… Online (Natural)», iOS «(mejorada)/(Premium)»)
 * sound better than the old local ones; Apple's novelty voices (Eddy, Flo, Grandma, Rocko…) never read MIJIN.
 */
const quality = (name: string) => {
  const n = plain(name);
  if (/\b(eddy|flo|grandma|grandpa|abuela|abuelo|reed|rocko|sandy|shelley|bells|bubbles|jester|organ|whisper|zarvox|bahh|boing|cellos|trinoids|wobble|superstar|albert|fred|junior|kathy|ralph)\b/.test(n)) return 4;
  if (/natural|online|google|premium|mejorada|enhanced/.test(n)) return 0;
  if (/microsoft|helena|laura|pablo|sabina|raul|paulina|monica|jorge|juan|diego|marisol|angelica|francisca/.test(n)) return 1;
  return 2;
};
export interface VoiceLike { lang: string; name: string; localService?: boolean; default?: boolean }
export function pickSpanishVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const spanish = voices.filter(voice => voice.lang.replace('_', '-').toLowerCase().startsWith('es'));
  if (!spanish.length) return null;
  const rank = (voice: T) => { const index = PREFERRED.indexOf(voice.lang.replace('_', '-').toLowerCase()); return index === -1 ? PREFERRED.length : index; };
  // A novelty voice loses against any normal voice, whatever its variant.
  const novelty = (voice: T) => quality(voice.name) === 4 ? 1 : 0;
  return [...spanish].sort((a, b) => novelty(a) - novelty(b) || rank(a) - rank(b) || quality(a.name) - quality(b.name) || Number(Boolean(b.localService)) - Number(Boolean(a.localService)))[0] ?? null;
}

/** iPhone, iPad (also iPadOS reporting itself as a Mac) and iPod: every browser there is WebKit. */
export function isAppleMobile(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints ?? 0): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);
}
/** Desktop Safari or Firefox: their SpeechRecognition is missing or unreliable. */
export function isSafariOrFirefox(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /Firefox\/|FxiOS/.test(userAgent) || (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|CriOS|Edg\/|OPR\/|Android/.test(userAgent));
}
export type VoiceEngine = 'browser' | 'local';
export const VOICE_ENGINE_KEY = 'chullavida:mijin-voice-engine';
/**
 * Which recognizer to try first. The browser service (Chrome, Edge, Android) answers fast but sends audio to its
 * provider; the local one runs Whisper on the device. iOS, Safari and Firefox always use the local one.
 * `stored` is the person's last working choice (localStorage).
 */
export function preferredVoiceEngine({ hasRecognition, userAgent, touchPoints, stored }: { hasRecognition: boolean; userAgent?: string; touchPoints?: number; stored?: string | null }): VoiceEngine {
  if (!hasRecognition || isAppleMobile(userAgent, touchPoints) || isSafariOrFirefox(userAgent)) return 'local';
  return stored === 'local' ? 'local' : 'browser';
}
export function readVoiceEngine(): string | null {
  try { return window.localStorage.getItem(VOICE_ENGINE_KEY); } catch { return null; }
}
export function storeVoiceEngine(engine: VoiceEngine) {
  try { window.localStorage.setItem(VOICE_ENGINE_KEY, engine); } catch { /* private mode: it is chosen again next time */ }
}

/**
 * iOS only lets a page speak if the first `speak()` happens inside a tap. Call this synchronously from the tap
 * handler: it queues a silent utterance so later answers (after transcription, which is async) can be read aloud.
 */
const unlockedEngines = new WeakSet<object>();
export function unlockSpeechSynthesis(synthesis: Pick<SpeechSynthesis, 'speak'> | undefined = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined, appleMobile = isAppleMobile()): boolean {
  if (!synthesis || unlockedEngines.has(synthesis) || !appleMobile || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try { const silent = new SpeechSynthesisUtterance(' '); silent.volume = 0; silent.rate = 2; synthesis.speak(silent); unlockedEngines.add(synthesis); return true; } catch { return false; }
}

/** Splits long answers into sentence-sized pieces: some engines stop reading after ~15 s of a single utterance. */
export function chunkSpeech(text: string, max = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?¡¿;:]+[.!?;:]*|[¡¿][^.!?]*[.!?]*/g) ?? [clean];
  const chunks: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const sentence = raw.trim(); if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= max) { current = (current + ' ' + sentence).trim(); continue; }
    if (current) chunks.push(current);
    if (sentence.length <= max) { current = sentence; continue; }
    // A very long sentence: cut on commas or spaces.
    let rest = sentence;
    while (rest.length > max) {
      const slice = rest.slice(0, max);
      const cut = Math.max(slice.lastIndexOf(', '), slice.lastIndexOf(' '));
      const at = cut > max * 0.4 ? cut + 1 : max;
      chunks.push(rest.slice(0, at).trim()); rest = rest.slice(at).trim();
    }
    current = rest;
  }
  if (current) chunks.push(current);
  return chunks;
}

interface SynthesisLike { getVoices?: () => SpeechSynthesisVoice[]; addEventListener?: (type: 'voiceschanged', listener: () => void) => void; removeEventListener?: (type: 'voiceschanged', listener: () => void) => void; onvoiceschanged?: unknown }
/** Chrome loads voices asynchronously: wait for `voiceschanged`, but never longer than `timeoutMs`. */
export function loadVoices(synthesis: SynthesisLike, timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  const current = synthesis.getVoices?.() ?? [];
  if (current.length || !synthesis.addEventListener) return Promise.resolve(current);
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; synthesis.removeEventListener?.('voiceschanged', finish); window.clearTimeout(timer); resolve(synthesis.getVoices?.() ?? []); };
    const timer = window.setTimeout(finish, timeoutMs);
    synthesis.addEventListener?.('voiceschanged', finish);
  });
}

export type RecognitionIssue = 'blocked' | 'service' | 'network' | 'no-speech' | 'no-microphone' | 'language' | 'aborted' | 'other';
export function classifyRecognitionError(code: string): RecognitionIssue {
  if (code === 'not-allowed') return 'blocked';
  if (code === 'service-not-allowed') return 'service';
  if (code === 'network') return 'network';
  if (code === 'no-speech') return 'no-speech';
  if (code === 'audio-capture') return 'no-microphone';
  if (code === 'language-not-supported') return 'language';
  if (code === 'aborted') return 'aborted';
  return 'other';
}
export const recognitionMessages: Record<RecognitionIssue, string> = {
  blocked: 'El micrófono está bloqueado para esta página. Toca el candado junto a la dirección web, permite «Micrófono» y vuelve a tocar el botón. También puedes escribirme abajo.',
  service: 'El servicio de reconocimiento de voz de tu navegador no está disponible aquí (puede estar desactivado o no existir en este navegador).',
  network: 'El reconocimiento de voz de tu navegador necesita internet y no logró conectarse con su servicio. Revisa tu conexión o escríbeme abajo.',
  'no-speech': 'No te escuché. ¿Hablamos de nuevo? Toca «Reintentar» y habla cerca del micrófono.',
  'no-microphone': 'No encontré un micrófono en este dispositivo. Conecta uno o escríbeme abajo; te respondo igual.',
  language: 'Tu navegador no reconoce voz en español. Escríbeme abajo y te respondo igual.',
  aborted: 'Micrófono apagado.',
  other: 'No pude reconocer la voz esta vez. Toca el micrófono para intentar de nuevo o escríbeme abajo.',
};
/** Short, plain explanation of each SpeechRecognition error code, shown next to the code itself. */
export const recognitionCodeHints: Record<string, string> = {
  'no-speech': 'el navegador no detectó voz',
  'audio-capture': 'no hay micrófono disponible',
  network: 'sin conexión con el servicio de voz del navegador',
  'not-allowed': 'permiso de micrófono denegado',
  'service-not-allowed': 'el servicio de voz del navegador no está permitido',
  aborted: 'la escucha se interrumpió',
  'language-not-supported': 'el navegador no reconoce este idioma',
  'bad-grammar': 'error interno del reconocimiento',
  'engine-silent': 'el servicio de voz no arrancó',
  'no-result': 'terminó sin devolver texto',
};
/** Browser failures after which MIJIN switches to on-device recognition by itself (asking first only for the download). */
export const AUTO_LOCAL_FALLBACK = new Set(['network', 'service-not-allowed', 'no-speech', 'engine-silent', 'no-result']);
export const describeRecognitionCode = (code: string) => `Código del navegador: ${code || 'desconocido'}${recognitionCodeHints[code] ? ` (${recognitionCodeHints[code]})` : ''}.`;
/** Codes after which on-device recognition is worth offering instead of the browser service. */
export const FALLBACK_TO_LOCAL = new Set(['network', 'service-not-allowed', 'no-speech', 'engine-silent', 'no-result', 'other', 'language-not-supported', 'bad-grammar']);

export const localVoiceMessages = {
  offer: (megabytes: number) => `Para entenderte sin enviar tu voz a ningún servidor, descargo el reconocimiento de voz a este dispositivo: unos ${megabytes} MB, solo la primera vez. Te conviene una red wifi.`,
  preparing: (megabytes: number) => `Preparando voz en tu dispositivo… (${megabytes} MB, solo la primera vez)`,
  privacy: 'Tu voz se procesa en este dispositivo. No se envía ni se guarda.',
  noSpeech: 'No escuché tu voz. Si la barra de nivel no se movió, revisa que el micrófono correcto esté activo y habla más cerca.',
  empty: 'No logré entender la frase. Habla un poco más despacio y cerca del micrófono, o escríbeme abajo.',
  offline: 'Sin conexión: la voz en tu dispositivo aún no está descargada y el reconocimiento del navegador necesita internet. Escríbeme abajo: busco en tus fichas descargadas.',
  unsupported: 'Este navegador no permite grabar y procesar la voz en el dispositivo. Escríbeme abajo: te respondo igual y puedo leer la respuesta en voz alta.',
  download: 'No pude descargar la voz para tu dispositivo. Revisa tu conexión y vuelve a intentarlo, o escríbeme abajo.',
  engine: 'Tu navegador no pudo iniciar el reconocimiento de voz en el dispositivo (memoria o WebAssembly no disponibles). Escríbeme abajo.',
  decode: 'No pude leer el audio grabado. Toca «Reintentar» o escríbeme abajo.',
};

export const engineSilentMessage ='El reconocimiento de voz del navegador no respondió; escríbeme abajo o toca «Reintentar».';
export const unsupportedVoiceMessage = 'Tu navegador (por ejemplo Firefox o un Safari antiguo) no ofrece reconocimiento de voz. Escríbeme abajo: te respondo igual y puedo leer la respuesta en voz alta.';
/** Same notice without promising to read aloud when the browser cannot speak either. */
export const unsupportedVoiceText = (canSpeak: boolean) => canSpeak ? unsupportedVoiceMessage : 'Este navegador no permite usar el micrófono ni leer en voz alta aquí. Escríbeme abajo: te respondo igual.';

export function readVoiceNoticeSeen(): boolean {
  try { return window.sessionStorage.getItem(VOICE_NOTICE_KEY) === '1'; } catch { return false; }
}
export function markVoiceNoticeSeen() {
  try { window.sessionStorage.setItem(VOICE_NOTICE_KEY, '1'); } catch { /* private mode: the notice simply shows again */ }
}
