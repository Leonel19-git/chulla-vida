import { lazy, Suspense, useState, type ReactNode } from 'react';
import { ArrowUpRight, BadgeCheck, CalendarHeart, ChevronDown, Compass, HandCoins, LockKeyhole, Map, Mountain, Music2, ScrollText, ShieldCheck, Stamp, Ticket, Trees, Waves } from 'lucide-react';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { getCultureCard, getUpcomingEvents, monthName, type CultureCard } from '../../domain/culture';
import { useCatalog } from './CatalogContext';
import { optionalLazy } from '../workspace/optionalModule';
import { Rail } from './Rail';
import './home.css';
import './compact.css';

import { useT, msg } from '../../i18n/v3';
export const REGION_ORDER: RegionId[] = ['sierra', 'costa', 'amazonia', 'galapagos'];
export const REGION_ICONS = { sierra: Mountain, costa: Waves, amazonia: Trees, galapagos: Compass } as const;
export const LEGAL_PDFS = {
  notice: '/legal/aviso-proteccion-datos-chulla-vida.pdf',
  rights: '/legal/formulario-derechos-datos-chulla-vida.pdf',
} as const;
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));

/* Protección de datos: la entrega el frente de privacidad; mientras no exista, se muestra este respaldo corto. */
function DataProtectionFallback() {
  const t = useT();
  return <section className="cv-home-block cv-privacy-fallback" aria-labelledby="cv-privacy-title">
    <h2 id="cv-privacy-title">{t("Protección de tus datos personales")}</h2>
    <p>{t("Cuidamos tus datos según la LOPDP. Pide acceso, corrección o eliminación cuando quieras.")}</p>
    <div className="cv-privacy-actions"><a className="button button-secondary" href={LEGAL_PDFS.notice} download>{t("Aviso (PDF)")}</a><a className="button button-secondary" href={LEGAL_PDFS.rights} download>{t("Formulario (PDF)")}</a><button className="button button-primary" onClick={() => signal('privacy-rights')}>{t("Ejercer mis derechos de datos")}</button></div>
  </section>;
}
const DataProtectionSection = optionalLazy<object>(import.meta.glob('../privacy-rights/DataProtectionSection.tsx'), 'DataProtectionSection', DataProtectionFallback);

/* Cultura Viva: el carrusel lo entrega el frente de cultura; mientras no exista, este respaldo con la agenda real. */
function CultureFallback() {
  const t = useT();
  const upcoming = getUpcomingEvents(new Date(), { monthsAhead: 6 }).slice(0, 8);
  if (!upcoming.length) return null;
  return <Rail label={t("Fiestas de los próximos meses")} className="cv-culture-rail">{upcoming.map(item => <li key={`${item.event.id}-${item.year}-${item.month}`} data-region-tone={item.event.region}>
    <button className="cv-culture-card" onClick={() => signal('culture')} aria-label={t("{name}, {v} {year}. Ver en Cultura Viva", { name: item.event.name, v: monthName(item.month), year: item.year })}>
      <span className="cv-culture-date"><strong>{monthName(item.month).slice(0, 3)}</strong><small>{item.year}</small></span>
      <span className="cv-culture-name">{item.event.name}</span>
      <span className="cv-culture-meta">{REGION_LABELS[item.event.region]}</span>
      <span className={`cv-culture-status is-${item.status}`}>{item.status === 'orientative' ? t("Fecha orientativa") : t("Fecha con fuente")}</span>
    </button>
  </li>)}</Rail>;
}
interface CarouselProps { cards: readonly CultureCard[]; label: string; onOpenExperience?: (id: string) => void }
const CultureCarouselModule = optionalLazy<CarouselProps>(import.meta.glob('../culture/CultureCarousel.tsx'), 'CultureCarousel', CultureFallback);
/** Carrusel de cartas del frente de cultura con las fiestas de los próximos meses; respaldo propio si no está. */
function CultureCarousel() {
  const t = useT();
  const { select } = useCatalog();
  const [cards] = useState(() => getUpcomingEvents(new Date(), { monthsAhead: 6 }).slice(0, 8).map(item => getCultureCard(item.event)));
  if (!cards.length) return null;
  return <CultureCarouselModule cards={cards} label={t("Fiestas de los próximos meses")} onOpenExperience={id => select(id)} />;
}

