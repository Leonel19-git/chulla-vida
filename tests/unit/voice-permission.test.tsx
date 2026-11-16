// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MijinAssistant } from '../../src/features/assistant/MijinAssistant';
import { microphonePermission, permissionPromptMessage, requestMicrophone, voiceDebug } from '../../src/features/assistant/voice-tools';
import { START_WATCHDOG_MS } from '../../src/features/assistant/speech';

vi.mock('../../src/components/chulla/Dialog', () => ({
  Dialog: ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => <section role="dialog" aria-label={title}><button onClick={onClose}>Cerrar prueba</button>{children}</section>,
}));

const start = vi.fn(); const abort = vi.fn(); const stop = vi.fn();
const synthesis = { speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), paused: false, speaking: false, getVoices: vi.fn(() => [{ lang: 'es-ES', name: 'Microsoft Helena - Spanish (Spain)', localService: true }, { lang: 'es-US', name: 'Google español de Estados Unidos', localService: false }]), addEventListener: vi.fn(), removeEventListener: vi.fn() };
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onresult: ((event: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((event: unknown) => void) | null = null;
  onstart: (() => void) | null = null; onaudiostart: (() => void) | null = null;
  start = start; abort = abort; stop = stop;
  constructor() { FakeRecognition.instances.push(this); }
}
class FakeUtterance { text: string; lang = ''; rate = 1; voice: { name: string } | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
const last = () => FakeRecognition.instances[FakeRecognition.instances.length - 1];
const trackStop = vi.fn();
let getUserMedia = vi.fn(async (_constraints: MediaStreamConstraints) => ({ getTracks: () => [{ stop: trackStop }] }));
const setMedia = (value: unknown) => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value });
const deny = (name: string) => { getUserMedia = vi.fn(async () => { throw Object.assign(new Error(name), { name }); }); setMedia({ getUserMedia }); };

function openPanel() { fireEvent.click(screen.getByRole('button', { name: 'Habla con MIJIN, tu pana de aventuras' })); }
async function tapMic() { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hablar con MIJIN' })); await vi.advanceTimersByTimeAsync(0); }); }
const emit = (callback: () => void) => act(() => { callback(); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('SpeechRecognition', FakeRecognition); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance); vi.stubGlobal('speechSynthesis', synthesis);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] })); setMedia({ getUserMedia });
  FakeRecognition.instances = []; [start, abort, stop, trackStop, synthesis.speak, synthesis.cancel].forEach(mock => mock.mockClear());
  window.sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as unknown as { __mijinVoiceDebug?: boolean }).__mijinVoiceDebug; delete (navigator as unknown as { permissions?: unknown }).permissions; });

