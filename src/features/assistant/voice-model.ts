/**
 * Reconocimiento de voz local (en el dispositivo) de MIJIN: modelo Whisper base cuantizado (q8), autoalojado en
 * /models y /ort por scripts/fetch-voice-model.mjs. Nada se descarga de terceros en tiempo de uso.
 */
export const LOCAL_VOICE_MODEL = 'onnx-community/whisper-base';
/** Debe coincidir con MODEL_REVISION de scripts/fetch-voice-model.mjs. */
export const LOCAL_VOICE_REVISION = '27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c';
/** Cache Storage propio: modelo + runtime WASM. Cambia de nombre si cambia la revisión. */
export const LOCAL_VOICE_CACHE = `chulla-vida-voz-${LOCAL_VOICE_REVISION.slice(0, 8)}`;
export const LOCAL_VOICE_MANIFEST = `/models/${LOCAL_VOICE_MODEL}/manifest.json`;
/**
 * onnxruntime-web trae dos motores: «asyncify» (el que usa @huggingface/transformers por defecto) y el básico,
 * que transformers elige para Safari < 26 sin WebGPU. Replicamos esa misma regla.
 */
export type OrtVariant = 'asyncify' | 'plain';
export function ortVariant(userAgent: string, hasWebGpu: boolean): OrtVariant {
  const safari = /Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\/|Android/.test(userAgent);
  const version = Number(/Version\/(\d+)/.exec(userAgent)?.[1] ?? 0);
  return safari && version > 0 && version < 26 && !hasWebGpu ? 'plain' : 'asyncify';
}
export const ortWasmPath = (variant: OrtVariant) => variant === 'plain' ? '/ort/ort-wasm-simd-threaded.wasm' : '/ort/ort-wasm-simd-threaded.asyncify.wasm';
/**
 * Peso aproximado de la primera descarga (MiB, manifest.json): modelo 76 (codificador 22,1 + decodificador 51,2 +
 * tokenizador 2,7) + motor 25,6 (13,6 en Safari < 26). Whisper base y no tiny: en pruebas con frases del catálogo,
 * tiny transcribía «Abre mi pasaporte» como «Ahora, mi pasaste» y base las acertó casi todas.
 */
export function localVoiceMegabytes(variant: OrtVariant = currentVariant()): number { return variant === 'plain' ? 90 : 102; }
export const LOCAL_VOICE_SAMPLE_RATE = 16000;
const currentVariant = (): OrtVariant => typeof navigator === 'undefined' ? 'asyncify' : ortVariant(navigator.userAgent, 'gpu' in navigator);
/** Lo mínimo para comprobar que la descarga ya está completa sin abrir el worker. */
export const localVoiceKeyFiles = (variant: OrtVariant = currentVariant()) => [
  `/models/${LOCAL_VOICE_MODEL}/onnx/encoder_model_quantized.onnx`,
  `/models/${LOCAL_VOICE_MODEL}/onnx/decoder_model_merged_quantized.onnx`,
  `/models/${LOCAL_VOICE_MODEL}/tokenizer.json`,
  ortWasmPath(variant),
];

