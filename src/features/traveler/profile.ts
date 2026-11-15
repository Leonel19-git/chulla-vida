import type { SupabaseClient } from '@supabase/supabase-js';
import type { TravelInterest, TravelPreferences } from '../onboarding/WelcomeFlow';
import type { ServerStampRow } from '../../domain/passport/stamps';

/** Perfil de viajero tal como lo guarda Supabase (profiles + buyer_identity_documents). Nunca contiene el número de documento. */
export interface TravelerPreferences { interests: TravelInterest[]; budgetTotalUsd: number | null; travelers: number; pet: boolean }
export interface TravelerProfile {
  displayName: string;
  homeCountry: string;
  homeCity: string;
  preferences: TravelerPreferences;
  marketing: boolean;
  document: { type: 'cedula' | 'passport'; last4: string } | null;
  /** false cuando el servidor todavía no tiene la migración 202611150001 (sin país/ciudad/preferencias). */
  extendedColumns: boolean;
}
export const INTEREST_LABELS: Readonly<Record<TravelInterest, string>> = {
  cultura: 'Cultura y comunidad', naturaleza: 'Naturaleza', aventura: 'Aventura', gastronomia: 'Comida típica', relax: 'Relax y termas',
};
export const INTEREST_IDS = Object.keys(INTEREST_LABELS) as TravelInterest[];
export const emptyPreferences = (): TravelerPreferences => ({ interests: [], budgetTotalUsd: null, travelers: 1, pet: false });

export function preferencesFromOnboarding(value: TravelPreferences | null): TravelerPreferences {
  if (!value) return emptyPreferences();
  return { interests: [...value.interests], budgetTotalUsd: value.budgetTotalUsd, travelers: value.travelers, pet: value.pet };
}
/** Valida lo que llega del servidor (jsonb libre) antes de mostrarlo. */
export function parsePreferences(raw: unknown): TravelerPreferences | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const interests = Array.isArray(v.interests) ? v.interests.filter((item): item is TravelInterest => INTEREST_IDS.includes(item as TravelInterest)) : [];
  const budget = typeof v.budgetTotalUsd === 'number' && Number.isFinite(v.budgetTotalUsd) && v.budgetTotalUsd > 0 && v.budgetTotalUsd <= 1_000_000 ? Math.round(v.budgetTotalUsd) : null;
  const travelers = typeof v.travelers === 'number' && Number.isInteger(v.travelers) && v.travelers >= 1 && v.travelers <= 30 ? v.travelers : 1;
  if (!interests.length && budget === null && travelers === 1 && v.pet !== true) return null;
  return { interests: [...new Set(interests)], budgetTotalUsd: budget, travelers, pet: v.pet === true };
}

export const PROFILE_LIMITS = { displayName: 100, homeCountry: 80, homeCity: 120 } as const;
export function profileProblems(input: Pick<TravelerProfile, 'displayName' | 'homeCountry' | 'homeCity'>): string[] {
  const problems: string[] = [];
  if (!input.displayName.trim()) problems.push('Escribe cómo quieres que te llamemos.');
  if (input.displayName.length > PROFILE_LIMITS.displayName) problems.push('El nombre visible admite hasta 100 caracteres.');
  if (input.homeCountry.length > PROFILE_LIMITS.homeCountry) problems.push('El país admite hasta 80 caracteres.');
  if (input.homeCity.length > PROFILE_LIMITS.homeCity) problems.push('La ciudad admite hasta 120 caracteres.');
  return problems;
}

/** PostgREST / PostgreSQL responden así cuando una columna todavía no existe en el servidor. */
const missingColumn = (error: { code?: string; message?: string } | null) => Boolean(error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(error.message ?? '')));

export async function loadTravelerProfile(client: SupabaseClient, userId: string, fallbackName: string): Promise<TravelerProfile> {
  let extendedColumns = true;
  let result = await client.from('profiles').select('display_name,home_country,home_city,travel_preferences,marketing_consent_at').eq('id', userId).maybeSingle();
  if (result.error && missingColumn(result.error)) {
    extendedColumns = false;
    result = await client.from('profiles').select('display_name,marketing_consent_at').eq('id', userId).maybeSingle();
  }
  if (result.error) throw result.error;
  const row = (result.data ?? {}) as Record<string, unknown>;
  const documentResult = await client.from('buyer_identity_documents').select('document_type,last4').eq('user_id', userId).maybeSingle();
  const documentRow = documentResult.error ? null : documentResult.data as { document_type?: string; last4?: string } | null;
  const document = documentRow && (documentRow.document_type === 'cedula' || documentRow.document_type === 'passport') && typeof documentRow.last4 === 'string' && /^[0-9A-Z]{4}$/.test(documentRow.last4)
    ? { type: documentRow.document_type, last4: documentRow.last4 } as const : null;
  const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
  return {
    displayName: text(row.display_name, PROFILE_LIMITS.displayName) || fallbackName.slice(0, PROFILE_LIMITS.displayName),
    homeCountry: text(row.home_country, PROFILE_LIMITS.homeCountry),
    homeCity: text(row.home_city, PROFILE_LIMITS.homeCity),
    preferences: parsePreferences(row.travel_preferences) ?? emptyPreferences(),
    marketing: Boolean(row.marketing_consent_at),
    document, extendedColumns,
  };
}

