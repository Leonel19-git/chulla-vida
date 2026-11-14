import type { ReactNode } from 'react';
import { allowsExternalMedia } from '../../domain/consent';
import { useConsent } from './ConsentContext';

/** Solo monta contenido de terceros (Spotify, mapas) con el permiso «Contenido externo». Al revocarlo se desmonta. */
export function ConsentMedia({ children, provider = 'Spotify' }: { children: ReactNode; provider?: string }) {
  const { preferences, open } = useConsent();
  if (allowsExternalMedia(preferences)) return children;
  return <div className="inline-notice consent-media-blocked"><div><p>El reproductor de {provider} está bloqueado porque el contenido externo no está permitido en tu nivel de privacidad. Elige «Equilibrado» o actívalo en Personalizado, o abre el enlace directamente.</p><button type="button" className="button button-secondary" onClick={open}>Configurar contenido externo</button></div></div>;
}
