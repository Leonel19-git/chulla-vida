/**
 * Grabación de una frase para el reconocimiento local: MediaRecorder + AnalyserNode (nivel real de voz y fin por
 * silencio) y decodificación a PCM mono de 16 kHz. El audio vive solo en memoria y se descarta tras transcribirlo.
 */
import { LOCAL_VOICE_SAMPLE_RATE } from './voice-model';

export const SILENCE_END_MS = 1200;
export const MAX_RECORD_MS = 15000;
/** Sin voz detectada en este tiempo, la frase termina como «no te escuché». */
export const NO_SPEECH_MS = 8000;
const LEVEL_INTERVAL_MS = 50;

/** iOS graba mp4/AAC; Chrome, Edge y Firefox, webm/opus. */
export function pickRecordingMime(isTypeSupported: ((type: string) => boolean) | undefined, appleMobile: boolean): string | undefined {
  if (!isTypeSupported) return undefined;
  const order = appleMobile ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return order.find(type => { try { return isTypeSupported(type); } catch { return false; } });
}

export type DetectorState = 'waiting' | 'speaking' | 'trailing' | 'done' | 'no-speech' | 'max';
/**
 * Decide cuándo terminó la frase a partir del volumen (RMS 0–1). Aprende el ruido de fondo los primeros 300 ms y
 * considera voz lo que lo supera con margen; tras haber voz, ~1,2 s de silencio cierran la frase.
 */
export class SilenceDetector {
  private floor = 0.004; private samples = 0; private speechSince = -1; private lastVoice = -1; private start = -1;
  heardSpeech = false;
  constructor(private options: { silenceMs?: number; maxMs?: number; noSpeechMs?: number; minSpeechMs?: number } = {}) {}
  threshold() { return Math.max(0.012, this.floor * 3); }
  push(rms: number, now: number): DetectorState {
    const { silenceMs = SILENCE_END_MS, maxMs = MAX_RECORD_MS, noSpeechMs = NO_SPEECH_MS, minSpeechMs = 180 } = this.options;
    if (this.start < 0) this.start = now;
    const elapsed = now - this.start;
    if (elapsed < 300 && !this.heardSpeech) { this.samples += 1; this.floor = Math.min(0.03, this.floor + (rms - this.floor) / this.samples); }
    const loud = rms > this.threshold();
    if (loud) { if (this.speechSince < 0) this.speechSince = now; this.lastVoice = now; if (now - this.speechSince >= minSpeechMs) this.heardSpeech = true; }
    else if (!this.heardSpeech) this.speechSince = -1;
    if (elapsed >= maxMs) return 'max';
    if (!this.heardSpeech) return elapsed >= noSpeechMs ? 'no-speech' : 'waiting';
    if (now - this.lastVoice >= silenceMs) return 'done';
    return loud ? 'speaking' : 'trailing';
  }
}

export interface RecordingResult { blob: Blob | null; heardSpeech: boolean; reason: 'done' | 'no-speech' | 'max' | 'manual' | 'cancelled' }
export interface Recording { /** «Listo»: termina y transcribe lo grabado. */ finish(): void; /** Detener: descarta lo grabado. */ cancel(): void; done: Promise<RecordingResult> }
interface RecorderLike { state: string; mimeType?: string; start(timeslice?: number): void; stop(): void; ondataavailable: ((event: { data: Blob }) => void) | null; onstop: (() => void) | null; onerror?: ((event: unknown) => void) | null }
type RecorderConstructor = new (stream: MediaStream, options?: { mimeType?: string; audioBitsPerSecond?: number }) => RecorderLike;

/** Records one phrase from `stream`. `onLevel` receives 0–1 roughly every 50 ms (for the live meter). */
export function recordPhrase(stream: MediaStream, context: AudioContext, options: { onLevel?: (level: number) => void; appleMobile?: boolean; Recorder?: RecorderConstructor; now?: () => number } = {}): Recording {
  const Recorder = options.Recorder ?? (globalThis as unknown as { MediaRecorder: RecorderConstructor & { isTypeSupported?: (type: string) => boolean } }).MediaRecorder;
  const mimeType = pickRecordingMime((Recorder as unknown as { isTypeSupported?: (type: string) => boolean }).isTypeSupported?.bind(Recorder), Boolean(options.appleMobile));
  const recorder = new Recorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined);
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser(); analyser.fftSize = 1024; source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  const detector = new SilenceDetector();
  const now = options.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const chunks: Blob[] = [];
  let reason: RecordingResult['reason'] = 'done';
  let settled = false;
  let resolveDone: (result: RecordingResult) => void = () => undefined;
  const done = new Promise<RecordingResult>(resolve => { resolveDone = resolve; });
  const cleanup = () => { window.clearInterval(timer); try { source.disconnect(); } catch { /* already disconnected */ } };
  const finishWith = (why: RecordingResult['reason']) => {
    if (settled) return; settled = true; reason = why; cleanup(); options.onLevel?.(0);
    if (recorder.state !== 'inactive') { try { recorder.stop(); return; } catch { /* fall through */ } }
    resolveDone({ blob: why === 'cancelled' ? null : chunks.length ? new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }) : null, heardSpeech: detector.heardSpeech, reason });
  };
  recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
  recorder.onstop = () => { resolveDone({ blob: reason === 'cancelled' || !chunks.length ? null : new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }), heardSpeech: detector.heardSpeech, reason }); };
  recorder.onerror = () => { if (!settled) { settled = true; reason = 'cancelled'; cleanup(); } resolveDone({ blob: null, heardSpeech: false, reason: 'cancelled' }); };
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0; for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    options.onLevel?.(Math.min(1, rms * 9));
    const state = detector.push(rms, now());
    if (state === 'done' || state === 'no-speech' || state === 'max') finishWith(state);
  }, LEVEL_INTERVAL_MS);
  // A timeslice makes every browser hand over data regularly (iOS sometimes drops a single final chunk).
  recorder.start(250);
  return { finish: () => finishWith('manual'), cancel: () => finishWith('cancelled'), done };
}

/** Downmixes to mono and resamples linearly to 16 kHz (averaging when downsampling, a cheap low-pass). */
export function toMono16k(channels: readonly Float32Array[], sampleRate: number, target = LOCAL_VOICE_SAMPLE_RATE): Float32Array {
  if (!channels.length) return new Float32Array(0);
  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (const channel of channels) for (let i = 0; i < length; i += 1) mono[i] += channel[i] / channels.length;
  if (sampleRate === target) return mono;
  const ratio = sampleRate / target;
  const out = new Float32Array(Math.floor(length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    const from = i * ratio; const to = Math.min(length, from + ratio);
    if (ratio > 1) { let sum = 0; let count = 0; for (let j = Math.floor(from); j < to; j += 1) { sum += mono[j]; count += 1; } out[i] = count ? sum / count : 0; }
    else { const left = Math.floor(from); const fraction = from - left; out[i] = mono[left] * (1 - fraction) + (mono[left + 1] ?? mono[left]) * fraction; }
  }
  return out;
}

/** Decodes the recording (webm/opus or mp4/aac) with the page's AudioContext and returns 16 kHz mono PCM. */
export async function decodeRecording(blob: Blob, context: BaseAudioContext): Promise<Float32Array> {
  const data = await blob.arrayBuffer();
  const audio = await new Promise<AudioBuffer>((resolve, reject) => {
    // Old Safari only supports the callback form of decodeAudioData.
    const result = context.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    result?.then?.(resolve, reject);
  });
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  return toMono16k(channels, audio.sampleRate);
}
