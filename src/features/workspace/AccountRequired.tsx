import { useEffect, useState, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useT } from '../../i18n/v3';
import { openAccount } from './AccountButton';
import { Dialog } from '../../components/chulla/Dialog';

/** UX gate only. Private data and commercial actions still require API/RLS authorization. */
export function AccountRequired({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const t = useT();
  const [access, setAccess] = useState<'checking' | 'denied' | 'allowed'>('checking');
  useEffect(() => {
    let current = true;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        if (!current) return;
        const client = getSupabase();
        if (!client) { setAccess('denied'); return; }
        const check = async () => {
          try { const { data, error } = await client.auth.getUser(); if (current) setAccess(!error && data.user?.email_confirmed_at ? 'allowed' : 'denied'); }
          catch { if (current) setAccess('denied'); }
        };
        void check();
        const { data: { subscription } } = client.auth.onAuthStateChange(() => { void check(); });
        unsubscribe = () => subscription.unsubscribe();
      } catch { if (current) setAccess('denied'); }
    };
    void connect();
    return () => { current = false; unsubscribe?.(); };
  }, []);
  if (access === 'allowed') return children;
  return <Dialog title={t('Tu espacio de viaje')} onClose={onClose}><div className="al-account-required">
    <LockKeyhole size={32} aria-hidden="true" /><h3>{t(access === 'checking' ? 'Comprobando tu cuenta…' : 'Tus historias van contigo')}</h3>
    {access === 'checking' ? <p role="status">{t('Un momento, por favor.')}</p> : <><p>{t('Entra con tu correo confirmado para abrir tu espacio.')}</p><button className="al-button" onClick={() => { onClose(); openAccount('signup'); }}>{t('Entrar / Crear cuenta')}</button></>}
  </div></Dialog>;
}