export type SaveOutcome = 'saved' | 'name-only';
export async function saveTravelerProfile(client: SupabaseClient, userId: string, input: Pick<TravelerProfile, 'displayName' | 'homeCountry' | 'homeCity' | 'preferences'>): Promise<SaveOutcome> {
  const base = { display_name: input.displayName.trim().slice(0, PROFILE_LIMITS.displayName) };
  const full = { ...base, home_country: input.homeCountry.trim().slice(0, PROFILE_LIMITS.homeCountry), home_city: input.homeCity.trim().slice(0, PROFILE_LIMITS.homeCity),
    travel_preferences: { interests: input.preferences.interests, budgetTotalUsd: input.preferences.budgetTotalUsd, travelers: input.preferences.travelers, pet: input.preferences.pet } };
  const { error } = await client.from('profiles').update(full).eq('id', userId);
  if (!error) return 'saved';
  if (!missingColumn(error)) throw error;
  const retry = await client.from('profiles').update(base).eq('id', userId);
  if (retry.error) throw retry.error;
  return 'name-only';
}

/** Envía el número UNA vez a set_buyer_document (servidor) y devuelve solo los últimos 4. El número no se guarda en el navegador. */
export async function saveTravelerDocument(client: SupabaseClient, type: 'cedula' | 'passport', number: string): Promise<{ type: 'cedula' | 'passport'; last4: string }> {
  const { data, error } = await client.rpc('set_buyer_document', { p_type: type, p_value: number });
  if (error) throw error;
  const last4 = data && typeof data === 'object' && typeof (data as { last4?: unknown }).last4 === 'string' ? (data as { last4: string }).last4 : '';
  if (!/^[0-9A-Z]{4}$/.test(last4)) throw new Error('Respuesta inesperada');
  return { type, last4 };
}

export async function saveMarketingChoice(client: SupabaseClient, granted: boolean, policyVersion: string): Promise<void> {
  const { error } = await client.rpc('record_consent', { p_category: 'email_marketing', p_granted: granted, p_purpose: 'Novedades y ofertas de CHULLA VIDA por correo', p_policy_version: policyVersion, p_method: 'settings' });
  if (error) throw error;
}

export interface BookingRow { id: string; code: string; experience_id: string; status: string; participants: number; total_amount: number | string; currency: string; created_at: string }
export interface PaymentRow { id: string; booking_id: string | null; amount: number | string; currency: string; status: string; card_brand: string | null; card_last4: string | null; environment: string; created_at: string }
export async function loadPurchases(client: SupabaseClient): Promise<{ bookings: BookingRow[]; payments: PaymentRow[] }> {
  const [bookings, payments] = await Promise.all([
    client.from('bookings').select('id,code,experience_id,status,participants,total_amount,currency,created_at').order('created_at', { ascending: false }).limit(50),
    client.from('payments').select('id,booking_id,amount,currency,status,card_brand,card_last4,environment,created_at').order('created_at', { ascending: false }).limit(50),
  ]);
  if (bookings.error) throw bookings.error;
  return { bookings: (bookings.data ?? []) as BookingRow[], payments: payments.error ? [] : (payments.data ?? []) as PaymentRow[] };
}

/** Sellos de visita verificada del usuario con sesión (RLS: passport_stamps_owner_read). */
export async function loadVerifiedStamps(client: SupabaseClient, userId: string): Promise<ServerStampRow[]> {
  const { data, error } = await client.from('passport_stamps').select('id,experience_id,region_id,stamp_type,awarded_at').eq('user_id', userId).eq('stamp_type', 'verified_visit').limit(500);
  if (error) throw error;
  return ((data ?? []) as ServerStampRow[]).filter(row => row.stamp_type === 'verified_visit');
}

export const BOOKING_STATUS: Readonly<Record<string, string>> = {
  draft: 'Borrador', requested: 'Solicitada', awaiting_merchant_confirmation: 'Esperando al anfitrión', confirmed: 'Confirmada', awaiting_payment: 'Pendiente de pago',
  paid: 'Pagada', completed: 'Visita completada', expired: 'Vencida', cancelled: 'Cancelada', refunded: 'Reembolsada', payment_failed: 'Pago no aprobado',
};
export const PAYMENT_STATUS: Readonly<Record<string, string>> = {
  pending: 'Pago pendiente', authorized: 'Autorizado', captured: 'Pagado', failed: 'Rechazado', cancelled: 'Cancelado', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial',
};
const BRANDS: Readonly<Record<string, string>> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', 'american express': 'American Express', diners: 'Diners Club', discover: 'Discover' };
/** «Visa •••• 4242». Solo usa la marca y los últimos 4 que guardó el servidor; nunca el número completo. */
export function cardLabel(brand: string | null, last4: string | null): string | null {
  if (!last4 || !/^[0-9]{4}$/.test(last4)) return null;
  const name = brand ? BRANDS[brand.trim().toLowerCase()] ?? brand.trim().slice(0, 30) : 'Tarjeta';
  return `${name} •••• ${last4}`;
}
export function formatMoney(amount: number | string, currency: string): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return '';
  try { return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value); } catch { return `${currency} ${value.toFixed(2)}`; }
}

/** Cierra el diálogo que contiene a `element` usando su propio botón (respeta el onClose de quien lo montó). */
export function closeContainingDialog(element: Element | null): boolean {
  const button = element?.closest('dialog')?.querySelector<HTMLButtonElement>('.dialog-top .icon-button');
  if (!button) return false;
  button.click(); return true;
}
