import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, Clock3, Compass, Heart, Leaf, MapPin, Mountain, PlayCircle, Search, Settings2, SlidersHorizontal, Users, Waves, WifiOff, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Place } from '../../types';
import { matchesPreferences, rankPlaces } from '../../lib/recommendations';
import { money, normalize, placeImage, shortTitle } from './content';
import { Dialog } from './Dialog';
import { RegionalSpotlight } from './RegionalSpotlight';
import { CatalogExplorer, CatalogSaved } from '../../features/catalog/CatalogExplorer';

export function ExperienceCard({ place }: { place: Place }) {
  const { t, savedPlaceIds, toggleSavedPlace, setSelectedPlace } = useApp();
  const saved = savedPlaceIds.includes(place.id);
  return <article className="experience-card" data-region={place.region}>
    <div className="experience-photo">
      <button className="photo-link" onClick={() => setSelectedPlace(place)} aria-label={t("Conocer {place}", { place: shortTitle(place) })}><img src={placeImage(place)} onError={e => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = 'true'; e.currentTarget.src = '/images/quilotoa.jpg'; } }} alt={`Paisaje de ${t(place.region)}, imagen de referencia`} loading="lazy" width="640" height="420" /></button>
      <span className="region-label">{t(place.region)}</span>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={`${saved ? 'Quitar de' : 'Añadir a'} guardados: ${shortTitle(place)}`} aria-pressed={saved} onClick={() => toggleSavedPlace(place.id)}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <div className="experience-body">
      <p className="place-location"><MapPin size={13} />{place.provincia} · {place.canton_parroquia.split('/')[0].trim()}</p>
      <h3><button onClick={() => setSelectedPlace(place)}>{shortTitle(place)}</button></h3>
      <div className="experience-meta"><span title={t("Duración")}><Clock3 size={14} />{place.duracion_dias} {t(place.duracion_dias === 1 ? 'día' : 'días')}</span><span title={t("Intensidad de la aventura")}><Mountain size={14} />{t(place.nivel_aventura)}</span><span title={`Grupos de hasta ${place.cupos_disponibles_dia} personas`} aria-label={`Hasta ${place.cupos_disponibles_dia} personas`}><Users size={14} />{t("Hasta")} {place.cupos_disponibles_dia}</span></div>
      <div className="experience-bottom"><span className="experience-price"><strong>{money(place.precio_base_pp)}</strong><small>{t("por persona")}</small></span><button className="experience-link" onClick={() => setSelectedPlace(place)} aria-label={t("Ver experiencia {place}", { place: shortTitle(place) })}>{t("Conocer")}<ArrowUpRight size={17} /></button></div>
    </div>
  </article>;
}


