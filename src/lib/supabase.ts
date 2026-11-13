import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseConfiguration = { available: true; url: string; key: string } | { available: false; reason: string };

/** Browser configuration accepts only public Supabase credentials. Server keys never belong here. */
export function supabaseConfiguration(env: Record<string, string | undefined> = import.meta.env): SupabaseConfiguration {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return { available: false, reason: 'Falta conectar Supabase. Las cuentas y solicitudes en línea todavía no están disponibles.' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('URL no válida');
    if (key.startsWith('sb_secret_')) throw new Error('Clave de servidor');
    const payload = key.split('.')[1];
    if (payload) {
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (claims.role === 'service_role') throw new Error('Clave de servidor');
    }
    return { available: true, url: parsed.toString().replace(/\/$/, ''), key };
  } catch {
    return { available: false, reason: 'La configuración pública de Supabase no es válida. Revisa la URL y utiliza una clave publicable, nunca una clave de servidor.' };
  }
}

let client: SupabaseClient | null | undefined;
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = supabaseConfiguration();
  client = config.available ? createClient(config.url, config.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  return client;
}
