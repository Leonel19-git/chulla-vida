import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';

export interface AccountIdentity { name: string; initial: string }
type SessionLike = { user?: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null } | null;

/** Nombre corto para la cabecera: nombre visible, o la parte local del correo. Nunca el correo completo. */
export function identityFromSession(session: SessionLike): AccountIdentity | null {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const raw = [meta.display_name, meta.full_name, meta.name].find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?? (user.email ? user.email.split('@')[0] : '');
  const name = raw.trim().split(/\s+/)[0]?.slice(0, 18) || 'Mi cuenta';
  return { name, initial: name.charAt(0).toLocaleUpperCase('es-EC') };
}

/** ¿Hay una sesión de Supabase guardada en este navegador? Evita cargar supabase-js a quien nunca entró. */
function hasStoredSession() {
  try { return Object.keys(localStorage).some(key => /^sb-.+-auth-token$/.test(key)); } catch { return false; }
}

/** Abre el panel de cuenta. `tab` elige la pestaña inicial del acceso (crear cuenta o entrar). */
export function openAccount(tab?: 'signup' | 'login') {
  window.dispatchEvent(new CustomEvent('cv3:account', { detail: tab ? { tab } : undefined }));
}

/**
 * Botón de cuenta siempre visible en la cabecera: «Entrar / Crear cuenta» sin sesión y la inicial
 * con el nombre cuando hay sesión. Carga supabase-js solo si hay sesión guardada o si abres tu cuenta.
 */
export function AccountButton() {
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      if (unsubscribe) return;
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const client = getSupabase();
        if (!client || !active) return;
        const { data } = await client.auth.getSession();
        if (active) setIdentity(identityFromSession(data.session as SessionLike));
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { if (active) setIdentity(identityFromSession(session as SessionLike)); });
        unsubscribe = () => subscription.unsubscribe();
      } catch { /* sin conexión o sin Supabase: el botón sigue ofreciendo entrar */ }
    };
    if (hasStoredSession()) void connect();
    const onAccount = () => { void connect(); };
    window.addEventListener('cv3:account', onAccount);
    return () => { active = false; unsubscribe?.(); window.removeEventListener('cv3:account', onAccount); };
  }, []);
  if (identity) return <button type="button" className="cv-account-button is-signed" data-tour="account" onClick={() => openAccount()} aria-label={`Tu cuenta: ${identity.name}`}>
    <span className="cv-account-initial" aria-hidden="true">{identity.initial}</span><span className="cv-account-label">{identity.name}</span>
  </button>;
  return <button type="button" className="cv-account-button" data-tour="account" aria-label="Entrar o crear cuenta" onClick={() => openAccount('signup')}>
    <LogIn size={17} aria-hidden="true" /><span className="cv-account-label cv-account-long" aria-hidden="true">Entrar / Crear cuenta</span><span className="cv-account-label cv-account-short" aria-hidden="true">Entrar</span>
  </button>;
}
