import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  CONSENT_KEY, LEGACY_CONSENT_KEY, levelCategories, makeConsent, restoreConsent,
  type ConsentCategories, type ConsentLevel, type ConsentMethod, type ConsentPreferences,
} from '../../domain/consent';

function readJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function readConsent(): ConsentPreferences | null {
  const restored = restoreConsent(readJson(CONSENT_KEY), readJson(LEGACY_CONSENT_KEY));
  if (restored?.method === 'migration') {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(restored)); localStorage.removeItem(LEGACY_CONSENT_KEY); } catch { /* sin almacenamiento: se aplica en memoria */ }
  }
  return restored;
}

export interface ConsentApi {
  preferences: ConsentPreferences | null;
  /** API heredada: recibe categorías (cualquier otro campo se ignora) y deriva el nivel. `update({})` = Privado. */
  update: (value: Partial<ConsentPreferences>, method?: ConsentMethod) => void;
  /** Aplica un nivel. Con 'custom' usa solo las categorías indicadas; nada viene premarcado. */
  choose: (level: ConsentLevel, custom?: Partial<ConsentCategories>, method?: ConsentMethod) => void;
  /** Retira todos los permisos opcionales (vuelve a Privado). */
  revoke: () => void;
  open: () => void;
  close: () => void;
  editing: boolean;
  notice: string;
}
const Context = createContext<ConsentApi | null>(null);
const LEVEL_NAME: Record<ConsentLevel, string> = { private: 'Privado', balanced: 'Equilibrado', custom: 'Personalizado' };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readConsent);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const save = (next: ConsentPreferences) => {
    setPreferences(next); setEditing(false);
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
      setNotice(next.method === 'revoke' ? 'Listo: retiramos los permisos opcionales. Spotify y los mapas ya no se cargan.' : `Guardamos tu elección: ${LEVEL_NAME[next.level]}. Puedes cambiarla cuando quieras en «Privacidad y cookies».`);
    } catch { setNotice('Aplicamos tu elección en esta visita. Tu navegador no permite guardarla.'); }
  };
  const update: ConsentApi['update'] = (value, method = 'feature') => save(makeConsent({ media: value.media, personalization: value.personalization, analytics: value.analytics, marketing: value.marketing }, new Date(), method));
  const choose: ConsentApi['choose'] = (level, custom, method = 'editor') => save(makeConsent(levelCategories(level, custom), new Date(), method));
  const revoke = () => save(makeConsent({}, new Date(), 'revoke'));
  return <Context.Provider value={{ preferences, update, choose, revoke, editing, open: () => setEditing(true), close: () => setEditing(false), notice }}>{children}</Context.Provider>;
}
export function useConsent() { const context = useContext(Context); if (!context) throw new Error('Falta ConsentProvider'); return context; }
