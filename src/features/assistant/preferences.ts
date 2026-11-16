/**
 * «Armar mi viaje» from MIJIN: the trip answers become the same travel preferences the welcome flow stores
 * (readTravelPreferences in onboarding/WelcomeFlow.tsx), so Mi viaje opens with them. Only what the person said
 * in the conversation is written; nothing sensitive (origin city, budget, group size, interests, pet).
 */
import { readTravelPreferences, WELCOME_KEY, type TravelInterest, type TravelPreferences } from '../onboarding/WelcomeFlow';
import { groupBudget, type Interest, type TripSlots } from './trip';

const TO_TRAVEL: Partial<Record<Interest, TravelInterest>> = { naturaleza: 'naturaleza', cultura: 'cultura', aventura: 'aventura', comida: 'gastronomia', relax: 'relax' };

export function preferencesFromSlots(slots: TripSlots, previous: TravelPreferences | null = readTravelPreferences(), now = new Date()): TravelPreferences {
  const interests = [...new Set((slots.interests ?? []).map(item => TO_TRAVEL[item]).filter((item): item is TravelInterest => Boolean(item)))];
  const budget = groupBudget(slots);
  return {
    completed: previous?.completed ?? true,
    path: previous?.path ?? 'traveler',
    interests: interests.length ? interests : previous?.interests ?? [],
    budgetTotalUsd: budget !== undefined && budget > 0 ? Math.round(budget * 100) / 100 : previous?.budgetTotalUsd ?? null,
    origin: (slots.origin ?? previous?.origin ?? '').slice(0, 80),
    travelers: slots.people !== undefined ? Math.min(30, Math.max(1, Math.round(slots.people))) : previous?.travelers ?? 1,
    pet: slots.pet ?? previous?.pet ?? false,
    updatedAt: now.toISOString(),
  };
}

/** Stores the preferences (same key and shape as the welcome flow) and tells listeners, like the welcome flow does. */
export function saveTripPreferences(slots: TripSlots): TravelPreferences {
  const preferences = preferencesFromSlots(slots);
  try { window.localStorage.setItem(WELCOME_KEY, JSON.stringify(preferences)); } catch { /* sin almacenamiento: vale solo para esta sesión */ }
  window.dispatchEvent(new CustomEvent('cv3:preferences', { detail: preferences }));
  return preferences;
}
