import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, MapPin, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useCatalog } from '../catalog/CatalogContext';
import { albumLabel, ALBUM_TOTAL } from '../../domain/album';
import { experienceVisual } from '../catalog/experienceArt';
import { REGION_LABELS } from '../../domain/catalog';
import { useT } from '../../i18n/v3';

function MotionCromo() {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced.matches || connection?.saveData) return;
    const timer = window.setTimeout(() => setEnabled(true), 900);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const sync = () => { if (!video.current) return; if (document.hidden || paused) video.current.pause(); else void video.current.play().catch(() => setPaused(true)); };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [enabled, paused]);
  if (!enabled) return null;
  return <><video ref={video} className="al-motion-video" src="/video/chulla-vida-hero-720x1280.mp4" onError={() => setEnabled(false)} muted loop playsInline autoPlay preload="none" aria-hidden="true" /><span className="al-motion-label">ECUADOR · {t('En movimiento')}</span><button className="al-motion-control" onClick={() => setPaused(p => !p)} aria-label={t(paused ? 'Reproducir video' : 'Pausar video')}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></>;
}

export function AlbumCover() {
  const t = useT();
  const { records, saved, toggle, select } = useCatalog();
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
  const photoRecords = records.filter(place => experienceVisual(place).photo);
  const picks = [1, 14, 32].map((offset, i) => photoRecords[(offset + round * 7 + i) % photoRecords.length]).filter(Boolean);
  return <section className="al-cover" data-field="portada" data-tour="album" aria-labelledby="hero-title">
    <div className="al-cover-copy">
      <div className="al-country"><span className="al-flag" aria-hidden="true" /><span>Ecuador, a tu manera</span><span className="al-edition">VOL. 01</span></div>
      <h1 id="hero-title">{t('Llena tu álbum del Ecuador')}</h1>
      <p>{t('Lugares que se guardan. Historias que se viven.')}</p>
      <div className="al-cover-actions"><button className="al-button" onClick={() => setOpened(true)}><Sparkles size={19} />{t('Abrir mi primer sobre')}</button><a href="#experiencias" className="al-text-link">{t('Hojear el álbum')}<ArrowDown size={17} /></a></div>
      <div className="al-cover-index"><span><strong>{ALBUM_TOTAL}</strong>{t('lugares')}</span><i aria-hidden="true" /><span><strong>04</strong>{t('regiones')}</span><i aria-hidden="true" /><span><strong>{String(saved.length).padStart(2, '0')}</strong>{t('En mi sobre')}</span></div>
    </div>
    <div className={`al-pack-stage ${opened ? 'is-open' : ''}`} data-tour="pack">
      <div className="al-orbit-label" aria-hidden="true">CHULLA VIDA · UN PAÍS POR DESCUBRIR ·</div>
      <div className="al-pack-cards">
        {picks.map((place, index) => { const visual = experienceVisual(place); return <article key={`${round}-${place.id}`} className={`al-preview-card al-preview-${index}`} data-region={place.localizedRegion}>
          <button className="al-preview-open" onClick={() => opened ? select(place.id) : setOpened(true)} aria-label={`${t('Abrir cromo')}: ${place.title}`}><img src={visual.src} alt={visual.alt} width="320" height="400" loading="eager" /><span className="al-number">{albumLabel(place.id)}</span><span className="al-preview-title">{place.title}</span></button>
          {!opened && index === 1 && <MotionCromo />}
          {opened && <button className="al-preview-save" onClick={() => toggle(place.id)} aria-pressed={saved.includes(place.id)}>{saved.includes(place.id) ? <Check size={16} /> : <ArrowDown size={16} />}{t(saved.includes(place.id) ? 'En mi sobre' : 'Guardar')}</button>}
        </article>; })}
      </div>
      {!opened ? <button className="al-pack" onClick={() => setOpened(true)} aria-label={t('Abrir mi primer sobre')}><span className="al-pack-tear">{t('Tira para descubrir')}<ArrowUpRight size={20} /></span><img src="/brand/logo-320.webp" alt="CHULLA VIDA" width="132" height="132" /><strong>ECUADOR</strong><span>3 {t('lugares')} · 1 {t('aventura')}</span></button> : <div className="al-pack-open-tools" role="status"><span><MapPin size={16} />{t('Tu próxima historia empieza aquí')}</span><button onClick={() => { setRound(n => n + 1); }}><RotateCcw size={17} />{t('Otro sobre')}</button></div>}
      {!opened && <p className="al-stage-note">{t('Abre. Guarda. Sal a vivirlo.')}<span>↗</span></p>}
    </div>
    <div className="al-region-ribbon" data-tour="regions" aria-label={t('Explora por región')}>{Object.entries(REGION_LABELS).map(([id, label]) => <a key={id} href={`#rail-${id}`} data-region={id}><span className="al-region-dot" />{label}<ArrowDown size={15} /></a>)}</div>
  </section>;
}
