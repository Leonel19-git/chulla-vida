import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, BookOpen, Camera, ChevronRight, Compass, Download, Heart, Map, MapPin, Pause, Play, Share2, Sparkles } from 'lucide-react';
import { REGION_LABELS, type Experience, type RegionId } from '../../domain/catalog';
import { albumLabel } from '../../domain/album';
import { experienceVisual } from '../catalog/experienceArt';
import { useCatalog } from '../catalog/CatalogContext';
import { useT, msg } from '../../i18n/v3';
import { REGION_FILMS } from './films';
import { SocialButtons } from '../../components/chulla/SocialButtons';
import './discovery.css';
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));
const TOOLS = [
  { icon: Map, name: msg('Arma el plan'), hint: msg('Fechas, panas y presupuesto'), event: 'plan', tone: 'yellow' },
  { icon: Heart, name: msg('Favoritos'), hint: msg('Tus lugares para el próximo plan'), event: 'favorites', tone: 'blue' },
  { icon: Sparkles, name: msg('Cultura Viva'), hint: msg('Fiestas, historias y tradición'), event: 'culture', tone: 'red' },
  { icon: BookOpen, name: msg('Tu pasaporte'), hint: msg('Guarda recuerdos del camino'), event: 'passport', tone: 'green' },
  { icon: Download, name: msg('Llévalo sin señal'), hint: msg('Solo lo que descargaste'), event: 'downloads', tone: 'mint' },
];
export function QuickStart({ onPlan, onDownloads }: { onPlan: () => void; onDownloads: () => void }) {
  const t = useT();
  const open = (event: string) => event === 'plan' ? onPlan() : event === 'downloads' ? onDownloads() : signal(event);
  return <section className="cv-start" aria-labelledby="cv-start-title">
    <div className="cv-start-heading"><h2 id="cv-start-title">{t('¿Qué se arma aquí?')}</h2><p>{t('Viaja con tus panas y conecta con anfitriones locales.')}</p></div>
    <div className="cv-start-tools">{TOOLS.map(({icon: Icon, name, hint, event, tone}) => <button key={event} className={`cv-start-tool is-${tone}`} data-tour={event === 'downloads' ? 'offline' : event === 'passport' ? 'passport' : undefined} onClick={() => open(event)}><Icon size={24} aria-hidden="true" /><span><strong>{t(name)}</strong><small>{t(hint)}</small></span><ChevronRight size={18} aria-hidden="true" /></button>)}</div>
    <div className="cv-start-signoff"><p className="cv-local-saying">{t('De una, ñaño. ¡Se arma el plan!')}</p><img className="cv-route-mark" src="/brand/route-mark.svg" width="100" height="76" alt="" aria-hidden="true"/><a className="cv-start-jump" href="#experiencias">{t('Primero, encuentra tu lugar')}<ArrowDown size={16} /></a></div>
  </section>;
}

const PHOTO_IDS = ['gen-02-quilotoa-shalala', 'costa-07-ola-y-manglar', 'amz-01-reserva-cuyabeno', 'gal-04-kicker-rock-tour-360', 'gen-07-banos-de-agua-santa', 'amz-12-cascada-hola-vida', 'gen-08-cuenca', 'gal-01-bartolome-bahia-sullivan'];
export function PhotoStories() {
  const t = useT(); const { records, saved, toggle, select } = useCatalog();
  const [region, setRegion] = useState<RegionId | 'all'>('all');
  const [notice, setNotice] = useState('');
  const photos = PHOTO_IDS.flatMap(id => { const item = records.find(x => x.id === id); return item && experienceVisual(item).photo ? [item] : []; }).filter(item => region === 'all' || item.localizedRegion === region);
  async function share(item: Experience) {
    setNotice('');
    const url = new URL(`/experiencias/${encodeURIComponent(item.id)}`, window.location.origin).href;
    const data = { title: `${item.title} · CHULLA VIDA`, text: `${item.title} · ${item.province}`, url };
    try {
      if (navigator.share) { await navigator.share(data); setNotice(t('Plan compartido.')); }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setNotice(t('Enlace copiado. Pásaselo a tus panas.')); }
      else setNotice(t('Abre la ficha y comparte su dirección desde el navegador.'));
    } catch (error) { if ((error as {name?: string}).name !== 'AbortError') setNotice(t('No se pudo compartir. Abre la ficha y copia su dirección.')); }
  }
  return <section className="cv-photostories" aria-labelledby="cv-photostories-title">
    <div className="cv-visual-head"><div><h2 id="cv-photostories-title">{t('Esta foto se tomó aquí.')}</h2><p>{t('Del «¿dónde es?» al «vamos de una».')}</p></div><Camera size={30} aria-hidden="true" /></div>
    <div className="cv-photo-filters" role="group" aria-label={t('Filtrar fotos por región')}><button aria-pressed={region === 'all'} onClick={() => setRegion('all')}>{t('Todo Ecuador')}</button>{Object.entries(REGION_LABELS).map(([id, label]) => <button key={id} data-region={id} aria-pressed={region === id} onClick={() => setRegion(id as RegionId)}>{label}</button>)}</div>
    {photos.length ? <ul className="cv-photo-track" aria-label={t('Fotos con su ubicación real')}>{photos.map(item => {
      const v = experienceVisual(item); const kept = saved.includes(item.id);
      return <li key={item.id}><article className="cv-photo-post" data-region={item.localizedRegion}>
        <div className="cv-photo-top"><span className="cv-photo-brand">CV</span><span><strong>CHULLA VIDA</strong><small><MapPin size={12} />{item.province} · {REGION_LABELS[item.localizedRegion]}</small></span><span className="cv-photo-number">{albumLabel(item.id)}</span></div>
        <button className="cv-photo-open" onClick={() => select(item.id)} aria-label={`${t('Ver el lugar')}: ${item.title}`}><img src={v.src} srcSet={v.srcSet} sizes="(max-width:700px) 78vw, 340px" alt={v.alt} loading="lazy" width="640" height="800" /><span>{t('Esta foto se tomó aquí')}<ArrowUpRight size={18} /></span></button>
        <div className="cv-photo-actions"><button aria-pressed={kept} onClick={() => toggle(item.id)} aria-label={`${t(kept ? 'Quitar de guardados' : 'Guardar este plan')}: ${item.title}`}><Heart size={21} fill={kept ? 'currentColor' : 'none'} /><span>{t(kept ? 'Guardado' : 'Me apunto')}</span></button><button aria-label={`${t('Compartir')}: ${item.title}`} onClick={() => void share(item)}><Share2 size={20} /></button></div>
        <h3><button onClick={() => select(item.id)}>{item.title}</button></h3><p>{item.locality}</p>
        {v.sourceUrl && <a className="cv-photo-credit" href={v.sourceUrl} target="_blank" rel="noreferrer">{t('Foto')}: {v.credit}<ArrowUpRight size={12} /></a>}
      </article></li>;
    })}</ul> : <p className="cv-photo-empty">{t('No hay fotos descargadas de esta región. Explora las fichas disponibles.')}</p>}
    <p className="cv-share-notice" role="status">{notice}</p>
    <div className="cv-social-inspiration"><p className="cv-local-saying">{t('¡Qué bacán estar aquí!')}<small>{t('La foto al feed. El recuerdo, contigo.')}</small></p><SocialButtons /></div>
  </section>;
}