const MusicPanel = lazy(() => import('../../components/chulla/JourneyViews').then(module => ({ default: module.MusicPanel })));
/** Música para el camino: el reproductor (y Spotify, con permiso) solo se monta al abrir el plegable. */
function MusicFold() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return <details className="cv-fold cv-music-fold" onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
    <summary><Music2 size={20} aria-hidden="true" /><span>{t("Música")}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    {open && <Suspense fallback={<div className="cv-skeleton-block" role="status" aria-label={t("Cargando música")}><span className="cv-skeleton" /></div>}><MusicPanel /></Suspense>}
  </details>;
}

function Illustration({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 120 80" aria-hidden="true" className="cv-step-art">{children}</svg>;
}
/** Cuatro pasos de una línea. El detalle se abre al tocar cada paso. */
const STEPS = [
  { title: msg('Explora'), text: msg('Elige región o provincia.'), more: msg('Cada ficha dice de dónde sale su información.'), icon: Compass, art: <Illustration><path d="M0 70 L30 30 L50 52 L72 18 L120 70Z" fill="#1f575a" /><path d="M64 30 L72 18 L80 30Z" fill="#fff" /><circle cx="98" cy="18" r="9" fill="#fed65a" /><path d="M40 48a8 8 0 1 1 16 0c0 7-8 14-8 14s-8-7-8-14z" fill="#c61534" /><circle cx="48" cy="47" r="3" fill="#fff" /></Illustration> },
  { title: msg('Arma tu viaje'), text: msg('Junta paradas y presupuesto.'), more: msg('En Chulla Flex lo que falta confirmar se queda a la vista.'), icon: Map, art: <Illustration><rect x="6" y="10" width="108" height="60" rx="8" fill="#dcf0f2" /><path d="M18 58 C40 20 70 70 100 22" stroke="#012960" strokeWidth="3" strokeDasharray="5 6" fill="none" /><circle cx="18" cy="58" r="6" fill="#4cc69f" /><circle cx="58" cy="44" r="6" fill="#fed65a" /><circle cx="100" cy="22" r="6" fill="#c61534" /></Illustration> },
  { title: msg('Compra o pregunta'), text: msg('Desde la ficha, en pocos pasos.'), more: msg('Hoy la compra es de prueba y no cobra nada.'), icon: Ticket, art: <Illustration><path d="M14 22h92v12a8 8 0 0 0 0 16v12H14V50a8 8 0 0 0 0-16z" fill="#fed65a" /><path d="M44 22v40" stroke="#012960" strokeWidth="2" strokeDasharray="3 4" /><path d="M58 38h36M58 46h24" stroke="#012960" strokeWidth="3" strokeLinecap="round" /><circle cx="29" cy="42" r="7" fill="#c61534" /></Illustration> },
  { title: msg('Vive y sella'), text: msg('Tu pasaporte suma sellos.'), more: msg('El sello verificado llega cuando el anfitrión confirma tu visita.'), icon: Stamp, art: <Illustration><rect x="20" y="8" width="80" height="64" rx="6" fill="#012960" /><circle cx="60" cy="40" r="20" fill="none" stroke="#fed65a" strokeWidth="3" strokeDasharray="4 4" /><path d="M50 40l7 7 13-14" stroke="#4cc69f" strokeWidth="4" fill="none" strokeLinecap="round" /></Illustration> },
];

/** «Cómo funciona» en un carrusel de cuatro pasos. */
export function HomeIntro(_props: { onRegion?: (region: RegionId) => void }) {
  const t = useT();
  return <details className="cv-home-block cv-how journey-how">
    <summary><Compass size={19} aria-hidden="true" /><span>{t("Así funciona CHULLA VIDA")}</span><small>{t("Cuatro pasos")}</small><ChevronDown size={17} aria-hidden="true" /></summary>
    <Rail label={t("Pasos de CHULLA VIDA")} className="cv-how-rail">{STEPS.map((step, index) => <li key={step.title} className="cv-how-step">
      {step.art}<span className="cv-step-number" aria-hidden="true">{index + 1}</span>
      <h3><step.icon size={17} aria-hidden="true" />{t(step.title)}</h3><p>{t(step.text)}</p>
      <details className="cv-more-line"><summary>{t("Ver más")}<ChevronDown size={14} aria-hidden="true" /></summary><p>{t(step.more)}</p></details>
    </li>)}</Rail>
  </details>;
}

const TRUST = [
  { icon: BadgeCheck, title: msg('Revisión humana'), text: msg('Ningún anfitrión se aprueba solo. Hasta revisar sus documentos, la ficha dice «operador sin verificar».') },
  { icon: HandCoins, title: msg('Precios claros'), text: msg('Son precios propuestos, con moneda y unidad. El anfitrión confirma la tarifa final antes de cobrar.') },
  { icon: LockKeyhole, title: msg('Pagos seguros'), text: msg('Hoy la compra es de prueba, sin cobro. Con la pasarela activa, la tarjeta se escribe solo en la página del proveedor.') },
  { icon: ScrollText, title: msg('Tu privacidad'), text: msg('Sin analítica ni publicidad. Tú eliges las cookies y ejerces tus derechos cuando quieras.') },
];

/** Cultura Viva, Pasaporte, confianza y protección de datos: compactos, con el detalle al tocar. */
export function HomeOutro() {
  const t = useT();
  return <>
    <section className="cv-home-block cv-culture-band" aria-labelledby="cv-culture-title">
      <div className="cv-section-head"><h2 id="cv-culture-title"><CalendarHeart size={20} aria-hidden="true" />{t("Cultura Viva")}</h2><button className="cv-head-link" onClick={() => signal('culture')}>{t("Agenda")}<ArrowUpRight size={15} aria-hidden="true" /></button></div>
      <Suspense fallback={<div className="cv-skeleton-block" role="status" aria-label={t("Cargando Cultura Viva")}><span className="cv-skeleton" /></div>}><CultureCarousel /></Suspense>
    </section>
    <section className="cv-home-block cv-passport-teaser cv-passport-compact" aria-labelledby="cv-passport-title">
      <div className="cv-passport-stamps" aria-hidden="true">{REGION_ORDER.map((region, index) => <span key={region} data-region-tone={region} style={{ rotate: `${[-9, 6, -4, 10][index]}deg` }}><Stamp size={16} /><strong>{REGION_LABELS[region]}</strong></span>)}</div>
      <div><h2 id="cv-passport-title">{t("Pasaporte Guambra")}</h2><p>{t("Colecciona historias, no solo sellos.")}</p><button className="button button-primary" onClick={() => signal('passport')}>{t("Abrir mi pasaporte")}<ArrowUpRight size={16} /></button></div>
    </section>
    <section className="cv-home-block cv-trust" aria-labelledby="cv-trust-title">
      <div className="cv-section-head"><h2 id="cv-trust-title">{t("Viaja con confianza")}</h2></div>
      <ul className="cv-trust-chips">{TRUST.map(item => <li key={item.title}><details><summary><item.icon size={20} aria-hidden="true" /><span>{t(item.title)}</span><ChevronDown size={14} aria-hidden="true" /></summary><p>{t(item.text)}</p></details></li>)}</ul>
    </section>
    <div className="cv-fold-pair">
      <details className="cv-fold cv-privacy-fold">
        <summary><ShieldCheck size={20} aria-hidden="true" /><span>{t("Tus datos (LOPDP)")}</span><ChevronDown size={16} aria-hidden="true" /></summary>
        <Suspense fallback={<div className="cv-skeleton-block" role="status" aria-label={t("Cargando protección de datos")}><span className="cv-skeleton" /></div>}><DataProtectionSection /></Suspense>
      </details>
      <MusicFold />
    </div>
  </>;
}
