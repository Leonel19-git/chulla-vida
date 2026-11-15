import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCatalog } from '../catalog/CatalogContext';
import { parsePath, pathForTarget, targetForState, titleForTarget, VIEW_ROUTES, type RouteTarget, type ViewName } from './routes';

/** Vistas que no son paneles de WorkspaceVivo: se siguen siempre por su evento. */
const EXTERNAL_VIEWS: ViewName[] = ['culture', 'passport', 'mijin'];
const ALL_VIEWS = Object.keys(VIEW_ROUTES) as ViewName[];
/** Cultura Viva es una pestaña, no un diálogo: se cierra con `cv3:home` o al abrir otra vista. */
const NOT_DIALOG: ViewName[] = ['culture'];
/** Paneles que leen parámetros de retorno (Supabase Auth, PayPhone): se conserva ?query y #hash. */
const KEEP_QUERY = new Set(['account', 'payments']);
const INITIAL_WAIT_MS = 2500;

const samePlace = (a: RouteTarget, b: RouteTarget) => pathForTarget(a) === pathForTarget(b) || (a.kind === 'legal' && b.kind === 'view' && b.view === 'legal') || (b.kind === 'legal' && a.kind === 'view' && a.view === 'legal');
const signal = (name: string, detail?: unknown) => window.dispatchEvent(detail === undefined ? new Event(`cv3:${name}`) : new CustomEvent(`cv3:${name}`, { detail }));
/** Cierra cualquier <dialog> abierto como si se pulsara Escape (dispara su onCancel). */
export function closeOpenDialogs(): void {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); });
}

export interface UrlRoutingOptions {
  /** Panel abierto de WorkspaceVivo ('' si ninguno). Si se omite, los paneles se siguen por sus eventos `cv3:*` y por el cierre de su diálogo. */
  panel?: string;
  /** Cierra el panel de WorkspaceVivo; si falta, se cierran los diálogos abiertos. */
  closePanel?: () => void;
}

/**
 * Enlaces profundos con History API, sin router: /experiencias/<id|slug>, /mi-viaje, /pasaporte, /legal/<slug>…
 * Al cargar abre la ficha o dispara `cv3:<vista>`; al abrir y cerrar actualiza la URL y el título;
 * «Atrás» cierra el panel o la ficha. Al volver al inicio emite `cv3:home` para vistas que no son diálogos.
 */
export function useUrlRouting({ panel, closePanel }: UrlRoutingOptions = {}): RouteTarget {
  const { selected, select } = useCatalog();
  const [tracked, setTracked] = useState<ViewName | ''>('');
  const panelKnown = panel !== undefined;
  /** Diálogos que ya estaban abiertos cuando llegó el evento de la vista seguida. */
  const openBefore = useRef<Set<Element>>(new Set());
  const [initial] = useState<RouteTarget>(() => parsePath(window.location.pathname));
  const ready = useRef(initial.kind === 'home' || initial.kind === 'unknown');
  const homeTitle = useRef('');
  const closeRef = useRef(closePanel);
  const selectRef = useRef(select);
  useLayoutEffect(() => { closeRef.current = closePanel; selectRef.current = select; });

  const apply = (target: RouteTarget) => {
    if (target.kind === 'experience') { if (closeRef.current) closeRef.current(); else closeOpenDialogs(); selectRef.current(target.id); return; }
    if (target.kind === 'view') { signal(VIEW_ROUTES[target.view].event); return; }
    if (target.kind === 'legal') { signal('legal', { slug: target.slug }); return; }
    selectRef.current(null);
    if (closeRef.current) closeRef.current();
    setTracked('');
    closeOpenDialogs();
    signal('home');
  };

  useEffect(() => {
    homeTitle.current = document.title || 'CHULLA VIDA';
    const target = initial;
    const timers: number[] = [];
    if (target.kind === 'unknown') window.history.replaceState(window.history.state, '', `/${window.location.search}${window.location.hash}`);
    else if (target.kind !== 'home') {
      const path = window.location.pathname;
      // Los oyentes de eventos se registran en efectos hermanos y algunos paneles cargan en diferido: se reintenta si la URL sigue igual.
      for (const delay of target.kind === 'view' && target.view === 'mijin' ? [0, 700, 2000] : [0]) timers.push(window.setTimeout(() => { if (window.location.pathname === path) apply(target); }, delay));
      timers.push(window.setTimeout(() => { ready.current = true; }, INITIAL_WAIT_MS));
    }
    const onPop = () => apply(parsePath(window.location.pathname));
    // Con `panel` conocido solo se siguen las vistas externas; sin él, todas. Un panel nuevo reemplaza la vista seguida.
    const listeners = [...ALL_VIEWS.map(view => ({ name: `cv3:${VIEW_ROUTES[view].event}`, handle: () => { openBefore.current = new Set(document.querySelectorAll('dialog[open]')); setTracked(panelKnown && !EXTERNAL_VIEWS.includes(view) ? '' : view); } })),
      { name: 'cv3:editorial', handle: () => setTracked('') }, { name: 'cv3:home', handle: () => setTracked('') }];
    window.addEventListener('popstate', onPop);
    listeners.forEach(({ name, handle }) => window.addEventListener(name, handle));
    return () => { timers.forEach(clearTimeout); window.removeEventListener('popstate', onPop); listeners.forEach(({ name, handle }) => window.removeEventListener(name, handle)); };
  }, [initial, panelKnown]);

  // La vista seguida es un <dialog>: cuando su diálogo (uno nuevo, no los que ya estaban abiertos) se cierra y no queda ninguno, se libera.
  useEffect(() => {
    if (!tracked || NOT_DIALOG.includes(tracked)) return;
    const before = openBefore.current;
    let seen = false;
    const check = () => {
      const open = [...document.querySelectorAll('dialog[open]')];
      if (open.some(dialog => !before.has(dialog))) seen = true;
      if (seen && !open.length) setTracked('');
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, [tracked]);

  const state = { selected, panel: panel ?? '', external: tracked };
  const target = targetForState(state);
  useEffect(() => {
    const target = targetForState({ selected, panel: panel ?? '', external: tracked });
    if (!ready.current) {
      if (!samePlace(target, initial)) return;
      ready.current = true;
    }
    const current = parsePath(window.location.pathname);
    document.title = titleForTarget(samePlace(target, current) ? current : target, homeTitle.current);
    if (samePlace(target, current)) return;
    const keep = target.kind === 'view' && KEEP_QUERY.has(target.view);
    const url = `${pathForTarget(target)}${keep ? `${window.location.search}${window.location.hash}` : ''}`;
    // Volver al inicio reemplaza la entrada: así «Atrás» no reabre lo que acabas de cerrar.
    if (target.kind === 'home') window.history.replaceState(null, '', url);
    else window.history.pushState({ cv: pathForTarget(target) }, '', url);
  }, [selected, panel, tracked, initial]);

  return target;
}
