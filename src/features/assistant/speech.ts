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

/** Locale order inside one quality tier: Ecuador, Mexico, US Spanish, Latin America, Spain, then any Spanish voice. */
const PREFERRED = ['es-ec', 'es-mx', 'es-us', 'es-419', 'es-es'];
/** Natural voices of Microsoft Edge, warmest first (Andrea/Luis es-EC, Dalia/Jorge es-MX, Paloma/Alonso es-US, Elvira/Álvaro es-ES). */
const FAVOURITE_NAMES = ['andrea', 'dalia', 'paloma', 'elvira', 'luis', 'jorge', 'alonso', 'alvaro',
  // If only Windows voices exist: the newer OneCore ones (Sabina, Laura, Pablo, Raúl) sound far less metallic than Helena (SAPI 5).
  'sabina', 'laura', 'raul', 'pablo', 'helena'];
const plain = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const langOf = (voice: { lang: string }) => voice.lang.replace('_', '-').toLowerCase();
/** 0 neural · 1 Apple premium · 2 Google · 3 Apple standard · 4 unknown · 6 robotic desktop · 9 novelty. Lower is better. */
export type VoiceTier = 0 | 1 | 2 | 3 | 4 | 6 | 9;
export function voiceTier(name: string): VoiceTier {
  const n = plain(name);
  if (/\b(eddy|flo|grandma|grandpa|abuela|abuelo|reed|rocko|sandy|shelley|bells|bubbles|jester|organ|whisper|zarvox|bahh|boing|cellos|trinoids|wobble|superstar|albert|fred|junior|kathy|ralph|hysterical|deranged)\b/.test(n)) return 9;
  if (/natural|neural|\bonline\b/.test(n)) return 0;
  if (/premium|enhanced|mejorada/.test(n)) return 1;
  if (/google/.test(n)) return 2;
  if (/microsoft|desktop|\b(helena|laura|pablo|sabina|raul)\b/.test(n)) return 6;
  if (/\b(monica|paulina|marisol|jorge|juan|diego|angelica|francisca|carlos|isabela|soledad)\b/.test(n)) return 3;
  return 4;
}
export interface VoiceLike { lang: string; name: string; localService?: boolean; default?: boolean }
const isSpanish = (voice: VoiceLike) => langOf(voice).startsWith('es');
const localeRank = (voice: VoiceLike) => { const index = PREFERRED.indexOf(langOf(voice)); return index === -1 ? PREFERRED.length : index; };
const nameRank = (voice: VoiceLike) => { const n = plain(voice.name); const index = FAVOURITE_NAMES.findIndex(name => new RegExp(`\\b${name}\\b`).test(n)); return index === -1 ? FAVOURITE_NAMES.length : index; };
/**
 * Spanish voices from best to worst: neural «Online (Natural)» first, then Apple Premium/Mejorada, Google, Apple
 * standard, unknown, and the robotic Windows desktop voices (Helena, Laura, Pablo…) last. Novelty voices never.
 */
