// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { chunkSpeech, classifyRecognitionError, loadBestVoices, loadVoices, markVoiceNoticeSeen, pickSpanishVoice, readVoiceNoticeSeen, recognitionMessages } from '../../src/features/assistant/speech';

describe('voz de MIJIN: utilidades del navegador', () => {
  it('prefiere es-EC, luego es-419, es-MX, es-US, es-ES y nunca otra lengua', () => {
    const voice = (lang: string, name = lang) => ({ lang, name });
    expect(pickSpanishVoice([voice('en-US'), voice('es-ES'), voice('es-EC')])?.lang).toBe('es-EC');
    expect(pickSpanishVoice([voice('es-ES'), voice('es_US')])?.lang).toBe('es_US');
    expect(pickSpanishVoice([voice('es-AR'), voice('es-ES')])?.lang).toBe('es-ES');
    expect(pickSpanishVoice([voice('es-AR')])?.lang).toBe('es-AR');
    expect(pickSpanishVoice([voice('en-GB'), voice('pt-BR')])).toBeNull();
  });
  it('prefiere es-US sobre es-MX y, dentro de una variante, la voz natural sobre la local antigua', () => {
    expect(pickSpanishVoice([{ lang: 'es-MX', name: 'Microsoft Sabina' }, { lang: 'es-US', name: 'Google español de Estados Unidos' }])?.lang).toBe('es-US');
    expect(pickSpanishVoice([{ lang: 'es-ES', name: 'Microsoft Helena - Spanish (Spain)', localService: true }, { lang: 'es-ES', name: 'Google español', localService: false }])?.name).toBe('Google español');
    expect(pickSpanishVoice([{ lang: 'es-ES', name: 'Microsoft Laura - Spanish (Spain)', localService: true }, { lang: 'es-ES', name: 'Voz genérica', localService: true }])?.name).toBe('Voz genérica');
    expect(pickSpanishVoice([{ lang: 'es-ES', name: 'Microsoft Laura - Spanish (Spain)', localService: true }])?.name).toMatch(/Laura/);
  });
  it('trocea respuestas largas por frases sin perder texto', () => {
    const text = 'Saraguro Ancestral: desde $45 por persona. '.repeat(12) + 'Confirma con el anfitrión antes de viajar.';
    const chunks = chunkSpeech(text, 120);
    expect(chunks.length).toBeGreaterThan(3);
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(120));
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' ').trim());
    expect(chunkSpeech('   ')).toEqual([]);
    expect(chunkSpeech('a'.repeat(450), 200).every(chunk => chunk.length <= 200)).toBe(true);
  });
  it('espera voiceschanged con un límite de tiempo', async () => {
    vi.useFakeTimers();
    const listeners: (() => void)[] = [];
    const synth = { getVoices: vi.fn(() => [] as SpeechSynthesisVoice[]), addEventListener: (_: 'voiceschanged', listener: () => void) => { listeners.push(listener); }, removeEventListener: vi.fn() };
    const pending = loadVoices(synth, 1000); vi.advanceTimersByTime(1000);
    await expect(pending).resolves.toEqual([]);
    vi.useRealTimers();
  });
  it('si solo hay voces de Windows, prefiere Laura (OneCore) a Helena (SAPI 5)', () => {
    const windows = [{ name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' }, { name: 'Microsoft Laura - Spanish (Spain)', lang: 'es-ES' }, { name: 'Microsoft Pablo - Spanish (Spain)', lang: 'es-ES' }];
    expect(pickSpanishVoice(windows)?.name).toBe('Microsoft Laura - Spanish (Spain)');
  });
  it('no arranca con una voz robótica si Chrome o Edge todavía están cargando una mejor', async () => {
    vi.useFakeTimers();
    const listeners: (() => void)[] = [];
    let list = [{ name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' }] as SpeechSynthesisVoice[];
    const synth = { getVoices: vi.fn(() => list), addEventListener: (_: 'voiceschanged', listener: () => void) => { listeners.push(listener); }, removeEventListener: vi.fn() };
    const pending = loadBestVoices(synth, 1500);
    list = [...list, { name: 'Google español de Estados Unidos', lang: 'es-US' } as SpeechSynthesisVoice];
    listeners.forEach(listener => listener());
    const voices = await pending;
    expect(pickSpanishVoice(voices)?.name).toBe('Google español de Estados Unidos');
    list = [{ name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES' }] as SpeechSynthesisVoice[];
    const alone = loadBestVoices(synth, 1500); vi.advanceTimersByTime(1500);
    expect((await alone).map(voice => voice.name)).toEqual(['Microsoft Helena - Spanish (Spain)']);
    vi.useRealTimers();
  });
  it('clasifica cada error de SpeechRecognition con un mensaje útil', () => {
    expect(classifyRecognitionError('not-allowed')).toBe('blocked'); expect(classifyRecognitionError('service-not-allowed')).toBe('service');
    expect(classifyRecognitionError('network')).toBe('network'); expect(classifyRecognitionError('no-speech')).toBe('no-speech');
    expect(classifyRecognitionError('audio-capture')).toBe('no-microphone'); expect(classifyRecognitionError('language-not-supported')).toBe('language');
    expect(classifyRecognitionError('bad-grammar')).toBe('other');
    expect(recognitionMessages.blocked).toMatch(/candado/);
  });
  it('recuerda el aviso por sesión y tolera un almacenamiento bloqueado', () => {
    window.sessionStorage.clear(); expect(readVoiceNoticeSeen()).toBe(false); markVoiceNoticeSeen(); expect(readVoiceNoticeSeen()).toBe(true);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readVoiceNoticeSeen()).toBe(false); spy.mockRestore();
  });
});
