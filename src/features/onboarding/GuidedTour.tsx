import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { isHostMode } from '../roles';
import './tour.css';

import { useT, msg } from '../../i18n/v3';
export const TOUR_EVENT = 'cv3:tour';
export const TOUR_KEY = 'chullavida:v3:tour';
export const TOUR_PROGRESS_KEY = `${TOUR_KEY}:progress`;
export type TourPath = 'traveler' | 'host';
/** Event sigue funcionando; CustomEvent admite ruta y reinicio explícitos. */
export interface TourRequest { path?: TourPath; restart?: boolean }

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** Contrato estable: atributos en controles reales, independientes del texto y del CSS. */
  targets: string[];
}

/** Recorrido por las partes reales de la página. Cada paso apunta a un elemento marcado con data-tour. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'album', title: msg('Explorar Ecuador'), text: msg('Elige región o provincia.'), targets: ['[data-tour="album"]'] },
  { id: 'regions', title: msg('Elige tu región'), text: msg('Toca una región y mira sus cromos.'), targets: ['[data-tour="regions"]'] },
  { id: 'search', title: msg('Busca un lugar'), text: msg('Escribe un nombre o una provincia.'), targets: ['[data-tour="search"]'] },
  { id: 'filters', title: msg('A tu medida'), text: msg('Filtra por días, presupuesto o dificultad.'), targets: ['[data-tour="filters"]'] },
  { id: 'card', title: msg('Abre una ficha'), text: msg('Toca el corazón de una ficha.'), targets: ['[data-tour="card"]'] },
  { id: 'plan', title: msg('Mis guardados'), text: msg('Junta paradas y presupuesto.'), targets: ['[data-tour="envelope"]', '[data-tour="plan"]'] },
  { id: 'mijin', title: msg('Habla con MIJIN'), text: msg('Pregunta por voz o texto. Tú enciendes el micrófono.'), targets: ['[data-tour="mijin"]'] },
  { id: 'culture', title: msg('Cultura Viva'), text: msg('Descubre las fechas y los lugares de cada fiesta.'), targets: ['[data-tour="culture"]'] },
  { id: 'passport', title: msg('Pasaporte Guambra'), text: msg('Mira lo que llevas en tu álbum. Solo una visita confirmada pega el cromo.'), targets: ['[data-tour="passport"]'] },
  { id: 'account', title: msg('Yo · Tu cuenta'), text: msg('Entra a tu cuenta y ajusta tus preferencias.'), targets: ['[data-tour="account"]'] },
];
export const HOST_TOUR_STEPS: TourStep[] = [
  { id: 'host', title: msg('Tu espacio de anfitrión'), text: msg('Desde aquí gestionas tus solicitudes.'), targets: ['[data-tour="host"]'] },
  { id: 'host-experiences', title: msg('Tus experiencias'), text: msg('Prepara tus fichas y revisa su estado.'), targets: ['[data-tour="host-experiences"]'] },
  { id: 'host-requests', title: msg('Tus solicitudes'), text: msg('Revisa cada solicitud antes de responder.'), targets: ['[data-tour="host-requests"]'] },
  { id: 'account', title: msg('Tu cuenta'), text: msg('Revisa tus datos y permisos. Tener cuenta no acredita una verificación.'), targets: ['[data-tour="account"]'] },
];

function isShown(element: Element) {
  if (element.closest('[hidden], [aria-hidden="true"]')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}
/** Primer elemento visible que coincide con los selectores del paso. */
export function findTourTarget(step: TourStep, root: ParentNode = document): HTMLElement | null {
  for (const selector of step.targets) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) if (isShown(element)) return element;
  }
  return null;
}
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };

/** Al terminar u omitir el recorrido: vuelve suave al principio de la página y enfoca el título principal. */
export function returnToTop() {
  try { window.scrollTo({ top: 0, behavior: reduced() ? 'instant' : 'smooth' }); } catch { /* entorno sin desplazamiento */ }
  const title = document.getElementById('hero-title') ?? document.querySelector<HTMLElement>('main h1');
  if (!title) return;
  if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
  title.focus({ preventScroll: true });
}

