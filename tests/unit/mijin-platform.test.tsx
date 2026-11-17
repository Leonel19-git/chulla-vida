// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MijinAssistant } from '../../src/features/assistant/MijinAssistant';
import { MIJIN_GREETING_KEY } from '../../src/features/assistant/VoiceExperience';
import { createWorkerTranscriber } from '../../src/features/assistant/local-asr';
import { VOICE_PREF_KEY } from '../../src/features/assistant/speech';

const local = vi.hoisted(() => ({ supported: false, cached: false, prepare: vi.fn(), transcribe: vi.fn(), cancel: vi.fn(), finish: vi.fn(), stopRecording: vi.fn(), done: Promise.resolve({ reason: 'cancelled' }) as Promise<unknown> }));
vi.mock('../../src/components/chulla/Dialog', () => ({ Dialog: ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => <section role="dialog"><button onClick={onClose}>Cerrar prueba</button>{children}</section> }));
vi.mock('../../src/features/assistant/voice-model', async original => ({ ...await original<typeof import('../../src/features/assistant/voice-model')>(), localVoiceGaps: () => local.supported ? [] : ['worker'], isLocalVoiceCached: async () => local.cached }));
vi.mock('../../src/features/assistant/local-asr', async original => ({ ...await original<typeof import('../../src/features/assistant/local-asr')>(), getLocalTranscriber: () => ({ prepare: local.prepare, transcribe: local.transcribe, cancel: local.cancel }) }));
vi.mock('../../src/features/assistant/recorder', async original => ({ ...await original<typeof import('../../src/features/assistant/recorder')>(), recordPhrase: () => ({ done: local.done, finish: local.finish, cancel: local.stopRecording }), decodeRecording: async () => new Float32Array(16000) }));

class Recognition {
  static instances: Recognition[] = [];
  onstart: (() => void) | null = null; onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: { resultIndex?: number; results: unknown[] }) => void) | null = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
}
class Utterance { text: string; voice: { name: string } | null = null; onend: (() => void) | null = null; constructor(text: string) { this.text = text; } }
class AudioContextMock { state = 'running'; resume = async () => undefined; close = async () => undefined; }
const availableVoices = [{ name: 'Microsoft Andrea Online (Natural)', lang: 'es-EC' }, { name: 'Microsoft Helena', lang: 'es-ES' }];
const synthesis = { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => availableVoices), addEventListener: vi.fn(), removeEventListener: vi.fn(), speaking: false };
const stopTrack = vi.fn();
const media = vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] }));
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Habla con MIJIN, tu pana de aventuras' }));
const mic = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); }); };
const last = () => Recognition.instances.at(-1)!;
const result = (text: string, isFinal = true) => Object.assign([{ transcript: text }], { isFinal });
const flush = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(0); }); };
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('SpeechRecognition', Recognition); vi.stubGlobal('SpeechSynthesisUtterance', Utterance); vi.stubGlobal('speechSynthesis', synthesis); vi.stubGlobal('AudioContext', AudioContextMock);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Windows Chrome/130.0');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: media } });
  Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { isActive: false } });
  Recognition.instances = []; vi.clearAllMocks(); media.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  local.supported = false; local.cached = false; local.prepare.mockResolvedValue(undefined); local.transcribe.mockResolvedValue('Quiero conocer Saraguro'); local.done = new Promise(() => undefined);
  synthesis.getVoices.mockReturnValue(availableVoices);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); Reflect.deleteProperty(navigator, 'userActivation'); });

