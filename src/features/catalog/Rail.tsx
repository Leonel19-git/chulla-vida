import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { prefersReducedMotion } from '../../components/common/motion';
import './compact.css';

import { useT } from '../../i18n/v3';
/** Carrusel horizontal con scroll-snap. Las flechas solo aparecen con puntero fino (ratón); en el celular se desliza. */
export function Rail({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const t = useT();
  const ref = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => { const list = ref.current; if (list) list.scrollBy({ left: dir * list.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); };
  return <div className={`cv-rail ${className}`}>
    <ul ref={ref} className="cv-rail-track" aria-label={label} tabIndex={0}>{children}</ul>
    <button type="button" className="cv-rail-arrow is-prev" aria-label={t("Anterior: {label}", { label: label })} onClick={() => move(-1)}><ChevronLeft size={20} /></button>
    <button type="button" className="cv-rail-arrow is-next" aria-label={t("Siguiente: {label}", { label: label })} onClick={() => move(1)}><ChevronRight size={20} /></button>
  </div>;
}

/** Chip corto con el detalle desplegable: los avisos de «referencial» y «prueba» no ocupan la pantalla. */
export function NoteChip({ label, children, icon: ChipIcon = Info }: { label: string; children: ReactNode; icon?: typeof Info }) {
  return <details className="cv-note-chip"><summary><ChipIcon size={15} aria-hidden="true" />{label}</summary><div className="cv-note-body">{children}</div></details>;
}
