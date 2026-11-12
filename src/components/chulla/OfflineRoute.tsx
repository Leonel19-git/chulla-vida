import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Backpack, Check, ChevronDown, Clock3, Download, Leaf, MapPin, Mountain, Phone, RefreshCw, Save, Thermometer, Users, Wallet, Wifi, WifiOff, Play, Pause } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { buildOfflineRoute, offlineRouteHtml, readOfflineRoute, routeDay, saveOfflineRoute } from '../../lib/offline-route';
import { Dialog } from './Dialog';
import { money } from './content';
import { RegionalRouteMap } from './RegionalRouteMap';
import { offlineLocale, translateOffline } from '../../i18n/offline';
import './offline-route.css';

export function OfflineRoute({ onClose }: { onClose: () => void }) {
  const { places, onboarding, setSelectedPlace, setIsOnboardingOpen, language } = useApp();
  const t = (literal: string, variables?: Record<string, string | number>) => translateOffline(language, literal, variables);
  const currentRoute = useMemo(() => buildOfflineRoute(places, onboarding), [places, onboarding]);
  const [initialSaved] = useState(readOfflineRoute);
  const [route, setRoute] = useState(initialSaved || currentRoute);
  const [isSaved, setIsSaved] = useState(Boolean(initialSaved));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [preview, setPreview] = useState(false);
  const [active, setActive] = useState(0);
  const [touring, setTouring] = useState(false);
  const [notice, setNotice] = useState('');
  const offlineView = !online || preview;
  const stop = route.stops[active];
  const source = stop && places.find(place => place.id === stop.id);

  useEffect(() => {
    if (!touring || !route.stops.length) return;
    const timer = window.setTimeout(() => {
      if (active >= route.stops.length - 1) setTouring(false);
      else setActive(index => index + 1);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [touring, active, route.stops.length]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const save = () => {
    const snapshot = { ...route, createdAt: new Date().toISOString() };
    const ok = saveOfflineRoute(snapshot);
    if (ok) setRoute(snapshot);
    setIsSaved(ok);
    setNotice(ok ? '¡De una! Ruta guardada en este navegador.' : 'No se pudo guardar aquí. Descarga el archivo para llevarlo.');
  };
  const download = () => {
    try {
      const html = offlineRouteHtml(route, language);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'mi-ruta-sin-internet-chulla-vida.html';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Archivo listo. Ábrelo desde Descargas para ver tu ruta sin internet.');
    } catch { setNotice('No se pudo preparar el archivo. Actualiza tu ruta e inténtalo otra vez.'); }
  };
  const update = () => { setTouring(false); setRoute(currentRoute); setIsSaved(false); setActive(0); setNotice('Ruta actualizada con tus gustos. Guárdala para llevarla.'); };
  return <Dialog title={t('Tu ruta va contigo')} onClose={onClose} wide>
    <div className={`offline-route ${offlineView ? 'is-offline-view' : ''}`}>
      <div className="offline-route-tools">
        <span className={`offline-connection ${online ? '' : 'lost'}`}>{online ? <Wifi size={15} /> : <WifiOff size={15} />}{t(online ? 'Con conexión' : 'Sin conexión')}</span>
        <button className="offline-mode-toggle" role="switch" aria-checked={offlineView} disabled={!online} onClick={() => setPreview(value => !value)}><WifiOff size={15} /><span>{t('Vista sin conexión')}</span><i aria-hidden="true" /></button>
      </div>
      <div className="offline-route-title"><h3>{t(offlineView ? 'Sin señal. Con plan.' : 'Arma el plan. Guarda la ruta.')}</h3><p>{t(offlineView && online ? 'Así se verá tu ruta cuando se vaya la señal.' : offlineView ? (isSaved ? 'Tu ruta guardada sigue aquí, pana.' : 'Aún no guardaste una ruta. Puedes llevarte esta propuesta.') : 'Tus paradas, gastos y datos clave, a la mano.')}</p></div>
      <div className="offline-origin"><MapPin size={18} /><div><small>{t('Punto de partida')}</small><strong>{route.origin}</strong></div><div className="offline-trip-facts"><span><Users size={15} />{route.people}</span><span><Clock3 size={15} />{route.days} {t('días')}</span></div></div>

      {route.stops.length ? <>
        <div className="offline-tour-controls"><button onClick={() => { if (touring) setTouring(false); else { setActive(0); setTouring(true); } }} aria-pressed={touring}>{touring ? <Pause size={16} /> : <Play size={16} />}{t(touring ? 'Pausar recorrido' : 'Recorrer mi ruta')}</button><span aria-live="polite">{t('Parada {number} de {count}', { number: active + 1, count: route.stops.length })}</span></div>
        <RegionalRouteMap stops={route.stops} active={active} origin={route.origin} language={language} touring={touring} onSelect={index => { setTouring(false); setActive(index); }} />
        <div className="offline-stop-tabs" role="group" aria-label={t('Paradas de la ruta')}>{route.stops.map((item, index) => <button key={item.id} className={active === index ? 'active' : ''} aria-pressed={active === index} onClick={() => { setTouring(false); setActive(index); }}><span>{index + 1}</span><div><strong>{item.title}</strong><small>{routeDay(item, language)}</small></div></button>)}</div>

        {stop && <section className="offline-stop-detail" key={stop.id} aria-label={`Datos de ${stop.title}`}>
          <div className="offline-stop-heading"><div><h4>{stop.title}</h4><p><MapPin size={13} />{stop.province} · {t(stop.region)}</p></div><span>{routeDay(stop, language)}</span></div>
          <div className="offline-stop-facts"><span><Clock3 size={18} /><strong>{stop.days} {t(stop.days === 1 ? 'día' : 'días')}</strong></span><span><Mountain size={18} /><strong>{t(stop.level)}</strong></span><span><Wallet size={18} /><strong>{money(stop.total)}<small>{t('el grupo')}</small></strong></span></div>
          <div className="offline-pack"><details><summary><Backpack size={16} />{t('Qué incluye')}<ChevronDown size={15} /></summary><ul>{stop.includes.map((item, index) => <li key={index}><Check size={14} />{t(item)}</li>)}</ul>{stop.excludes.length > 0 && <p>{t('Gastos aparte')}: {stop.excludes.map(item => t(item)).join(' · ')}</p>}</details><details><summary><Leaf size={16} />{t('Ve pilas')}<ChevronDown size={15} /></summary><p><Thermometer size={14} />{t(stop.climate)}</p><p><Mountain size={14} />{stop.altitude}</p><ul>{stop.eco.map((item, index) => <li key={index}><Leaf size={14} />{t(item)}</li>)}</ul>{stop.phone && <p><Phone size={14} />{stop.phone}</p>}</details></div>
          {source && <button className="text-button offline-source" onClick={() => { onClose(); setSelectedPlace(source); }}>{t('Ver ficha completa')}<ArrowUpRight size={15} /></button>}
        </section>}
        <div className="offline-budget"><div><Wallet size={18} /><span>{t('Experiencias')}<strong>{money(route.total)}</strong></span></div><div><Backpack size={18} /><span>{t('Te queda para extras')}<strong>{money(route.remaining)}</strong></span></div></div>
        <div className="offline-save-state"><span>{isSaved ? <Check size={15} /> : <Save size={15} />}{isSaved ? `${t('Guardada')} · ${new Date(route.createdAt).toLocaleDateString(offlineLocale(language), { timeZone: 'America/Guayaquil', day: 'numeric', month: 'short' })}` : t('Propuesta sin guardar')}</span><button className="text-button" onClick={update}><RefreshCw size={13} />{t('Actualizar ruta')}</button></div>
        <div className="offline-route-actions"><button className="button button-secondary" onClick={save}><Save size={17} />{t(isSaved ? 'Volver a guardar' : 'Guardar para el camino')}</button><button className="button button-primary" onClick={download}><Download size={17} />{t('Descargar ruta offline')}</button></div>
      </> : <div className="offline-empty"><MapPin size={35} /><h4>{t('Hagamos espacio para el paseo')}</h4><p>{t('Amplía tus días, región o presupuesto para encontrar paradas.')}</p><button className="button button-primary" onClick={() => { onClose(); setIsOnboardingOpen(true); }}>{t('Ajustar mi plan')}</button></div>}
      {notice && <p className="offline-route-notice" role="status"><Check size={16} />{t(notice)}</p>}
      <details className="offline-scope"><summary><WifiOff size={14} />{t('¿Qué llevo sin internet?')}<ChevronDown size={14} /></summary><p>{t('El archivo descargado abre sin red: esquema, paradas, precios y recomendaciones.')} {t('Guardar conserva esta ruta en este navegador; para abrir la app web por primera vez necesitas conexión.')} {t('Spotify, carreteras y datos en vivo necesitan señal.')}</p><p>{t('Ruta orientativa: confirma traslados, acceso y disponibilidad antes de salir. No calcula distancias ni tiempos por carretera.')}</p></details>
    </div>
  </Dialog>;
}
