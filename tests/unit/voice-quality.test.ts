// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeVoice, pickSpanishVoice, rankSpanishVoices, readVoicePreference, storeVoicePreference, toSpeakable, VOICE_PREF_KEY, voiceTier, voiceTip } from '../../src/features/assistant/speech';

const v = (name: string, lang: string) => ({ name, lang });
const WINDOWS_EDGE = [
  v('Microsoft Helena - Spanish (Spain)', 'es-ES'), v('Microsoft Laura - Spanish (Spain)', 'es-ES'), v('Microsoft Pablo - Spanish (Spain)', 'es-ES'),
  v('Microsoft Elvira Online (Natural) - Spanish (Spain)', 'es-ES'), v('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX'),
  v('Microsoft Andrea Online (Natural) - Spanish (Ecuador)', 'es-EC'), v('Microsoft Luis Online (Natural) - Spanish (Ecuador)', 'es-EC'),
  v('Microsoft Paloma Online (Natural) - Spanish (United States)', 'es-US'), v('Microsoft Zira - English (United States)', 'en-US'),
];
const CHROME = [v('Microsoft Helena - Spanish (Spain)', 'es-ES'), v('Google español', 'es-ES'), v('Google español de Estados Unidos', 'es-US')];
const IPHONE = [v('Mónica', 'es-ES'), v('Paulina', 'es-MX'), v('Paulina (Mejorada)', 'es-MX'), v('Eddy (español (México))', 'es-MX'), v('Grandma (español (España))', 'es-ES'), v('Jorge', 'es-ES')];

afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); });

describe('MIJIN elige una voz agradable', () => {
  it('en Edge prefiere las voces naturales de Ecuador y deja al final las de escritorio robóticas', () => {
    const ranked = rankSpanishVoices(WINDOWS_EDGE).map(voice => voice.name);
    expect(ranked[0]).toMatch(/Andrea Online \(Natural\)/);
    expect(ranked[1]).toMatch(/Luis Online/);
    expect(ranked.slice(-3).every(name => /Helena|Laura|Pablo/.test(name))).toBe(true);
    expect(ranked.some(name => /Zira/.test(name))).toBe(false);
  });
  it('en Chrome usa la voz de Google antes que Microsoft Helena', () => {
    expect(pickSpanishVoice(CHROME)?.name).toBe('Google español de Estados Unidos');
  });
  it('en iPhone prefiere la voz Mejorada y nunca las voces de novedad', () => {
    const ranked = rankSpanishVoices(IPHONE).map(voice => voice.name);
    expect(ranked[0]).toBe('Paulina (Mejorada)');
    expect(ranked).not.toContain('Eddy (español (México))'); expect(ranked).not.toContain('Grandma (español (España))');
    expect(voiceTier('Mónica')).toBeLessThan(voiceTier('Microsoft Helena - Spanish (Spain)'));
  });
  it('respeta la voz elegida mientras siga instalada', () => {
    expect(pickSpanishVoice(WINDOWS_EDGE, 'Microsoft Dalia Online (Natural) - Spanish (Mexico)')?.name).toMatch(/Dalia/);
    expect(pickSpanishVoice(WINDOWS_EDGE, 'Voz que ya no existe')?.name).toMatch(/Andrea/);
  });
  it('describe cada voz en pocas palabras para el selector', () => {
    expect(describeVoice(WINDOWS_EDGE[5])).toBe('Andrea · Ecuador · natural');
    expect(describeVoice(CHROME[2])).toBe('Google · EE. UU. · buena');
    expect(describeVoice(WINDOWS_EDGE[0])).toBe('Helena · España · robótica');
  });
  it('si solo hay voces robóticas sugiere cómo conseguir una mejor', () => {
    const robotic = WINDOWS_EDGE.slice(0, 3);
    expect(voiceTip(robotic, 'windows', 'Mozilla/5.0 Chrome/130')).toMatch(/Edge/);
    expect(voiceTip(robotic, 'windows', 'Mozilla/5.0 Chrome/130 Edg/130')).toMatch(/internet/);
    expect(voiceTip(WINDOWS_EDGE, 'windows')).toBeNull();
    expect(voiceTip([v('Mónica', 'es-ES')], 'apple')).toMatch(/Ajustes → Accesibilidad → Contenido leído → Voces/);
    expect(voiceTip([v('Paulina (Mejorada)', 'es-MX')], 'apple')).toBeNull();
  });
  it('guarda la preferencia de voz (no es un dato sensible) y tolera el modo privado', () => {
    storeVoicePreference('Microsoft Dalia Online (Natural) - Spanish (Mexico)');
    expect(window.localStorage.getItem(VOICE_PREF_KEY)).toMatch(/Dalia/); expect(readVoicePreference()).toMatch(/Dalia/);
    storeVoicePreference(null); expect(readVoicePreference()).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(readVoicePreference()).toBeNull();
  });
});

describe('lo que MIJIN dice en voz alta suena natural', () => {
  it.each([
    ['El Quilotoa cuesta desde $38 por persona.', 'El Quilotoa cuesta desde 38 dólares por persona.'],
    ['Desde $239–419 por persona, 3 días.', 'Desde 239 a 419 dólares por persona, 3 días.'],
    ['Cabe en tus $50 ✅ 🏖️', 'Cabe en tus 50 dólares'],
    ['Mira https://chulla-vida.vercel.app/fichas o www.ejemplo.com ya.', 'Mira o ya.'],
    ['Bus de 8–10 h, USD 15–20.', 'Bus de 8 a 10 horas, 15 a 20 dólares.'],
    ['21 °C y viento de 5 km/h.', '21 grados y viento de 5 kilómetros por hora.'],
    ['Consultado a las 12:15. Abre a las 9:00.', 'Consultado a las 12 y 15. Abre a las 9 en punto.'],
    ['Saraguro · Sierra → Loja', 'Saraguro, Sierra, Loja'],
    ['«Armar mi viaje» **ya**', 'Armar mi viaje ya'],
  ])('«%s»', (input, expected) => { expect(toSpeakable(input)).toBe(expected); });
});
