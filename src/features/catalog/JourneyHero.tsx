import { ArrowDown, ArrowUpRight, Compass, MapPin, Mic, Mountain, Trees, Waves } from 'lucide-react';
import { useT } from '../../i18n/v3';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { HeroVideo } from './HeroVideo';

export interface JourneyVisual { src: string; srcSet?: string; alt: string; place: string; credit: string | null; photo: boolean }
const icons = { sierra: Mountain, costa: Waves, amazonia: Trees, galapagos: Compass };
export function JourneyHero({ hero, active, selected, regions, onPreview, onRegion }: {
  hero: JourneyVisual; active: RegionId | null; selected: RegionId | 'all';
  regions: { id: RegionId; visual: JourneyVisual; count: number }[];
  onPreview: (id: RegionId | null) => void; onRegion: (id: RegionId) => void;
}) {
  const t = useT();
  return <section className="vivo-hero cv-hero journey-hero" aria-labelledby="hero-title" data-region-tone={active ?? undefined}>
    <div className="journey-introduction">
      <h1 id="hero-title" tabIndex={-1}>{t('Un país.')}<br />{t('Mil formas de')}<br /><em>{t('vivirlo.')}</em></h1>
      <p>{t('Cumbres, río, bosque y mar.')}</p>
      <div className="journey-actions">
        <a className="journey-primary" href="#experiencias">{t('Encuentra tu aventura')}<ArrowDown size={18} aria-hidden="true" /></a>
        <button className="journey-mijin" onClick={() => window.dispatchEvent(new Event('cv3:mijin'))}><Mic size={18} aria-hidden="true" />{t('Habla con MIJIN')}<ArrowUpRight size={16} aria-hidden="true" /></button>
      </div>
    </div>
    <figure className="journey-landscape">
      <img key={hero.src} className="vivo-hero-photo journey-photo" src={hero.src} srcSet={hero.srcSet} sizes="(max-width:700px) 100vw, 50vw" width="1280" height="782" alt={hero.alt} fetchPriority="high" />
      {!active && <HeroVideo />}
      <figcaption><span><MapPin size={14} aria-hidden="true" />{hero.place}</span><details><summary>{t('Créditos')}</summary><p>{hero.credit && <>{hero.photo ? t('Foto') : t('Ilustración')}: {hero.credit}</>}{!active && <> · <a href="/video/CREDITS.md" target="_blank" rel="noreferrer">{t('Créditos del video')}</a></>}</p></details></figcaption>
    </figure>
    <div className="journey-regions" role="group" aria-label={t('Explora por región')} data-tour="regions">
      {regions.map(({ id, visual, count }) => { const Icon = icons[id]; return <button key={id} data-region-tone={id} aria-label={`${REGION_LABELS[id]}, ${count} ${count === 1 ? 'ficha' : 'fichas'}`} aria-pressed={selected === id} onMouseEnter={() => onPreview(id)} onMouseLeave={() => onPreview(null)} onFocus={() => onPreview(id)} onBlur={() => onPreview(null)} onClick={() => onRegion(id)}>
        <img src={visual.src} alt="" loading="lazy" width="160" height="110" /><span><Icon size={16} aria-hidden="true" /><strong>{REGION_LABELS[id]}</strong></span><ArrowUpRight size={18} className="journey-region-arrow" aria-hidden="true" />
      </button>; })}
    </div>
  </section>;
}
