import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Compass, FileLock2, LogIn, PawPrint, Store, UserPlus, UserRoundCheck, Users } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { useConsent } from '../privacy/ConsentContext';
import { TOUR_EVENT } from './GuidedTour';
import { useRole } from '../roles/RoleContext';
import './welcome.css';

import { useT, msg } from '../../i18n/v3';
export const WELCOME_KEY = 'chullavida:v3:welcome';
export type TravelInterest = 'cultura' | 'naturaleza' | 'aventura' | 'gastronomia' | 'relax';
export interface TravelPreferences {
  completed: boolean;
  path: 'traveler' | 'host' | 'explore';
  interests: TravelInterest[];
  /** Presupuesto TOTAL del viaje en USD, no precio por persona. */
  budgetTotalUsd: number | null;
  origin: string;
  travelers: number;
  pet: boolean;
  updatedAt: string;
}

const INTERESTS: { id: TravelInterest; label: string }[] = [
  { id: 'cultura', label: msg('Cultura y comunidad') }, { id: 'naturaleza', label: msg('Naturaleza') },
  { id: 'aventura', label: msg('Aventura') }, { id: 'gastronomia', label: msg('Comida típica') }, { id: 'relax', label: msg('Relax y termas') },
];
/** Tras la bienvenida, el recorrido guiado muestra cada parte sobre la página real (GuidedTour). */
const startTour = () => window.setTimeout(() => window.dispatchEvent(new Event(TOUR_EVENT)), 120);

export function readTravelPreferences(): TravelPreferences | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(WELCOME_KEY) || 'null');
    if (!value || typeof value !== 'object') return null;
    const v = value as Partial<TravelPreferences>;
    if (typeof v.completed !== 'boolean' || !['traveler', 'host', 'explore'].includes(String(v.path))) return null;
    return {
      completed: v.completed, path: v.path as TravelPreferences['path'],
      interests: Array.isArray(v.interests) ? v.interests.filter((item): item is TravelInterest => INTERESTS.some(option => option.id === item)) : [],
      budgetTotalUsd: typeof v.budgetTotalUsd === 'number' && v.budgetTotalUsd > 0 ? v.budgetTotalUsd : null,
      origin: typeof v.origin === 'string' ? v.origin.slice(0, 80) : '',
      travelers: typeof v.travelers === 'number' && v.travelers >= 1 && v.travelers <= 30 ? Math.round(v.travelers) : 1,
      pet: v.pet === true, updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : '',
    };
  } catch { return null; }
}
function saveTravelPreferences(preferences: TravelPreferences) {
  try { localStorage.setItem(WELCOME_KEY, JSON.stringify(preferences)); } catch { /* sin almacenamiento: vale solo para esta sesión */ }
  window.dispatchEvent(new CustomEvent('cv3:preferences', { detail: preferences }));
}

/** Se monta una vez. Abre en la primera visita (después de la intro de marca) o con el evento `cv3:welcome`. */
export function WelcomeGate() {
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const { preferences } = useConsent();
  useEffect(() => {
    const show = () => { setAuto(false); setOpen(true); };
    const showAuto = () => { setAuto(true); setOpen(true); };
    window.addEventListener('cv3:welcome', show);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const firstVisit = !readTravelPreferences()?.completed;
    const afterIntro = () => { if (firstVisit) timer = setTimeout(showAuto, 250); };
    if (firstVisit) {
      window.addEventListener('cv3:intro-closed', afterIntro, { once: true });
      timer = setTimeout(() => { if (!document.querySelector('.brand-intro[open]')) showAuto(); }, 800);
    }
    return () => { window.removeEventListener('cv3:welcome', show); window.removeEventListener('cv3:intro-closed', afterIntro); if (timer) clearTimeout(timer); };
  }, []);
  // En la primera visita, el banner de cookies va primero: la bienvenida espera a que la persona elija su nivel de privacidad.
  if (!open || (auto && !preferences)) return null;
  return <WelcomeFlow onClose={() => setOpen(false)} />;
}

type Step = 'choose' | 'interests' | 'trip' | 'host';

const HOST_STEPS = [
  { icon: UserPlus, text: msg('Crea tu cuenta') },
  { icon: FileLock2, text: msg('Sube tus papeles (privado)') },
  { icon: UserRoundCheck, text: msg('Una persona revisa') },
  { icon: BadgeCheck, text: msg('Publicas tu experiencia') },
];

