import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useApp, CURRENT_TRAVELER_EMAIL } from './AppContext';
import { createDemoMembership, isMembership, MEMBERSHIP_KEY, MEMBERSHIP_PLANS, membershipHasAccess, membershipIsActive, type MembershipSubscription, type PlanId, type PremiumFeature } from '../lib/membership';

interface MembershipValue {
  subscription: MembershipSubscription | null;
  isActive: boolean;
  plan: typeof MEMBERSHIP_PLANS[number] | undefined;
  hasAccess: (feature: PremiumFeature) => boolean;
  activateDemoPlan: (planId: PlanId) => boolean;
  cancelRenewal: () => void;
  storageError: boolean;
}
const MembershipContext = createContext<MembershipValue | undefined>(undefined);
export function MembershipProvider({ children }: { children: ReactNode }) {
  const { role } = useApp();
  const [subscription, setSubscription] = useState<MembershipSubscription | null>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem(MEMBERSHIP_KEY) || 'null'); return isMembership(value) && value.owner === CURRENT_TRAVELER_EMAIL ? value : null; } catch { return null; }
  });
  const [now, setNow] = useState(Date.now);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    if (!subscription) return;
    const remaining = new Date(subscription.expiresAt).getTime() - Date.now();
    if (remaining <= 0 || remaining > 2147483647) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), remaining + 1);
    return () => window.clearTimeout(timeout);
  }, [subscription]);
  const persist = (next: MembershipSubscription) => {
    setSubscription(next); setNow(Date.now());
    try { localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  };
  const activateDemoPlan = (planId: PlanId) => {
    if (role !== 'turista') return false;
    persist(createDemoMembership(planId, CURRENT_TRAVELER_EMAIL)); return true;
  };
  const cancelRenewal = () => { if (role === 'turista' && subscription) persist({ ...subscription, renewalEnabled: false }); };
  const isActive = role === 'turista' && membershipIsActive(subscription, now, CURRENT_TRAVELER_EMAIL);
  return <MembershipContext.Provider value={{ subscription, isActive, plan: MEMBERSHIP_PLANS.find(plan => plan.id === subscription?.planId), hasAccess: feature => role === 'turista' && membershipHasAccess(subscription, feature, Date.now(), CURRENT_TRAVELER_EMAIL), activateDemoPlan, cancelRenewal, storageError }}>{children}</MembershipContext.Provider>;
}
export function useMembership() { const context = useContext(MembershipContext); if (!context) throw new Error('MembershipProvider is required'); return context; }
