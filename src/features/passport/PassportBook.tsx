import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RegionId } from '../../domain/catalog';
import { spreadCount, spreadOf, spreadPages } from '../../domain/passport/pages';
import { useT } from '../../i18n/v3';
import { foilFollowPointer, foilShift, releaseVelocity, springTo } from './motion';

export interface BookPage {
  id: string;
  /** Pestaña del índice a la que pertenece (`null`: sin pestaña). */
  tab: string | null;
  /** Nombre corto ya traducido, para el contador y los anuncios. */
  label: string;
  /** `active`: la página está a la vista (no es una copia en la hoja que gira ni una vecina oculta). */
  render: (active: boolean) => ReactNode;
}
export interface BookTab { id: string; label: string; region?: RegionId; field?: string }

interface BookProps {
  pages: BookPage[];
  tabs: BookTab[];
  index: number;
  reduced: boolean;
  label: string;
  tools?: ReactNode;
  onGo: (index: number) => void;
}

const TYPING = 'input, textarea, select, [contenteditable="true"]';
const isTyping = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(TYPING));
/** Separación entre hojas mientras se desliza (px). */
const GAP = 24;

function IndexTabs({ tabs, current, open, onPick, variant }: { tabs: BookTab[]; current: string | null; open: readonly (string | null)[]; onPick: (tab: string) => void; variant: 'row' | 'rail' }) {
  const t = useT();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    // En la fila del celular, la pestaña abierta siempre a la vista (sin mover el resto del diálogo).
    if (variant !== 'row' || !nav.current) return;
    const tab = nav.current.querySelector<HTMLElement>('[aria-current="page"]');
    if (!tab || typeof nav.current.scrollTo !== 'function') return;
    nav.current.scrollTo({ left: tab.offsetLeft - nav.current.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' });
  }, [current, variant]);
  return <nav ref={nav} className={`pg-index is-${variant}`} aria-label={t('Índice del pasaporte')}>
    <ul>{tabs.map(tab => <li key={tab.id}>
      <button type="button" className={`pg-tab${open.includes(tab.id) ? ' is-open' : ''}`} data-region={tab.region} data-field={tab.field}
        aria-current={current === tab.id ? 'page' : undefined} onClick={() => onPick(tab.id)}><span>{tab.label}</span></button>
    </li>)}</ul>
  </nav>;
}

const firstPageOfTab = (pages: BookPage[], tab: string) => Math.max(0, pages.findIndex(page => page.tab === tab));

/**
 * Libro del Pasaporte Guambra.
 * - `book` (≥ 900 px): doble página con lomo, grosor de páginas en los cantos, hoja que gira en 3D (rotateY, 480 ms) y
 *   pestañas de índice en el canto derecho. La tapa empieza cerrada y centrada; «Abrir» la gira.
 * - `phone`: una página por pantalla; la hoja sigue al dedo 1:1 y se suelta con un resorte que hereda la velocidad.
 * Movimiento reducido: sin 3D ni deslizamiento animado, cambio con un fundido corto.
 */
export function PassportBook({ layout, ...props }: BookProps & { layout: 'book' | 'phone' }) {
  const t = useT();
  const { pages, index } = props;
  const [announcement, setAnnouncement] = useState('');
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (layout === 'book') {
      const [left, right] = spreadPages(spreadOf(index), pages.length);
      if (left === null) setAnnouncement(t('Tapa del pasaporte'));
      else setAnnouncement(t('Páginas {a} y {b} de {total}: {left} y {right}', { a: left + 1, b: (right ?? left) + 1, total: pages.length, left: pages[left]!.label, right: pages[right ?? left]!.label }));
    } else setAnnouncement(t('Página {n} de {total}: {title}', { n: index + 1, total: pages.length, title: pages[index]!.label }));
    // Solo al cambiar de página, no al traducir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, layout]);
  return <>
    {layout === 'phone' ? <PhoneBook {...props} /> : <SpreadBook {...props} />}
    <p className="pg-sr" aria-live="polite">{announcement}</p>
  </>;
}

