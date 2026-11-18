import { getExperienceById, getExperienceBySlug, type Experience } from '../../domain/catalog';

/** Vistas con URL propia. `event` es el nombre del evento `cv3:<event>` que abre cada una. */
export const VIEW_ROUTES = {
  admin: { path: '/administracion', event: 'admin', title: 'Administración' },
  culture: { path: '/cultura-viva', event: 'culture', title: 'Cultura Viva' },
  passport: { path: '/pasaporte', event: 'passport', title: 'Pasaporte Guambra' },
  plan: { path: '/mi-viaje', event: 'plan', title: 'Mi viaje' },
  wallet: { path: '/billetera', event: 'wallet', title: 'Mi billetera' },
  upcoming: { path: '/proximos-viajes', event: 'upcoming', title: 'Próximos viajes' },
  downloads: { path: '/sin-senal', event: 'downloads', title: 'Sin señal' },
  account: { path: '/cuenta', event: 'account', title: 'Tu cuenta' },
  host: { path: '/anfitriones', event: 'host', title: 'Anfitriones' },
  legal: { path: '/privacidad', event: 'legal', title: 'Términos y privacidad' },
  payments: { path: '/reservas', event: 'payments', title: 'Reservas y pagos' },
  alerts: { path: '/avisos', event: 'alerts', title: 'Mis avisos' },
  'privacy-rights': { path: '/derechos-de-datos', event: 'privacy-rights', title: 'Mis derechos de datos' },
} as const;
export type ViewName = keyof typeof VIEW_ROUTES;
export type RouteTarget =
  | { kind: 'home' }
  | { kind: 'experience'; id: string; title: string }
  | { kind: 'view'; view: ViewName }
  | { kind: 'legal'; slug: string }
  | { kind: 'unknown'; path: string };

export const SITE_TITLE = 'CHULLA VIDA';
export const isViewName = (value: string): value is ViewName => Object.prototype.hasOwnProperty.call(VIEW_ROUTES, value);
export const pathForView = (view: ViewName) => VIEW_ROUTES[view].path;
/** URL estable de una ficha: usa el ID, que no cambia aunque cambie el título. */
export const pathForExperience = (experience: Pick<Experience, 'id'>) => `/experiencias/${encodeURIComponent(experience.id)}`;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Interpreta una ruta de la barra de direcciones. Acepta IDs, slugs y alias antiguos de fichas. */
export function parsePath(pathname: string): RouteTarget {
  let path: string;
  try { path = decodeURIComponent(pathname); } catch { return { kind: 'unknown', path: pathname }; }
  path = path.replace(/\/+$/, '').toLowerCase() || '/';
  if (path === '/' || path === '/index.html') return { kind: 'home' };
  const experience = /^\/experiencias\/([^/]+)$/.exec(path);
  if (experience) {
    const key = experience[1];
    const record = SLUG.test(key) ? getExperienceById(key) ?? getExperienceBySlug(key) : undefined;
    return record ? { kind: 'experience', id: record.id, title: record.title } : { kind: 'unknown', path };
  }
  const legal = /^\/legal\/([^/]+)$/.exec(path);
  if (legal) return SLUG.test(legal[1]) ? { kind: 'legal', slug: legal[1] } : { kind: 'unknown', path };
  if (path === '/legal') return { kind: 'view', view: 'legal' };
  if (path === '/mijin') return { kind: 'view', view: 'plan' };
  const view = (Object.keys(VIEW_ROUTES) as ViewName[]).find(name => VIEW_ROUTES[name].path === path);
  return view ? { kind: 'view', view } : { kind: 'unknown', path };
}
export function pathForTarget(target: RouteTarget): string {
  if (target.kind === 'experience') return pathForExperience(target);
  if (target.kind === 'view') return pathForView(target.view);
  if (target.kind === 'legal') return `/legal/${target.slug}`;
  return '/';
}
export function titleForTarget(target: RouteTarget, homeTitle = SITE_TITLE): string {
  if (target.kind === 'experience') return `${target.title} · ${SITE_TITLE}`;
  if (target.kind === 'view') return `${VIEW_ROUTES[target.view].title} · ${SITE_TITLE}`;
  if (target.kind === 'legal') return `Documentos legales · ${SITE_TITLE}`;
  return homeTitle;
}
/** Estado actual de la interfaz → ruta. La ficha abierta manda sobre el panel, y el panel sobre las vistas externas. */
export function targetForState(state: { selected: string | null; panel: string; external: ViewName | '' }): RouteTarget {
  if (state.selected) {
    const record = getExperienceById(state.selected);
    if (record) return { kind: 'experience', id: record.id, title: record.title };
  }
  if (state.panel && isViewName(state.panel)) return { kind: 'view', view: state.panel };
  if (state.external) return { kind: 'view', view: state.external };
  return { kind: 'home' };
}