describe('MIJIN pide el micrófono de forma explícita y nunca se queda callado', () => {
  it('permiso concedido → escucha → transcripción en vivo → respuesta escrita y hablada', async () => {
    render(<MijinAssistant />); openPanel();
    expect(getUserMedia).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
    await tapMic();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true }); expect(trackStop).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1); expect(last().lang).toBe('es-EC'); expect(last().interimResults).toBe(true);
    expect(screen.getAllByText('Encendiendo el micrófono…').length).toBeGreaterThan(0);
    emit(() => last().onstart?.());
    expect(screen.getByText('Escuchando…')).toBeInTheDocument(); expect(screen.getByText('Habla ahora…')).toBeInTheDocument();
    emit(() => last().onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'Quiero conocer Sara' }], { isFinal: false })] }));
    expect(screen.getByText('«Quiero conocer Sara»')).toBeInTheDocument(); expect(synthesis.speak).not.toHaveBeenCalled();
    emit(() => last().onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'Quiero conocer Saraguro' }], { isFinal: true })] }));
    expect(screen.getByText(/Saraguro Ancestral:/i)).toBeInTheDocument();
    const said = synthesis.speak.mock.calls.map(call => call[0] as FakeUtterance);
    expect(said.length).toBeGreaterThan(0); said.forEach(utterance => expect(utterance.voice?.name).toBe('Google español de Estados Unidos'));
    expect(screen.getByText(/Voz del navegador: Google español de Estados Unidos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Detener', exact: true })); expect(synthesis.cancel).toHaveBeenCalled();
    // A second turn does not ask getUserMedia again in the same conversation.
    await tapMic(); expect(getUserMedia).toHaveBeenCalledTimes(1); expect(start).toHaveBeenCalledTimes(2);
  });
  it('mientras el navegador muestra su aviso, dice dónde pulsar Permitir', async () => {
    let grant: (value: unknown) => void = () => undefined;
    getUserMedia = vi.fn(() => new Promise(resolve => { grant = resolve; })) as typeof getUserMedia; setMedia({ getUserMedia });
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => ({ state: 'prompt' })) } });
    render(<MijinAssistant />); openPanel(); await tapMic();
    expect(screen.getByText(/te pide permiso .*pulsa Permitir/)).toBeInTheDocument(); expect(start).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Detener micrófono' })).toBeInTheDocument();
    await act(async () => { grant({ getTracks: () => [{ stop: trackStop }] }); await vi.advanceTimersByTimeAsync(0); });
    expect(trackStop).toHaveBeenCalled(); expect(start).toHaveBeenCalledTimes(1);
  });
  it('cancelar durante el aviso del navegador no enciende el reconocimiento después', async () => {
    let grant: (value: unknown) => void = () => undefined;
    getUserMedia = vi.fn(() => new Promise(resolve => { grant = resolve; })) as typeof getUserMedia; setMedia({ getUserMedia });
    render(<MijinAssistant />); openPanel(); await tapMic();
    fireEvent.click(screen.getByRole('button', { name: 'Detener micrófono' }));
    await act(async () => { grant({ getTracks: () => [{ stop: trackStop }] }); await vi.advanceTimersByTimeAsync(0); });
    expect(trackStop).toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
  });
  it('permiso denegado → pasos del candado y botón Reintentar que vuelve a pedirlo', async () => {
    deny('NotAllowedError'); render(<MijinAssistant />); openPanel(); await tapMic();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('bloqueado'); expect(alert).toHaveTextContent('candado'); expect(alert).toHaveTextContent('«Micrófono»'); expect(alert).toHaveTextContent('«Permitir»');
    expect(start).not.toHaveBeenCalled();
    getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] })); setMedia({ getUserMedia });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await vi.advanceTimersByTimeAsync(0); });
    expect(getUserMedia).toHaveBeenCalledTimes(1); expect(start).toHaveBeenCalledTimes(1); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each([
    ['NotFoundError', /No encontré un micrófono/], ['NotReadableError', /Otra aplicación está usando el micrófono/], ['TypeError', /No pude encender el micrófono/],
  ])('getUserMedia %s se explica con un mensaje claro', async (name, message) => {
    deny(name); render(<MijinAssistant />); openPanel(); await tapMic();
    expect(screen.getByRole('alert')).toHaveTextContent(message); expect(start).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeEnabled();
  });
  it('sin contexto seguro no intenta el micrófono', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    render(<MijinAssistant />); openPanel(); await tapMic();
    expect(screen.getByRole('alert')).toHaveTextContent(/página segura \(https\)/); expect(getUserMedia).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  });
  it("'end' sin resultado ni error → «No te escuché» con Reintentar, no vuelve en silencio", async () => {
    render(<MijinAssistant />); openPanel(); await tapMic(); emit(() => last().onstart?.());
    emit(() => last().onend?.());
    expect(screen.getByRole('alert')).toHaveTextContent('No te escuché. ¿Hablamos de nuevo?');
    expect(screen.getByText('Probemos de nuevo.')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(synthesis.speak).not.toHaveBeenCalled();
  });
  it('sin evento start en 2,5 s no prueba otras variantes: explica que el reconocimiento no respondió', async () => {
    render(<MijinAssistant />); openPanel(); await tapMic();
    expect(last().lang).toBe('es-EC');
    await act(async () => { await vi.advanceTimersByTimeAsync(START_WATCHDOG_MS); });
    expect(FakeRecognition.instances).toHaveLength(1); expect(abort).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('El reconocimiento de voz del navegador no respondió; escríbeme abajo');
    expect(screen.getByRole('alert')).toHaveTextContent('Código del navegador: engine-silent');
    expect(screen.getByRole('button', { name: 'Hablar con MIJIN' })).toBeEnabled();
  });
  it('si arranca a tiempo, el vigilante no interrumpe la escucha', async () => {
    render(<MijinAssistant />); openPanel(); await tapMic(); emit(() => last().onaudiostart?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(START_WATCHDOG_MS * 2); });
    expect(FakeRecognition.instances).toHaveLength(1); expect(abort).not.toHaveBeenCalled(); expect(screen.getByText('Escuchando…')).toBeInTheDocument();
  });
  it('si el motor nunca avisa el final tras el tope de escucha, cierra el turno con un mensaje', async () => {
    render(<MijinAssistant />); openPanel(); await tapMic(); emit(() => last().onstart?.());
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); }); expect(stop).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.getByRole('alert')).toHaveTextContent('No te escuché');
  });
  it('el registro de depuración es opcional y nunca incluye lo hablado', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    render(<MijinAssistant />); openPanel(); await tapMic(); expect(debug).not.toHaveBeenCalled();
    (window as unknown as { __mijinVoiceDebug?: boolean }).__mijinVoiceDebug = true;
    fireEvent.click(screen.getByRole('button', { name: 'Detener micrófono' }));
    await tapMic(); emit(() => last().onstart?.());
    emit(() => last().onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'Mi secreto es Saraguro' }], { isFinal: true })] }));
    expect(debug).toHaveBeenCalled();
    const logged = JSON.stringify(debug.mock.calls);
    expect(logged).toContain('start'); expect(logged).toContain('result'); expect(logged).not.toMatch(/secreto/i);
  });
});

