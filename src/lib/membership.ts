export type PlanId = 'weekly' | 'monthly' | 'annual';
export type PremiumFeature = 'offline' | 'community' | 'premium-passport';
export interface MembershipSubscription {
  version: 1;
  owner: string;
  planId: PlanId;
  startsAt: string;
  expiresAt: string;
  renewalEnabled: boolean;
  mode: 'demo';
}
export const MEMBERSHIP_KEY = 'chullavida:membership:v1';
export const MEMBERSHIP_PLANS = [
  { id: 'weekly' as const, price: 2.99, label: 'Semanal', period: '7 días' },
  { id: 'monthly' as const, price: 4.99, label: 'Mensual', period: '1 mes' },
  { id: 'annual' as const, price: 49.99, label: 'Anual', period: '1 año' },
];
export function membershipExpiry(plan: PlanId, start: Date): Date {
  const result = new Date(start);
  if (plan === 'weekly') result.setUTCDate(result.getUTCDate() + 7);
  else {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    if (plan === 'annual') result.setUTCFullYear(result.getUTCFullYear() + 1);
    else result.setUTCMonth(result.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
  }
  return result;
}
export function createDemoMembership(planId: PlanId, owner: string, now = new Date()): MembershipSubscription {
  if (!MEMBERSHIP_PLANS.some(plan => plan.id === planId) || !owner || !Number.isFinite(now.getTime())) throw new Error('Invalid membership');
  return { version: 1, owner, planId, startsAt: now.toISOString(), expiresAt: membershipExpiry(planId, now).toISOString(), renewalEnabled: true, mode: 'demo' };
}
export function isMembership(value: unknown): value is MembershipSubscription {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || item.mode !== 'demo' || typeof item.owner !== 'string' || !item.owner || typeof item.renewalEnabled !== 'boolean' || !MEMBERSHIP_PLANS.some(plan => plan.id === item.planId) || typeof item.startsAt !== 'string' || typeof item.expiresAt !== 'string') return false;
  const start = new Date(item.startsAt);
  return Number.isFinite(start.getTime()) && item.expiresAt === membershipExpiry(item.planId as PlanId, start).toISOString();
}
export function membershipIsActive(subscription: MembershipSubscription | null, now = Date.now(), owner?: string): boolean {
  return Boolean(subscription && isMembership(subscription) && (!owner || subscription.owner === owner) && new Date(subscription.startsAt).getTime() <= now && new Date(subscription.expiresAt).getTime() > now);
}
export function membershipHasAccess(subscription: MembershipSubscription | null, feature: PremiumFeature, now = Date.now(), owner?: string): boolean {
  return membershipIsActive(subscription, now, owner) && (feature !== 'premium-passport' || subscription?.planId === 'annual');
}
export interface PassportStamp { placeId: string; title: string; region: string; date: string; verified: boolean }
export function collectVerifiedStamps(reservations: readonly { lugar_id: string; lugar_titulo: string; turista_email: string; estado: string; fecha_tour: string; validado_en?: string }[], places: readonly { id: string; region: string }[], owner: string): PassportStamp[] {
  const stamps = new Map<string, PassportStamp>();
  for (const reservation of reservations) {
    if (reservation.turista_email !== owner || !['validado_en_sitio', 'completado', 'liquidado_al_local'].includes(reservation.estado) || !reservation.validado_en || !Number.isFinite(Date.parse(reservation.validado_en))) continue;
    const place = places.find(place => place.id === reservation.lugar_id);
    if (!place) continue;
    const date = reservation.validado_en || reservation.fecha_tour;
    const existing = stamps.get(place.id);
    if (!existing || date < existing.date) stamps.set(place.id, { placeId: place.id, title: reservation.lugar_titulo, region: place.region, date, verified: true });
  }
  return [...stamps.values()].sort((a, b) => a.date.localeCompare(b.date));
}