/** La vista activa decide el recorrido, también cuando la cuenta tiene ambos roles. */
export function stepsForRole(steps: TourStep[] = TOUR_STEPS): TourStep[] {
  return isHostMode() ? HOST_TOUR_STEPS : steps.filter(step => !step.id.startsWith('host'));
}

function readCheckpoint(path: TourPath, steps: TourStep[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY) ?? '{}') as Record<string, unknown> | null;
    return Math.max(0, steps.findIndex(step => step.id === saved?.[path]));
  } catch { return 0; }
}
function saveCheckpoint(path: TourPath, id: string | null) {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY) ?? '{}');
    const saved = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    localStorage.setItem(TOUR_PROGRESS_KEY, JSON.stringify({ ...saved, [path]: id }));
  } catch { /* sin almacenamiento */ }
}

interface Box { top: number; left: number; width: number; height: number }
const PAD = 8;

/** Se monta una vez. Escucha `cv3:tour` y abre el recorrido con foco sobre la página real. */
export function TourGate() {
  const [request, setRequest] = useState<(TourRequest & { path: TourPath }) | null>(null);
  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<TourRequest>).detail;
      setRequest({ restart: detail?.restart === true, path: detail?.path === 'host' || (!detail?.path && isHostMode()) ? 'host' : 'traveler' });
    };
    window.addEventListener(TOUR_EVENT, show);
    return () => window.removeEventListener(TOUR_EVENT, show);
  }, []);
  return request && <GuidedTour key={request.path} {...request} steps={request.path === 'host' ? HOST_TOUR_STEPS : TOUR_STEPS} onClose={() => setRequest(null)} />;
}

