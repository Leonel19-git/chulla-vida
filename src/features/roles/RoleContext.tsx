import { useSyncExternalStore } from 'react';
import { Compass, Store } from 'lucide-react';
import { isHostMode, isTravelerMode, roleStore, type RoleMode, type RoleSnapshot } from './role';
import './roles.css';

import { useT } from '../../i18n/v3';
export interface RoleValue extends RoleSnapshot {
  isTraveler: boolean;
  isHost: boolean;
  setMode: (mode: RoleMode) => void;
  requestHost: () => void;
  requestTraveler: () => void;
}

/**
 * Rol de quien usa la página. No necesita proveedor: el estado vive en `roleStore` y lo alimentan
 * el panel de cuenta (sesión) y la bienvenida (elección). Se puede usar desde cualquier componente.
 */
export function useRole(): RoleValue {
  const snapshot = useSyncExternalStore(roleStore.subscribe, roleStore.get, roleStore.get);
  return { ...snapshot, isTraveler: isTravelerMode(snapshot), isHost: isHostMode(snapshot), setMode: roleStore.setMode, requestHost: roleStore.requestHost, requestTraveler: roleStore.requestTraveler };
}

/** Interruptor claro para quien tiene ambos roles. No se muestra a nadie más. */
export function RoleSwitch() {
  const t = useT();
  const { role, mode, setMode } = useRole();
  if (role !== 'both') return null;
  return <div className="role-switch" role="radiogroup" aria-label={t("Cómo quieres usar tu cuenta")}>
    <button type="button" role="radio" aria-checked={mode === 'traveler'} onClick={() => setMode('traveler')}><Compass size={18} aria-hidden="true" />{t("Modo viajero")}</button>
    <button type="button" role="radio" aria-checked={mode === 'host'} onClick={() => setMode('host')}><Store size={18} aria-hidden="true" />{t("Modo negocio")}</button>
  </div>;
}
