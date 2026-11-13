import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { useConsent } from './ConsentContext';
import './privacy.css';

export function PrivacyControls() {
  const { preferences, update, editing, close, open } = useConsent();
  return <>{!preferences && !editing && <section className="privacy-banner" aria-label="Preferencias de privacidad"><ShieldCheck size={22} /><div><strong>Tu viaje, tus decisiones.</strong><p>Usamos almacenamiento local para tus preferencias y viajes. Spotify y mapas externos solo se cargan con tu permiso. No usamos analítica ni publicidad. <button className="privacy-link" onClick={() => window.dispatchEvent(new Event('cv3:legal'))}>Política de cookies</button></p></div><div className="privacy-actions"><button className="button privacy-choice" onClick={() => update({ media: true })}>Aceptar todas</button><button className="button privacy-choice" onClick={() => update({})}>Rechazar opcionales</button><button className="button privacy-choice" onClick={open}>Personalizar</button></div></section>}{editing && <PrivacyEditor onClose={close} />}</>;
}
function PrivacyEditor({ onClose }: { onClose: () => void }) {
  const { preferences, update } = useConsent();
  const [media, setMedia] = useState(preferences?.media ?? false);
  return <Dialog title="Privacidad y cookies" onClose={onClose}><div className="dialog-content privacy-editor"><p>El permiso de micrófono, ubicación y notificaciones se solicita por separado, al usar cada función.</p><label><input type="checkbox" checked disabled /> Almacenamiento esencial <span>Preferencias, sesión y viajes guardados en este dispositivo.</span></label><label><input type="checkbox" checked={media} onChange={event => setMedia(event.target.checked)} /> Medios externos <span>Permite cargar Spotify y mapas de OpenStreetMap cuando los actives. Al revocar se retiran de la pantalla. No autoriza acceso a tu micrófono ni GPS.</span></label><p>Analítica y marketing: no configurados y desactivados.</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => update({})}>Revocar todos los opcionales</button><button className="button button-primary" onClick={() => update({ media })}>Guardar preferencias</button></div></div></Dialog>;
}
