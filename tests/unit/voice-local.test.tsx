// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MijinAssistant } from '../../src/features/assistant/MijinAssistant';
import { cleanTranscript, correctPlaceNames, ortVariant, phoneticKey, placeVocabulary } from '../../src/features/assistant/voice-model';
import { pickRecordingMime, SilenceDetector, toMono16k } from '../../src/features/assistant/recorder';
import { createWorkerTranscriber } from '../../src/features/assistant/local-asr';
import { isAppleMobile, pickSpanishVoice, preferredVoiceEngine, unlockSpeechSynthesis } from '../../src/features/assistant/speech';
import { voicePlaceNames } from '../../src/features/assistant/voice-tools';

const mocks = vi.hoisted(() => ({
  cached: true,
  prepare: vi.fn(async (onProgress?: (progress: { loaded: number; total: number; stage: 'download' | 'engine' }) => void) => { onProgress?.({ loaded: 50, total: 100, stage: 'download' }); }),
  transcribe: vi.fn(async (_audio: Float32Array) => ' Quiero conocer cuya vino.'),
  finish: vi.fn(), cancel: vi.fn(),
  outcome: { blob: new Blob(['audio'], { type: 'audio/webm' }) as Blob | null, heardSpeech: true, reason: 'done' as string },
  decode: vi.fn(async () => new Float32Array(16000)),
}));
vi.mock('../../src/components/chulla/Dialog', () => ({
  Dialog: ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <section role="dialog" aria-label={title}><button onClick={onClose}>Cerrar prueba</button>{children}</section>,
}));
vi.mock('../../src/features/assistant/local-asr', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/assistant/local-asr')>(), getLocalTranscriber: () => ({ prepare: mocks.prepare, transcribe: mocks.transcribe }) }));
vi.mock('../../src/features/assistant/recorder', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/features/assistant/recorder')>(),
  recordPhrase: vi.fn((_stream: unknown, _context: unknown, options: { onLevel?: (level: number) => void }) => { options.onLevel?.(0.6); return { finish: mocks.finish, cancel: mocks.cancel, done: Promise.resolve(mocks.outcome) }; }),
  decodeRecording: mocks.decode,
}));
vi.mock('../../src/features/assistant/voice-model', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/assistant/voice-model')>(), isLocalVoiceCached: vi.fn(async () => mocks.cached), localVoiceGaps: () => [] }));

const start = vi.fn(); const abort = vi.fn();
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onresult: ((event: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((event: unknown) => void) | null = null; onstart: (() => void) | null = null; onaudiostart: (() => void) | null = null;
  start = start; abort = abort; stop = vi.fn();
  constructor() { FakeRecognition.instances.push(this); }
}
class FakeUtterance { text: string; lang = ''; rate = 1; volume = 1; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; onstart: (() => void) | null = null; constructor(text: string) { this.text = text; } }
class FakeAudioContext { state = 'running'; resume = vi.fn(async () => undefined); close = vi.fn(async () => undefined); }
const synthesis = { speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), paused: false, speaking: false, getVoices: vi.fn(() => [{ lang: 'es-MX', name: 'Paulina' }]), addEventListener: vi.fn(), removeEventListener: vi.fn() };
const trackStop = vi.fn();
const getUserMedia = vi.fn(async (_constraints?: MediaStreamConstraints) => ({ getTracks: () => [{ stop: trackStop }] }));
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Habla con MIJIN, tu pana de aventuras' }));
const flush = async () => { for (let i = 0; i < 6; i += 1) await act(async () => { await Promise.resolve(); }); };

beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', FakeRecognition); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance); vi.stubGlobal('speechSynthesis', synthesis); vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  FakeRecognition.instances = []; [start, abort, trackStop, getUserMedia, synthesis.speak, synthesis.cancel, mocks.prepare, mocks.transcribe, mocks.finish, mocks.cancel, mocks.decode].forEach(mock => mock.mockClear());
  mocks.cached = true; mocks.outcome = { blob: new Blob(['audio'], { type: 'audio/webm' }), heardSpeech: true, reason: 'done' };
  window.sessionStorage.clear(); window.localStorage.clear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('MIJIN: voz en el dispositivo cuando el navegador falla', () => {
  it("Web Speech falla con 'network' → muestra el código, pasa sola a la voz local, transcribe y responde en voz alta", async () => {
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); await Promise.resolve(); });
    expect(start).toHaveBeenCalledTimes(1);
    act(() => { FakeRecognition.instances[0].onstart?.(); });
    act(() => { FakeRecognition.instances[0].onerror?.({ error: 'network', message: '' }); });
    await flush();
    expect(screen.getByRole('note')).toHaveTextContent('Código del navegador: network (sin conexión con el servicio de voz del navegador).');
    expect(mocks.prepare).toHaveBeenCalled(); expect(getUserMedia).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(mocks.transcribe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent('Quiero conocer Cuyabeno.'));
    expect(screen.getByText(/Tu voz se procesa en este dispositivo/)).toBeInTheDocument();
    expect(trackStop).toHaveBeenCalled();
    expect(synthesis.speak).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Corregir lo que entendí/ })).toBeInTheDocument();
    expect(window.localStorage.getItem('chullavida:mijin-voice-engine')).toBe('local');
  });
  it('si el reconocimiento del navegador nunca arranca, pasa a la voz local tras un solo intento (sin probar otras variantes)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<MijinAssistant />); open();
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); await Promise.resolve(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(2600); });
      await flush();
      expect(FakeRecognition.instances).toHaveLength(1);
      expect(screen.getByRole('note')).toHaveTextContent('Código del navegador: engine-silent');
      await waitFor(() => expect(mocks.transcribe).toHaveBeenCalledTimes(1));
    } finally { vi.useRealTimers(); }
  });
  it('en iPhone usa la voz local directo: nunca crea SpeechRecognition', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); });
    await flush();
    await waitFor(() => expect(mocks.transcribe).toHaveBeenCalled());
    expect(FakeRecognition.instances).toHaveLength(0); expect(start).not.toHaveBeenCalled();
    expect(getUserMedia.mock.calls[0]?.[0]).toMatchObject({ audio: { echoCancellation: true } });
  });
  it('la primera vez pide confirmar la descarga con su peso y muestra el avance', async () => {
    mocks.cached = false; let finishPrepare: () => void = () => undefined;
    mocks.prepare.mockImplementationOnce(onProgress => { onProgress?.({ loaded: 52428800, total: 104857600, stage: 'download' }); return new Promise<void>(resolve => { finishPrepare = resolve; }); });
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); });
    await flush();
    expect(screen.getByRole('group', { name: 'Descargar la voz para este dispositivo' })).toHaveTextContent(/unos \d+ MB, solo la primera vez/);
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(getUserMedia).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Descargar y hablar' })); });
    await flush();
    expect(screen.getByRole('progressbar', { name: 'Descarga de la voz para tu dispositivo' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('50 de 100 MB')).toBeInTheDocument();
    expect(screen.getByText(/Preparando voz en tu dispositivo… \(\d+ MB, solo la primera vez\)/)).toBeInTheDocument();
    await act(async () => { finishPrepare(); }); await flush();
    await waitFor(() => expect(mocks.transcribe).toHaveBeenCalled());
  });
  it('sin voz detectada explica el motivo y ofrece Reintentar; «Listo» corta la grabación', async () => {
    mocks.outcome = { blob: new Blob(['x']), heardSpeech: false, reason: 'no-speech' };
    window.localStorage.setItem('chullavida:mijin-voice-engine', 'local');
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); }); await flush();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/No escuché tu voz/); expect(alert).toHaveTextContent('local-no-speech');
    expect(mocks.transcribe).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
  it('una orden de navegación dicha en modo local no navega sola: deja el botón para confirmar', async () => {
    mocks.transcribe.mockResolvedValueOnce('Abre mi pasaporte.');
    window.localStorage.setItem('chullavida:mijin-voice-engine', 'local');
    const navigate = vi.fn(); window.addEventListener('cv3:passport', navigate);
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); }); await flush();
    await waitFor(() => expect(screen.getByRole('button', { name: /Mi pasaporte/ })).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Corregir lo que entendí/ }));
    expect(screen.getByLabelText('Consulta accesible para MIJIN')).toHaveValue('Abre mi pasaporte.');
    window.removeEventListener('cv3:passport', navigate);
  });
  it('«Listo» tocado al instante (menos de medio segundo de audio) no transcribe ni inventa una pregunta', async () => {
    mocks.outcome = { blob: new Blob(['x']), heardSpeech: false, reason: 'manual' };
    mocks.decode.mockResolvedValueOnce(new Float32Array(3200));
    window.localStorage.setItem('chullavida:mijin-voice-engine', 'local');
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); }); await flush();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('local-too-short'); expect(mocks.transcribe).not.toHaveBeenCalled();
  });
  it("'no-speech' del navegador también muestra el código y, sin voz local posible, solo los botones de siempre", async () => {
    render(<MijinAssistant />); open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); await Promise.resolve(); });
    act(() => { FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' }); });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Código del navegador: not-allowed (permiso de micrófono denegado).');
    expect(screen.queryByRole('button', { name: 'Usar voz en mi dispositivo' })).not.toBeInTheDocument();
  });
  it('cada botón de voz visible hace algo inmediato: Detener solo aparece cuando hay algo que detener', async () => {
    render(<MijinAssistant />); open();
    expect(screen.queryByRole('button', { name: 'Detener', exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta con voz' }));
    expect(screen.getByText(/No leeré en voz alta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Procesar mi voz en este dispositivo' }));
    expect(screen.getByText(/Usaré la voz en tu dispositivo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar el reconocimiento del navegador' })).toBeInTheDocument();
  });
});

describe('utilidades de la voz local', () => {
  it('corrige nombres de lugares que Whisper parte o escribe mal, sin tocar el resto', () => {
    const places = placeVocabulary([], voicePlaceNames());
    expect(correctPlaceNames('Quiero conocer cuya vino.', places)).toBe('Quiero conocer Cuyabeno.');
    expect(correctPlaceNames('quiero ir a saraguro', places)).toBe('quiero ir a Saraguro');
    expect(correctPlaceNames('Voy con mi perro.', places)).toBe('Voy con mi perro.');
    expect(correctPlaceNames('Salgo de quito con 20 dólares.', places)).toBe('Salgo de quito con 20 dólares.');
    expect(phoneticKey('Cuyabeno')).toBe(phoneticKey('cuya veno'));
  });
  it('descarta las alucinaciones típicas de Whisper en silencio', () => {
    expect(cleanTranscript(' Subtítulos realizados por la comunidad de Amara.org')).toBe('');
    expect(cleanTranscript('[Música]')).toBe(''); expect(cleanTranscript('  Hola   MIJIN ')).toBe('Hola MIJIN');
    expect(cleanTranscript(' y')).toBe(''); expect(cleanTranscript('¿Sí?')).toBe('¿Sí?');
  });
  it('elige el motor: iPhone, Safari y Firefox siempre local; Chrome primero el navegador salvo preferencia guardada', () => {
    expect(preferredVoiceEngine({ hasRecognition: true, userAgent: IPHONE })).toBe('local');
    expect(preferredVoiceEngine({ hasRecognition: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15' })).toBe('local');
    expect(preferredVoiceEngine({ hasRecognition: false, userAgent: 'Mozilla/5.0 Firefox/140.0' })).toBe('local');
    expect(preferredVoiceEngine({ hasRecognition: true, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36' })).toBe('browser');
    expect(preferredVoiceEngine({ hasRecognition: true, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36', stored: 'local' })).toBe('local');
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5)).toBe(true);
  });
  it('usa el mismo motor WASM que transformers: básico en Safari < 26 sin WebGPU', () => {
    expect(ortVariant(IPHONE, false)).toBe('plain');
    expect(ortVariant(IPHONE.replace(/18_5|18\.5/g, '26.1'), false)).toBe('asyncify');
    expect(ortVariant('Mozilla/5.0 Chrome/140.0 Safari/537.36', false)).toBe('asyncify');
  });
  it('detecta lo que falta para la voz local', async () => {
    const actual = await vi.importActual<typeof import('../../src/features/assistant/voice-model')>('../../src/features/assistant/voice-model');
    expect(actual.localVoiceGaps({})).toEqual(['media', 'recorder', 'audio', 'worker', 'wasm']);
  });
  it('graba mp4 en iPhone y webm/opus en el resto', () => {
    const supported = (types: string[]) => (type: string) => types.includes(type);
    expect(pickRecordingMime(supported(['audio/mp4', 'audio/webm']), true)).toBe('audio/mp4');
    expect(pickRecordingMime(supported(['audio/mp4', 'audio/webm;codecs=opus']), false)).toBe('audio/webm;codecs=opus');
    expect(pickRecordingMime(undefined, true)).toBeUndefined();
  });
  it('termina la frase tras ~1,2 s de silencio, y avisa si nunca hubo voz', () => {
    const detector = new SilenceDetector();
    let t = 0; const feed = (rms: number, ms: number) => { let state = ''; for (const end = t + ms; t < end; t += 50) state = detector.push(rms, t); return state; };
    expect(feed(0.002, 400)).toBe('waiting');
    expect(feed(0.08, 800)).toBe('speaking');
    expect(feed(0.002, 600)).toBe('trailing');
    expect(feed(0.002, 700)).toBe('done');
    const quiet = new SilenceDetector(); let q = 0; let state = '';
    for (; q <= 8000; q += 50) state = quiet.push(0.002, q);
    expect(state).toBe('no-speech'); expect(quiet.heardSpeech).toBe(false);
  });
  it('convierte a mono 16 kHz', () => {
    const left = new Float32Array(48000).fill(0.5); const right = new Float32Array(48000).fill(-0.5);
    const out = toMono16k([left, right], 48000);
    expect(out.length).toBe(16000); expect(Math.abs(out[100])).toBeLessThan(1e-6);
    expect(toMono16k([new Float32Array(8000).fill(0.25)], 8000).length).toBe(16000);
  });
  it('el cliente del worker informa el avance, resuelve la transcripción y transfiere el audio', async () => {
    const posted: unknown[] = [];
    const worker = { onmessage: null as ((event: MessageEvent) => void) | null, onerror: null, postMessage: vi.fn((message: unknown, transfer?: Transferable[]) => { posted.push({ message, transfer }); }), terminate: vi.fn() };
    const client = createWorkerTranscriber(() => worker as unknown as Worker);
    const progress = vi.fn();
    const ready = client.prepare(progress);
    worker.onmessage?.({ data: { type: 'progress', loaded: 10, total: 20 } } as MessageEvent);
    worker.onmessage?.({ data: { type: 'ready' } } as MessageEvent);
    await expect(ready).resolves.toBeUndefined();
    expect(progress).toHaveBeenCalledWith({ loaded: 10, total: 20, stage: 'download' });
    const audio = new Float32Array(4);
    const text = client.transcribe(audio);
    worker.onmessage?.({ data: { type: 'result', id: 1, text: 'hola' } } as MessageEvent);
    await expect(text).resolves.toBe('hola');
    expect((posted[1] as { transfer: unknown[] }).transfer).toEqual([audio.buffer]);
    const failing = client.transcribe(new Float32Array(2));
    worker.onmessage?.({ data: { type: 'error', id: 2, stage: 'transcribe', message: 'sin memoria' } } as MessageEvent);
    await expect(failing).rejects.toThrow('sin memoria');
  });
  it('en iPhone desbloquea la lectura con un enunciado silencioso dentro del toque; en Chrome no hace nada', () => {
    const speak = vi.fn(); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    expect(unlockSpeechSynthesis({ speak }, false)).toBe(false); expect(speak).not.toHaveBeenCalled();
    expect(unlockSpeechSynthesis({ speak }, true)).toBe(true);
    expect((speak.mock.calls[0][0] as FakeUtterance).volume).toBe(0);
  });
  it('en iOS prefiere Paulina o Mónica y nunca una voz de novedad', () => {
    expect(pickSpanishVoice([{ lang: 'es-MX', name: 'Eddy (español (México))' }, { lang: 'es-ES', name: 'Mónica' }])?.name).toBe('Mónica');
    expect(pickSpanishVoice([{ lang: 'es-MX', name: 'Grandma (español (México))' }, { lang: 'es-MX', name: 'Paulina' }])?.name).toBe('Paulina');
  });
});