export function GuidedTour({ onClose, steps = TOUR_STEPS, path = 'traveler', restart = false }: { onClose: () => void; steps?: TourStep[]; path?: TourPath; restart?: boolean }) {
  const t = useT();
  const [index, setIndex] = useState(() => restart ? 0 : readCheckpoint(path, steps));
  const [available, setAvailable] = useState(() => steps.filter(step => findTourTarget(step)));
  const [box, setBox] = useState<Box | null>(null);
  const [bubble, setBubble] = useState<{ top: number; left: number; placement: 'below' | 'above' | 'dock' }>({ top: 0, left: 0, placement: 'dock' });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const backToTop = useRef(false);
  const closed = useRef(false);
  const titleId = useId();
  const textId = useId();
  const step = available.find(item => steps.indexOf(item) >= index) ?? available.at(-1);
  const position = step ? available.indexOf(step) : -1;
  const last = position === available.length - 1;

  const finish = useCallback((completed: boolean) => {
    if (closed.current) return;
    closed.current = true;
    try { localStorage.setItem(TOUR_KEY, completed ? 'done' : 'skipped'); } catch { /* sin almacenamiento */ }
    if (completed) saveCheckpoint(path, null);
    backToTop.current = true;
    onClose();
  }, [onClose, path]);

  useEffect(() => { if (step) saveCheckpoint(path, step.id); else finish(false); }, [step, path, finish]);

  // Fondo inerte mientras dura el recorrido; al cerrar, el foco vuelve a donde estaba.
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    return () => {
      if (root) root.inert = wasInert;
      if (backToTop.current) { returnToTop(); return; }
      const back = previousFocus.current;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  // Lleva el elemento del paso a la vista.
  useEffect(() => {
    if (!step) return;
    const target = findTourTarget(step);
    if (target) {
      // Desplazamiento suave solo si está cerca; si está lejos (pie de página), salto directo para no marear.
      const rect = target.getBoundingClientRect();
      const far = Math.abs(rect.top) > window.innerHeight * 2;
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced() || far ? 'instant' : 'smooth' });
    }
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Sigue cambios reales, sin un bucle de medidas en cada fotograma.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const visible = steps.filter(item => findTourTarget(item));
      setAvailable(previous => previous.length === visible.length && previous.every((item, i) => item === visible[i]) ? previous : visible);
      const target = step && findTourTarget(step);
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? window.innerWidth, vh = viewport?.height ?? window.innerHeight;
      const ox = viewport?.offsetLeft ?? 0, oy = viewport?.offsetTop ?? 0;
      const bw = Math.min(360, vw - 24);
      const bh = Math.min(bubbleRef.current?.offsetHeight || 260, vh - 24);
      if (!target) { setBox(null); setBubble({ top: Math.max(12, (vh - bh) / 2), left: (vw - bw) / 2, placement: 'dock' }); return; }
      const rect = target.getBoundingClientRect();
      const next = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
      setBox(previous => previous && Math.abs(previous.top - next.top) < 0.5 && Math.abs(previous.left - next.left) < 0.5 && Math.abs(previous.width - next.width) < 0.5 && Math.abs(previous.height - next.height) < 0.5 ? previous : next);
      const left = Math.min(Math.max(ox + 12, rect.left + rect.width / 2 - bw / 2), ox + vw - bw - 12);
      let placement: 'below' | 'above' | 'dock' = 'dock';
      let top = oy + vh - bh - 12;
      if (rect.bottom + PAD + 14 + bh <= oy + vh - 12) { placement = 'below'; top = rect.bottom + PAD + 14; }
      else if (rect.top - PAD - 14 - bh >= oy + 12) { placement = 'above'; top = rect.top - PAD - 14 - bh; }
      top = Math.max(oy + 12, Math.min(top, oy + vh - bh - 12));
      setBubble(previous => previous.top === top && previous.left === left && previous.placement === placement ? previous : { top, left, placement });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    const observer = new MutationObserver(records => { if (records.some(record => !(record.target instanceof Element) || !record.target.closest('.cv-tour'))) schedule(); });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'class', 'style', 'data-tour'] });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (bubbleRef.current) resize?.observe(bubbleRef.current);
    const element = step && findTourTarget(step);
    if (element) resize?.observe(element);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resize?.disconnect();
      window.removeEventListener('resize', schedule); document.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [step, steps]);

  const go = (delta: number) => { const next = available[position + delta]; if (next) setIndex(steps.indexOf(next)); };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); finish(false); return; }
    if (event.key === 'ArrowRight' && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); if (last) finish(true); else go(1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1); return; }
    if (event.key === 'Tab') {
      const focusable = [...(bubbleRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
      if (!focusable.length) return;
      const first = focusable[0], end = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) { event.preventDefault(); end.focus(); }
      else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first.focus(); }
    }
  };

  if (!step) return null;
  return createPortal(<div className={`cv-tour ${reduced() ? 'is-reduced' : ''}`} onKeyDown={onKeyDown}>
    <div className="cv-tour-backdrop" aria-hidden="true" onClick={event => event.stopPropagation()} />
    {box ? <div className="cv-tour-spot" aria-hidden="true" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} /> : <div className="cv-tour-dim" aria-hidden="true" />}
    <div ref={bubbleRef} className={`cv-tour-bubble is-${bubble.placement}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} style={{ top: bubble.top, left: bubble.left }}>
      <div className="cv-tour-head">
        <p className="cv-tour-count" aria-live="polite">{t("Paso {n} de {total}", { n: position + 1, total: available.length })}</p>
        <button type="button" className="cv-tour-close" onClick={() => finish(false)} aria-label={t("Cerrar el recorrido")}><X size={18} /></button>
      </div>
      <h2 id={titleId} ref={titleRef} tabIndex={-1}>{t(step.title)}</h2>
      <p id={textId}>{t(step.text)}</p>
      <div className="cv-tour-progress" aria-hidden="true">{available.map((item, i) => <i key={item.id} className={i === position ? 'is-on' : i < position ? 'is-done' : ''} />)}</div>
      <div className="cv-tour-actions">
        <button type="button" className="cv-tour-skip" onClick={() => finish(false)}>{t("Saltar recorrido")}</button>
        <span>
          {position > 0 && <button type="button" className="cv-tour-back" onClick={() => go(-1)}><ArrowLeft size={16} />{t("Atrás")}</button>}
          {last
            ? <button type="button" className="cv-tour-next" onClick={() => finish(true)}><Check size={16} />{t("¡Listo, a explorar!")}</button>
            : <button type="button" className="cv-tour-next" onClick={() => go(1)}>{t("Siguiente")}<ArrowRight size={16} /></button>}
        </span>
      </div>
      <p className="cv-tour-keys">{t("Usa las flechas ← → para moverte y Esc para salir.")}</p>
    </div>
  </div>, document.body);
}
