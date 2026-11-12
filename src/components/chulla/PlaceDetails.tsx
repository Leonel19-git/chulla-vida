import { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, Check, ChevronDown, Clock3, Compass, Info, Leaf, MapPin, Mountain, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from './Dialog';
import { money, placeImage, shortTitle } from './content';

export function PlaceDetails() {
  const { t, selectedPlace: place, setSelectedPlace, setBookingPlace, savedPlaceIds, toggleSavedPlace } = useApp();
  const [tab, setTab] = useState('esencial');
  useEffect(() => { setTab('esencial'); }, [place?.id]);
  if (!place) return null;
  const saved = savedPlaceIds.includes(place.id);
  return <Dialog title={shortTitle(place)} onClose={() => setSelectedPlace(null)} wide>
    <img className="detail-image" src={placeImage(place)} alt={`Fotografía regional de referencia de ${place.region}`} />
    <div className="dialog-content compact-details">
      <p className="place-location"><MapPin size={15} />{place.canton_parroquia} · {place.provincia}</p>
      <div className="detail-quick-facts"><span><Clock3 size={19} /><strong>{place.duracion_dias} {t(place.duracion_dias === 1 ? 'día' : 'días')}</strong></span><span><Mountain size={19} /><strong>{t(place.nivel_aventura)}</strong></span><span><Users size={19} /><strong>{t("Hasta")} {place.cupos_disponibles_dia}</strong></span></div>
      <div className="detail-info-tabs" role="tablist" aria-label={t("Información de la experiencia")} onKeyDown={event => { const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']; if (!keys.includes(event.key)) return; event.preventDefault(); const tabs = ['esencial', 'incluye', 'tips']; const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(tabs[index]); document.getElementById(`detail-tab-${tabs[index]}`)?.focus({ preventScroll: true }); }}>{[{ value: 'esencial', label: 'Lo esencial', icon: Compass }, { value: 'incluye', label: 'Incluye', icon: Check }, { value: 'tips', label: 'Ve pilas', icon: Leaf }].map(({ value, label, icon: Icon }) => <button key={value} role="tab" tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} aria-controls="detail-info-panel" id={`detail-tab-${value}`} onClick={() => setTab(value)}><Icon size={17} />{t(label)}</button>)}</div>
      <div id="detail-info-panel" className="detail-info-panel" role="tabpanel" tabIndex={0} aria-labelledby={`detail-tab-${tab}`}>
        {tab === 'esencial' && <><p>{place.descripcion_corta}</p><details className="detail-story"><summary><Info size={17} />{t("La historia del lugar")}<ChevronDown size={16} /></summary><p>{place.historia_ancestral}</p></details><span className="detail-host"><Users size={16} />{place.comunidad_nombre}</span></>}
        {tab === 'incluye' && <><ul className="check-list">{place.que_incluye.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul>{place.que_no_incluye.length > 0 && <details className="detail-story"><summary><Info size={17} />{t("Gastos aparte")}<ChevronDown size={16} /></summary><ul className="plain-list">{place.que_no_incluye.map(item => <li key={item}>{item}</li>)}</ul></details>}</>}
        {tab === 'tips' && <><div className="detail-weather"><Mountain size={17} /><span>{place.altitud}</span><Leaf size={17} /><span>{place.clima}</span></div><ul className="check-list">{place.recomendaciones_eco.map(item => <li key={item}><Leaf size={16} />{item}</li>)}</ul>{place.preguntas_frecuentes.length > 0 && <div className="faq-list detail-mini-faq">{place.preguntas_frecuentes.map(item => <details key={item.pregunta}><summary>{item.pregunta}<ChevronDown size={16} /></summary><p>{item.respuesta}</p></details>)}</div>}</>}
      </div>
      <div className="detail-price-bar"><div><strong>{money(place.precio_base_pp)}</strong><span> {t("/ persona")}</span></div><div className="detail-price-actions"><button className={`button button-secondary ${saved ? 'is-saved' : ''}`} onClick={() => toggleSavedPlace(place.id)} aria-pressed={saved}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{t(saved ? 'Guardado' : 'Guardar')}</button><button className="button button-primary" onClick={() => { setSelectedPlace(null); setBookingPlace(place); }}>{t("Reservar y probar pago")}<ArrowRight size={16} /></button></div></div>
      <p className="detail-demo-note">{t("Demo · foto y precio orientativos. Confirma tu visita con el anfitrión.")}</p>
    </div>
  </Dialog>;
}