export type LocalVoiceGap = 'media' | 'recorder' | 'audio' | 'worker' | 'wasm';
interface SupportEnvironment { mediaDevices?: unknown; MediaRecorder?: unknown; AudioContext?: unknown; webkitAudioContext?: unknown; Worker?: unknown; WebAssembly?: unknown }
/** What the browser lacks to transcribe on the device; empty when everything is there. */
export function localVoiceGaps(environment: SupportEnvironment = typeof window === 'undefined' ? {} : { mediaDevices: (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices, MediaRecorder: (window as unknown as SupportEnvironment).MediaRecorder, AudioContext: (window as unknown as SupportEnvironment).AudioContext, webkitAudioContext: (window as unknown as SupportEnvironment).webkitAudioContext, Worker: (window as unknown as SupportEnvironment).Worker, WebAssembly: (globalThis as unknown as SupportEnvironment).WebAssembly }): LocalVoiceGap[] {
  const gaps: LocalVoiceGap[] = [];
  if (!(environment.mediaDevices as { getUserMedia?: unknown } | undefined)?.getUserMedia) gaps.push('media');
  if (typeof environment.MediaRecorder !== 'function') gaps.push('recorder');
  if (typeof environment.AudioContext !== 'function' && typeof environment.webkitAudioContext !== 'function') gaps.push('audio');
  if (typeof environment.Worker !== 'function') gaps.push('worker');
  if (typeof environment.WebAssembly !== 'object' || environment.WebAssembly === null) gaps.push('wasm');
  return gaps;
}
export const canTranscribeLocally = () => localVoiceGaps().length === 0;

/** True when every key file is already in this browser's Cache Storage (so no download is needed). */
export async function isLocalVoiceCached(storage: Pick<CacheStorage, 'open'> | undefined = typeof caches === 'undefined' ? undefined : caches): Promise<boolean> {
  if (!storage) return false;
  try {
    const cache = await storage.open(LOCAL_VOICE_CACHE);
    const found = await Promise.all(localVoiceKeyFiles().map(path => cache.match(path)));
    return found.every(Boolean);
  } catch { return false; }
}

/** Rough Spanish phonetic key: b/v, c/s/z, qu/k, ll/y and silent h sound alike; doubled letters collapse. */
export function phoneticKey(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')
    .replace(/ll/g, 'y').replace(/qu/g, 'k').replace(/c([ei])/g, 's$1').replace(/ch/g, 'x').replace(/c/g, 'k').replace(/z/g, 's').replace(/v/g, 'b').replace(/h/g, '').replace(/(.)\1+/g, '$1');
}
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) { const saved = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = saved; }
  }
  return row[b.length];
}
/**
 * Whisper splits or misspells proper nouns it does not know («cuya vino» for Cuyabeno). Windows of one to three
 * words that sound like a known place (same first sound, ≤1 edit, ≤2 for long names) are replaced by its spelling.
 * Only for on-device transcripts, which the person can still correct before anything happens.
 */
export function correctPlaceNames(text: string, places: readonly string[]): string {
  const entries = [...new Set(places)].map(name => ({ name, key: phoneticKey(name) })).filter(entry => entry.key.length >= 5);
  if (!entries.length) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    let replaced = false;
    for (let size = Math.min(3, words.length - i); size >= 1 && !replaced; size -= 1) {
      const window = words.slice(i, i + size);
      const key = phoneticKey(window.join(''));
      if (key.length < 5) continue;
      const limit = key.length >= 8 ? 2 : 1;
      const best = entries.map(entry => ({ ...entry, gap: entry.key[0] === key[0] ? distance(key, entry.key) : 99 })).filter(entry => entry.gap <= limit).sort((a, b) => a.gap - b.gap)[0];
      if (!best) continue;
      const trailing = /[.,;:!?…»"]+$/.exec(window[window.length - 1])?.[0] ?? '';
      const leading = /^[¿¡«"]+/.exec(window[0])?.[0] ?? '';
      out.push(`${leading}${best.name}${trailing}`); i += size - 1; replaced = true;
    }
    if (!replaced) out.push(words[i]);
  }
  return out.join(' ');
}
/** Place vocabulary for the correction: well-known places plus every catalog title word, province and weather locality. */
export function placeVocabulary(catalog: readonly { title: string; province?: string; locality?: string; weatherReference?: { placeName: string } | null }[], known: readonly string[] = []): string[] {
  const words = new Set(known);
  for (const item of catalog) {
    for (const source of [item.title, item.province, item.weatherReference?.placeName]) {
      for (const word of (source ?? '').split(/[\s,·/()-]+/)) if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{4,}$/.test(word)) words.add(word);
    }
  }
  return [...words];
}

/** Whisper inventa frases típicas de subtítulos cuando oye ruido o silencio: no las tratamos como pregunta. */
const HALLUCINATIONS = [/subt[ií]tulos? (realizados|por)/i, /amara\.org/i, /gracias por ver/i, /suscr[ií]bete/i, /^\W*(m[uú]sica|aplausos|risas)\W*$/i, /^\W*$/];
export function cleanTranscript(text: string): string {
  const clean = text.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  // A lone letter («y», «a») is what Whisper makes of a breath or a tap, not a question.
  if (!clean || clean.replace(/[^\p{L}\p{N}]/gu, '').length < 2 || HALLUCINATIONS.some(pattern => pattern.test(clean))) return '';
  return clean.slice(0, 1000);
}
