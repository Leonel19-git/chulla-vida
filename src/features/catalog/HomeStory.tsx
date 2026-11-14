import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, CalendarHeart, Compass, Download, FileText, HandCoins, LockKeyhole, Map, MapPin, Mountain, ScrollText, ShieldCheck, Stamp, Ticket, Trees, Waves } from 'lucide-react';
import { REGION_LABELS, type Experience, type RegionId } from '../../domain/catalog';
import { getUpcomingEvents, monthName } from '../../domain/culture';
import { CountUp } from '../../components/common/motion';
import { optionalLazy } from '../workspace/optionalModule';
import { experienceVisual } from './experienceArt';
import { useCatalog } from './CatalogContext';
import './home.css';

export const REGION_ORDER: RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];
export const REGION_ICONS = { sierra: Mountain, costa: Waves, amazonia: Trees, galapagos: Compass } as const;
export const LEGAL_PDFS = {
  notice: '/legal/aviso-proteccion-datos-chulla-vida.pdf',
  rights: '/legal/formulario-derechos-datos-chulla-vida.pdf',
} as const;
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));

/* Sección de protección de datos: la entrega el frente de privacidad; mientras no exista, se muestra este respaldo. */
function DataProtectionFallback() {
  return <section className="cv-home-block cv-privacy-fallback" aria-labelledby="cv-privacy-title" data-reveal>
    <div><ShieldCheck size={30} /><h2 id="cv-privacy-title">Protección de tus datos personales</h2><p>Tratamos tu información con cuidado y conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP). Puedes conocer cómo los usamos y pedir acceso, rectificación, eliminación u oposición cuando quieras.</p></div>
    <div className="cv-privacy-actions"><a className="button button-secondary" href={LEGAL_PDFS.notice} download><FileText size={17} />Descargar aviso de protección de datos</a><a className="button button-secondary" href={LEGAL_PDFS.rights} download><Download size={17} />Descargar formulario de derechos</a><button className="button button-primary" onClick={() => signal('privacy-rights')}>Ejercer mis derechos de datos<ArrowUpRight size={16} /></button></div>
  </section>;
}
const DataProtectionSection = optionalLazy<object>(import.meta.glob('../privacy-rights/DataProtectionSection.tsx'), 'DataProtectionSection', DataProtectionFallback);

