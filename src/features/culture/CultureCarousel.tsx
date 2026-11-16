import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Camera, CalendarCheck, ChevronLeft, ChevronRight, Footprints, HandHeart, Leaf, MapPin, Store, Trash2, Undo2, VolumeX, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { REGION_LABELS, getExperienceById } from '../../domain/catalog';
import { RESPECT_LABELS, eventStatusLabel, monthName, type CultureCard, type RespectIcon } from '../../domain/culture';
import { experienceArtSvg } from '../catalog/experienceArt';
import './culture-carousel.css';

import { useT } from '../../i18n/v3';
const RESPECT_ICONS: Record<RespectIcon, LucideIcon> = {
  camera: Camera,
  path: Footprints,
  trash: Trash2,
  invite: Mail,
  calendar: CalendarCheck,
  silence: VolumeX,
  nature: Leaf,
  share: Store,
};

const smoothOrAuto = (): ScrollBehavior => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
/** Momento en que la cara oculta pasa a visible (mitad del giro de 0,6 s; 0,2 s con movimiento reducido). */
const FACE_SWAP_MS = 320;
const shortMonth =(month: number) => monthName(month).slice(0, 3);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** «Feb–Mar», «Jun», «Sin fecha fija». */
export function monthsLabel(months: readonly number[]): string {
  if (!months.length) return 'Sin fecha fija';
  if (months.length === 1) return capital(monthName(months[0]));
  return `${capital(shortMonth(months[0]))}–${shortMonth(months[months.length - 1])}`;
}

function statusChip(card: CultureCard, now: Date): string {
  const label = eventStatusLabel(card.event, now);
  if (label.startsWith('En curso')) return 'En curso';
  if (label.startsWith('Programada')) return 'Programada';
  if (label.startsWith('Fecha definida por la comunidad')) return 'La comunidad fija la fecha';
  if (label.startsWith('Edición')) return 'Edición terminada';
  return 'Fecha orientativa';
}

const placeLabel = (card: CultureCard) => {
  const { localities, provinces, region } = card.event;
  const where = localities.length ? localities.join(', ') : provinces.length ? provinces.join(', ') : 'Varias comunidades';
  return `${where} · ${REGION_LABELS[region]}`;
};

