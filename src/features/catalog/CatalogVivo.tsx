import { lazy, Suspense, useEffect, useId, useRef, useState, type ComponentType, type CSSProperties } from 'react';
const MoneyFlow = lazy(() => import('../transparency/MoneyFlow').then(module => ({ default: module.MoneyFlow })));
import { experienceVisual } from './experienceArt';
import { prefersReducedMotion, useReveal } from '../../components/common/motion';
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, ChevronRight, Clock3, Compass, Download, Heart, Info, Leaf, MapPin, Mic, Mountain, PawPrint, Search, ShieldCheck, SlidersHorizontal, Trees, Waves, X } from 'lucide-react';
import { catalogSourceDownload, catalogSources, filterExperiences, formatExperiencePrice, REGION_LABELS, type Experience, type RegionId } from '../../domain/catalog';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../../components/chulla/Dialog';
import { LocationPanel } from '../location/LocationPanel';
import { useCatalog } from './CatalogContext';
import { HeroVideo } from './HeroVideo';
import { PhotoStories, QuickStart } from '../discovery/YouthDiscovery';
import { NoteChip, Rail } from './Rail';
import './catalog.css';
import './vivo.css';
import './vivo-2026.css';
import './compact.css';
import '../discovery/expressive.css';

import { useT, msg } from '../../i18n/v3';
import { SpanishContentNote } from '../../i18n/v3/SpanishContentNote';
const icons = { sierra: Mountain, costa: Waves, amazonia: Trees, galapagos: Compass };
const REGION_SAYINGS = {
  sierra: msg('Achachay… ¡pero qué vista!'), costa: msg('¡Vamos, ve! El mar nos espera.'),
  amazonia: msg('Desconecta un rato, pana.'), galapagos: msg('¡Qué bacán este Ecuador!'),
};
const money = (value: number, currency = 'USD') => new Intl.NumberFormat('es-EC', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

type BuyButtonProps = { experience: Experience; variant?: 'card' | 'detail' };
const BuyButton = lazy((): Promise<{ default: ComponentType<BuyButtonProps> }> => import('../payments/BuyButton').then(module => ({ default: module.BuyButton as ComponentType<BuyButtonProps> })).catch(() => ({ default: () => null })));

/** En la tarjeta, un rango «USD 239–300» se lee «Desde USD 239»; el rango completo está en la ficha. */
export function shortCardPrice(price: string, from = 'Desde'): string {
  const range = /^(USD|EUR|US\$|\$)\s?([\d.,]+)\s?[–-]\s?(?:USD|EUR|\$)?\s?[\d.,]+$/.exec(price.trim());
  return range ? `${from} ${range[1]} ${range[2]}` : price;
}
/** «1 día (aprox. 7:00 a 17:00)» → «1 día»: el horario completo vive en la ficha. */
export function shortDuration(label: string): string {
  return label.replace(/\s*\(.*$/, '').replace(/\s*[·,;].*$/, '').trim() || label;
}
/**
 * Tarjeta compacta: foto, región, corazón, nombre, dos datos con icono, precio y «Comprar».
 * El resumen, la fuente y los avisos viven en la ficha (se abre al tocar la foto o el nombre).
 */
export function CatalogCard({ experience, index = 0 }: { experience: Experience; index?: number }) {
  const t = useT();
  const visual = experienceVisual(experience);
  const { saved, toggle, select } = useCatalog();
  const selected = saved.includes(experience.id);
  const Icon = icons[experience.localizedRegion];
  const [priceFull, priceKind] = formatExperiencePrice(experience).replace(' por persona', '').split(' · ');
  // «Desde» va en la línea pequeña: así la cifra entera cabe en tarjetas de 300 px («Desde US…» se cortaba).
  // En un rango, «Referencial» se omite aquí (no cabe junto a «Comprar»): lo dicen el chip «Precios referenciales» y la ficha.
  const priceShort = shortCardPrice(priceFull, '');
  const isRange = priceShort !== priceFull;
  const priceAmount = isRange ? priceShort.trim() : priceFull;
  const priceNote = priceKind === 'referencial' ? 'Referencial' : priceKind === 'propuesta' ? 'Propuesto' : priceKind === 'oferta verificada' ? 'Verificado' : undefined;
  return <article className="vivo-card cv-card" data-tour="card" data-vivo-region={experience.localizedRegion} data-region-tone={experience.localizedRegion} style={{ '--i': index % 9 } as CSSProperties}>
    <div className="vivo-card-photo"><button onClick={() => select(experience.id)} aria-label={t("Conocer {title}", { title: experience.title })} title={visual.credit ? t("Foto: {credit}", { credit: visual.credit }) : undefined}><img src={visual.src} srcSet={visual.srcSet} sizes={visual.srcSet ? '(max-width:700px) 80vw, (max-width:1200px) 40vw, 300px' : undefined} alt={visual.alt} loading="lazy" decoding="async" width="640" height="400" /></button><span className="vivo-region"><Icon size={14} aria-hidden="true" />{REGION_LABELS[experience.localizedRegion]}</span><button className={`vivo-save ${selected ? 'is-saved' : ''}`} aria-label={`${selected ? 'Quitar' : 'Guardar'} ${experience.title}`} aria-pressed={selected} onClick={() => toggle(experience.id)}><Heart size={18} fill={selected ? 'currentColor' : 'none'} /></button>{!visual.photo && <span className="cv-card-art">{t(visual.referencePhoto ? "Foto de referencia" : "Ilustración")}</span>}</div>
    <div className="vivo-card-body"><p className="vivo-card-location"><MapPin size={13} aria-hidden="true" />{experience.province}</p><h3><button onClick={() => select(experience.id)}>{experience.title}</button></h3><div className="vivo-card-facts"><span title={experience.duration.label}><Clock3 size={14} aria-hidden="true" />{shortDuration(experience.duration.label)}</span><span><Mountain size={14} aria-hidden="true" />{experience.difficultyLabel}</span></div><div className="cv-card-foot"><strong className="cv-card-price" title={t("Precio por persona. Lo confirma el anfitrión")}>{priceAmount}{(isRange || priceNote) && <small>{isRange ? (priceNote && priceNote !== 'Referencial' ? `${t("Desde")} · ${priceNote}` : t("Desde")) : priceNote}</small>}</strong><Suspense fallback={null}><BuyButton experience={experience} variant="card" /></Suspense></div></div>
  </article>;
}

const HomeIntro = lazy(() => import('./HomeStory').then(module => ({ default: module.HomeIntro })));
const HomeOutro = lazy(() => import('./HomeStory').then(module => ({ default: module.HomeOutro })));
const REGION_ORDER: RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];
function HomeSkeleton() {
  const t = useT(); return <div className="cv-skeleton-block" role="status" aria-label={t("Cargando")}><span className="cv-skeleton" /><span className="cv-skeleton" /><span className="cv-skeleton" /></div>; }

interface HeroVisual { src: string; srcSet?: string; alt: string; place: string; credit: string | null; photo: boolean }
const HERO_DEFAULT: HeroVisual = { src: '/images/hero-1280.webp', srcSet: '/images/hero-640.webp 640w, /images/hero-1280.webp 1280w', alt: 'Laguna del Quilotoa entre las montañas de Ecuador', place: 'Quilotoa, Cotopaxi', credit: 'Annom · Dominio público', photo: true };
const HERO_COAST: HeroVisual = { src: '/images/coast-1280.webp', srcSet: '/images/coast-640.webp 640w, /images/coast-1280.webp 1280w', alt: 'Laguna de Agua Blanca en el Parque Nacional Machalilla, Manabí', place: 'Agua Blanca, Manabí', credit: 'Delphine Ménard · CC BY-SA 2.0 FR', photo: true };
/** Foto del héroe por región: una foto real grande de una ficha; si no hay, la foto regional con crédito; si tampoco, la ilustración propia. */
function heroVisual(region: RegionId | null, records: Experience[]): HeroVisual {
  if (!region || region === 'sierra') return HERO_DEFAULT;
  const inRegion = records.filter(item => item.localizedRegion === region);
  for (const item of inRegion) {
    const visual = experienceVisual(item);
    const large = visual.photo && visual.srcSet ? visual.srcSet.split(', ')[1]?.split(' ')[0] : undefined;
    if (large) return { src: large, srcSet: visual.srcSet, alt: visual.alt, place: `${item.locality || item.title}, ${item.province}`, credit: visual.credit, photo: true };
  }
  if (region === 'costa') return HERO_COAST;
  const first = inRegion[0];
  if (!first) return HERO_DEFAULT;
  const art = experienceVisual(first);
  return { src: art.src, alt: art.alt, place: `${REGION_LABELS[region]} · ${first.province}`, credit: art.photo ? art.credit : 'original de CHULLA VIDA', photo: art.photo };
}

export function CatalogExplorer({ onPlan, onDownloads }: { onPlan: () => void; onDownloads: () => void; onDemo: () => void }) {
  const t = useT();
  const { records, online } = useCatalog();
  const { selectedRegion, setSelectedRegion, searchQuery, setSearchQuery } = useApp();
  const [filters, setFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
  const [days, setDays] = useState('');
  const [province, setProvince] = useState('');
  const [sort, setSort] = useState('source');
  const [pet, setPet] = useState(false);
  const region = (Object.entries(REGION_LABELS).find(([, label]) => label === selectedRegion)?.[0] ?? 'all') as RegionId | 'all';
  useEffect(() => {
    if (province && !records.some(item => item.province === province && (region === 'all' || item.localizedRegion === region))) setProvince('');
  }, [province, region, records]);
  let visible = filterExperiences({ query: searchQuery, region, ...(maxPrice ? { maxPrice: +maxPrice, currency } : {}), ...(days ? { maxDays: +days } : {}) }, records).filter(item => (!province || item.province === province) && (!pet || item.petPolicy.status === 'confirmed_allowed' && item.petPolicy.confirmedBy && item.petPolicy.confirmedAt));
  if (sort === 'name') visible = [...visible].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  if (sort === 'price') visible = [...visible].sort((a, b) => a.price.currency.localeCompare(b.price.currency) || (a.price.min ?? Infinity) - (b.price.min ?? Infinity));
  const provinces = [...new Set(records.filter(item => region === 'all' || item.localizedRegion === region).map(item => item.province))].sort();
  /** Sin filtros: un carrusel por región. Con cualquier filtro, búsqueda u orden: la lista de resultados. */
  const browsing = region === 'all' && !searchQuery.trim() && !maxPrice && !days && !province && !pet && sort === 'source';
  const reset = () => { setSelectedRegion('Todas'); setSearchQuery(''); setMaxPrice(''); setDays(''); setProvince(''); setPet(false); setSort('source'); };
  const [preview, setPreview] = useState<RegionId | null>(null);
  const heroRegion = preview ?? (region === 'all' ? null : region);
  const hero = heroVisual(heroRegion, records);
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const scrollToList = () => document.getElementById('experiencias')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  const goToRegion = (id: RegionId) => { setSelectedRegion(REGION_LABELS[id]); setProvince(''); setSearchQuery(''); scrollToList(); };
  const chooseRegion = (id: RegionId | 'all') => { setSelectedRegion(id === 'all' ? 'Todas' : REGION_LABELS[id]); setProvince(''); };
  return <div className="vivo-catalog cv-compact cv-youth" ref={rootRef}>
    <section className="vivo-hero cv-hero" data-tour="album" aria-labelledby="hero-title" data-region-tone={heroRegion ?? undefined}><img key={hero.src} className="vivo-hero-photo" src={hero.src} srcSet={hero.srcSet} sizes="(max-width:760px) 100vw, 80vw" width="1280" height="782" alt={hero.alt} fetchPriority="high" />{!heroRegion && <HeroVideo />}<div className="vivo-hero-shade" /><div className="vivo-hero-copy"><h1 id="hero-title" tabIndex={-1}>{t("Un país.")}<br />{t("Mil formas de")}{' '}<em>{t("vivirlo.")}</em></h1><p>{t("Cumbres, río, bosque y mar.")}</p><div className="vivo-hero-actions"><a className="vivo-primary" href="#experiencias">{t("Encuentra tu aventura")}<ArrowDown size={19} /></a><button className="vivo-voice-hero" onClick={() => window.dispatchEvent(new Event('cv3:plan'))}><span className="cv-pulse"><Compass size={21} /></span>{t("Arma tu viaje")}</button></div><div className="vivo-hero-place cv-hero-place"><span><MapPin size={14} aria-hidden="true" />{hero.place}</span>{(hero.credit || !heroRegion) && <details className="cv-hero-credit"><summary>{t("Créditos")}</summary><p>{hero.credit && <>{hero.photo ? t("Foto") : t("Ilustración")}: {hero.credit}</>}{!heroRegion && <>{hero.credit && ' · '}<a href="/video/CREDITS.md" target="_blank" rel="noreferrer">{t("Créditos del video")}</a></>}</p></details>}</div></div><div className="cv-hero-regions" role="group" aria-label={t("Explora por región")} data-tour="regions">{REGION_ORDER.map(id => { const RegionIcon = icons[id]; const count = records.filter(item => item.localizedRegion === id).length; return <button key={id} data-region-tone={id} aria-label={`${REGION_LABELS[id]}, ${count} ${count === 1 ? 'ficha' : 'fichas'}`} aria-pressed={region === id} onMouseEnter={() => setPreview(id)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(id)} onBlur={() => setPreview(null)} onClick={() => goToRegion(id)}><RegionIcon size={20} /><span><strong>{REGION_LABELS[id]}</strong><small>{count}</small></span></button>; })}</div></section>
    <QuickStart onPlan={onPlan} onDownloads={onDownloads} />
    <details className="cv-how-fold"><summary>{t('Así funciona CHULLA VIDA')}<ChevronRight size={18} aria-hidden="true" /></summary><Suspense fallback={<HomeSkeleton />}><HomeIntro onRegion={goToRegion} /></Suspense></details>
    <section id="experiencias" className="vivo-discovery cv-discovery" aria-labelledby="experience-heading"><div className="cv-section-head"><h2 id="experience-heading">{t("¿Qué historia quieres vivir?")}</h2><p>{online ? t("{length} fichas en 4 regiones", { length: records.length }) : t("{length} fichas guardadas · sin conexión", { length: records.length })}</p></div>
      <div className="vivo-searchbar" data-tour="search"><label><Search size={20} /><input aria-label={t("Buscar experiencias")} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t("Busca un lugar")} />{searchQuery && <button aria-label={t("Borrar búsqueda")} onClick={() => setSearchQuery('')}><X size={17} /></button>}</label><button data-tour="filters" aria-expanded={filters} aria-controls="vivo-filters" onClick={() => setFilters(!filters)}><SlidersHorizontal size={18} aria-hidden="true" /><span className="cv-narrow-sr">{t("Filtros")}</span></button><label className="vivo-sort"><span className="sr-only">{t("Ordenar experiencias")}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="source">{t("Destacadas")}</option><option value="name">{t("Nombre")}</option><option value="price">{t("Precio")}</option></select></label></div>
      <div className="cv-region-chips" role="group" aria-label={t("Filtrar por región")}><button aria-pressed={region === 'all'} onClick={() => chooseRegion('all')}><Compass size={16} aria-hidden="true" />{t("Todo")}</button>{REGION_ORDER.map(id => { const ChipIcon = icons[id]; return <button key={id} data-region-tone={id} aria-pressed={region === id} onClick={() => chooseRegion(id)}><ChipIcon size={16} aria-hidden="true" />{REGION_LABELS[id]}</button>; })}</div>
      {filters && <div className="vivo-filters" id="vivo-filters"><label>{t("Provincia")}<select className="field" value={province} onChange={event => setProvince(event.target.value)}><option value="">{t("Todas las provincias")}</option>{provinces.map(item => <option key={item}>{item}</option>)}</select></label><label>{t("Precio base máximo")}<select className="field" value={maxPrice} onChange={event => setMaxPrice(event.target.value)}><option value="">{t("Cualquier precio")}</option>{[20, 50, 100, 300, 600, 2000].map(amount => <option key={amount} value={amount}>{t("Hasta")}{' '}{amount}</option>)}</select></label><label>{t("Moneda de origen")}<select className="field" value={currency} onChange={event => setCurrency(event.target.value as 'USD' | 'EUR')}><option value="USD">{t("USD · dólares")}</option><option value="EUR">{t("EUR · sin conversión")}</option></select></label><label>{t("Tiempo disponible")}<select className="field" value={days} onChange={event => setDays(event.target.value)}><option value="">{t("Sin límite")}</option>{[1, 2, 3, 5].map(value => <option key={value} value={value}>{t("Hasta")}{' '}{value} {value === 1 ? 'día' : 'días'}</option>)}</select></label><label className="vivo-pet"><input type="checkbox" checked={pet} onChange={event => setPet(event.target.checked)} /><PawPrint size={18} />{t("Solo mascotas confirmadas")}</label></div>}
      {browsing
        ? <div className="cv-region-rails" data-tour="cards">{REGION_ORDER.map(id => { const items = records.filter(item => item.localizedRegion === id); if (!items.length) return null; const RailIcon = icons[id]; return <section key={id} className="cv-region-rail" data-region-tone={id} aria-labelledby={`rail-${id}`}><div className="cv-rail-head"><h3 id={`rail-${id}`}><RailIcon size={18} aria-hidden="true" />{REGION_LABELS[id]}<small>{items.length}</small></h3><button onClick={() => goToRegion(id)} aria-label={t("Ver todo {v}", { v: REGION_LABELS[id] })}>{t("Ver todo")}<ArrowRight size={15} aria-hidden="true" /></button></div><p className="cv-region-saying">{t(REGION_SAYINGS[id])}</p><Rail label={t("Experiencias en {v}", { v: REGION_LABELS[id] })}>{items.map((experience, index) => <li key={experience.id}><CatalogCard experience={experience} index={index} /></li>)}</Rail></section>; })}</div>
        : <><div className="vivo-results" aria-live="polite"><span><strong>{visible.length}</strong> {visible.length === 1 ? 'historia' : 'historias'}{province && ` en ${province}`}</span><button onClick={reset}>{t("Ver todo Ecuador")}<ArrowRight size={14} /></button></div>{visible.length ? <div className="vivo-grid cv-grid" key={`${region}|${province}`} data-tour="cards">{visible.map((experience, index) => <CatalogCard key={experience.id} experience={experience} index={index} />)}</div> : <div className="vivo-empty"><Compass size={40} /><h3>{pet ? t("Primero, el permiso del anfitrión.") : t("Prueba con otra idea.")}</h3><p>{pet ? t("Ninguna ficha tiene mascotas confirmadas con estos filtros.") : t("Cambia la búsqueda, la provincia o el presupuesto.")}</p><button className="button button-primary" onClick={reset}>{t("Ver todas las fichas")}</button></div>}</>}
      <div className="cv-discovery-foot"><NoteChip label={t("Precios referenciales · compra de prueba")}><p>{t("El anfitrión confirma acceso, servicios y tarifa final.")}</p><p>{t("Puedes probar la compra completa en")}{' '}<strong>{t("modo prueba, sin cobro")}</strong>{t(". El cobro real se activa cuando la pasarela esté configurada.")}</p><p>{t("Las fotos llevan su crédito. Las ilustraciones no muestran el lugar real.")}</p></NoteChip></div>
    </section><Suspense fallback={<HomeSkeleton />}><PhotoStories /><HomeOutro /></Suspense>
  </div>;
}

export function CatalogSaved() {
  const t = useT();
  const { saved, records } = useCatalog();
  const favorites = records.filter(item => saved.includes(item.id));
  return <section className="vivo-catalog cv-compact"><div className="cv-section-head"><h1>{t("Favoritos")}</h1><p>{t("Guardar no reserva: es tu lista para comparar.")}</p></div>{favorites.length ? <div className="vivo-grid cv-grid">{favorites.map(item => <CatalogCard key={item.id} experience={item} />)}</div> : <div className="vivo-empty"><Bookmark size={40} /><h2>{t("Toca el corazón de una ficha.")}</h2><p>{t("Se guarda en este navegador.")}</p></div>}</section>;
}

/** La descripción sin la frase que ya se lee arriba como entrada (antes se repetía igual dos veces). */
function withoutLead(description: string, lead: string): string {
  const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
  const body = norm(description); const first = norm(lead).replace(/[.…]+$/, '');
  return first && body.startsWith(first) ? body.slice(first.length).replace(/^[.…]+\s*/, '').trim() : body;
}
function Items({ title, items, chips = false }: { title: string; items: string[]; chips?: boolean }) { return items.length > 0 ? <section className="vivo-detail-section"><h3>{title}</h3><ul className={chips ? 'vivo-detail-chips' : undefined}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null; }
export function CatalogDetail(props: { onDownload: (experience: Experience) => Promise<string | void>; onAsk: () => void; onInquiry: (id: string) => void }) {
  const { selected, records } = useCatalog();
  const experience = records.find(item => item.id === selected);
  return experience ? <ExperienceDetail key={experience.id} experience={experience} {...props} /> : null;
}
function ExperienceDetail({ experience, onDownload, onAsk, onInquiry }: { experience: Experience; onDownload: (experience: Experience) => Promise<string | void>; onAsk: () => void; onInquiry: (id: string) => void }) {
  const t = useT();
  const visual = experienceVisual(experience);
  const { select, saved, toggle, online } = useCatalog();
  const [tab, setTab] = useState('plan');
  const [notice, setNotice] = useState('');
  const [downloading, setDownloading] = useState(false);
  const titleId = useId();
  const source = catalogSources.find(item => item.id === experience.contentSourceId);
  const Icon = icons[experience.localizedRegion];
  const tabs = [{ id: 'plan', name: 'El plan', icon: Compass }, { id: 'location', name: 'Cómo llegar', icon: MapPin }, { id: 'budget', name: 'Presupuesto', icon: Bookmark }, { id: 'respect', name: 'Ve pilas', icon: Leaf }];
  const download = async () => { setDownloading(true); try { const message = await onDownload(experience); setNotice(message || t("Listo: «{title}» quedó guardada para usarla sin señal. Ábrela desde «Sin señal».", { title: experience.title })); } catch (error) { setNotice(error instanceof Error && error.message ? error.message : t("No se pudo descargar la ficha. Revisa los permisos de descarga o el espacio del navegador y reintenta.")); } finally { setDownloading(false); } };
  return <Dialog title={experience.title} onClose={() => select(null)} wide><div className="vivo-detail" data-vivo-region={experience.localizedRegion}><div className="vivo-detail-landscape"><img src={visual.src} srcSet={visual.srcSet} sizes={visual.srcSet ? '(max-width:760px) 100vw, 900px' : undefined} alt={visual.alt} />{(visual.photo || visual.referencePhoto) ? visual.credit && <small className="vivo-photo-credit">{t(visual.referencePhoto ? "Foto de referencia · no muestra este sitio" : "Foto:")}{visual.referencePhoto ? ' · ' : ' '}{visual.sourceUrl ? <a href={visual.sourceUrl} target="_blank" rel="noreferrer noopener">{visual.credit}</a> : visual.credit}</small> : <small className="vivo-photo-credit">{t("Ilustración original de CHULLA VIDA · no es una foto del lugar")}</small>}<span><Icon size={18} />{REGION_LABELS[experience.localizedRegion]}<i />{experience.province}</span><button onClick={() => toggle(experience.id)} aria-pressed={saved.includes(experience.id)} aria-label={saved.includes(experience.id) ? t("Quitar de mi viaje") : t("Guardar en mi viaje")}><Heart size={19} fill={saved.includes(experience.id) ? 'currentColor' : 'none'} />{saved.includes(experience.id) ? t("Guardado") : t("Guardar")}</button></div><div className="vivo-detail-content"><p className="vivo-detail-locality"><MapPin size={16} />{experience.locality}</p>{experience.experienceName && <p className="vivo-experience-name">{experience.experienceName}</p>}<div className="al-detail-book"><strong>{formatExperiencePrice(experience).replace(' por persona', '').split(' · ')[0]}<small>{t('Referencial')}</small></strong><Suspense fallback={null}><BuyButton experience={experience} variant="card" /></Suspense></div><details className="cv-bbs"><summary>{t("BBS · Bueno, bonito y seguro")}</summary><p>{t("Tu guía para elegir, pana: compara la experiencia, cuida el lugar y confirma accesos, guía y condiciones antes de salir. No es una calificación ni un sello de seguridad verificada.")}</p></details><details className="al-detail-summary"><summary>{t('El plan')}</summary><p className="vivo-detail-lead">{experience.summary}</p></details><div className="vivo-detail-facts"><span><Clock3 size={18} />{experience.duration.label}</span><span><Mountain size={18} />{experience.difficultyLabel}</span><span><ShieldCheck size={18} />{t("Operador sin verificar")}</span></div><div className="vivo-detail-tabs" role="tablist" aria-label={t("Información de la experiencia")} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const current = tabs.findIndex(item => item.id === tab); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; setTab(tabs[next].id); document.getElementById(`${titleId}-${tabs[next].id}`)?.focus(); }}>{tabs.map(item => <button key={item.id} id={`${titleId}-${item.id}`} role="tab" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} aria-controls={`${titleId}-panel`} onClick={() => setTab(item.id)}><item.icon size={17} />{item.name}</button>)}</div>
      <div className="vivo-detail-panel" role="tabpanel" id={`${titleId}-panel`} aria-labelledby={`${titleId}-${tab}`} tabIndex={0}>{tab === 'plan' && <><SpanishContentNote text="Contenido de la ficha en español" />{withoutLead(experience.description, experience.summary) && <p>{withoutLead(experience.description, experience.summary)}</p>}{experience.context && <details className="vivo-detail-section"><summary>{t("Historia y contexto")}</summary><p>{experience.context}</p></details>}<Items chips title={t("Lo que puedes conocer")} items={[...experience.attractions, ...experience.activities]} />{experience.itinerary.length > 0 && <section className="vivo-detail-section"><h3>{t("Un día aquí · programa tentativo")}</h3><ol className="vivo-itinerary">{experience.itinerary.map((step, index) => <li key={index}><span>{step.time || `${index + 1}`}</span><p>{step.text}</p></li>)}</ol></section>}<div className="vivo-location-invite"><MapPin size={25} /><div><strong>{experience.province}{t(", más cerca de tu próximo plan.")}</strong><p>{t("Revisa las etapas de acceso, los transportes orientativos y una referencia para el mapa.")}</p></div><button onClick={() => setTab('location')}>{t("Cómo llegar")}<ArrowRight size={17} /></button></div></>}{tab === 'location' && <LocationPanel experience={experience} />}{tab === 'budget' && <><h3 className="vivo-panel-title">{t("Las cuentas, claras.")}</h3><p className="vivo-detail-price">{formatExperiencePrice(experience)}</p><p>{t("No es una cotización. Compara moneda, unidad y duración de cada referencia antes de sumar.")}</p>{experience.price.options?.length ? <div className="vivo-price-options">{experience.price.options.map(option => <article key={option.id}><div><h4>{option.label}</h4><p>{option.durationLabel}</p><small>{option.notes}</small></div><strong>{option.min === null ? t("Cotizar") : option.max !== null && option.max !== option.min ? `${money(option.min, option.currency)}–${money(option.max, option.currency)}` : `${option.max === null ? 'Desde ' : ''}${money(option.min, option.currency)}`}<span>{({ per_person: 'por persona', per_person_per_day: 'por persona / día', per_night: 'por noche', per_trip: 'por trayecto', unknown: 'unidad por confirmar' } as const)[option.unit]}</span></strong></article>)}</div> : null}{experience.price.groupBreakdown?.length ? <Items title={t("Referencia por tamaño de grupo")} items={experience.price.groupBreakdown.map(item => `${item.groupSize} personas: ${money(item.amountPerPerson, experience.price.currency)} por persona`)} /> : null}<Items title={t("Incluye según la fuente · por confirmar")} items={experience.price.includes} /><Items title={t("Gastos aparte")} items={experience.price.excludes} /><Suspense fallback={null}><MoneyFlow experience={experience} /></Suspense>{experience.price.separateCosts?.length ? <Items title={t("Otros importes para revalidar")} items={experience.price.separateCosts.map(item => `${item.concept}: ${item.detail}`)} /> : null}<Items title={t("Supuestos del precio")} items={experience.price.assumptions} /></>}{tab === 'respect' && <><Items title={t("Antes de salir")} items={[...experience.conditions, ...experience.recommendations, ...experience.activityConstraints]} /><section className="vivo-detail-section"><h3><PawPrint size={19} />{t("Chulla Pet")}</h3><p>{experience.petPolicy.note || t("No hay una política de mascotas confirmada. Consulta condiciones; no se garantiza el ingreso.")}</p></section>{experience.warnings.length > 0 && <section className="vivo-detail-warning"><Info size={23} /><div><h3>{t("Avisos de la fuente, no alertas actuales.")}</h3><p>{t("Confirma las condiciones de acceso antes de viajar.")}</p>{experience.warnings.map((warning, index) => <p key={index}><strong>{warning.asOf || t("Sin fecha precisa")} · </strong>{warning.text}</p>)}</div></section>}<section className="vivo-detail-section"><h3>{t("Viajar también es cuidar.")}</h3><p>{t("Pide permiso para fotografiar personas y actividades comunitarias. No alimentes fauna ni entres a espacios ceremoniales sin invitación. Actividades de agua, cavernas y áreas protegidas requieren confirmar condiciones, guía y acceso.")}</p></section></>}</div>
      <details className="vivo-source"><summary><Info size={16} />{t("Información de origen y documento completo")}</summary><strong>{source?.title || t("Documento de trabajo aportado")}</strong><p>{t("Importación:")}{' '}{experience.sourceCheckedAt}{' '}{t("· Versión")}{' '}{experience.contentVersion}{t(". Esta fecha no certifica disponibilidad ni tarifas vigentes.")}</p>{source && <a href={catalogSourceDownload(source)} target="_blank" rel="noreferrer">{t("Consultar documento fuente")}<ArrowUpRight size={15} /></a>}<p className="v3-source-text">{experience.sourceText}</p></details><div className="vivo-detail-cta"><div><strong>{formatExperiencePrice(experience)}</strong><span>{t("Precio referencial propuesto. Mientras los pagos no estén activos, la compra es de prueba y no cobra nada.")}</span></div><div><button className="button button-secondary" disabled={!online || downloading} onClick={download}><Download size={17} />{downloading ? t("Preparando archivo…") : t("Descargar ficha")}</button><button className="button button-secondary" disabled={!online} onClick={() => { select(null); onInquiry(experience.id); }}>{t("Solicitar información")}<ArrowUpRight size={16} /></button><Suspense fallback={null}><BuyButton experience={experience} variant="detail" /></Suspense></div></div><p role="status" className="vivo-download-notice">{notice}</p><button className="vivo-detail-mijin" onClick={() => { select(null); onAsk(); }}><MapPin size={20} /><span>{t("Arma tu viaje")}</span><ArrowUpRight size={19} /></button></div></div></Dialog>;
}