export function Explore(props: { onPlan: () => void; onIntro: () => void; onOffline: () => void }) {
  const [demo, setDemo] = useState(false);
  return demo ? <><div className="v3-catalog-note"><p><strong>Catálogo anterior de demostración.</strong> Negocios, reseñas, pagos, confirmaciones y sellos de esta sección son ficticios y solo se guardan en este navegador.</p><button className="button button-secondary" onClick={() => setDemo(false)}>Volver a las 33 fichas de V3</button></div><LegacyExplore {...props} /></> : <CatalogExplorer onPlan={() => window.dispatchEvent(new Event('cv3:plan'))} onDownloads={() => window.dispatchEvent(new Event('cv3:downloads'))} onDemo={() => setDemo(true)} />;
}
function LegacyExplore({ onPlan, onIntro, onOffline }: { onPlan: () => void; onIntro: () => void; onOffline: () => void }) {
  const { t, places, selectedRegion, setSelectedRegion, searchQuery, setSearchQuery, onboarding, setIsOnboardingOpen } = useApp();
  const [sort, setSort] = useState('recommended');
  const [filters, setFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(200);
  const [level, setLevel] = useState('Todas');
  const [duration, setDuration] = useState(14);
  const [interest, setInterest] = useState('Todas');
  const filtered = rankPlaces(places, onboarding).filter(p => (selectedRegion === 'Todas' || p.region === selectedRegion) && normalize([p.titulo, p.provincia, p.comunidad_nombre, p.descripcion_corta, ...p.etiquetas].join(' ')).includes(normalize(searchQuery.trim())) && p.precio_base_pp <= maxPrice && p.duracion_dias <= duration && (level === 'Todas' || p.nivel_aventura === level) && (interest === 'Todas' || normalize([p.titulo, p.descripcion_corta, ...p.etiquetas].join(' ')).includes(normalize(interest))));
  if (sort === 'price') filtered.sort((a, b) => a.precio_base_pp - b.precio_base_pp);
  if (sort === 'duration') filtered.sort((a, b) => a.duracion_dias - b.duracion_dias);
  const activeFilters = maxPrice < 200 || level !== 'Todas' || duration < 14 || interest !== 'Todas';
  return <>
    <section className="discovery-hero" aria-labelledby="hero-title">
      <img className="hero-photo" src="/images/hero.jpg" alt="Agua turquesa y montañas alrededor de la laguna del Quilotoa, Ecuador" fetchPriority="high" width="1800" height="1100" />
      <div className="hero-shade" />
      <div className="hero-copy"><h1 id="hero-title">{t("Ecuador te espera.")}<br />{t("Sal a vivirlo.")}</h1><p>{t("Tu próximo plan, con gente de aquí.")}</p><div className="hero-actions"><button className="button hero-button" onClick={() => setIsOnboardingOpen(true)}>{t("Planificar mi viaje")}<ArrowUpRight size={18} /></button><button className="hero-watch" onClick={onOffline}><WifiOff size={19} />{t("Ruta sin señal")}</button></div><span className="hero-note"><Leaf size={14} />{t("Viaja con respeto. Apoya lo local.")}</span></div>
      <span className="hero-location"><MapPin size={15} />{t("Quilotoa, Cotopaxi")}</span>
    </section>
    <section className="trip-strip" aria-label={t("Tus preferencias de viaje")}>
      <div className="trip-strip-icon"><Compass size={23} /></div><div className="trip-strip-label"><strong>{t("Tu viaje, a tu ritmo")}</strong><span>{t(onboarding.completado ? 'Un punto de partida hecho para ti' : 'Cuéntanos qué te mueve')}</span></div>
      <div className="trip-strip-values"><span><Users size={15} />{onboarding.cantidad_personas} {t("wambras")}</span><span><Clock3 size={15} />{onboarding.dias_disponibles} {t("días")}</span><span>{money(onboarding.presupuesto_max)} {t("en total")}</span></div>
      <button className="text-button" onClick={onboarding.completado ? onPlan : () => setIsOnboardingOpen(true)}>{t(onboarding.completado ? 'Ver mi ruta' : 'Personalizar')}<ArrowRight size={16} /></button>
    </section>
    <section className="discovery-section" data-region={selectedRegion} id="experiencias" aria-labelledby="experience-heading">
      <div className="section-heading"><div><h2 id="experience-heading">{t("¿A dónde nos vamos?")}</h2><p>{t("Elige un destino y arranca.")}</p></div><span className="catalog-note"><Leaf size={14} />{t("Turismo con sentido")}</span></div>
      <RegionalSpotlight region={selectedRegion} /><div className="discovery-tools"><button className={`button button-secondary filter-button ${filters ? 'selected' : ''}`} aria-expanded={filters} aria-controls="discovery-filters" onClick={() => setFilters(!filters)}><SlidersHorizontal size={16} />{t("Filtros")}{activeFilters && <span className="filter-dot" />}</button></div>
      <div className="search-sort"><label className="search-field"><Search size={17} /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("Busca un destino, una comunidad, una historia…")} aria-label={t("Buscar experiencias")} />{searchQuery && <button className="icon-button" aria-label={t("Borrar búsqueda")} onClick={() => setSearchQuery('')}><X size={16} /></button>}</label><label className="sort-field"><span>{t("Ordenar:")}</span><select aria-label={t("Ordenar experiencias")} value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">{t("Para ti")}</option><option value="price">{t("Menor precio")}</option><option value="duration">{t("Escapada corta")}</option></select><ChevronDown size={13} /></label></div>
      {filters && <div className="discovery-filters" id="discovery-filters"><label className="field-label">{t("Precio máximo por persona")}<select className="field" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}><option value={200}>{t("Cualquier precio")}</option><option value={20}>{t("Hasta $20")}</option><option value={30}>{t("Hasta $30")}</option><option value={40}>{t("Hasta $40")}</option><option value={50}>{t("Hasta $50")}</option></select></label><label className="field-label">{t("Intensidad")}<select className="field" value={level} onChange={e => setLevel(e.target.value)}><option value="Todas">{t("Todas")}</option><option value="Tranqui">{t("Tranqui")}</option><option value="Moderado">{t("Moderado")}</option><option value="Adrenalina">{t("Adrenalina")}</option></select></label><label className="field-label">{t("Duración máxima")}<select className="field" value={duration} onChange={e => setDuration(+e.target.value)}><option value={14}>{t("Sin límite")}</option><option value={1}>{t("1 día")}</option><option value={2}>{t("2 días")}</option><option value={3}>{t("3 días")}</option></select></label><label className="field-label">{t("Interés")}<select className="field" value={interest} onChange={e => setInterest(e.target.value)}><option value="Todas">{t("Todas")}</option><option value="cultura">{t("Cultura")}</option><option value="bosque">{t("Naturaleza")}</option><option value="gastronom">{t("Gastronomía")}</option><option value="sender">{t("Senderismo")}</option></select></label><button className="text-button" onClick={() => { setMaxPrice(200); setLevel('Todas'); setDuration(14); setInterest('Todas'); }}>{t("Limpiar filtros")}</button></div>}
      <div className="results-count" aria-live="polite"><span>{t("{count} experiencias para descubrir", { count: filtered.length })}</span>{onboarding.completado && <button className="text-button" onClick={() => setIsOnboardingOpen(true)}><Settings2 size={13} />{t("Ajustar mis gustos")}</button>}</div>
      {filtered.length ? <div className="experience-grid">{filtered.map(place => <ExperienceCard key={place.id} place={place} />)}</div> : <div className="empty-state"><Search size={32} /><h3>{t("Aún hay mucho por descubrir")}</h3><p>{t("Prueba otra región o amplía tu búsqueda.")}</p><button className="button button-primary" onClick={() => { setSearchQuery(''); setSelectedRegion('Todas'); setMaxPrice(200); setLevel('Todas'); setDuration(14); setInterest('Todas'); }}>{t("Ver todas las experiencias")}</button></div>}
      <p className="catalog-footnote">{t("Catálogo de demostración · Precios orientativos · Fotografías de referencia de cada región.")}</p>
    </section>
  </>;
}

