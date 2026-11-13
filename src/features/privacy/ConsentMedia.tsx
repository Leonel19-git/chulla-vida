import type { ReactNode } from 'react';
import { useConsent } from './ConsentContext';

export function ConsentMedia({ children }: { children: ReactNode }) {
  const { preferences, open } = useConsent();
  return preferences?.media ? children : <div className="inline-notice"><div><p>El reproductor de Spotify está bloqueado porque los medios externos están desactivados. Puedes habilitarlos en tus preferencias o abrir el enlace directamente.</p><button className="button button-secondary" onClick={open}>Configurar medios externos</button></div></div>;
}
