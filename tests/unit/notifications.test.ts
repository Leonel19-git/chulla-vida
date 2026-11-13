import { describe, expect, it } from 'vitest';
import { defaultNoticePreferences, inQuietHours, isNoticePreferences } from '../../src/domain/notifications';
describe('preferencias de avisos', () => {
  it('no acepta temas opcionales ni silencio automáticamente', () => {
    const value = defaultNoticePreferences();
    expect(Object.values(value.categories).every(active => active === false)).toBe(true);
    expect(isNoticePreferences(value)).toBe(true);
    expect(inQuietHours(value)).toBe(false);
    expect(isNoticePreferences({ ...value, quietStart: '25:00' })).toBe(false);
  });
  it('respeta horarios que atraviesan medianoche y el límite final', () => {
    const value = { ...defaultNoticePreferences(), quietEnabled: true };
    expect(inQuietHours(value, new Date(2026, 10, 13, 23, 0))).toBe(true);
    expect(inQuietHours(value, new Date(2026, 10, 13, 7, 59))).toBe(true);
    expect(inQuietHours(value, new Date(2026, 10, 13, 8, 0))).toBe(false);
    expect(inQuietHours({ ...value, quietStart: '08:00', quietEnd: '08:00' })).toBe(true);
  });
});