export function SavedView() {
  return <><CatalogSaved /><details className="v3-detail-section"><summary>Guardados del catálogo demo anterior</summary><LegacySavedView /></details></>;
}
function LegacySavedView() {
  const { t, places, savedPlaceIds, setActiveTab } = useApp();
  const saved = places.filter(p => savedPlaceIds.includes(p.id));
  return <section><div className="page-heading"><h1>{t("Esos lugares que te esperan")}</h1><p>{t("Tus favoritos, juntos. Porque una buena escapada empieza con una idea.")}</p></div>{saved.length ? <div className="experience-grid">{saved.map(p => <ExperienceCard key={p.id} place={p} />)}</div> : <div className="empty-state"><Bookmark size={38} /><h2>{t("Tu próxima historia puede empezar aquí")}</h2><p>{t("Toca el corazón en una experiencia para guardarla y volver cuando quieras.")}</p><button className="button button-primary" onClick={() => setActiveTab('feed')}>{t("Explorar Ecuador")}<ArrowRight size={17} /></button></div>}</section>;
}

export function TripPlan({ onClose }: { onClose: () => void }) {
  const { t, places, onboarding, setSelectedPlace, setIsOnboardingOpen } = useApp();
  let budget = onboarding.presupuesto_max;
  let days = onboarding.dias_disponibles;
  const route: Place[] = [];
  for (const p of rankPlaces(places, onboarding)) {
    const cost = p.precio_base_pp * onboarding.cantidad_personas;
    if (matchesPreferences(p, onboarding) && p.duracion_dias <= days && cost <= budget) { route.push(p); budget -= cost; days -= p.duracion_dias; }
    if (route.length >= 3) break;
  }
  const total = onboarding.presupuesto_max - budget;
  const download = () => {
    const text = ['CHULLA VIDA · Mi ruta', `Desde ${onboarding.origen || 'Ecuador'} · ${onboarding.cantidad_personas} personas · ${onboarding.dias_disponibles} días`, ...route.map((p, i) => `${i + 1}. ${shortTitle(p)} · ${p.provincia} · ${p.duracion_dias} días · ${money(p.precio_base_pp * onboarding.cantidad_personas)} grupo`), `Total experiencias: ${money(total)}`, `Presupuesto restante para traslados y otros gastos: ${money(budget)}`, 'Propuesta orientativa. Confirma traslados, disponibilidad e inclusiones con cada anfitrión.'].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'mi-ruta-chulla-vida.txt'; a.click(); URL.revokeObjectURL(url);
  };
  return <Dialog title={t("Una ruta muy tuya")} onClose={onClose} wide><div className="dialog-content"><p className="muted">{t("Desde")} {onboarding.origen || 'Ecuador'} · {onboarding.cantidad_personas} {t("wambras · hasta")} {onboarding.dias_disponibles} {t("días ·")} {money(onboarding.presupuesto_max)} {t("para el grupo")}</p><div className="plan-interests">{onboarding.pasiones.map(p => <span className="soft-tag" key={p}>{p}</span>)}</div>{route.length ? <ol className="itinerary-list">{route.map((p, i) => <li key={p.id}><span className="itinerary-number">{i + 1}</span><img src={placeImage(p)} alt="Paisaje de referencia" /><div><h3>{shortTitle(p)}</h3><p>{p.provincia} · {p.duracion_dias} {t(p.duracion_dias === 1 ? 'día' : 'días')}</p><button className="text-button" onClick={() => { onClose(); setSelectedPlace(p); }}>{t("Conocer experiencia")}<ArrowUpRight size={14} /></button></div><strong>{money(p.precio_base_pp * onboarding.cantidad_personas)}</strong></li>)}</ol> : <div className="empty-state"><Compass size={30} /><h3>{t("Probemos con un poco más de margen")}</h3><p>{t("No hay experiencias de esa región que encajen en tus días y presupuesto.")}</p></div>}<div className="plan-totals"><div><span>{t("Experiencias para el grupo")}</span><strong>{money(total)}</strong></div><div><span>{t("Disponible para transporte y otros gastos")}</span><strong>{money(budget)}</strong></div></div><p className="small-note">{t("Propuesta orientativa: los trayectos, horarios y distancias por carretera no están calculados. La cercanía elegida (")}{onboarding.distancia_max || 1000} {t("km) queda como preferencia para revisar al organizar los traslados.")}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => { onClose(); setIsOnboardingOpen(true); }}>{t("Ajustar mi viaje")}</button><button className="button button-primary" disabled={!route.length} onClick={download}><Check size={17} />{t("Guardar mi ruta")}</button></div></div></Dialog>;
}
