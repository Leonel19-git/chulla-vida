/**
 * Cliente del worker de transcripción local. Un solo worker por pestaña: el modelo queda cargado entre turnos y
 * entre aperturas del panel. El audio se transfiere al worker y no sale del dispositivo.
 */
export interface PrepareProgress { loaded: number; total: number; stage: 'download' | 'engine' }
export interface LocalTranscriber {
  prepare(onProgress?: (progress: PrepareProgress) => void): Promise<void>;
  transcribe(audio: Float32Array): Promise<string>;
  /** Detiene también las descargas y el cálculo pendientes; conserva los archivos completos en caché. */
  cancel(): void;
}
export class LocalVoiceError extends Error {
  constructor(message: string, readonly stage: string) { super(message); this.name = 'LocalVoiceError'; }
}
type Outbound = { type: 'progress'; loaded: number; total: number } | { type: 'stage'; stage: 'engine' } | { type: 'ready' } | { type: 'result'; id: number; text: string } | { type: 'error'; id?: number; stage: string; message: string };

let shared: LocalTranscriber | null = null;
export function getLocalTranscriber(): LocalTranscriber {
  shared ??= createWorkerTranscriber(() => new Worker(new URL('./asr.worker.ts', import.meta.url), { type: 'module', name: 'mijin-voz' }));
  return shared;
}

export function createWorkerTranscriber(spawn: () => Worker): LocalTranscriber {
  let worker: Worker | null = null;
  let preparing: Promise<void> | null = null;
  let progressListener: ((progress: PrepareProgress) => void) | undefined;
  let nextId = 1;
  const pending = new Map<number, { resolve: (text: string) => void; reject: (error: Error) => void }>();
  let prepareSettle: { resolve: () => void; reject: (error: Error) => void } | null = null;
  const reset = (error: Error) => {
    prepareSettle?.reject(error); prepareSettle = null; preparing = null;
    pending.forEach(item => item.reject(error)); pending.clear();
    progressListener = undefined;
    if (worker) { worker.onmessage = null; worker.onerror = null; }
    try { worker?.terminate(); } catch { /* already gone */ }
    worker = null;
  };
  const ensureWorker = () => {
    if (worker) return worker;
    const created = spawn();
    created.onmessage = (event: MessageEvent<Outbound>) => {
      const message = event.data;
      if (message.type === 'progress') progressListener?.({ loaded: message.loaded, total: message.total, stage: 'download' });
      else if (message.type === 'stage') progressListener?.({ loaded: 1, total: 1, stage: 'engine' });
      else if (message.type === 'ready') { prepareSettle?.resolve(); prepareSettle = null; }
      else if (message.type === 'result') { pending.get(message.id)?.resolve(message.text); pending.delete(message.id); }
      else if (message.type === 'error') {
        const error = new LocalVoiceError(message.message, message.stage);
        if (message.id !== undefined) { pending.get(message.id)?.reject(error); pending.delete(message.id); }
        else reset(error);
      }
    };
    created.onerror = event => { event.preventDefault?.(); reset(new LocalVoiceError(event.message || 'El motor de voz local se detuvo.', 'worker')); };
    worker = created;
    return created;
  };
  return {
    prepare(onProgress) {
      progressListener = onProgress;
      if (preparing) return preparing;
      preparing = new Promise<void>((resolve, reject) => { prepareSettle = { resolve, reject }; });
      const result = preparing;
      try { ensureWorker().postMessage({ type: 'prepare' }); }
      catch { reset(new LocalVoiceError('No pude iniciar el motor de voz.', 'worker')); }
      return result;
    },
    transcribe(audio) {
      const id = nextId++;
      return new Promise<string>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        try { ensureWorker().postMessage({ type: 'transcribe', id, audio }, [audio.buffer]); }
        catch { reset(new LocalVoiceError('No pude iniciar la transcripción.', 'worker')); }
      });
    },
    cancel() {
      if (prepareSettle || pending.size) reset(new LocalVoiceError('Voz cancelada.', 'cancelled'));
    },
  };
}