describe('utilidades de permiso de micrófono', () => {
  it('requestMicrophone suelta las pistas y clasifica cada resultado', async () => {
    const stopTrack = vi.fn();
    await expect(requestMicrophone({ secure: true, mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }] }) as unknown as MediaStream } })).resolves.toBe('granted');
    expect(stopTrack).toHaveBeenCalledTimes(2);
    const failing = (name: string) => ({ secure: true, mediaDevices: { getUserMedia: async () => { throw Object.assign(new Error(name), { name }); } } });
    await expect(requestMicrophone(failing('NotAllowedError'))).resolves.toBe('denied');
    await expect(requestMicrophone(failing('NotFoundError'))).resolves.toBe('no-device');
    await expect(requestMicrophone(failing('NotReadableError'))).resolves.toBe('busy');
    await expect(requestMicrophone(failing('Weird'))).resolves.toBe('error');
    await expect(requestMicrophone({ secure: false })).resolves.toBe('insecure');
    await expect(requestMicrophone({ secure: true, mediaDevices: undefined })).resolves.toBe('unavailable');
  });
  it('lee el estado del permiso sin pedirlo y tolera navegadores sin Permissions API', async () => {
    await expect(microphonePermission({ query: async () => ({ state: 'denied' }) as PermissionStatus })).resolves.toBe('denied');
    await expect(microphonePermission({ query: async () => { throw new TypeError('microphone'); } })).resolves.toBe('unknown');
    await expect(microphonePermission(undefined)).resolves.toBe('unknown');
  });
  it('el aviso nombra el navegador y dónde pulsar Permitir', () => {
    expect(permissionPromptMessage('Mozilla/5.0 Chrome/131.0 Safari/537.36', false)).toBe('Chrome te pide permiso arriba, junto a la barra de direcciones: pulsa Permitir.');
    expect(permissionPromptMessage('Mozilla/5.0 Chrome/131.0 Edg/131.0', false)).toMatch(/^Edge/);
    expect(permissionPromptMessage('Mozilla/5.0 Firefox/130.0', true)).toBe('Tu navegador te pide permiso en un aviso de la pantalla: pulsa Permitir.');
  });
  it('voiceDebug solo escribe cuando se activa a mano', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    voiceDebug('start'); expect(debug).not.toHaveBeenCalled();
    (window as unknown as { __mijinVoiceDebug?: boolean }).__mijinVoiceDebug = true; voiceDebug('start', { lang: 'es-EC' });
    expect(debug).toHaveBeenCalledWith('[MIJIN voz] start', 'lang=es-EC');
    voiceDebug('error', { code: 'network', message: 'Network down', lang: 'es-EC' });
    expect(debug).toHaveBeenLastCalledWith('[MIJIN voz] error', 'code=network message="Network down" lang=es-EC');
    expect(JSON.stringify(debug.mock.calls)).not.toContain('[object Object]');
  });
});
