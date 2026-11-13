export const CONSENT_VERSION = 1;
export const CONSENT_KEY = 'chullavida:consent:v1';
export interface ConsentPreferences {
  version: 1;
  essential: true;
  media: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}
export function isConsent(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ConsentPreferences>;
  return item.version === CONSENT_VERSION && item.essential === true
    && ['media', 'analytics', 'marketing'].every(key => typeof item[key as keyof ConsentPreferences] === 'boolean')
    && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt));
}
export function makeConsent(optional: Partial<Pick<ConsentPreferences, 'media' | 'analytics' | 'marketing'>>, now = new Date()): ConsentPreferences {
  return { version: 1, essential: true, media: optional.media === true, analytics: optional.analytics === true,
    marketing: optional.marketing === true, updatedAt: now.toISOString() };
}
