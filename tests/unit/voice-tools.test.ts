import { describe, expect, it } from 'vitest';
import { isWeatherQuestion, navigationFromVoice, weatherLocalityFromVoice } from '../../src/features/assistant/voice-tools';
describe('intenciones de voz', () => {
  it('distingue explicar de abrir una pantalla y no tiene operaciones transaccionales', () => {
    expect(navigationFromVoice('Abre mi pasaporte')).toBe('passport'); expect(navigationFromVoice('Cómo funciona el pasaporte')).toBeNull();
    expect(navigationFromVoice('Muéstrame Cultura Viva')).toBe('culture'); expect(navigationFromVoice('Paga mi reserva')).toBeNull();
  });
  it('resuelve referencias explícitas de localidad y no usa la ubicación del usuario', () => {
    expect(isWeatherQuestion('Qué tiempo hace en Baños')).toBe(true); expect(weatherLocalityFromVoice('¿Qué clima hace hoy en Baños?', [])).toBe('Baños');
    expect(weatherLocalityFromVoice('El clima de Cuyabeno', [])).toBe('Cuyabeno'); expect(weatherLocalityFromVoice('Hola, MIJIN', [])).toBeNull();
  });
});
