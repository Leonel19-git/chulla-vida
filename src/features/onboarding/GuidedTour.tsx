import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import './tour.css';

export const TOUR_EVENT = 'cv3:tour';
export const TOUR_KEY = 'chullavida:v3:tour';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** Selectores en orden de preferencia: primero el data-tour propio, luego respaldos por clase o aria-label. */
  targets: string[];
}

/** Recorrido por las partes reales de la página. Cada paso apunta a un elemento marcado con data-tour. */
export const TOUR_STEPS: TourStep[] = [
  { id: 'regions', title: 'Elige tu región', text: 'Sierra, Costa, Amazonía o Galápagos: toca una y te llevamos directo a sus fichas.', targets: ['[data-tour="regions"]', '.cv-hero-regions'] },
  { id: 'search', title: 'Busca y filtra', text: 'Escribe un lugar, una provincia o una actividad. En «Filtros» eliges provincia, presupuesto, días y si viajas con mascota.', targets: ['[data-tour="search"]', '.vivo-searchbar'] },
  { id: 'card', title: 'Así es cada ficha', text: 'Foto real con su crédito (o una ilustración rotulada), el precio referencial que propone la fuente y el corazón para guardarla en tu viaje.', targets: ['[data-tour="cards"] .vivo-card', '.vivo-card'] },
  { id: 'buy', title: 'Comprar', text: 'Abre el checkout por pasos: datos, cédula y pago con tarjeta. Mientras la pasarela no esté activa, todo es modo prueba y no se cobra nada.', targets: ['[data-tour="cards"] .vivo-card .buy-button', '.vivo-card .buy-button', '[aria-label^="Comprar"]'] },
  { id: 'mijin', title: 'Habla con MIJIN', text: 'Tu pana de aventuras. Pregúntale por voz o por escrito: fichas, fiestas, clima y cómo llegar. El micrófono solo se enciende cuando lo tocas.', targets: ['[data-tour="mijin"]', '[aria-label="Habla con MIJIN"]', '.mijin-launcher'] },
  { id: 'plan', title: 'Mi viaje', text: 'Junta paradas, ordénalas y mira tu presupuesto total. Lo que falta confirmar se queda a la vista.', targets: ['[data-tour="plan"]', '[aria-label="Mi viaje"]'] },
  { id: 'wallet', title: 'Mi billetera', text: 'Tus compras de prueba, comprobantes y lo que llevas gastado, todo en un solo lugar.', targets: ['[data-tour="wallet"]', '[aria-label="Mi billetera"]'] },
  { id: 'offline', title: 'Sin señal', text: 'Descarga fichas a tu dispositivo para leerlas sin internet en el páramo o en el río.', targets: ['[data-tour="offline"]', '[data-tour="more"]'] },
  { id: 'passport', title: 'Pasaporte Guambra', text: 'Colecciona historias. El sello verificado llega cuando el anfitrión confirma tu visita; abrir una ficha no cuenta.', targets: ['[data-tour="passport"]', '.passport-nav'] },
  { id: 'account', title: 'Entrar o crear cuenta', text: 'Con tu correo y un código de 6 dígitos guardas tu perfil, tus compras y tus sellos en cualquier dispositivo.', targets: ['[data-tour="account"]'] },
  { id: 'host', title: 'Anfitriones', text: '¿Tienes un emprendimiento, guías o una comunidad? Aquí empiezas a publicar tu experiencia, con revisión humana.', targets: ['[data-tour="host"]', '.vivo-host-hero', '.business-switch'] },
  { id: 'privacy', title: 'Tu privacidad', text: 'Tú decides qué guardamos y qué se comparte. Cambia tu nivel o ejerce tus derechos de datos cuando quieras.', targets: ['[data-tour="privacy-banner"]', '[data-tour="privacy"]'] },
];

function isShown(element: Element) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}
/** Primer elemento visible que coincide con los selectores del paso. */
export function findTourTarget(step: TourStep, root: ParentNode = document): HTMLElement | null {
  for (const selector of step.targets) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) if (isShown(element)) return element;
  }
  return null;
}
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };

interface Box { top: number; left: number; width: number; height: number }
const PAD = 8;

/** Se monta una vez. Escucha `cv3:tour` y abre el recorrido con foco sobre la página real. */
export function TourGate() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(TOUR_EVENT, show);
    return () => window.removeEventListener(TOUR_EVENT, show);
  }, []);
  if (!open) return null;
  return <GuidedTour onClose={() => setOpen(false)} />;
}

