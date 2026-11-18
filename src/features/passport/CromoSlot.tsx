import { BadgeCheck, Check, Eye, Footprints, Lock, Mail, Map as MapIcon, PenLine, QrCode, Ticket, Trophy, type LucideIcon } from 'lucide-react';
import type { CromoEstado } from '../../domain/album';
import type { PassportSlot } from '../../domain/passport/slots';
import type { Achievement } from '../../domain/passport/stamps';
import type { ExperienceVisual } from '../catalog/experienceArt';
import { msg, useT } from '../../i18n/v3';

/** Nombre corto de cada estado (leyenda, lector de pantalla). */
export const ESTADO_TEXT: Readonly<Record<CromoEstado, string>> = {
  album: msg('Te falta'),
  visto: msg('Visto'),
  en_sobre: msg('En mi sobre'),
  comprado: msg('Comprado · por vivir'),
  pegado_demo: msg('Pegado de demostración'),
  pegado: msg('Pegado'),
};

type FaceSlot = Pick<PassportSlot, 'label' | 'estado' | 'region'> & Partial<Pick<PassportSlot, 'prueba'>>;
type FaceVisual = Pick<ExperienceVisual, 'src' | 'photo'> & Partial<Pick<ExperienceVisual, 'srcSet' | 'referencePhoto'>>;

/**
 * Cara visible de una casilla del álbum. Decorativa (`aria-hidden`): quien la usa da el nombre accesible.
 * hueco → filete discontinuo y número en contorno · visto → foto desaturada y ojo · en mi sobre → esquina roja ·
 * comprado → sello de caucho · pegado de demostración → sello DEMO sin brillo · pegado → marco foil, fecha y visto bueno.
 */
export function CromoFace({ slot, visual, date, mini = false }: { slot: FaceSlot; visual?: FaceVisual; date?: string; mini?: boolean }) {
  const t = useT();
  const { estado } = slot;
  const photo = estado !== 'album' && visual ? visual : null;
  return <span className={`pg-cromo is-${estado}${estado === 'pegado' ? ' pg-foil' : ''}${mini ? ' is-mini' : ''}`} data-region={slot.region} aria-hidden="true">
    <span className="pg-cromo-window">
      {photo ? <img className="pg-cromo-photo" src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 899px) 24vw, 128px" alt="" width="128" height="170" loading="lazy" decoding="async" draggable={false} />
        : <span className="pg-cromo-hole"><span className="pg-cromo-ghost">{slot.label}</span>{!mini && <span className="pg-cromo-hint">{t('Pega aquí')}</span>}</span>}
      {photo && !photo.photo && !mini && <span className="pg-cromo-art"><PenLine size={11} strokeWidth={2.5} /><span>{t(photo.referencePhoto ? 'Foto de referencia' : 'Ilustración')}</span></span>}
      {estado === 'visto' && <span className="pg-cromo-eye"><Eye size={mini ? 11 : 14} strokeWidth={2.5} /></span>}
      {estado === 'en_sobre' && <span className="pg-cromo-corner">{!mini && <span>{t('Sobre')}</span>}</span>}
      {estado === 'comprado' && <span className="pg-rubber is-buy">{!mini && <><b>{t('Comprado')}</b>{slot.prueba && <small>{t('Prueba')}</small>}</>}</span>}
      {estado === 'pegado_demo' && <span className="pg-rubber is-demo">{!mini && <b>{t('Demo')}</b>}</span>}
      {estado === 'pegado' && <span className="pg-cromo-seal"><Check size={mini ? 10 : 13} strokeWidth={3.5} /></span>}
      {estado === 'pegado' && date && !mini && <span className="pg-cromo-date">{date}</span>}
    </span>
    <span className="pg-cromo-tab">{slot.label}</span>
  </span>;
}

/** Texto accesible de una casilla: número, lugar, estado y matices honestos. */
export function useSlotLabel() {
  const t = useT();
  return (slot: PassportSlot, visual: FaceVisual | undefined, date: string | undefined) => {
    const parts = [slot.label, slot.title, t(ESTADO_TEXT[slot.estado])];
    if (slot.estado === 'comprado' && slot.prueba) parts.push(t('compra de prueba, sin cobro'));
    if (slot.estado === 'comprado' && slot.revision) parts.push(t('transferencia en revisión'));
    if (slot.estado === 'pegado_demo') parts.push(t('no cuenta como visita'));
    if (slot.estado === 'pegado' && date) parts.push(t('verificado el {date}', { date }));
    if (visual && !visual.photo && slot.estado !== 'album') parts.push(t(visual.referencePhoto ? 'Foto de referencia · no muestra este sitio' : 'ilustración, no es foto del lugar'));
    return parts.join(' · ');
  };
}

