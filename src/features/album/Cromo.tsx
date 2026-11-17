import { useState, lazy, Suspense } from 'react';
import { ArrowUpRight, Clock3, Heart, MapPin, RotateCw } from 'lucide-react';
import { albumLabel } from '../../domain/album';
import { formatExperiencePrice, REGION_LABELS, type Experience } from '../../domain/catalog';
import { useCatalog } from '../catalog/CatalogContext';
import { experienceVisual } from '../catalog/experienceArt';
import { useT } from '../../i18n/v3';
const BuyButton = lazy(() => import('../payments/BuyButton').then(m => ({ default: m.BuyButton })));

export function Cromo({ experience }: { experience: Experience }) {
  const t = useT();
  const { select, saved, toggle } = useCatalog();
  const [flipped, setFlipped] = useState(false);
  const visual = experienceVisual(experience);
  const kept = saved.includes(experience.id);
  const price = formatExperiencePrice(experience).replace(' por persona', '').split(' · ')[0];
  return <article className={`al-cromo ${flipped ? 'is-flipped' : ''} ${kept ? 'is-kept' : ''}`} data-region={experience.localizedRegion} data-tour="card" aria-label={`${albumLabel(experience.id)} · ${experience.title}`}>
    <div className="al-cromo-turn">
      <div className="al-cromo-front" inert={flipped} aria-hidden={flipped}>
        <button className="al-cromo-image" onClick={() => select(experience.id)} aria-label={t('Conocer {title}', { title: experience.title })}><img src={visual.src} srcSet={visual.srcSet} sizes="(max-width:700px) 65vw, 290px" alt={visual.alt} width="320" height="400" loading="lazy" /><span className="al-cromo-shade" /><span className="al-cromo-caption"><small>{REGION_LABELS[experience.localizedRegion]}</small><strong>{experience.title}</strong></span></button>
        <span className="al-number">{albumLabel(experience.id)}</span><button className="al-cromo-heart" aria-label={`${kept ? 'Quitar' : 'Guardar'} ${experience.title}`} aria-pressed={kept} onClick={() => toggle(experience.id)}><Heart size={19} fill={kept ? 'currentColor' : 'none'} /></button>
        <div className="al-cromo-strip"><strong>{price}<small>{t('Referencial')}</small></strong><button onClick={() => setFlipped(true)} aria-label={`${t('Girar cromo')}: ${experience.title}`}><RotateCw size={17} />{t('Girar')}</button></div>
        {kept && <span className="al-cromo-kept">{t('En mi sobre')}</span>}
        {!visual.photo && <span className="al-cromo-art">{t('Ilustración')}</span>}
      </div>
      <div className="al-cromo-back" inert={!flipped} aria-hidden={!flipped}>
        <div className="al-cromo-back-top"><span>{albumLabel(experience.id)} / 51</span><button onClick={() => setFlipped(false)} aria-label={t('Volver a la foto')}><RotateCw size={19} /></button></div>
        <h3>{experience.title}</h3><p className="al-cromo-province"><MapPin size={15} />{experience.province}</p><p className="al-cromo-summary">{experience.summary}</p><div className="al-cromo-facts"><span><Clock3 size={15} />{experience.duration.label}</span><span>{experience.difficultyLabel}</span></div>
        <button className="al-button al-button-small" onClick={() => select(experience.id)}>{t('Ver ficha y cómo llegar')}<ArrowUpRight size={16} /></button><Suspense fallback={null}><BuyButton experience={experience} variant="card" /></Suspense>
        {visual.credit && <small className="al-cromo-credit">{visual.credit}{visual.sourceUrl && <a href={visual.sourceUrl} target="_blank" rel="noreferrer"> · {t('Créditos')}</a>}</small>}
      </div>
    </div>
  </article>;
}