const artUri = (card: CultureCard) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(experienceArtSvg(`cultura-${card.event.id}`, card.event.region))}`;

export interface FestivalCardProps {
  card: CultureCard;
  now: Date;
  flipped: boolean;
  onFlip: (flipped: boolean) => void;
  onOpenExperience?: (experienceId: string) => void;
}

export function FestivalCard({ card, now, flipped, onFlip, onOpenExperience }: FestivalCardProps) {
  const t = useT();
  const { event, info, photo } = card;
  const backId = useId();
  const frontRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const [showExperiences, setShowExperiences] = useState(false);
  const related = event.relatedExperienceIds.map(id => getExperienceById(id)).filter(experience => experience !== undefined);

  const flip = (next: boolean) => {
    onFlip(next);
    if (!next) setShowExperiences(false);
    // El foco sigue a la cara visible, cuando ya es visible (a mitad del giro o del fundido; ver CSS).
    const target = () => (next ? backRef.current : frontRef.current);
    const tryFocus = (attempt: number) => {
      const element = target();
      if (!element) return;
      element.focus({ preventScroll: true });
      if (document.activeElement !== element && attempt < 8) window.setTimeout(() => tryFocus(attempt + 1), 60);
    };
    window.setTimeout(() => tryFocus(0), FACE_SWAP_MS);
  };
  const backClick = (clickEvent: MouseEvent<HTMLDivElement>) => {
    if ((clickEvent.target as HTMLElement).closest('a, button')) return;
    flip(false);
  };
  const seeExperiences = () => {
    if (related.length === 1 && onOpenExperience) return onOpenExperience(related[0].id);
    if (related.length > 1 && onOpenExperience) return setShowExperiences(value => !value);
    window.dispatchEvent(new CustomEvent('cv3:culture-experiences', { detail: { eventId: event.id, region: event.region, experienceIds: event.relatedExperienceIds } }));
    document.getElementById('experiencias')?.scrollIntoView?.({ behavior: smoothOrAuto(), block: 'start' });
  };

  return (
    <article className="cvc-card" data-flipped={flipped || undefined} data-region-tone={event.region} aria-label={event.name}>
      <div className="cvc-inner">
        <button
          ref={frontRef}
          type="button"
          className="cvc-face cvc-front"
          aria-pressed={flipped}
          aria-controls={backId}
          aria-label={`${event.name}. ${monthsLabel(event.usualMonths)}, ${REGION_LABELS[event.region]}. Toca para ver detalles`}
          onClick={() => flip(true)}
          inert={flipped}
        >
          <img
            className="cvc-photo"
            src={photo ? photo.src : artUri(card)}
            srcSet={photo ? `${photo.src} 640w, ${photo.srcLarge} 1280w` : undefined}
            sizes="(min-width: 900px) 300px, 78vw"
            alt=""
            loading="lazy"
            decoding="async"
            width={640}
            height={800}
          />
          {!photo && <span className="cvc-art-label">{event.sensitive ? t("Ilustración · sin fotos por respeto") : t("Ilustración")}</span>}
          {photo?.depicts === 'lugar' && <span className="cvc-art-label">{t("Foto del lugar")}</span>}
          <span className="cvc-shade" aria-hidden="true" />
          <span className="cvc-front-text">
            <span className="cvc-chips">
              <span className="cvc-chip cvc-chip-month">{monthsLabel(event.usualMonths)}</span>
              <span className="cvc-chip">{REGION_LABELS[event.region]}</span>
            </span>
            <span className="cvc-name">{event.name}</span>
            <span className="cvc-hint" aria-hidden="true">{t("Toca para girar")}</span>
          </span>
        </button>

        <div id={backId} className="cvc-face cvc-back" role="group" aria-label={t("Detalles de {name}", { name: event.name })} inert={!flipped} onClick={backClick}>
          <div className="cvc-back-head">
            <h3>{event.name}</h3>
            <button ref={backRef} type="button" className="cvc-icon-button" aria-pressed={flipped} aria-label={t("Volver a la foto de {name}", { name: event.name })} onClick={() => flip(false)}>
              <Undo2 size={18} aria-hidden="true" />
            </button>
          </div>
          <ul className="cvc-facts">
            <li><CalendarCheck size={16} aria-hidden="true" /><span><strong>{t("Cuándo")}</strong> {event.dateLabel} <em className="cvc-status">{statusChip(card, now)}</em></span></li>
            <li><MapPin size={16} aria-hidden="true" /><span><strong>{t("Dónde")}</strong> {placeLabel(card)}</span></li>
            <li><HandHeart size={16} aria-hidden="true" /><span><strong>{t("Qué")}</strong> {info.what}</span></li>
          </ul>
          <p className="cvc-respect-title">{t("Vívela con respeto")}</p>
          <ul className="cvc-respect">
            {info.respect.map(icon => {
              const Icon = RESPECT_ICONS[icon];
              return <li key={icon}><Icon size={20} aria-hidden="true" /><span>{RESPECT_LABELS[icon]}</span></li>;
            })}
          </ul>
          <details className="cvc-more">
            <summary>{t("Más detalles")}</summary>
            <ul>{event.protocols.map(protocol => <li key={protocol}>{protocol}</li>)}</ul>
          </details>
          <p className="cvc-source">{t("Fuente:")}{' '}<a href={info.source.url} target="_blank" rel="noreferrer">{info.source.publisher}<span className="cvc-sr">{' '}{t("(abre en otra pestaña)")}</span></a>
            {' · '}revisada {info.source.checkedAt.split('-').reverse().join('/')}
            <br />
            {photo ? (
              <>{photo.depicts === 'lugar' ? t("Foto del lugar") : t("Foto")}: <a href={photo.pageUrl} target="_blank" rel="noreferrer">{photo.author}<span className="cvc-sr">{' '}{t("(abre en otra pestaña)")}</span></a> · {photo.license}</>
            ) : (
              t("Imagen: ilustración propia")
            )}
          </p>
          <button type="button" className="cvc-cta" onClick={seeExperiences} aria-expanded={related.length > 1 && onOpenExperience ? showExperiences : undefined}>{t("Ver experiencias cercanas")}</button>
          {showExperiences && (
            <ul className="cvc-related">
              {related.map(experience => (
                <li key={experience.id}><button type="button" onClick={() => onOpenExperience?.(experience.id)}>{experience.title}</button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

export interface CultureCarouselProps {
  cards: readonly CultureCard[];
  /** Nombre accesible del carrusel. */
  label: string;
  now?: Date;
  onOpenExperience?: (experienceId: string) => void;
  /** Carta destacada (más grande), para «Este mes» o la portada. */
  featured?: boolean;
}

/** Carrusel horizontal de cartas que giran. Deslizar con el dedo, flechas en escritorio, ← → con teclado. */
export function CultureCarousel({ cards, label, now: nowProp, onOpenExperience, featured = false }: CultureCarouselProps) {
  const t = useT();
  const [fallbackNow] = useState(() => new Date());
  const now = nowProp ?? fallbackNow;
  const trackRef = useRef<HTMLUListElement>(null);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector<HTMLElement>('.cvc-item');
    const step = item ? item.offsetWidth + 14 : track.clientWidth * 0.8;
    track.scrollBy?.({ left: direction * step, behavior: smoothOrAuto() });
  };
  const keys = (keyEvent: KeyboardEvent<HTMLUListElement>) => {
    if (keyEvent.key !== 'ArrowRight' && keyEvent.key !== 'ArrowLeft' && keyEvent.key !== 'Home' && keyEvent.key !== 'End') return;
    const items = [...(trackRef.current?.querySelectorAll<HTMLElement>('.cvc-item') ?? [])];
    const current = items.findIndex(item => item.contains(document.activeElement));
    if (current < 0) return;
    keyEvent.preventDefault();
    const next =
      keyEvent.key === 'Home' ? 0 : keyEvent.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + (keyEvent.key === 'ArrowRight' ? 1 : -1)));
    const target = items[next].querySelector<HTMLElement>('.cvc-face:not([inert])');
    target?.focus({ preventScroll: true });
    items[next].scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: smoothOrAuto() });
  };

  if (!cards.length) return null;
  return (
    <div className={`cvc-carousel${featured ? ' cvc-featured' : ''}`}>
      <div className="cvc-arrows">
        <button type="button" className="cvc-arrow" aria-label={t("Anterior en {label}", { label: label })} onClick={() => scrollBy(-1)}><ChevronLeft size={22} aria-hidden="true" /></button>
        <button type="button" className="cvc-arrow" aria-label={t("Siguiente en {label}", { label: label })} onClick={() => scrollBy(1)}><ChevronRight size={22} aria-hidden="true" /></button>
      </div>
      <ul ref={trackRef} className="cvc-track" aria-label={label} onKeyDown={keys}>
        {cards.map(card => (
          <li key={card.event.id} className="cvc-item">
            <FestivalCard
              card={card}
              now={now}
              flipped={flipped === card.event.id}
              onOpenExperience={onOpenExperience}
              onFlip={next => {
                setFlipped(next ? card.event.id : null);
                setAnnounce(next ? t("Detalles de {name}", { name: card.event.name }) : t("{name}: foto", { name: card.event.name }));
              }}
            />
          </li>
        ))}
      </ul>
      <p className="cvc-sr" aria-live="polite">{announce}</p>
    </div>
  );
}