function Film({ region, active, onPlay }: {region: RegionId; active: boolean; onPlay: () => void}) {
  const t = useT(); const {records, select} = useCatalog(); const film = REGION_FILMS[region]; const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false); const [error, setError] = useState(false);
  const stop = () => { video.current?.pause(); setPaused(true); };
  useEffect(() => {
    if (!active) return;
    const node = video.current;
    const visibility = () => { if (document.hidden) stop(); };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }, {threshold:.1});
    if (node) observer?.observe(node);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [active, error]);
  const toggle = () => {
    if (!active || error) { setError(false); setPaused(false); onPlay(); }
    else if (paused) { void video.current?.play().catch(() => setError(true)); setPaused(false); }
    else stop();
  };
  return <article className="cv-film" data-region={region}>
    <div className="cv-film-screen"><img src={film.poster} alt={film.alt} loading="lazy" width="640" height="800" />
      {active && !error && <video ref={video} src={film.src} muted playsInline autoPlay loop preload="none" aria-label={`${t('Video con fotos reales')}: ${REGION_LABELS[region]}`} onError={() => setError(true)} onPlaying={() => setPaused(false)} />}
      <span className="cv-film-region">{REGION_LABELS[region]}</span><h3>{t(film.title)}</h3>
      <button className="cv-film-play" aria-label={`${t(active && !paused && !error ? 'Pausar video' : 'Reproducir video')}: ${REGION_LABELS[region]}`} onClick={toggle}>{active && !paused && !error ? <Pause size={22} /> : <Play size={22} />}<span>{t(active && !paused && !error ? 'Pausar' : 'Dale play')}</span></button>
    </div>
    {error && <p role="status">{t('No se pudo reproducir. Puedes abrir los lugares del video.')}</p>}
    <details className="cv-film-places"><summary>{t('Los lugares del video')}<ChevronRight size={15} /></summary><ul>{film.ids.map(id => {const item=records.find(x=>x.id===id);return item && <li key={id}><button onClick={()=>select(id)}><MapPin size={14} />{item.title}<ArrowUpRight size={14} /></button></li>;})}</ul><a href="/video/regions/CREDITS.md" target="_blank" rel="noreferrer">{t('Fotos y créditos')}<ArrowUpRight size={13} /></a></details>
  </article>;
}
export function RegionFilms() {
  const t = useT();const [active,setActive]=useState<RegionId | null>(null); const {online} = useCatalog();
  if (!online) return null;
  return <section className="cv-films" aria-labelledby="cv-films-title"><div className="cv-visual-head"><div><h2 id="cv-films-title">{t('Tu próximo finde empieza aquí.')}</h2><p>{t('Cuatro regiones. Dale play y elige tu próxima parada.')}</p></div><Compass size={30} aria-hidden="true" /></div><div className="cv-films-track">{(Object.keys(REGION_FILMS) as RegionId[]).map(region=><Film key={region} region={region} active={active===region} onPlay={()=>setActive(region)} />)}</div><p className="cv-films-note">{t('Videos creados con fotos reales. Dale play para cargarlos.')}</p></section>;
}
