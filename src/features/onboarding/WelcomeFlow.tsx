import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Compass, Download, Heart, Mic, PawPrint, Send, Store, Users } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import './welcome.css';

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
  { id: 'cultura', label: 'Cultura y comunidad' }, { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'aventura', label: 'Aventura' }, { id: 'gastronomia', label: 'Comida típica' }, { id: 'relax', label: 'Relax y termas' },
];
const TOUR = [
  { icon: Compass, title: 'Explora y filtra', text: 'Busca por región, provincia, duración o presupuesto total. Cada ficha dice de dónde sale su información y si el precio es referencial.' },
  { icon: Heart, title: 'Guarda y arma tu viaje', text: 'Toca el corazón para guardar. En «Mi viaje», Chulla Flex ordena tus paradas y separa lo que sabemos de lo que falta cotizar.' },
  { icon: Mic, title: 'Habla con MIJIN', text: 'Tu pana de aventuras responde con datos del catálogo, Cultura Viva y el clima. El micrófono solo se activa cuando tú lo tocas.' },
  { icon: Download, title: 'Lleva tus fichas sin señal', text: 'Descarga las fichas que vas a usar. Sin internet podrás leerlas, pero reservas, clima y pagos necesitan conexión.' },
  { icon: BookOpen, title: 'Pasaporte Guambra', text: 'Colecciona historias, no solo sellos. Explorar una ficha no cuenta como visita: el sello verificado llega cuando el anfitrión valida tu visita.' },
  { icon: Send, title: 'Solicita información', text: 'Las fichas todavía no se venden en línea. Puedes pedir información; el anfitrión responde y nada se cobra sin tu confirmación.' },
];

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
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('cv3:welcome', show);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const firstVisit = !readTravelPreferences()?.completed;
    const afterIntro = () => { if (firstVisit) timer = setTimeout(show, 250); };
    if (firstVisit) {
      window.addEventListener('cv3:intro-closed', afterIntro, { once: true });
      timer = setTimeout(() => { if (!document.querySelector('.brand-intro[open]')) show(); }, 800);
    }
    return () => { window.removeEventListener('cv3:welcome', show); window.removeEventListener('cv3:intro-closed', afterIntro); if (timer) clearTimeout(timer); };
  }, []);
  return open ? <WelcomeFlow onClose={() => setOpen(false)} /> : null;
}

type Step = 'choose' | 'interests' | 'trip' | 'tour' | 'host';