describe('MIJIN: acciones, permisos y respuestas', () => {
  it('abrir y usar chips nunca pide micrófono ni descarga un modelo', () => {
    const network = vi.fn(); vi.stubGlobal('fetch', network); render(<MijinAssistant />); open();
    fireEvent.click(within(screen.getByRole('group', { name: 'Respuestas rápidas' })).getByRole('button', { name: 'Quito' }));
    expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent('¿Cuánto quieres gastar en total?');
    expect(media).not.toHaveBeenCalled(); expect(local.prepare).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  });
  it('permiso denegado explica cómo recuperarlo; Reintentar arranca una sola escucha', async () => {
    media.mockRejectedValueOnce(new DOMException('No', 'NotAllowedError'));
    render(<MijinAssistant />); open(); await mic();
    expect(screen.getByRole('alert')).toHaveTextContent(/permiso|candado/i); expect(Recognition.instances).toHaveLength(0);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); });
    expect(Recognition.instances).toHaveLength(1); expect(last().start).toHaveBeenCalledTimes(1); expect(stopTrack).toHaveBeenCalled();
  });
  it('el mismo botón termina la escucha y conserva el texto aunque el motor no emita end', async () => {
    render(<MijinAssistant />); open(); await mic();
    act(() => { last().onstart?.(); last().onresult?.({ results: [result('Quiero conocer Saraguro', false)] }); });
    const active = last();
    fireEvent.click(screen.getByRole('button', { name: 'Listo, terminé de hablar' }));
    expect(active.stop).toHaveBeenCalledTimes(1); expect(screen.queryByRole('button', { name: 'Detener', exact: true })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent(/Saraguro Ancestral/);
    expect(synthesis.speak).toHaveBeenCalled(); expect(active.onresult).toBeNull();
  });
  it('recompone todos los segmentos del resultado, también si resultIndex cambia', async () => {
    render(<MijinAssistant />); open(); await mic();
    act(() => { last().onstart?.(); last().onresult?.({ resultIndex: 1, results: [result('Quiero conocer', true), result('Saraguro', true)] }); });
    expect(screen.getByRole('region', { name: 'Subtítulos de la conversación' })).toHaveTextContent('Quiero conocer Saraguro');
  });
  it('si el constructor de reconocimiento falla deja una acción de recuperación', async () => {
    vi.stubGlobal('SpeechRecognition', class { constructor() { throw new Error('motor cerrado'); } });
    render(<MijinAssistant />); open(); await mic();
    expect(screen.getByRole('alert')).toHaveTextContent(/no respondió/);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
  it('saluda una vez por sesión y únicamente después de un gesto', async () => {
    render(<MijinAssistant />); act(() => { window.dispatchEvent(new Event('cv3:mijin')); }); await flush();
    expect(synthesis.speak).not.toHaveBeenCalled(); expect(sessionStorage.getItem(MIJIN_GREETING_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar prueba' }));
    Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { isActive: true } });
    open(); await flush(); expect(synthesis.speak).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar prueba' })); open(); await flush();
    expect(synthesis.speak).toHaveBeenCalledTimes(1); expect(sessionStorage.getItem(MIJIN_GREETING_KEY)).toBe('1');
  });
  it('selector solo ofrece voces existentes y reemplaza una preferencia retirada', () => {
    localStorage.setItem(VOICE_PREF_KEY, 'Voz que ya no existe'); render(<MijinAssistant />); open();
    const picker = screen.getByLabelText('Voz de MIJIN');
    expect(picker).toHaveValue(availableVoices[0].name);
    expect(within(picker).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByText(/trae voces naturales/)).not.toBeInTheDocument();
    fireEvent.change(picker, { target: { value: availableVoices[1].name } });
    expect(localStorage.getItem(VOICE_PREF_KEY)).toBe(availableVoices[1].name);
    expect(synthesis.speak.mock.calls.at(-1)?.[0].voice.name).toBe(availableVoices[1].name);
  });
  it('silenciar antes de cargar las voces impide una lectura tardía', async () => {
    synthesis.getVoices.mockReturnValue([]); render(<MijinAssistant />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar respuesta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Respuesta con voz' }));
    synthesis.getVoices.mockReturnValue(availableVoices);
    await act(async () => { synthesis.addEventListener.mock.calls.forEach(call => (call[1] as () => void)()); await vi.advanceTimersByTimeAsync(1500); });
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
});

describe('voz local: descarga opcional, progreso y cancelación real', () => {
  beforeEach(() => { local.supported = true; localStorage.setItem('chullavida:mijin-voice-engine', 'local'); });
  it('pide opt-in antes de preparar; cancelar corta el proceso y bloquea el permiso tardío', async () => {
    let complete!: () => void;
    local.prepare.mockImplementation(onProgress => { onProgress({ stage: 'download', loaded: 50, total: 100 }); return new Promise<void>(resolve => { complete = resolve; }); });
    render(<MijinAssistant />); open(); await mic();
    expect(local.prepare).not.toHaveBeenCalled(); expect(media).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Descargar la voz para este dispositivo' })).toHaveTextContent(/MB/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Descargar y hablar' })); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar descarga' }));
    expect(local.cancel).toHaveBeenCalledTimes(1);
    await act(async () => { complete(); });
    expect(media).not.toHaveBeenCalled(); expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeEnabled();
  });
  it('caché existente → permiso → grabación → transcripción; cancelar descarta la respuesta tardía', async () => {
    local.cached = true; let finishRecording!: (outcome: unknown) => void, transcribed!: (text: string) => void;
    local.done = new Promise(resolve => { finishRecording = resolve; });
    local.finish.mockImplementation(() => finishRecording({ reason: 'manual', heardSpeech: true, blob: new Blob(['audio']) }));
    local.transcribe.mockImplementation(() => new Promise<string>(resolve => { transcribed = resolve; }));
    render(<MijinAssistant />); open(); await mic();
    expect(local.prepare).toHaveBeenCalledTimes(1); expect(media).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Listo, terminé de hablar' })); });
    expect(stopTrack).toHaveBeenCalled(); expect(local.transcribe).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar y volver' }));
    expect(local.cancel).toHaveBeenCalled();
    await act(async () => { transcribed('Quiero conocer Saraguro'); });
    expect(synthesis.speak).not.toHaveBeenCalled(); expect(screen.queryByText(/Saraguro Ancestral:/)).not.toBeInTheDocument();
  });
  it('cancelar el cliente termina el worker, rechaza lo pendiente y permite reintentar', async () => {
    const workers: { onmessage: ((event: MessageEvent) => void) | null; onerror: unknown; postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }[] = [];
    const spawn = () => { const worker = { onmessage: null, onerror: null, postMessage: vi.fn(), terminate: vi.fn() }; workers.push(worker); return worker as unknown as Worker; };
    const client = createWorkerTranscriber(spawn), progress = vi.fn();
    const first = client.prepare(progress); const cancelled = expect(first).rejects.toMatchObject({ stage: 'cancelled' });
    client.cancel(); await cancelled;
    expect(workers[0].terminate).toHaveBeenCalledTimes(1); expect(workers[0].onmessage).toBeNull();
    const ready = client.prepare(progress); expect(workers).toHaveLength(2);
    workers[1].onmessage?.({ data: { type: 'ready' } } as MessageEvent); await ready;
    client.cancel(); expect(workers[1].terminate).not.toHaveBeenCalled();
    const text = client.transcribe(new Float32Array(16000)); const aborted = expect(text).rejects.toMatchObject({ stage: 'cancelled' });
    client.cancel(); await aborted; expect(workers[1].terminate).toHaveBeenCalledTimes(1);
  });
});
