import { useRef, useState } from 'react';
import { ArrowUpRight, Bus, Compass, MapPin, Navigation, Search, Ship, Trees } from 'lucide-react';
import type { Experience } from '../../domain/catalog';
import { REGION_LABELS } from '../../domain/catalog';
import { directionsUrl, isEcuadorReference, mapSearchUrl, osmEmbedUrl, type MapReference } from '../../domain/location';
import { searchWeatherLocalities, type WeatherLocality } from '../../domain/weather';
import { useConsent } from '../privacy/ConsentContext';
import { useCatalog } from '../catalog/CatalogContext';
import './location.css';

export function LocationPanel({ experience }: { experience: Experience }) {
  const { online } = useCatalog();
  const { preferences, update } = useConsent();
  const location = experience.locationInfo;
  const reference = location?.approximatePoint;
  const [point, setPoint] = useState<MapReference | null>(() => reference && isEcuadorReference(reference) ? reference : null);
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState(experience.locality.split(',')[0].slice(0, 80));
  const [results, setResults] = useState<WeatherLocality[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [origin, setOrigin] = useState('Quito');
  const request = useRef(0);
  const search = async () => {
    const id = ++request.current;
    setLoading(true); setNotice(''); setResults([]);
    try { const found = await searchWeatherLocalities(query, { online }); if (id !== request.current) return; setResults(found); if (!found.length) setNotice('No encontramos esa localidad. Prueba con el cantón o la ciudad de acceso.'); }
    catch { if (id === request.current) setNotice('No se pudo buscar la referencia. Puedes consultar la ubicación en un mapa externo.'); }
    finally { if (id === request.current) setLoading(false); }
  };
  return <section className="destination-location" aria-labelledby={`location-${experience.id}`}>
    <div className="location-intro"><div className="location-title-icon"><MapPin size={25} /></div><div><h3 id={`location-${experience.id}`}>Aquí empieza el camino.</h3><p>{experience.locality}<br /><strong>{experience.province} · {REGION_LABELS[experience.localizedRegion]}</strong></p></div></div>
    <div className="location-layout"><div className="location-route"><h4><Compass size={18} />Cómo llegar</h4><p>{location?.accessSummary || 'La fuente identifica esta localidad, pero no confirma el recorrido ni un punto de encuentro. Coordina el acceso con un anfitrión autorizado antes de salir.'}</p>{location?.transportOptions?.length ? <ol>{location.transportOptions.map((option, index) => <li key={index}><span className="location-step-icon">{/canoa|lancha|barco/i.test(option.mode) ? <Ship size={19} /> : /pie|camina/i.test(option.mode) ? <Trees size={19} /> : <Bus size={19} />}</span><div><strong>{option.label}</strong><span>{[option.durationLabel, option.priceLabel].filter(Boolean).join(' · ')}</span><p>{option.notes}</p></div></li>)}</ol> : <p className="location-unconfirmed">Transporte, horarios y tarifas: por confirmar. No calculamos un trayecto ni inventamos transporte incluido.</p>}<label className="location-origin">Tu ciudad de salida<input className="field" value={origin} onChange={event => setOrigin(event.target.value)} maxLength={80} /></label><a className="button button-secondary" href={directionsUrl(origin, experience.locality, experience.province)} target="_blank" rel="noreferrer">Consultar trayecto en Maps<ArrowUpRight size={16} /></a><small>Se abrirá una búsqueda externa por localidad. Verifica el destino: no es un punto de encuentro ni una ruta validada.</small></div>
      <div className="location-map"><div className="location-map-stage">{online && enabled && preferences?.media && point ? <iframe title={`Mapa de referencia de ${point.label}`} src={osmEmbedUrl(point)} loading="lazy" referrerPolicy="no-referrer" /> : <div className="location-map-placeholder"><svg viewBox="0 0 400 260" aria-hidden="true"><path d="M0 60Q100 0 190 85T400 50M0 115Q110 45 220 120T400 95M0 180Q110 100 210 185T400 170M0 235Q120 150 225 240T400 220" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M195 0Q130 70 210 130T200 260" fill="none" stroke="#efb22c" strokeWidth="5" strokeDasharray="8 9" /></svg><MapPin size={44} /><strong>{point ? point.label : experience.province}</strong><span>{point ? 'Referencia aproximada de la localidad' : 'Elige una referencia antes de mostrar el mapa'}</span>{online && point && <button className="button button-primary" onClick={() => { update({ ...preferences, media: true }); setEnabled(true); }}>Activar mapa externo</button>}{!online && <span>Sin señal · conserva la información de acceso descargada.</span>}</div>}</div>
      {point && <p className="location-point-note">Marcador de referencia aproximada. No es GPS de llegada, entrada de reserva ni punto de encuentro. {point.sourceUrl && <a href={point.sourceUrl} target="_blank" rel="noreferrer">Fuente de la referencia<ArrowUpRight size={13} /></a>}</p>}
      <details className="location-search"><summary><Search size={16} />{point ? 'Buscar otra localidad de referencia' : 'Buscar localidad para el mapa'}</summary><p>Se envía el nombre a Open-Meteo. Elige el resultado correcto; no se solicita tu ubicación.</p><div><input className="field" aria-label="Localidad para el mapa" value={query} maxLength={80} onChange={event => { ++request.current; setQuery(event.target.value); setResults([]); setLoading(false); }} /><button className="button button-secondary" disabled={!online || loading || query.trim().length < 2} onClick={search}>{loading ? 'Buscando…' : 'Buscar referencia'}</button></div>{results.length > 0 && <ul>{results.map(result => <li key={result.id}><button onClick={() => { setPoint({ lat: result.lat, lon: result.lon, label: `${result.placeName} · ${result.province}`, sourceUrl: 'https://open-meteo.com/en/docs/geocoding-api', checkedAt: new Date().toISOString().slice(0, 10) }); setEnabled(false); setResults([]); setNotice('Referencia elegida. Activa el mapa si quieres cargar OpenStreetMap.'); }}>{result.placeName} · {result.province}<MapPin size={16} /></button></li>)}</ul>}<p role="status">{notice}</p></details><a className="location-external" href={mapSearchUrl(experience.locality, experience.province)} target="_blank" rel="noreferrer">Buscar este lugar en OpenStreetMap<ArrowUpRight size={15} /></a><small>El mapa externo requiere internet y medios externos permitidos. Atribución: © OpenStreetMap contributors. No se guarda para uso offline.</small></div></div>
      {location?.references?.length ? <details className="location-sources"><summary>Fuentes para preparar el acceso</summary><ul>{location.references.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} /></a><span>Consultada: {source.checkedAt}</span></li>)}</ul></details> : null}
  </section>;
}