/** Casilla tocable: abre la ficha del lugar. `fresh` da el golpe de sello (una vez). */
export function CromoSlot({ slot, visual, date, fresh = false, label, name, onOpen, onPeek, onStuck }: {
  slot: PassportSlot; visual?: FaceVisual; date?: string; fresh?: boolean; label: string;
  /** Nombre impreso bajo la casilla (solo si cabe: en el libro abierto de computador). */
  name?: string;
  onOpen: (experienceId: string) => void; onPeek?: (slot: PassportSlot | null) => void; onStuck?: (slot: PassportSlot) => void;
}) {
  // La única animación de la cara es el golpe de sello: al terminar, ya no es «nuevo».
  return <button type="button" className={`pg-slot${fresh ? ' is-fresh' : ''}`} data-estado={slot.estado} data-region={slot.region} data-number={slot.label}
    aria-label={label} onClick={() => onOpen(slot.experienceId)} onAnimationEnd={fresh ? () => onStuck?.(slot) : undefined}
    onPointerEnter={() => onPeek?.(slot)} onPointerLeave={() => onPeek?.(null)} onFocus={() => onPeek?.(slot)} onBlur={() => onPeek?.(null)}>
    <CromoFace slot={slot} visual={visual} date={date} />
    {name && <span className="pg-slot-name">{name}</span>}
  </button>;
}

// ── Cromos especiales (logros) ───────────────────────────────────────────────
const SPECIAL: Readonly<Record<string, { title: string; hint: string; icon: LucideIcon }>> = {
  'primera-idea': { title: msg('Primera idea'), hint: msg('Mete un cromo en tu sobre.'), icon: Mail },
  curiosidad: { title: msg('Curiosidad viajera'), hint: msg('Mira 5 fichas.'), icon: Eye },
  'cuatro-mundos': { title: msg('Cuatro mundos'), hint: msg('Algo de las 4 regiones.'), icon: MapIcon },
  'ruta-en-marcha': { title: msg('Ruta en marcha'), hint: msg('Una compra lista para vivir.'), icon: Ticket },
  'ensayo-general': { title: msg('Ensayo general'), hint: msg('Pega un cromo de demostración.'), icon: QrCode },
  'huella-real': { title: msg('Huella real'), hint: msg('Tu primer cromo pegado de verdad.'), icon: Footprints },
  'ecuador-completo': { title: msg('Ecuador completo'), hint: msg('Pegados en las 4 regiones.'), icon: Trophy },
};
const BASIS_TEXT: Readonly<Record<Achievement['basis'], string>> = { verified: msg('Verificado'), demo: msg('Demo'), activity: msg('Actividad') };

/** Acabado honesto: brillo SOLO si es de base verificada y está ganado; demo y actividad llevan su propio rótulo. */
export function specialFinish(item: Pick<Achievement, 'basis' | 'earned'>): 'foil' | 'demo' | 'activity' | 'locked' {
  if (!item.earned) return 'locked';
  return item.basis === 'verified' ? 'foil' : item.basis;
}

export function SpecialCromo({ item }: { item: Achievement }) {
  const t = useT();
  const text = SPECIAL[item.id];
  const Icon = item.earned ? (text?.icon ?? BadgeCheck) : Lock;
  const finish = specialFinish(item);
  const progress = item.earned ? t('Logrado') : t('{progress} de {goal}', { progress: item.progress, goal: item.goal });
  return <li className={`pg-special is-${finish}`} data-basis={item.basis}>
    <span className={`pg-special-card${finish === 'foil' ? ' pg-foil' : ''}`}>
      <span className="pg-special-face">
        <span className="pg-special-icon" aria-hidden="true"><Icon size={22} strokeWidth={2.25} /></span>
        <strong>{text ? t(text.title) : t(item.title)}</strong>
        <small className="pg-special-hint">{text ? t(text.hint) : t(item.description)}</small>
        <span className="pg-special-foot"><span className="pg-special-basis">{t(BASIS_TEXT[item.basis])}</span><span className="pg-special-progress">{progress}</span></span>
      </span>
    </span>
  </li>;
}