export function WelcomeFlow({ onClose }: { onClose: () => void }) {
  const previous = readTravelPreferences();
  const [step, setStep] = useState<Step>('choose');
  const [interests, setInterests] = useState<TravelInterest[]>(previous?.interests ?? []);
  const [budget, setBudget] = useState(previous?.budgetTotalUsd ? String(previous.budgetTotalUsd) : '');
  const [origin, setOrigin] = useState(previous?.origin ?? '');
  const [travelers, setTravelers] = useState(previous?.travelers ?? 1);
  const [pet, setPet] = useState(previous?.pet ?? false);
  const [tourIndex, setTourIndex] = useState(0);

  const finish = (path: TravelPreferences['path']) => {
    const parsed = Number(budget.replace(',', '.'));
    saveTravelPreferences({ completed: true, path, interests, budgetTotalUsd: Number.isFinite(parsed) && parsed > 0 ? parsed : null, origin: origin.trim(), travelers, pet, updatedAt: new Date().toISOString() });
    onClose();
  };
  const order: Step[] = ['interests', 'trip', 'tour'];
  const progress = step === 'choose' || step === 'host' ? null : order.indexOf(step) + 1;

  return <Dialog title="Bienvenido a CHULLA VIDA" onClose={() => finish(previous?.path ?? 'explore')} wide>
    <div className="dialog-content welcome-flow">
      {progress && <p className="welcome-progress" aria-live="polite">Paso {progress} de 3</p>}
      {step === 'choose' && <>
        <h3 className="welcome-title">Descubre el Ecuador que se vive, no solo el que se visita.</h3>
        <p className="welcome-lead">¿Cómo quieres empezar? Puedes cambiarlo cuando quieras desde «Volver a ver tutorial».</p>
        <div className="welcome-paths">
          <button className="welcome-path" onClick={() => setStep('interests')}><Compass size={26} /><strong>Soy viajero/a</strong><span>Cuéntanos qué te mueve y te mostramos cómo sacarle el jugo.</span></button>
          <button className="welcome-path" onClick={() => setStep('host')}><Store size={26} /><strong>Tengo un negocio o represento una comunidad</strong><span>Conoce cómo publicar experiencias y el proceso de revisión.</span></button>
          <button className="welcome-path is-quiet" onClick={() => finish('explore')}><ArrowRight size={26} /><strong>Solo quiero explorar</strong><span>Mira el catálogo sin registrarte. Te pediremos cuenta solo para acciones privadas.</span></button>
        </div>
      </>}
      {step === 'interests' && <fieldset className="welcome-fieldset"><legend className="welcome-title">¿Buscas aventura, cultura o relax?</legend><p className="welcome-lead">Elige lo que quieras; no es obligatorio.</p>
        <div className="welcome-chips">{INTERESTS.map(option => { const on = interests.includes(option.id); return <button key={option.id} type="button" className={`welcome-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setInterests(list => on ? list.filter(item => item !== option.id) : [...list, option.id])}>{option.label}</button>; })}</div>
      </fieldset>}
      {step === 'trip' && <div className="welcome-trip"><h3 className="welcome-title">Tu viaje, a tu ritmo</h3><p className="welcome-lead">Usamos estos datos solo en este dispositivo para ordenar sugerencias. El presupuesto es el TOTAL del viaje.</p>
        <label className="field-label">¿Desde dónde sales?<input className="field" value={origin} onChange={event => setOrigin(event.target.value)} placeholder="Ej.: Quito, Guayaquil, Cuenca" autoComplete="address-level2" /></label>
        <label className="field-label">Presupuesto total en USD<input className="field" inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Ej.: 100" /></label>
        <label className="field-label"><span><Users size={15} /> Personas</span><input className="field" type="number" min={1} max={30} value={travelers} onChange={event => setTravelers(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
        <label className="welcome-check"><input type="checkbox" checked={pet} onChange={event => setPet(event.target.checked)} /><PawPrint size={18} /> Viajo con mascota (Chulla Pet)</label>
        {pet && <p className="welcome-note">Solo marcaremos como admitidas las fichas con política de mascotas confirmada por el anfitrión. Hoy ninguna lo está, y en Galápagos y otras áreas protegidas no se admiten mascotas.</p>}
      </div>}
      {step === 'tour' && (() => { const item = TOUR[tourIndex]; const Icon = item.icon; return <div className="welcome-tour" aria-live="polite"><Icon size={34} /><h3 className="welcome-title">{item.title}</h3><p className="welcome-lead">{item.text}</p><div className="welcome-dots" aria-hidden="true">{TOUR.map((_, index) => <i key={index} className={index === tourIndex ? 'is-on' : ''} />)}</div><p className="sr-only">Consejo {tourIndex + 1} de {TOUR.length}</p></div>; })()}
      {step === 'host' && <div className="welcome-host"><h3 className="welcome-title">Para anfitriones y comunidades</h3>
        <ol><li>Crea tu cuenta y confirma tu correo.</li><li>Elige tu figura: establecimiento, operador, guía, asociación comunitaria o representante.</li><li>Sube solo los documentos que corresponden a tu actividad, en un espacio privado.</li><li>Una persona del equipo revisa, te pide correcciones si hace falta y explica su decisión.</li><li>Tu experiencia se publica como reservable solo después de esa revisión y con precios y convenio validados.</li></ol>
        <p className="welcome-note">El distintivo de Chulla Vida no es un aval del Gobierno. El registro turístico oficial se verifica aparte cuando tu actividad lo requiere.</p>
      </div>}
      <div className="dialog-actions welcome-actions">
        {step !== 'choose' && <button className="button button-secondary" onClick={() => { if (step === 'tour' && tourIndex > 0) setTourIndex(tourIndex - 1); else setStep(step === 'host' || step === 'interests' ? 'choose' : order[order.indexOf(step) - 1]); }}><ArrowLeft size={16} />Atrás</button>}
        {step !== 'choose' && <button className="button button-secondary" onClick={() => finish(step === 'host' ? 'host' : 'traveler')}>Omitir</button>}
        {step === 'interests' && <button className="button button-primary" onClick={() => setStep('trip')}>Siguiente<ArrowRight size={16} /></button>}
        {step === 'trip' && <button className="button button-primary" onClick={() => { setTourIndex(0); setStep('tour'); }}>Siguiente<ArrowRight size={16} /></button>}
        {step === 'tour' && (tourIndex < TOUR.length - 1
          ? <button className="button button-primary" onClick={() => setTourIndex(tourIndex + 1)}>Siguiente consejo<ArrowRight size={16} /></button>
          : <button className="button button-primary" onClick={() => finish('traveler')}>¡De ley, a explorar!<ArrowRight size={16} /></button>)}
        {step === 'host' && <button className="button button-primary" onClick={() => { finish('host'); window.dispatchEvent(new Event('cv3:host')); }}>Ir al espacio de anfitriones<ArrowRight size={16} /></button>}
      </div>
    </div>
  </Dialog>;
}
