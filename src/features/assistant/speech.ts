/** Browser speech helpers for MIJIN: recognition errors, Spanish voice choice and chunked synthesis. No network of its own. */
export const RECOGNITION_LANG = 'es-EC';
export const RECOGNITION_FALLBACK_LANG = 'es-ES';
/** Safety net in case the browser never fires the silence end. */
export const MAX_LISTEN_MS = 15000;
export const VOICE_NOTICE_KEY = 'chullavida:mijin-voice-notice';
export type SpeechRate = 0.85 | 1 | 1.2;
export const speechRates: { value: SpeechRate; label: string }[] = [{ value: 0.85, label: 'Pausada' }, { value: 1, label: 'Normal' }, { value: 1.2, label: 'Ágil' }];

/** Preference order: Ecuador, Latin America, Mexico, US Spanish, Spain, then any Spanish voice. */
const PREFERRED = ['es-ec', 'es-419', 'es-mx', 'es-us', 'es-es'];
export interface VoiceLike { lang: string; name: string; localService?: boolean; default?: boolean }
export function pickSpanishVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const spanish = voices.filter(voice => voice.lang.replace('_', '-').toLowerCase().startsWith('es'));
  if (!spanish.length) return null;
  const rank = (voice: T) => { const index = PREFERRED.indexOf(voice.lang.replace('_', '-').toLowerCase()); return index === -1 ? PREFERRED.length : index; };
  return [...spanish].sort((a, b) => rank(a) - rank(b) || Number(Boolean(b.localService)) - Number(Boolean(a.localService)))[0] ?? null;
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

export type RecognitionIssue = 'blocked' | 'network' | 'no-speech' | 'no-microphone' | 'language' | 'aborted' | 'other';
export function classifyRecognitionError(code: string): RecognitionIssue {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'blocked';
  if (code === 'network') return 'network';
  if (code === 'no-speech') return 'no-speech';
  if (code === 'audio-capture') return 'no-microphone';
  if (code === 'language-not-supported') return 'language';
  if (code === 'aborted') return 'aborted';
  return 'other';
}
export const recognitionMessages: Record<RecognitionIssue, string> = {
  blocked: 'El micrófono está bloqueado para esta página. Toca el candado junto a la dirección web, permite «Micrófono» y vuelve a tocar el botón. También puedes escribirme abajo.',
  network: 'El reconocimiento de voz de tu navegador necesita internet y no logró conectarse. Revisa tu conexión o escríbeme abajo.',
  'no-speech': 'No te escuché. Toca el micrófono de nuevo y habla cerca del teléfono.',
  'no-microphone': 'No encontré un micrófono en este dispositivo. Conecta uno o escríbeme abajo; te respondo igual.',
  language: 'Tu navegador no reconoce voz en español. Escríbeme abajo y te respondo igual.',
  aborted: 'Micrófono apagado.',
  other: 'No pude reconocer la voz esta vez. Toca el micrófono para intentar de nuevo o escríbeme abajo.',
};
export const unsupportedVoiceMessage = 'Tu navegador (por ejemplo Firefox o un Safari antiguo) no ofrece reconocimiento de voz. Escríbeme abajo: te respondo igual y puedo leer la respuesta en voz alta.';

export function readVoiceNoticeSeen(): boolean {
  try { return window.sessionStorage.getItem(VOICE_NOTICE_KEY) === '1'; } catch { return false; }
}
export function markVoiceNoticeSeen() {
  try { window.sessionStorage.setItem(VOICE_NOTICE_KEY, '1'); } catch { /* private mode: the notice simply shows again */ }
}
