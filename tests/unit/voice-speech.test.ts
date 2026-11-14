// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { chunkSpeech, classifyRecognitionError, loadVoices, markVoiceNoticeSeen, pickSpanishVoice, readVoiceNoticeSeen, recognitionMessages } from '../../src/features/assistant/speech';

describe('voz de MIJIN: utilidades del navegador', () => {
  it('prefiere es-EC, luego es-419, es-MX, es-US, es-ES y nunca otra lengua', () => {
    const voice = (lang: string, name = lang) => ({ lang, name });
    expect(pickSpanishVoice([voice('en-US'), voice('es-ES'), voice('es-EC')])?.lang).toBe('es-EC');
    expect(pickSpanishVoice([voice('es-ES'), voice('es_US')])?.lang).toBe('es_US');
    expect(pickSpanishVoice([voice('es-AR'), voice('es-ES')])?.lang).toBe('es-ES');
    expect(pickSpanishVoice([voice('es-AR')])?.lang).toBe('es-AR');
    expect(pickSpanishVoice([voice('en-GB'), voice('pt-BR')])).toBeNull();
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
  it('clasifica cada error de SpeechRecognition con un mensaje útil', () => {
    expect(classifyRecognitionError('not-allowed')).toBe('blocked'); expect(classifyRecognitionError('service-not-allowed')).toBe('blocked');
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