function Illustration({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 120 80" aria-hidden="true" className="cv-step-art">{children}</svg>;
}
const STEPS = [
  { title: 'Explora', text: 'Elige región, provincia o un tipo de plan. Cada ficha dice de dónde sale la información.', icon: Compass, art: <Illustration><path d="M0 70 L30 30 L50 52 L72 18 L120 70Z" fill="#1f575a" /><path d="M64 30 L72 18 L80 30Z" fill="#fff" /><circle cx="98" cy="18" r="9" fill="#fed65a" /><path d="M40 48a8 8 0 1 1 16 0c0 7-8 14-8 14s-8-7-8-14z" fill="#c61534" /><circle cx="48" cy="47" r="3" fill="#fff" /></Illustration> },
  { title: 'Arma tu viaje', text: 'Junta paradas en Chulla Flex con tu presupuesto. Lo que falta confirmar se queda a la vista.', icon: Map, art: <Illustration><rect x="6" y="10" width="108" height="60" rx="8" fill="#dcf0f2" /><path d="M18 58 C40 20 70 70 100 22" stroke="#012960" strokeWidth="3" strokeDasharray="5 6" fill="none" /><circle cx="18" cy="58" r="6" fill="#4cc69f" /><circle cx="58" cy="44" r="6" fill="#fed65a" /><circle cx="100" cy="22" r="6" fill="#c61534" /></Illustration> },
  { title: 'Compra o pregunta', text: 'Compra desde la ficha o pide información. Hoy la compra es de prueba y no cobra nada.', icon: Ticket, art: <Illustration><path d="M14 22h92v12a8 8 0 0 0 0 16v12H14V50a8 8 0 0 0 0-16z" fill="#fed65a" /><path d="M44 22v40" stroke="#012960" strokeWidth="2" strokeDasharray="3 4" /><path d="M58 38h36M58 46h24" stroke="#012960" strokeWidth="3" strokeLinecap="round" /><circle cx="29" cy="42" r="7" fill="#c61534" /></Illustration> },
  { title: 'Vive y sella', text: 'Cuando el anfitrión confirma tu visita, tu Pasaporte Guambra recibe un sello verificado.', icon: Stamp, art: <Illustration><rect x="20" y="8" width="80" height="64" rx="6" fill="#012960" /><circle cx="60" cy="40" r="20" fill="none" stroke="#fed65a" strokeWidth="3" strokeDasharray="4 4" /><path d="M50 40l7 7 13-14" stroke="#4cc69f" strokeWidth="4" fill="none" strokeLinecap="round" /></Illustration> },
];

/** «Cómo funciona», números del catálogo y una ficha para empezar en cada región. */
export function HomeIntro({ onRegion }: { onRegion: (region: RegionId) => void }) {
  const { records, select } = useCatalog();
  const counts = REGION_ORDER.map(region => ({ region, count: records.filter(item => item.localizedRegion === region).length }));
  const max = Math.max(1, ...counts.map(item => item.count));
  const provinces = new Set(records.map(item => item.province)).size;
  const featured = REGION_ORDER.map(region => {
    const inRegion = records.filter(item => item.localizedRegion === region);
    return inRegion.find(item => item.media.some(media => media.depictsThisPlace)) ?? inRegion[0];
  }).filter((item): item is Experience => Boolean(item));
  return <>
    <section className="cv-home-block cv-how" aria-labelledby="cv-how-title">
      <div className="cv-home-heading"><h2 id="cv-how-title">Así funciona CHULLA VIDA</h2><p>Cuatro pasos, sin letra pequeña.</p></div>
      <ol className="cv-how-steps">{STEPS.map((step, index) => <li key={step.title} data-reveal style={{ '--i': index } as CSSProperties}>{step.art}<span className="cv-step-number" aria-hidden="true">{index + 1}</span><h3><step.icon size={18} />{step.title}</h3><p>{step.text}</p></li>)}</ol>
    </section>
    <section className="cv-home-block cv-stats" aria-labelledby="cv-stats-title">
      <div className="cv-stats-numbers" data-reveal><h2 id="cv-stats-title" className="sr-only">El catálogo en números</h2><p><strong><CountUp value={records.length} /></strong><span>fichas con fuente</span></p><p><strong><CountUp value={provinces} /></strong><span>provincias</span></p><p><strong><CountUp value={4} /></strong><span>regiones</span></p></div>
      <ul className="cv-stats-bars" aria-label="Fichas por región">{counts.map(({ region, count }, index) => { const Icon = REGION_ICONS[region]; return <li key={region} data-region-tone={region} data-reveal style={{ '--i': index, '--bar': count / max } as CSSProperties}><span className="cv-bar-label"><Icon size={16} />{REGION_LABELS[region]}</span><span className="cv-bar-track" aria-hidden="true"><i /></span><span className="cv-bar-value">{count} {count === 1 ? 'ficha' : 'fichas'}</span></li>; })}</ul>
    </section>
    {featured.length > 0 && <section className="cv-home-block cv-featured" aria-labelledby="cv-featured-title">
      <div className="cv-home-heading"><h2 id="cv-featured-title">Una para empezar en cada región</h2><p>Si no sabes por dónde arrancar, arranca por aquí.</p></div>
      <ul className="cv-featured-list">{featured.map((item, index) => { const visual = experienceVisual(item); const Icon = REGION_ICONS[item.localizedRegion]; return <li key={item.id} data-region-tone={item.localizedRegion} data-reveal style={{ '--i': index } as CSSProperties}>
        <button className="cv-featured-photo" onClick={() => select(item.id)} aria-label={`Ver la ficha de ${item.title}`} title={visual.credit ? `Foto: ${visual.credit}` : undefined}><img src={visual.src} srcSet={visual.srcSet} sizes={visual.srcSet ? '(max-width:700px) 100vw, 25vw' : undefined} alt={visual.alt} loading="lazy" decoding="async" width="640" height="400" /></button>
        <div><button className="cv-chip" onClick={() => onRegion(item.localizedRegion)}><Icon size={14} />{REGION_LABELS[item.localizedRegion]}</button><h3>{item.title}</h3><p><MapPin size={14} />{item.province}</p></div>
      </li>; })}</ul>
    </section>}
  </>;
}

/** Cultura Viva, Pasaporte Guambra, confianza y protección de datos. */
export function HomeOutro() {
  const upcoming = getUpcomingEvents(new Date(), { monthsAhead: 6 }).slice(0, 4);
  return <>
    {upcoming.length > 0 && <section className="cv-home-block cv-culture-band cv-textile-edge" aria-labelledby="cv-culture-title">
      <div className="cv-culture-copy"><CalendarHeart size={28} /><h2 id="cv-culture-title">Cultura Viva: lo que viene</h2><p>Fiestas y festivales de los próximos meses, con su estado real: fechada si hay fuente oficial, orientativa si solo se conoce el mes de siempre.</p><button className="cv-culture-cta" onClick={() => signal('culture')}>Ver toda la agenda<ArrowUpRight size={17} /></button></div>
      <ul className="cv-culture-list">{upcoming.map((item, index) => <li key={item.event.id} data-region-tone={item.event.region} data-reveal style={{ '--i': index } as CSSProperties}>
        <span className="cv-culture-date"><strong>{monthName(item.month).slice(0, 3)}</strong><small>{item.year}</small></span>
        <div><h3>{item.event.name}</h3><p className="cv-culture-meta">{REGION_LABELS[item.event.region]} · {item.event.provinces.join(', ')}</p><p className={`cv-culture-status is-${item.status}`}>{item.status === 'orientative' ? `Fecha orientativa: suele ser ${item.event.dateLabel}` : item.label.split('. ')[0]}</p></div>
      </li>)}</ul>
    </section>}
    <section className="cv-home-block cv-passport-teaser" aria-labelledby="cv-passport-title">
      <div className="cv-passport-stamps" aria-hidden="true">{(['sierra', 'costa', 'amazonia', 'galapagos'] as RegionId[]).map((region, index) => <span key={region} data-region-tone={region} data-reveal style={{ '--i': index, '--stamp-rot': `${[-9, 6, -4, 10][index]}deg` } as CSSProperties}><Stamp size={20} /><strong>{REGION_LABELS[region]}</strong><small>Ecuador</small></span>)}</div>
      <div><h2 id="cv-passport-title">Pasaporte Guambra</h2><p>Colecciona historias, no solo sellos. Abrir una ficha no cuenta como visita: el sello verificado llega cuando el anfitrión confirma que estuviste ahí. Los sellos de prueba se ven distintos y no dan premios.</p><button className="button button-primary" onClick={() => signal('passport')}>Abrir mi pasaporte<ArrowUpRight size={16} /></button></div>
    </section>
    <section className="cv-home-block cv-trust" aria-labelledby="cv-trust-title">
      <div className="cv-home-heading"><h2 id="cv-trust-title">Viaja con confianza</h2><p>Lo que sí hacemos y lo que todavía no, dicho claro.</p></div>
      <ul className="cv-trust-list">
        <li data-reveal style={{ '--i': 0 } as CSSProperties}><BadgeCheck size={26} /><h3>Revisión humana</h3><p>Ningún anfitrión se aprueba solo. Mientras alguien del equipo no revise sus documentos, la ficha lo muestra como operador pendiente de verificación.</p></li>
        <li data-reveal style={{ '--i': 1 } as CSSProperties}><HandCoins size={26} /><h3>Precios referenciales</h3><p>Son precios propuestos, con su moneda y unidad. El anfitrión confirma la tarifa final antes de cualquier cobro.</p></li>
        <li data-reveal style={{ '--i': 2 } as CSSProperties}><LockKeyhole size={26} /><h3>Pagos seguros cuando se activen</h3><p>Hoy la compra funciona en modo prueba, sin cobro. Con la pasarela activa, la tarjeta se escribe solo en la página del proveedor de pagos, nunca aquí.</p></li>
        <li data-reveal style={{ '--i': 3 } as CSSProperties}><ScrollText size={26} /><h3>Tu privacidad primero</h3><p>Sin analítica ni publicidad. Tú eliges qué cookies aceptar y puedes ejercer tus derechos sobre tus datos cuando quieras.</p></li>
      </ul>
    </section>
    <Suspense fallback={<div className="cv-skeleton-block" role="status" aria-label="Cargando protección de datos"><span className="cv-skeleton" /><span className="cv-skeleton" /><span className="cv-skeleton" /></div>}><DataProtectionSection /></Suspense>
  </>;
}