export function rankSpanishVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  return voices.filter(voice => isSpanish(voice) && voiceTier(voice.name) !== 9)
    .sort((a, b) => voiceTier(a.name) - voiceTier(b.name) || localeRank(a) - localeRank(b) || nameRank(a) - nameRank(b) || Number(Boolean(b.localService)) - Number(Boolean(a.localService)));
}
/** Best Spanish voice, or the one the person chose (`preferred`, its name) while it is still installed. */
export function pickSpanishVoice<T extends VoiceLike>(voices: readonly T[], preferred?: string | null): T | null {
  const ranked = rankSpanishVoices(voices);
  if (preferred) { const chosen = ranked.find(voice => voice.name === preferred); if (chosen) return chosen; }
  return ranked[0] ?? voices.find(isSpanish) ?? null;
}
const COUNTRIES: Record<string, string> = { 'es-ec': 'Ecuador', 'es-mx': 'México', 'es-us': 'EE. UU.', 'es-es': 'España', 'es-419': 'Latinoamérica', 'es-ar': 'Argentina', 'es-co': 'Colombia', 'es-cl': 'Chile', 'es-pe': 'Perú', 'es-ve': 'Venezuela', 'es-bo': 'Bolivia', 'es-uy': 'Uruguay', 'es-py': 'Paraguay', 'es-cr': 'Costa Rica', 'es-pa': 'Panamá', 'es-do': 'R. Dominicana', 'es-gt': 'Guatemala', 'es-hn': 'Honduras', 'es-ni': 'Nicaragua', 'es-sv': 'El Salvador', 'es-pr': 'Puerto Rico', 'es-cu': 'Cuba' };
const TIER_LABEL: Record<VoiceTier, string> = { 0: 'natural', 1: 'natural', 2: 'buena', 3: 'estándar', 4: 'estándar', 6: 'robótica', 9: 'robótica' };
/** Short label for the voice picker: «Dalia · México · natural». */
export function describeVoice(voice: VoiceLike): string {
  const country = COUNTRIES[langOf(voice)] ?? voice.lang;
  let name = voice.name.replace(/\s*-\s*(spanish|espa[nñ]ol).*$/i, '').replace(/\b(microsoft|apple)\b/gi, '').replace(/\((natural|premium|enhanced|mejorada)\)/gi, '').replace(/\b(online|natural|desktop)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (/^google/i.test(name)) name = 'Google';
  return `${name || 'Voz'} · ${country} · ${TIER_LABEL[voiceTier(voice.name)]}`;
}
export type VoicePlatform = 'windows' | 'apple' | 'android' | 'other';
export function voicePlatform(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints ?? 0): VoicePlatform {
  if (/Android/.test(userAgent)) return 'android';
  if (isAppleMobile(userAgent, touchPoints) || /Macintosh/.test(userAgent)) return 'apple';
  if (/Windows/.test(userAgent)) return 'windows';
  return 'other';
}
/** A short tip when the device only has robotic Spanish voices; null when a good voice exists. */
export function voiceTip(voices: readonly VoiceLike[], platform: VoicePlatform = voicePlatform(), userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): string | null {
  const best = rankSpanishVoices(voices)[0];
  const tier = best ? voiceTier(best.name) : 9;
  if (platform === 'apple') return tier <= 2 ? null : 'Tip: en iPhone ve a Ajustes → Accesibilidad → Contenido leído → Voces → Español y descarga una voz «Mejorada».';
  if (tier < 6) return null;
  if (platform === 'windows') return /Edg\//.test(userAgent) ? 'Tip: con internet, Edge te da voces naturales (Dalia, Andrea, Paloma).' : 'Tip: abre la página en Microsoft Edge: trae voces naturales en español.';
  if (platform === 'android') return 'Tip: en Ajustes → Idioma → Salida de texto a voz, instala la voz de Google en español.';
  return best ? null : 'Tu navegador no trae voces en español. Te respondo en texto.';
}
/** Chosen MIJIN voice (its name): a display preference, not personal data. */
export const VOICE_PREF_KEY = 'chullavida:mijin-voice';
export function readVoicePreference(): string | null {
  try { return window.localStorage.getItem(VOICE_PREF_KEY); } catch { return null; }
}
export function storeVoicePreference(name: string | null) {
  try { if (name) window.localStorage.setItem(VOICE_PREF_KEY, name.slice(0, 200)); else window.localStorage.removeItem(VOICE_PREF_KEY); } catch { /* private mode: chosen again next time */ }
}
/**
 * The engine's own tone. Raising it (1.05 before) made every voice sound pinched, and the robotic
 * Windows voices even more metallic: the owner found it «demasiado fea». Natural voices sound best untouched.
 */
export const SPEECH_PITCH = 1;
export const VOICE_SAMPLE = '¡Hola, wambra! Soy MIJIN. El Quilotoa cuesta desde $38 por persona.';

const money = (amount: string) => `${amount} ${amount === '1' ? 'dólar' : 'dólares'}`;
const NUM = '(\\d+(?:[.,]\\d+)?)';
const RANGE_USD = new RegExp(`(?:USD|US\\$|\\$)\\s*${NUM}\\s*(?:[–-]|a)\\s*(?:USD|\\$)?\\s*${NUM}`, 'gi');
const PREFIX_USD = new RegExp(`(?:USD|US\\$|\\$)\\s*${NUM}`, 'gi');
const SUFFIX_USD = new RegExp(`${NUM}\\s*(?:USD|\\$)(?![a-z])`, 'gi');
const EUROS = new RegExp(`(?:EUR|€)\\s*${NUM}|${NUM}\\s*(?:EUR|€)`, 'gi');
/**
 * Text as it should be heard: no emojis, URLs, symbols or file names; prices and units in words
 * («$38 por persona» → «38 dólares por persona», «8–10 h» → «8 a 10 horas»).
 */
export function toSpeakable(text: string): string {
  let t = ` ${text} `;
  t = t.replace(/https?:\/\/\S+|www\.\S+|\S+\.(?:md|pdf|docx?|json|webp|jpe?g|png)\b/gi, ' ');
  t = t.replace(/\p{Extended_Pictographic}|️|‍/gu, '');
  t = t.replace(RANGE_USD, (_m, a: string, b: string) => `${a} a ${money(b)}`);
  t = t.replace(PREFIX_USD, (_m, a: string) => money(a));
  t = t.replace(SUFFIX_USD, (_m, a: string) => money(a));
  t = t.replace(EUROS, (_m, a?: string, b?: string) => `${a ?? b} euros`);
  t = t.replace(/(\d)\s*[–-]\s*(\d)/g, '$1 a $2');
  // Clock times: «12:00» → «12 en punto», «9:15» → «9 y 15»; «a. m.» / «p. m.» are dropped (24-hour times are used).
  t = t.replace(/\b(\d{1,2}):00\b/g, '$1 en punto').replace(/\b(\d{1,2}):(\d{2})\b/g, '$1 y $2').replace(/\s?\b[ap]\.\s?m\./gi, '');
  t = t.replace(/(\d)\s*°\s*C\b/g, '$1 grados').replace(/°/g, ' grados');
  t = t.replace(/(\d)\s*km\/h\b/gi, '$1 kilómetros por hora').replace(/(\d)\s*km\b/gi, '$1 kilómetros').replace(/(\d)\s*m\.?s\.?n\.?m\.?/gi, '$1 metros sobre el nivel del mar');
  t = t.replace(/(\d)\s*%/g, '$1 por ciento').replace(/(\d)\s*mm\b/g, '$1 milímetros');
  t = t.replace(/\b1\s*h\b/g, '1 hora').replace(/(\d)\s*h\b/g, '$1 horas').replace(/(\d)\s*min\b/g, '$1 minutos');
  t = t.replace(/\bp\.\s?ej\.?/gi, 'por ejemplo').replace(/\bej\.:?/gi, 'por ejemplo').replace(/\baprox\./gi, 'aproximadamente').replace(/\bEE\.\s?UU\./g, 'Estados Unidos');
  t = t.replace(/([a-záéíóúñ])\/([a-záéíóúñ])/gi, '$1 o $2').replace(/\//g, ' ');
  t = t.replace(/\s*[·•→|]\s*/g, ', ').replace(/\s+[—–-]\s+/g, ', ');
  t = t.replace(/[«»"“”*#_~^<>[\]{}]/g, '');
  t = t.replace(/\(\s*\)/g, '').replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*([.;:!?])/g, '$1').replace(/([,.;:])\1+/g, '$1').replace(/\s+/g, ' ');
  return t.trim().replace(/^[,.;:]\s*/, '');
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
    // Sentences are joined while they fit: each new utterance makes network voices (Google, Edge Natural) pause
    // and restart their intonation, which the owner heard as choppy and «fea». The engine's own pauses sound better.
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

/** True when the list already has a Spanish voice that is not one of the robotic desktop ones (Helena, Laura, Pablo…). */
export function hasGoodSpanishVoice(voices: readonly VoiceLike[]): boolean {
  const best = rankSpanishVoices(voices)[0];
  return Boolean(best) && voiceTier(best!.name) < 6;
}
/**
 * Chrome first lists the robotic Windows voices and adds «Google español» a moment later; Edge does the same with
 * its natural voices. When only robotic voices are listed, wait once for the full list (at most `timeoutMs`).
 */
export function loadBestVoices(synthesis: SynthesisLike, timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const current = synthesis.getVoices?.() ?? [];
  if (hasGoodSpanishVoice(current) || !synthesis.addEventListener) return current.length ? Promise.resolve(current) : loadVoices(synthesis, timeoutMs);
  return new Promise(resolve => {
    let done = false;
    const check = () => { const list = synthesis.getVoices?.() ?? []; if (hasGoodSpanishVoice(list)) finish(); };
    const finish = () => { if (done) return; done = true; synthesis.removeEventListener?.('voiceschanged', check); window.clearTimeout(timer); resolve(synthesis.getVoices?.() ?? []); };
    const timer = window.setTimeout(finish, timeoutMs);
    synthesis.addEventListener?.('voiceschanged', check);
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