// ── Celular: una página por pantalla ─────────────────────────────────────────
type Role = 'prev' | 'current' | 'next';
interface Gesture { id: number; x: number; y: number; axis: 'x' | null; samples: [number, number][]; captured: boolean }

function PhoneBook({ pages, tabs, index, reduced, label, tools, onGo }: BookProps) {
  const t = useT();
  const stageRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const sheets = useRef<Partial<Record<Role, HTMLDivElement | null>>>({});
  const offset = useRef(0);
  const stop = useRef<(() => void) | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const dragged = useRef(false);
  const slid = useRef<string | null>(null);
  const first = useRef(true);
  const [entering, setEntering] = useState<string | null>(null);
  const current = pages[index]!;
  const prev = index > 0 ? pages[index - 1] : undefined;
  const next = index < pages.length - 1 ? pages[index + 1] : undefined;

  const width = () => deckRef.current?.clientWidth || window.innerWidth || 360;
  const shade = (sheet: HTMLElement | null | undefined, value: number) => {
    const layer = sheet?.lastElementChild instanceof HTMLElement && sheet.lastElementChild.classList.contains('pg-sheet-shade') ? sheet.lastElementChild : null;
    if (layer) layer.style.opacity = value > 0.001 ? value.toFixed(3) : '';
  };
  /** Pinta la posición del gesto escribiendo `transform` directamente (sin estado de React por movimiento). */
  const paint = (raw: number) => {
    offset.current = raw;
    const travel = width() + GAP;
    const { current: cur, next: nxt, prev: prv } = sheets.current;
    // Sin vecina, la hoja apenas cede (banda elástica) y vuelve.
    const curX = raw < 0 ? (nxt ? raw : raw * 0.2) : raw > 0 && !prv ? raw * 0.2 : 0;
    if (cur) cur.style.transform = curX ? `translate3d(${curX.toFixed(1)}px,0,0)` : '';
    if (nxt) { nxt.style.visibility = raw < 0 ? 'visible' : ''; shade(nxt, raw < 0 ? 0.2 * (1 + raw / travel) : 0); }
    if (prv) { prv.style.visibility = raw > 0 ? 'visible' : ''; prv.style.transform = raw > 0 ? `translate3d(${(raw - travel).toFixed(1)}px,0,0)` : ''; }
    shade(cur, raw > 0 && prv ? 0.2 * (raw / travel) : 0);
    foilShift(cur, curX * 0.25);
  };
  const clear = () => {
    offset.current = 0;
    for (const role of ['prev', 'current', 'next'] as const) {
      const sheet = sheets.current[role];
      if (!sheet) continue;
      sheet.style.transform = ''; sheet.style.visibility = ''; shade(sheet, 0);
    }
  };
  const settle = (target: number, velocity: number, done: () => void) => {
    stop.current?.();
    stop.current = springTo(offset.current, target, velocity, paint, () => { stop.current = null; done(); });
  };
  const finish = (direction: 1 | -1) => { slid.current = pages[index + direction]?.id ?? null; onGo(index + direction); };
  const turn = (direction: 1 | -1) => {
    if (!(direction > 0 ? next : prev)) return;
    if (reduced) { onGo(index + direction); return; }
    settle(direction > 0 ? -(width() + GAP) : width() + GAP, 0, () => finish(direction));
  };

  useLayoutEffect(() => {
    stop.current?.(); stop.current = null;
    clear();
    if (first.current) first.current = false;
    else if (slid.current === current.id) slid.current = null;
    else setEntering(current.id);
    const active = document.activeElement;
    if (active instanceof HTMLElement && deckRef.current?.contains(active) && active.closest('[inert]')) stageRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);
  useEffect(() => () => { stop.current?.(); }, []);

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    if ((event.pointerType === 'mouse' && event.button !== 0) || isTyping(event.target)) return;
    const caught = offset.current;
    stop.current?.(); stop.current = null;
    // Se puede atrapar la hoja a medio camino: el gesto sigue desde donde iba.
    gesture.current = { id: event.pointerId, x: event.clientX - caught, y: event.clientY, axis: caught ? 'x' : null, samples: [[event.clientX, performance.now()]], captured: false };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) { gesture.current = null; return; } // vertical: el navegador desplaza
      g.axis = 'x';
    }
    if (!g.captured) {
      g.captured = true; dragged.current = true;
      try { deckRef.current?.setPointerCapture?.(event.pointerId); } catch { /* sin captura: el gesto sigue por burbujeo */ }
    }
    g.samples.push([event.clientX, performance.now()]);
    if (g.samples.length > 6) g.samples.shift();
    if (!reduced) paint(dx);
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== event.pointerId || g.axis !== 'x') return;
    g.samples.push([event.clientX, performance.now()]);
    const raw = event.clientX - g.x;
    const velocity = releaseVelocity(g.samples);
    const span = width();
    const threshold = Math.min(span * 0.28, 120);
    const forward = Boolean(next) && (raw < -threshold || (velocity < -0.45 && raw < -24));
    const backward = Boolean(prev) && (raw > threshold || (velocity > 0.45 && raw > 24));
    if (reduced) { if (forward) onGo(index + 1); else if (backward) onGo(index - 1); return; }
    if (forward) settle(-(span + GAP), velocity, () => finish(1));
    else if (backward) settle(span + GAP, velocity, () => finish(-1));
    else settle(0, velocity, clear);
  };
  const cancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    if (g.axis === 'x' && !reduced) settle(0, 0, clear);
  };
  /** Tras arrastrar, el clic que dispara el navegador no debe abrir el cromo que quedó bajo el dedo. */
  const swallowClick = (event: ReactMouseEvent) => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const action = { ArrowRight: () => turn(1), PageDown: () => turn(1), ArrowLeft: () => turn(-1), PageUp: () => turn(-1), Home: () => onGo(0), End: () => onGo(pages.length - 1) }[event.key];
    if (!action) return;
    event.preventDefault(); action();
  };

  const sheet = (page: BookPage, role: Role) => <div key={page.id} ref={element => { sheets.current[role] = element; }} data-role={role} data-page-id={page.id}
    className={`pg-sheet${role === 'current' && entering === page.id ? ' is-entering' : ''}`} inert={role !== 'current'} aria-hidden={role !== 'current' || undefined}
    onAnimationEnd={role === 'current' ? event => { if (event.target === event.currentTarget) setEntering(null); } : undefined}>
    {page.render(role === 'current')}
    <span className="pg-sheet-shade" aria-hidden="true" />
  </div>;

  return <div className="pg-ui is-phone" onKeyDown={keys}>
    <div className="pg-topbar">
      <IndexTabs tabs={tabs} variant="row" current={current.tab} open={[current.tab]} onPick={tab => onGo(firstPageOfTab(pages, tab))} />
      {tools}
    </div>
    <section ref={stageRef} className="pg-stage" aria-label={label} tabIndex={0}>
      <div ref={deckRef} className="pg-deck" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onClickCapture={swallowClick}>
        {next && sheet(next, 'next')}
        {sheet(current, 'current')}
        {prev && sheet(prev, 'prev')}
      </div>
    </section>
    <div className="pg-pager">
      <button type="button" className="pg-nav" onClick={() => turn(-1)} disabled={!prev} aria-label={t('Página anterior')}><ChevronLeft size={26} strokeWidth={2.75} aria-hidden="true" /></button>
      <p className="pg-counter"><strong>{t('{n} de {total}', { n: index + 1, total: pages.length })}</strong><span>{current.label}</span></p>
      <button type="button" className="pg-nav" onClick={() => turn(1)} disabled={!next} aria-label={t('Página siguiente')}><ChevronRight size={26} strokeWidth={2.75} aria-hidden="true" /></button>
    </div>
  </div>;
}