export function GuidedTour({ onClose, steps = TOUR_STEPS }: { onClose: () => void; steps?: TourStep[] }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [bubble, setBubble] = useState<{ top: number; left: number; placement: 'below' | 'above' | 'dock' }>({ top: 0, left: 0, placement: 'dock' });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const textId = useId();
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = useCallback((completed: boolean) => {
    try { localStorage.setItem(TOUR_KEY, completed ? 'done' : 'skipped'); } catch { /* sin almacenamiento */ }
    onClose();
  }, [onClose]);

  // Fondo inerte mientras dura el recorrido; al cerrar, el foco vuelve a donde estaba.
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    return () => {
      if (root) root.inert = wasInert;
      const back = previousFocus.current;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  // Lleva el elemento del paso a la vista.
  useEffect(() => {
    const target = findTourTarget(step);
    if (target) {
      // Desplazamiento suave solo si está cerca; si está lejos (pie de página), salto directo para no marear.
      const rect = target.getBoundingClientRect();
      const far = Math.abs(rect.top) > window.innerHeight * 2;
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced() || far ? 'instant' : 'smooth' });
    }
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Sigue la posición del elemento (scroll, cambios de tamaño, carga perezosa).
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      const target = findTourTarget(step);
      const vw = window.innerWidth, vh = window.innerHeight;
      const bw = Math.min(360, vw - 24);
      const bh = bubbleRef.current?.offsetHeight ?? 220;
      if (!target) { setBox(null); setBubble({ top: Math.max(12, (vh - bh) / 2), left: (vw - bw) / 2, placement: 'dock' }); return; }
      const rect = target.getBoundingClientRect();
      const next = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
      setBox(previous => previous && Math.abs(previous.top - next.top) < 0.5 && Math.abs(previous.left - next.left) < 0.5 && Math.abs(previous.width - next.width) < 0.5 && Math.abs(previous.height - next.height) < 0.5 ? previous : next);
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - bw / 2), vw - bw - 12);
      let placement: 'below' | 'above' | 'dock' = 'dock';
      let top = vh - bh - 12;
      if (rect.bottom + PAD + 14 + bh <= vh - 8) { placement = 'below'; top = rect.bottom + PAD + 14; }
      else if (rect.top - PAD - 14 - bh >= 8) { placement = 'above'; top = rect.top - PAD - 14 - bh; }
      setBubble(previous => previous.top === top && previous.left === left && previous.placement === placement ? previous : { top, left, placement });
    };
    const loop = () => { measure(); frame = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const go = (delta: number) => setIndex(current => Math.min(steps.length - 1, Math.max(0, current + delta)));
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

  return createPortal(<div className={`cv-tour ${reduced() ? 'is-reduced' : ''}`} onKeyDown={onKeyDown}>
    <div className="cv-tour-backdrop" aria-hidden="true" onClick={event => event.stopPropagation()} />
    {box ? <div className="cv-tour-spot" aria-hidden="true" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} /> : <div className="cv-tour-dim" aria-hidden="true" />}
    <div ref={bubbleRef} className={`cv-tour-bubble is-${bubble.placement}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} style={{ top: bubble.top, left: bubble.left }}>
      <div className="cv-tour-head">
        <p className="cv-tour-count" aria-live="polite">Paso {index + 1} de {steps.length}</p>
        <button type="button" className="cv-tour-close" onClick={() => finish(false)} aria-label="Cerrar el recorrido"><X size={18} /></button>
      </div>
      <h2 id={titleId} ref={titleRef} tabIndex={-1}>{step.title}</h2>
      <p id={textId}>{step.text}{!box && <span className="cv-tour-missing"> Esta parte no está a la vista en esta pantalla; la encuentras en el menú o al volver a «Explorar».</span>}</p>
      <div className="cv-tour-progress" aria-hidden="true">{steps.map((item, i) => <i key={item.id} className={i === index ? 'is-on' : i < index ? 'is-done' : ''} />)}</div>
      <div className="cv-tour-actions">
        <button type="button" className="cv-tour-skip" onClick={() => finish(false)}>Saltar recorrido</button>
        <span>
          {index > 0 && <button type="button" className="cv-tour-back" onClick={() => go(-1)}><ArrowLeft size={16} />Atrás</button>}
          {last
            ? <button type="button" className="cv-tour-next" onClick={() => finish(true)}><Check size={16} />¡Listo, a explorar!</button>
            : <button type="button" className="cv-tour-next" onClick={() => go(1)}>Siguiente<ArrowRight size={16} /></button>}
        </span>
      </div>
      <p className="cv-tour-keys">Usa las flechas ← → para moverte y Esc para salir.</p>
    </div>
  </div>, document.body);
}
