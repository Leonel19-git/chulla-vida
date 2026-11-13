import { useState } from 'react';
import { Bell, BellOff, Check, Clock3, Compass, ShieldCheck } from 'lucide-react';
import { defaultNoticePreferences, inQuietHours, isNoticePreferences, NOTICE_CATEGORIES, NOTICE_KEY, type NoticeCategory } from '../../domain/notifications';
import { isJourney, JOURNEY_KEY } from '../../domain/itinerary';
import './notifications.css';

function readPreferences() { try { const stored: unknown = JSON.parse(localStorage.getItem(NOTICE_KEY) || 'null'); return isNoticePreferences(stored) ? stored : defaultNoticePreferences(); } catch { return defaultNoticePreferences(); } }
function readJourney() { try { const stored: unknown = JSON.parse(localStorage.getItem(JOURNEY_KEY) || 'null'); return isJourney(stored) ? stored : null; } catch { return null; } }
export function NotificationCenter() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [notice, setNotice] = useState('');
  const [region, setRegion] = useState('Amazonía');
  const [journey] = useState(readJourney);
  const save = (next: typeof preferences) => {
    const value = { ...next, updatedAt: new Date().toISOString() }; setPreferences(value);
    try { localStorage.setItem(NOTICE_KEY, JSON.stringify(value)); setNotice('Preferencias guardadas en este navegador. No se ha suscrito ningún envío externo.'); }
    catch { setNotice('Preferencias aplicadas en esta sesión. No fue posible guardarlas.'); }
  };
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try { const result = await Notification.requestPermission(); setPermission(result); setNotice(result === 'granted' ? 'Permiso del navegador concedido. Puedes probar un aviso local; no se activó un servicio de push.' : 'No se concedió permiso. Puedes seguir consultando tus avisos dentro de la página.'); }
    catch { setNotice('El navegador no pudo solicitar el permiso. Revisa su configuración.'); }
  };
  const test = () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') { setNotice('Primero permite avisos del navegador.'); return; }
    if (inQuietHours(preferences)) { setNotice('Estás en horario de silencio. El aviso de prueba no se enviará.'); return; }
    try { const notification = new Notification('CHULLA VIDA · Prueba local', { body: 'Tu próximo viaje empieza con una buena idea. Este es un aviso de prueba en tu dispositivo.', tag: 'chulla-vida-local-test' }); setTimeout(() => notification.close(), 8000); setNotice('Se creó un aviso local de prueba. No se programaron mensajes ni envíos futuros.'); }
    catch { setNotice('Este navegador no permite avisos directos. Las preferencias y el centro local siguen disponibles.'); }
  };
  return <section className="notice-center"><div className="notice-intro"><Bell size={28} /><div><h3>Que te llegue lo que te importa.</h3><p>Tú eliges los temas y los momentos. Por ahora son preferencias de este navegador; no hay un servicio de push o correo conectado.</p></div></div><div className="notice-topics">{Object.entries(NOTICE_CATEGORIES).map(([id, label]) => <label key={id}><span>{label}<small>{id === 'offers_marketing' ? 'Promociones siempre opcionales.' : id === 'geo_curiosities' ? 'Región elegida por ti, sin rastreo de ubicación.' : id === 'security_alerts' ? 'No hay un feed de emergencias en tiempo real.' : 'Preferencia local, pendiente de proveedor para envíos.'}</small></span><input type="checkbox" checked={preferences.categories[id as NoticeCategory]} onChange={event => save({ ...preferences, categories: { ...preferences.categories, [id]: event.target.checked } })} /></label>)}</div>
    <section className="notice-quiet"><h4><Clock3 size={20} />Tu descanso también cuenta.</h4><label><input type="checkbox" checked={preferences.quietEnabled} onChange={event => save({ ...preferences, quietEnabled: event.target.checked })} />Usar horario de silencio</label><div><label>Desde<input type="time" className="field" value={preferences.quietStart} onChange={event => { if (event.target.value) save({ ...preferences, quietStart: event.target.value }); }} /></label><label>Hasta<input type="time" className="field" value={preferences.quietEnd} onChange={event => { if (event.target.value) save({ ...preferences, quietEnd: event.target.value }); }} /></label></div><small>Hora local del dispositivo. Si inicio y fin coinciden, se mantiene silencio todo el día.</small></section>
    <section className="notice-browser"><h4><ShieldCheck size={20} />Permiso del navegador</h4><p>{permission === 'unsupported' ? 'Este navegador no ofrece notificaciones.' : permission === 'granted' ? 'Permiso concedido en este dispositivo.' : permission === 'denied' ? 'Permiso bloqueado. Puedes cambiarlo desde los ajustes del navegador.' : 'No has concedido permiso. Se solicita solo si pulsas el botón.'}</p><div><button className="button button-secondary" onClick={requestPermission} disabled={permission !== 'default'}><Bell size={16} />Permitir avisos del navegador</button><button className="button button-primary" disabled={permission !== 'granted'} onClick={test}>Probar un aviso local</button></div><p>Este permiso no acepta marketing, no comparte tu ubicación y no crea una suscripción de push.</p></section>
    {preferences.categories.trip_reminders && journey && <section className="notice-trip"><Check size={21} /><div><h4>Tu borrador sigue contigo.</h4><p>Desde {journey.origin} · {journey.people} personas · {journey.stops.length} paradas. {journey.date ? `Fecha tentativa: ${journey.date}.` : 'Todavía no has elegido fecha.'}</p><button onClick={() => window.dispatchEvent(new Event('cv3:plan'))}>Revisar mi viaje</button></div></section>}
    {preferences.categories.geo_curiosities && <section className="notice-region"><h4><Compass size={20} />Una región, sin activar GPS.</h4><label>Quiero preparar un viaje a<select className="field" value={region} onChange={event => setRegion(event.target.value)}>{['Sierra', 'Costa', 'Amazonía', 'Galápagos'].map(value => <option key={value}>{value}</option>)}</select></label><p>{region === 'Amazonía' ? 'Antes de visitar una comunidad, coordina permiso, guía y protocolos. La navegación y las caminatas necesitan confirmar condiciones de acceso.' : region === 'Galápagos' ? 'Revisa por separado vuelos, tasas y condiciones de cada visita. Las áreas protegidas requieren confirmar sus reglas con la autoridad.' : region === 'Sierra' ? 'Altitud, clima y acceso cambian entre localidades. Consulta las condiciones antes de combinar paradas.' : 'Confirma condiciones del mar, embarcaciones y puntos de encuentro con un operador autorizado.'}</p><small>Consejo de preparación, no alerta actual ni detección de que estás en el lugar.</small></section>}
    <button className="notice-revoke" onClick={() => save(defaultNoticePreferences())}><BellOff size={17} />Desactivar todos los temas opcionales</button><p role="status" className="notice-status">{notice}</p></section>;
}