// ── Computador: libro abierto a doble página ─────────────────────────────────
/** Cantos de páginas apiladas: una línea de papel y un filete por hoja, hacia afuera del libro. */
function pageEdges(leaves: number, side: -1 | 1): string {
  if (leaves <= 0) return 'none';
  const layers: string[] = [];
  for (let leaf = 1; leaf <= Math.min(5, leaves); leaf++) {
    layers.push(`${side * (leaf * 2 - 1)}px ${leaf}px 0 0 var(--al-paper)`, `${side * leaf * 2}px ${leaf}px 0 0 var(--al-line)`);
  }
  return layers.join(', ');
}

interface SpreadState { target: number; shown: number; turn: { from: number; to: number } | null; fade: number }

function SpreadBook({ pages, tabs, index, reduced, label, tools, onGo }: BookProps) {
  const t = useT();
  const total = pages.length;
  const spreads = spreadCount(total);
  const target = spreadOf(index);
  // Sin Web Animations (o con movimiento reducido) no hay hoja 3D: el pliego cambia con un fundido corto.
  const instant = reduced || typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function';
  const [state, setState] = useState<SpreadState>({ target, shown: target, turn: null, fade: 0 });
  let book = state;
  if (state.target !== target) {
    // Ajuste de estado al cambiar de página (sin efecto). Si llega otra orden a medio giro, esa hoja termina y gira la siguiente.
    const at = state.turn ? state.turn.to : state.shown;
    book = instant || at === target ? { target, shown: target, turn: null, fade: at === target ? state.fade : state.fade + 1 } : { target, shown: at, turn: { from: at, to: target }, fade: state.fade };
    setState(book);
  }
  const { shown, turn, fade } = book;
  const leafRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const pointer = useRef<{ frame: number; x: number; y: number }>({ frame: 0, x: 0, y: 0 });

  useLayoutEffect(() => {
    const leaf = leafRef.current;
    if (!turn || !leaf || typeof leaf.animate !== 'function') return;
    const forward = turn.to > turn.from;
    const timing: KeyframeAnimationOptions = { duration: 480, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' };
    const flip = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${forward ? -180 : 180}deg)` }], timing);
    // La cara que se levanta se oscurece al ponerse de canto; la que llega se aclara al asentarse.
    const shades = [...leaf.querySelectorAll<HTMLElement>('.pg-leaf-shade')].map((layer, face) => layer.animate(
      face === 0 ? [{ opacity: 0 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0.32 }] : [{ opacity: 0.32 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0 }], timing));
    let finished = false;
    flip.onfinish = () => { finished = true; setState(previous => (previous.turn === turn ? { ...previous, shown: turn.to, turn: null } : previous)); };
    return () => { flip.onfinish = null; if (!finished) flip.cancel(); shades.forEach(animation => animation.cancel()); };
  }, [turn]);

  const firstSpread = useRef(true);
  useEffect(() => {
    // Si el foco estaba en una página que se fue (p. ej. un cromo y luego →), vuelve al libro y no al inicio del documento.
    if (firstSpread.current) { firstSpread.current = false; return; }
    const active = document.activeElement;
    if (!active || active === document.body) stageRef.current?.focus({ preventScroll: true });
  }, [shown, turn]);
  useEffect(() => () => cancelAnimationFrame(pointer.current.frame), []);

  const at = turn ? turn.to : shown;
  const goSpread = (spread: number) => { const clamped = Math.max(0, Math.min(spreads - 1, spread)); onGo(clamped === 0 ? 0 : clamped * 2 - 1); };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const action = { ArrowRight: () => goSpread(at + 1), PageDown: () => goSpread(at + 1), ArrowLeft: () => goSpread(at - 1), PageUp: () => goSpread(at - 1), Home: () => goSpread(0), End: () => goSpread(spreads - 1) }[event.key];
    if (!action) return;
    event.preventDefault(); action();
  };
  const follow = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    pointer.current.x = event.clientX; pointer.current.y = event.clientY;
    if (pointer.current.frame) return;
    pointer.current.frame = requestAnimationFrame(() => { pointer.current.frame = 0; if (bookRef.current) foilFollowPointer(bookRef.current, pointer.current.x, pointer.current.y); });
  };

  let left: number | null; let right: number | null; let front: number | null = null; let back: number | null = null;
  const forward = turn ? turn.to > turn.from : true;
  if (turn) {
    const [fromLeft, fromRight] = spreadPages(turn.from, total);
    const [toLeft, toRight] = spreadPages(turn.to, total);
    if (forward) { left = fromLeft; right = toRight; front = fromRight; back = toLeft; }
    else { left = toLeft; right = fromRight; front = fromLeft; back = toRight; }
  } else [left, right] = spreadPages(shown, total);
  const closed = at === 0;
  const [visibleLeft, visibleRight] = spreadPages(at, total);
  const openTabs = [visibleLeft, visibleRight].map(page => (page === null ? null : pages[page]?.tab ?? null));
  const side = (page: number | null, where: 'left' | 'right') => page === null ? null
    // Mientras la hoja gira, la página que queda debajo aún no está «a la vista»: el golpe de sello espera a que asiente.
    : <div key={`${where}-${pages[page]!.id}-${fade}`} className={`pg-side is-${where}${fade && instant ? ' is-entering' : ''}`} data-page-id={pages[page]!.id}>{pages[page]!.render(!turn)}</div>;
  const counter = closed ? t('Tapa') : visibleRight === null ? t('{n} de {total}', { n: (visibleLeft ?? 0) + 1, total }) : t('{a}–{b} de {total}', { a: (visibleLeft ?? 0) + 1, b: visibleRight + 1, total });
  const names = [visibleLeft, visibleRight].filter((page): page is number => page !== null).map(page => pages[page]!.label).join(' · ');

  return <div className="pg-ui is-book" onKeyDown={keys}>
    <section ref={stageRef} className="pg-stage" aria-label={label} tabIndex={0} onPointerMove={follow}>
      <button type="button" className="pg-arrow is-prev" onClick={() => goSpread(at - 1)} disabled={at === 0} aria-label={t('Página anterior')}><ChevronLeft size={30} strokeWidth={2.75} aria-hidden="true" /></button>
      <div className="pg-book-slot">
        <div ref={bookRef} className={`pg-book${closed ? ' is-closed' : ''}${turn ? ' is-turning' : ''}`} data-spread={at}
          style={{ '--edge-l': pageEdges(at, -1), '--edge-r': pageEdges(spreads - 1 - at, 1) } as CSSProperties}>
          <div className="pg-spread">
            {side(left, 'left')}
            {side(right, 'right')}
            {!closed && <span className="pg-gutter" aria-hidden="true" />}
            {turn && <div ref={leafRef} key={`${turn.from}-${turn.to}`} className="pg-leaf" data-dir={forward ? 'next' : 'prev'} aria-hidden="true" inert>
              <div className="pg-leaf-face is-front">{front !== null && pages[front]!.render(false)}<span className="pg-leaf-shade" /></div>
              <div className="pg-leaf-face is-back">{back !== null && pages[back]!.render(false)}<span className="pg-leaf-shade" /></div>
            </div>}
          </div>
          <IndexTabs tabs={tabs} variant="rail" current={pages[index]?.tab ?? null} open={openTabs} onPick={tab => onGo(firstPageOfTab(pages, tab))} />
        </div>
      </div>
      <button type="button" className="pg-arrow is-next" onClick={() => goSpread(at + 1)} disabled={at >= spreads - 1} aria-label={t('Página siguiente')}><ChevronRight size={30} strokeWidth={2.75} aria-hidden="true" /></button>
    </section>
    <div className="pg-pager">
      <div className="pg-pager-tools">{tools}</div>
      <p className="pg-counter"><strong>{counter}</strong>{!closed && <span>{names}</span>}</p>
      <span className="pg-pager-keys" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd></span>
    </div>
  </div>;
}