export function WelcomeFlow({ onClose }: { onClose: () => void }) {
  const t = useT();
  const previous = readTravelPreferences();
  const { role, signedIn } = useRole();
  // Una cuenta de viajero no ve nada de negocios; sin sesión, la bienvenida deja elegir cualquier camino.
  const travelerOnly = signedIn && role === 'traveler';
  const [step, setStep] = useState<Step>('choose');
  const [interests, setInterests] = useState<TravelInterest[]>(previous?.interests ?? []);
  const [budget, setBudget] = useState(previous?.budgetTotalUsd ? String(previous.budgetTotalUsd) : '');
  const [origin, setOrigin] = useState(previous?.origin ?? '');
  const [travelers, setTravelers] = useState(previous?.travelers ?? 1);
  const [pet, setPet] = useState(previous?.pet ?? false);

  const finish = (path: TravelPreferences['path'], tour = false) => {
    const parsed = Number(budget.replace(',', '.'));
    saveTravelPreferences({ completed: true, path, interests, budgetTotalUsd: Number.isFinite(parsed) && parsed > 0 ? parsed : null, origin: origin.trim(), travelers, pet, updatedAt: new Date().toISOString() });
    onClose();
    if (tour) startTour();
  };
  const openAccount = (tab: 'signup' | 'login') => {
    finish(previous?.path ?? 'explore');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('cv3:account', { detail: { tab } })), 0);
  };
  const order: Step[] = ['interests', 'trip'];
  const progress = step === 'choose' || step === 'host' ? null : order.indexOf(step) + 1;

  return <Dialog title={t("Bienvenido a CHULLA VIDA")} onClose={() => finish(previous?.path ?? 'explore')} wide>
    <div className="dialog-content welcome-flow">
      {progress && <p className="welcome-progress" aria-live="polite">{t("Paso {n} de {total}", { n: progress, total: 2 })}</p>}
      {step === 'choose' && <>
        <h3 className="welcome-title">{t("Ecuador se vive, no solo se visita.")}</h3>
        {!signedIn && <section className="welcome-account" aria-label={t("Tu cuenta")}>
          <div className="welcome-account-text"><strong>{t("Tu cuenta, gratis")}</strong><span>{t("Confirmas tu correo con un código de 6 números.")}</span></div>
          <div className="welcome-account-actions">
            <button type="button" className="button button-primary" onClick={() => openAccount('signup')}><UserPlus size={18} />{t("Crear cuenta")}</button>
            <button type="button" className="button button-secondary" onClick={() => openAccount('login')}><LogIn size={18} />{t("Entrar")}</button>
          </div>
        </section>}
        <p className="welcome-lead">{t("¿Cómo quieres empezar?")}</p>
        <div className={`welcome-paths${travelerOnly ? ' is-two' : ''}`}>
          <button className="welcome-path" onClick={() => setStep('interests')}><Compass size={26} /><strong>{t("Soy viajero/a")}</strong><span>{t("Ideas a tu medida.")}</span></button>
          {!travelerOnly && <button className="welcome-path" onClick={() => setStep('host')}><Store size={26} /><strong>{t("Tengo un negocio o represento una comunidad")}</strong><span>{t("Publica tus experiencias.")}</span></button>}
          <button className="welcome-path is-quiet" onClick={() => finish('explore')}><ArrowRight size={26} /><strong>{t("Solo quiero explorar")}</strong><span>{t("Sin registro.")}</span></button>
        </div>
        <p className="welcome-tour-link"><button type="button" className="privacy-link" onClick={() => finish(previous?.path ?? 'explore', true)}>{t("Ver el recorrido por la página")}</button></p>
      </>}
      {step === 'interests' && <fieldset className="welcome-fieldset"><legend className="welcome-title">{t("¿Aventura, cultura o relax?")}</legend><p className="welcome-lead">{t("Elige las que quieras.")}</p>
        <div className="welcome-chips">{INTERESTS.map(option => { const on = interests.includes(option.id); return <button key={option.id} type="button" className={`welcome-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setInterests(list => on ? list.filter(item => item !== option.id) : [...list, option.id])}>{t(option.label)}</button>; })}</div>
      </fieldset>}
      {step === 'trip' && <div className="welcome-trip"><h3 className="welcome-title">{t("Tu viaje, a tu ritmo")}</h3><p className="welcome-lead">{t("Se guarda solo en este dispositivo.")}</p>
        <label className="field-label">{t("¿Desde dónde sales?")}<input className="field" value={origin} onChange={event => setOrigin(event.target.value)} placeholder={t("Ej.: Quito, Guayaquil, Cuenca")} autoComplete="address-level2" /></label>
        <label className="field-label">{t("Presupuesto total en USD (todo el viaje)")}<input className="field" inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} placeholder={t("Ej.: 100")} /></label>
        <label className="field-label"><span><Users size={15} />{' '}{t("Personas")}</span><input className="field" type="number" min={1} max={30} value={travelers} onChange={event => setTravelers(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
        <label className="welcome-check"><input type="checkbox" checked={pet} onChange={event => setPet(event.target.checked)} /><PawPrint size={18} />{' '}{t("Viajo con mascota (Chulla Pet)")}</label>
        {pet && <p className="welcome-note">{t("Solo marcamos fichas con mascotas confirmadas por el anfitrión (hoy ninguna). En Galápagos y otras áreas protegidas no se admiten mascotas.")}</p>}
      </div>}
      {step === 'host' && <div className="welcome-host"><h3 className="welcome-title">{t("Para anfitriones y comunidades")}</h3>
        <ol className="welcome-host-steps">{HOST_STEPS.map(({ icon: Icon, text }) => <li key={text}><Icon size={22} aria-hidden="true" /><span>{t(text)}</span></li>)}</ol>
        <p className="welcome-note">{t("El distintivo de Chulla Vida no es un aval del Gobierno.")}</p>
      </div>}
      <div className="dialog-actions welcome-actions">
        {step !== 'choose' && <button className="button button-secondary" onClick={() => setStep(step === 'host' || step === 'interests' ? 'choose' : order[order.indexOf(step) - 1])}><ArrowLeft size={16} />{t("Atrás")}</button>}
        {step !== 'choose' && <button className="button button-secondary" onClick={() => finish(step === 'host' ? 'host' : 'traveler')}>{t("Omitir")}</button>}
        {step === 'interests' && <button className="button button-primary" onClick={() => setStep('trip')}>{t("Siguiente")}<ArrowRight size={16} /></button>}
        {step === 'trip' && <button className="button button-primary" onClick={() => finish('traveler', true)}>{t("Ver el recorrido por la página")}<ArrowRight size={16} /></button>}
        {step === 'host' && <button className="button button-primary" onClick={() => { finish('host'); window.dispatchEvent(new Event('cv3:host')); }}>{t("Ir al espacio de anfitriones")}<ArrowRight size={16} /></button>}
      </div>
    </div>
  </Dialog>;
}