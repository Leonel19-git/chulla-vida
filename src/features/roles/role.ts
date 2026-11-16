/**
 * Roles separados: viajero, anfitrión/negocio o ambos.
 * El rol se calcula con lo que dice el servidor (organizaciones propias o membresías activas) y con la elección
 * de la bienvenida. En el navegador solo guardamos la preferencia de vista (modo e intención), nunca datos de la cuenta.
 */
export type Role = 'guest' | 'traveler' | 'host' | 'both';
export type RoleMode = 'traveler' | 'host';
export type WelcomePath = 'traveler' | 'host' | 'explore' | null;

export const ROLE_EVENT = 'cv3:role-changed';
export const ROLE_PREFS_KEY = 'chullavida:v3:role';

/** Lo que el servidor confirma de la sesión abierta. `null` = sin sesión. */
export interface RoleServerFacts { userId: string; hostOrganizations: number; admin: boolean }
/** Preferencias de vista en este dispositivo: no son permisos, el servidor decide qué datos se leen. */
export interface RolePrefs { mode: RoleMode | null; hostIntent: boolean; travelerIntent: boolean }
export interface RoleState { welcomePath: WelcomePath; server: RoleServerFacts | null; prefs: RolePrefs }
export interface RoleSnapshot { role: Role; mode: RoleMode | null; signedIn: boolean; admin: boolean; hostOrganizations: number }
export interface RoleChangedDetail { role: Role; mode: RoleMode | null }

export const EMPTY_PREFS: RolePrefs = { mode: null, hostIntent: false, travelerIntent: false };

export function computeRole(state: RoleState): Role {
  const { welcomePath, server, prefs } = state;
  if (!server) {
    if (prefs.hostIntent && (welcomePath === 'traveler' || prefs.travelerIntent)) return 'both';
    if (prefs.hostIntent || welcomePath === 'host') return 'host';
    if (welcomePath === 'traveler') return 'traveler';
    return 'guest';
  }
  const host = server.hostOrganizations > 0 || prefs.hostIntent || welcomePath === 'host';
  // Toda cuenta puede viajar; un negocio solo ve lo de viajero si lo pidió (bienvenida o «También viajo»).
  const traveler = !host || welcomePath === 'traveler' || prefs.travelerIntent;
  return host && traveler ? 'both' : host ? 'host' : 'traveler';
}

export function computeMode(role: Role, prefs: RolePrefs, server: RoleServerFacts | null): RoleMode | null {
  if (role === 'traveler') return 'traveler';
  if (role === 'host') return 'host';
  if (role === 'both') return prefs.mode ?? (server && server.hostOrganizations > 0 ? 'host' : 'traveler');
  return null;
}

export function snapshotOf(state: RoleState): RoleSnapshot {
  const role = computeRole(state);
  return { role, mode: computeMode(role, state.prefs, state.server), signedIn: Boolean(state.server), admin: state.server?.admin ?? false, hostOrganizations: state.server?.hostOrganizations ?? 0 };
}

/** Viajero puro, o alguien con ambos roles mirando en modo viajero. Un invitado no está en ningún modo. */
export function isTravelerMode(snapshot: Pick<RoleSnapshot, 'role' | 'mode'> = roleStore.get()): boolean {
  return snapshot.role === 'traveler' || (snapshot.role === 'both' && snapshot.mode === 'traveler');
}
export function isHostMode(snapshot: Pick<RoleSnapshot, 'role' | 'mode'> = roleStore.get()): boolean {
  return snapshot.role === 'host' || (snapshot.role === 'both' && snapshot.mode === 'host');
}

export function parseRolePrefs(value: unknown): RolePrefs {
  if (!value || typeof value !== 'object') return { ...EMPTY_PREFS };
  const v = value as Record<string, unknown>;
  return { mode: v.mode === 'traveler' || v.mode === 'host' ? v.mode : null, hostIntent: v.hostIntent === true, travelerIntent: v.travelerIntent === true };
}
function readPrefs(): RolePrefs {
  try { return parseRolePrefs(JSON.parse(localStorage.getItem(ROLE_PREFS_KEY) || 'null')); } catch { return { ...EMPTY_PREFS }; }
}
function writePrefs(prefs: RolePrefs) {
  try { localStorage.setItem(ROLE_PREFS_KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento: vale para esta sesión */ }
}
/** Lee la ruta elegida en la bienvenida sin importar WelcomeFlow (evita un ciclo de módulos). */
function readWelcomePath(): WelcomePath {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('chullavida:v3:welcome') || 'null');
    const path = value && typeof value === 'object' ? (value as { path?: unknown }).path : null;
    return path === 'traveler' || path === 'host' || path === 'explore' ? path : null;
  } catch { return null; }
}

type Listener = () => void;
function createRoleStore() {
  let state: RoleState = { welcomePath: null, server: null, prefs: { ...EMPTY_PREFS } };
  let snapshot: RoleSnapshot = snapshotOf(state);
  let hydrated = false;
  const listeners = new Set<Listener>();
  const hydrate = () => {
    if (hydrated || typeof window === 'undefined') return;
    hydrated = true;
    state = { ...state, welcomePath: readWelcomePath(), prefs: readPrefs() };
    snapshot = snapshotOf(state);
    window.addEventListener('cv3:preferences', event => {
      const path = (event as CustomEvent<{ path?: unknown }>).detail?.path;
      set({ welcomePath: path === 'traveler' || path === 'host' || path === 'explore' ? path : readWelcomePath() });
    });
  };
  const set = (patch: Partial<RoleState>) => {
    hydrate();
    state = { ...state, ...patch };
    const next = snapshotOf(state);
    const changed = next.role !== snapshot.role || next.mode !== snapshot.mode || next.signedIn !== snapshot.signedIn || next.admin !== snapshot.admin || next.hostOrganizations !== snapshot.hostOrganizations;
    snapshot = next;
    if (!changed) return;
    listeners.forEach(listener => listener());
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<RoleChangedDetail>(ROLE_EVENT, { detail: { role: next.role, mode: next.mode } }));
  };
  const setPrefs = (patch: Partial<RolePrefs>) => { hydrate(); const prefs = { ...state.prefs, ...patch }; writePrefs(prefs); set({ prefs }); };
  return {
    get: (): RoleSnapshot => { hydrate(); return snapshot; },
    subscribe: (listener: Listener) => { hydrate(); listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Lo llama el panel de cuenta al leer la sesión (o al cerrarla con `null`). */
    setServer: (server: RoleServerFacts | null) => set({ server }),
    setWelcomePath: (welcomePath: WelcomePath) => set({ welcomePath }),
    /** Interruptor «Modo viajero / Modo negocio». */
    setMode: (mode: RoleMode) => setPrefs({ mode }),
    /** «Tengo un negocio»: abre el lado de anfitrión sin quitar el de viajero si ya lo usaba. */
    requestHost: () => setPrefs({ hostIntent: true, travelerIntent: state.prefs.travelerIntent || snapshot.role === 'traveler', mode: 'host' }),
    /** «También viajo»: un negocio activa su lado viajero. */
    requestTraveler: () => setPrefs({ travelerIntent: true, mode: 'traveler' }),
    /** Solo para pruebas. */
    reset: () => { hydrated = false; state = { welcomePath: null, server: null, prefs: { ...EMPTY_PREFS } }; snapshot = snapshotOf(state); listeners.forEach(listener => listener()); },
  };
}

export const roleStore = createRoleStore();
