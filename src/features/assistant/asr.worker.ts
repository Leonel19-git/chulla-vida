/// <reference lib="webworker" />
/**
 * Web Worker de transcripción local de MIJIN. Todo ocurre en este dispositivo:
 * 1. «prepare»: descarga (solo la primera vez) el modelo y el runtime WASM desde /models y /ort de nuestro propio
 *    dominio, los guarda en Cache Storage y crea el pipeline de Whisper; informa el avance en bytes.
 * 2. «transcribe»: recibe audio PCM mono de 16 kHz y devuelve el texto en español. El audio no sale del worker.
 */
import { env, pipeline } from '@huggingface/transformers';
import { LOCAL_VOICE_CACHE, LOCAL_VOICE_MANIFEST, LOCAL_VOICE_MODEL, ortVariant, ortWasmPath, type OrtVariant } from './voice-model';

type Inbound = { type: 'prepare' } | { type: 'transcribe'; id: number; audio: Float32Array };
interface ManifestFile { path: string; bytes: number }
type Transcribe = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text?: string } | { text?: string }[]>;

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: unknown) => scope.postMessage(message);
let ready: Promise<Transcribe> | null = null;

/** Opens our Cache Storage; null where the browser does not offer it (some private modes). */
async function openCache(): Promise<Cache | null> {
  try { return typeof caches === 'undefined' ? null : await caches.open(LOCAL_VOICE_CACHE); } catch { return null; }
}

/** Downloads the files this browser needs (skipping cached ones) and reports overall progress in bytes. */
async function ensureFiles(cache: Cache | null, variant: OrtVariant): Promise<ArrayBuffer> {
  let manifest: { files: ManifestFile[] } | null = null;
  const cachedManifest = await cache?.match(LOCAL_VOICE_MANIFEST);
  try {
    const response = await fetch(LOCAL_VOICE_MANIFEST, { cache: 'no-cache' });
    if (response.ok) { manifest = await response.clone().json() as { files: ManifestFile[] }; await cache?.put(LOCAL_VOICE_MANIFEST, response); }
  } catch { /* offline: use the cached manifest below */ }
  if (!manifest && cachedManifest) manifest = await cachedManifest.json() as { files: ManifestFile[] };
  if (!manifest) throw Object.assign(new Error('No pude leer la lista de archivos de voz.'), { stage: 'manifest' });
  const wasm = ortWasmPath(variant);
  const wanted = manifest.files.map(file => ({ url: `/${file.path}`, bytes: file.bytes })).filter(file => file.url.startsWith('/models/') || file.url === wasm);
  const total = wanted.reduce((sum, file) => sum + file.bytes, 0);
  let loaded = 0;
  const report = () => post({ type: 'progress', loaded, total });
  let wasmBuffer: ArrayBuffer | null = null;
  for (const file of wanted) {
    const hit = await cache?.match(file.url);
    if (hit) {
      loaded += file.bytes; report();
      if (file.url === wasm) wasmBuffer = await hit.arrayBuffer();
      continue;
    }
    const response = await fetch(file.url);
    if (!response.ok || !response.body) throw Object.assign(new Error(`No pude descargar ${file.url.split('/').at(-1)} (${response.status}).`), { stage: 'download' });
    const reader = response.body.getReader();
    const parts: Uint8Array[] = []; let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); received += value.byteLength; loaded += value.byteLength; report();
    }
    const body = new Uint8Array(received); let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    loaded += Math.max(0, file.bytes - received);
    const headers = new Headers({ 'content-type': response.headers.get('content-type') ?? 'application/octet-stream', 'content-length': String(received) });
    try { await cache?.put(file.url, new Response(body, { headers })); } catch { /* quota exceeded: keep working in memory for this visit */ }
    if (file.url === wasm) wasmBuffer = body.buffer;
  }
  report();
  if (!wasmBuffer) throw Object.assign(new Error('Falta el motor WebAssembly de voz.'), { stage: 'download' });
  return wasmBuffer;
}

async function load(): Promise<Transcribe> {
  const cache = await openCache();
  const variant = ortVariant(navigator.userAgent, 'gpu' in navigator);
  const wasmBinary = await ensureFiles(cache, variant);
  post({ type: 'stage', stage: 'engine' });
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = '/models/';
  env.useWasmCache = false;
  env.useBrowserCache = false;
  if (cache) { env.useCustomCache = true; env.customCache = cache; }
  const wasm = env.backends.onnx.wasm;
  if (wasm) {
    // Same-origin runtime only (CSP «self»): the asyncify factory is embedded in the bundle; Safari < 26 uses the plain one.
    wasm.wasmPaths = variant === 'asyncify' ? { wasm: ortWasmPath(variant) } : { wasm: ortWasmPath(variant), mjs: '/ort/ort-wasm-simd-threaded.mjs' };
    wasm.wasmBinary = wasmBinary;
    wasm.numThreads = 1;
    wasm.proxy = false;
  }
  const asr = await pipeline('automatic-speech-recognition', LOCAL_VOICE_MODEL, { device: 'wasm', dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' } });
  return asr as unknown as Transcribe;
}

scope.onmessage = async (event: MessageEvent<Inbound>) => {
  const message = event.data;
  if (message.type === 'prepare') {
    ready ??= load();
    try { await ready; post({ type: 'ready' }); }
    catch (error) { ready = null; post({ type: 'error', stage: (error as { stage?: string }).stage ?? 'engine', message: error instanceof Error ? error.message : String(error) }); }
    return;
  }
  if (message.type === 'transcribe') {
    try {
      ready ??= load();
      const asr = await ready;
      const output = await asr(message.audio, { language: 'spanish', task: 'transcribe', return_timestamps: false, chunk_length_s: 30 });
      const text = Array.isArray(output) ? output.map(item => item.text ?? '').join(' ') : output.text ?? '';
      post({ type: 'result', id: message.id, text });
    } catch (error) {
      post({ type: 'error', id: message.id, stage: 'transcribe', message: error instanceof Error ? error.message : String(error) });
    }
  }
};
