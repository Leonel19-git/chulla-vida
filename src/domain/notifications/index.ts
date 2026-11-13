export const NOTICE_KEY = 'chullavida:notification-preferences:v1';
export const NOTICE_CATEGORIES = {
  booking_transactional: 'Solicitudes y reservas', security_alerts: 'Avisos de seguridad', trip_reminders: 'Recordatorios de mi viaje',
  cultural_stories: 'Historias y cultura', offers_marketing: 'Novedades y promociones', geo_curiosities: 'Curiosidades de una región',
} as const;
export type NoticeCategory = keyof typeof NOTICE_CATEGORIES;
export interface NoticePreferences { version: 1; categories: Record<NoticeCategory, boolean>; quietEnabled: boolean; quietStart: string; quietEnd: string; updatedAt: string }
export function defaultNoticePreferences(): NoticePreferences {
  return { version: 1, categories: Object.fromEntries(Object.keys(NOTICE_CATEGORIES).map(key => [key, false])) as Record<NoticeCategory, boolean>, quietEnabled: false, quietStart: '22:00', quietEnd: '08:00', updatedAt: new Date().toISOString() };
}
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function isNoticePreferences(value: unknown): value is NoticePreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as NoticePreferences;
  return v.version === 1 && Boolean(v.categories && typeof v.categories === 'object')
    && Object.keys(NOTICE_CATEGORIES).every(key => typeof v.categories[key as NoticeCategory] === 'boolean')
    && typeof v.quietEnabled === 'boolean' && time(v.quietStart) && time(v.quietEnd)
    && typeof v.updatedAt === 'string' && Number.isFinite(Date.parse(v.updatedAt));
}
export function inQuietHours(preferences: NoticePreferences, at = new Date()): boolean {
  if (!preferences.quietEnabled) return false;
  const current = at.getHours() * 60 + at.getMinutes();
  const number = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
  const start = number(preferences.quietStart), end = number(preferences.quietEnd);
  return start === end || (start < end ? current >= start && current < end : current >= start || current < end);
}
