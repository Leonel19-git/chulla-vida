import { createContext, useContext, useState, type ReactNode } from 'react';
import { CONSENT_KEY, isConsent, makeConsent, type ConsentPreferences } from '../../domain/consent';

function readConsent(): ConsentPreferences | null {
  try { const value: unknown = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); return isConsent(value) ? value : null; } catch { return null; }
}
const Context = createContext<{ preferences: ConsentPreferences | null; update: (value: Partial<ConsentPreferences>) => void; open: () => void; close: () => void; editing: boolean; notice: string } | null>(null);
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readConsent);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const update = (value: Partial<ConsentPreferences>) => {
    const next = makeConsent(value);
    setPreferences(next); setEditing(false);
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); setNotice('Preferencias guardadas. Puedes cambiarlas desde el pie de página.'); }
    catch { setNotice('Preferencias aplicadas en esta sesión. El navegador no permite guardarlas.'); }
  };
  return <Context.Provider value={{ preferences, update, editing, open: () => setEditing(true), close: () => setEditing(false), notice }}>{children}</Context.Provider>;
}
export function useConsent() { const context = useContext(Context); if (!context) throw new Error('Falta ConsentProvider'); return context; }
