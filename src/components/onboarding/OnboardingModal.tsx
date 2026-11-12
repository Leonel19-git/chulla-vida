import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, CalendarDays, Camera, Check, Compass, Footprints,
  Globe2, HandHeart, Leaf, Map, MapPin, Minus, Moon, Mountain, Plane,
  Plus, Route, Search, Users, Utensils, Wallet, Waves, X, Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdventureLevel, Region } from '../../types';
import './planner.css';

const PASSIONS = [
  { value: 'Aventura', label: 'Aventura', icon: Mountain },
  { value: 'Cultura Viva', label: 'Cultura viva', icon: Compass },
  { value: 'Fotografía', label: 'Fotografía', icon: Camera },
  { value: 'Gastronomía', label: 'Gastronomía', icon: Utensils },
  { value: 'Voluntariado', label: 'Voluntariado', icon: HandHeart },
  { value: 'Naturaleza', label: 'Naturaleza', icon: Leaf },
  { value: 'Noche cultural', label: 'Noche cultural', icon: Moon },
  { value: 'Con amigos', label: 'Con amigos', icon: Users },
];
const REGIONS: { value: Region | 'Todas'; label: string; description: string; icon: typeof Mountain }[] = [
  { value: 'Sierra', label: 'Sierra', description: 'Volcanes, páramos y cultura andina', icon: Mountain },
  { value: 'Costa', label: 'Costa', description: 'Mar, sabores y pueblos costeros', icon: Waves },
  { value: 'Amazonía', label: 'Oriente · Amazonía', description: 'Bosques, ríos y comunidades', icon: Leaf },
  { value: 'Galápagos', label: 'Galápagos', description: 'Islas y vida marina', icon: Compass },
  { value: 'Todas', label: 'Todo Ecuador', description: 'Abierto a descubrir nuevas regiones', icon: Globe2 },
];
const ADVENTURE: { value: AdventureLevel; label: string; description: string; icon: typeof Mountain }[] = [
  { value: 'Tranqui', label: 'Suave', description: 'Paseos, cultura y tiempo para respirar.', icon: Leaf },
  { value: 'Moderado', label: 'Media', description: 'Caminatas y un poco de desafío.', icon: Footprints },
  { value: 'Adrenalina', label: 'Intensa', description: 'Rutas exigentes y mucha energía.', icon: Zap },
];
const CITIES = [
  ['Quito', 'Pichincha'], ['Guayaquil', 'Guayas'], ['Cuenca', 'Azuay'],
  ['Loja', 'Loja'], ['Manta', 'Manabí'], ['Portoviejo', 'Manabí'],
  ['Ambato', 'Tungurahua'], ['Riobamba', 'Chimborazo'], ['Latacunga', 'Cotopaxi'],
  ['Ibarra', 'Imbabura'], ['Otavalo', 'Imbabura'], ['Tulcán', 'Carchi'],
  ['Esmeraldas', 'Esmeraldas'], ['Santo Domingo', 'Santo Domingo de los Tsáchilas'],
  ['Machala', 'El Oro'], ['Salinas', 'Santa Elena'], ['Santa Elena', 'Santa Elena'],
  ['Babahoyo', 'Los Ríos'], ['Quevedo', 'Los Ríos'], ['Tena', 'Napo'],
  ['Puyo', 'Pastaza'], ['Macas', 'Morona Santiago'], ['Nueva Loja', 'Sucumbíos'],
  ['Zamora', 'Zamora Chinchipe'], ['Puerto Ayora', 'Galápagos'],
  ['Puerto Baquerizo Moreno', 'Galápagos'], ['Guaranda', 'Bolívar'], ['Azogues', 'Cañar'],
];
const STEPS = ['Intereses', 'Presupuesto', 'Días', 'Compañía', 'Región', 'Ritmo', 'Origen', 'Cercanía'];
const QUESTIONS = [
  ['¿Qué te mueve?', 'Elige tus favoritos. Se vale marcar varios.'],
  ['¿Cuál es tu presupuesto total?', 'Para todo el grupo y todo el viaje, en USD.'],
  ['¿Cuántos días tienes?', 'De una escapada a dos semanas.'],
  ['¿Cuántos van?', '¿Vas solo o con tus panas?'],
  ['¿Qué región te late?', 'Elige una o déjate sorprender.'],
  ['¿Cuánta aventura?', 'Tranqui o con más energía: tú eliges.'],
  ['¿De dónde arrancas?', 'Busca tu ciudad en Ecuador o agrega otra.'],
  ['¿Cerca o más lejitos?', 'Dale alcance a tu escapada.'],
];
const QUESTION_ICONS = [Compass, Wallet, CalendarDays, Users, MapPin, Zap, Plane, Route];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const money = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, onboarding, setOnboarding, setSelectedRegion, setActiveTab, t } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const preferencesRef = useRef(onboarding);
  useEffect(() => { preferencesRef.current = onboarding; }, [onboarding]);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [passions, setPassions] = useState<string[]>([]);
  const [budget, setBudget] = useState(300);
  const [days, setDays] = useState(4);
  const [people, setPeople] = useState(2);
  const [region, setRegion] = useState<Region | 'Todas'>('Todas');
  const [adventure, setAdventure] = useState<AdventureLevel>('Moderado');
  const [origin, setOrigin] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [distance, setDistance] = useState(300);

  useEffect(() => {
    if (!isOnboardingOpen) return;
    const current = preferencesRef.current;
    const aliases: Record<string, string> = { 'Gastronomía Ancestral': 'Gastronomía', 'Fauna Marina': 'Naturaleza' };
    setPassions([...new Set(current.pasiones.map(value => aliases[value] || value))].filter(value => PASSIONS.some(passion => passion.value === value)));
    setBudget(clamp(current.presupuesto_max || 300, 20, 2000));
    setDays(clamp(current.dias_disponibles || 4, 1, 14));
    setPeople(clamp(current.cantidad_personas || 2, 1, 10));
    setRegion(REGIONS.some(item => item.value === current.region_preferida) ? current.region_preferida : 'Todas');
    setAdventure(current.nivel_aventura === 'Todas' ? 'Moderado' : current.nivel_aventura);
    setOrigin(current.origen || '');
    setDistance([100, 300, 1000].includes(current.distancia_max || 0) ? current.distancia_max! : 300);
    setCityQuery('');
    setStep(0);
    setFurthestStep(0);
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    const frame = requestAnimationFrame(() => questionRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOnboardingOpen]);

  useEffect(() => {
    if (isOnboardingOpen) questionRef.current?.focus();
  }, [step, isOnboardingOpen]);

  const close = () => setIsOnboardingOpen(false);
  const canContinue = step === 0 ? passions.length > 0 : step === 6 ? origin.trim().length >= 2 : true;
  const QuestionIcon = QUESTION_ICONS[step];
  const filteredCities = CITIES.filter(([city, province]) => normalize(`${city} ${province} Ecuador`).includes(normalize(cityQuery.trim())));
  const customCity = cityQuery.trim().length >= 2 && !CITIES.some(([city]) => normalize(city) === normalize(cityQuery.trim()));
  const chosenRegionLabel = REGIONS.find(item => item.value === region)?.label || 'Todo Ecuador';
  const chosenAdventureLabel = ADVENTURE.find(item => item.value === adventure)?.label || 'Media';
  const togglePassion = (value: string) => setPassions(previous => previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value]);
  const next = () => {
    if (!canContinue) return;
    setFurthestStep(previous => Math.max(previous, step + 1));
    setStep(previous => Math.min(7, previous + 1));
  };
  const finish = () => {
    if (!passions.length || origin.trim().length < 2) return;
    setOnboarding(previous => ({
      ...previous, pasiones: passions, presupuesto_max: budget,
      tipo_gasto: budget <= 150 ? 'mochilero' : budget <= 500 ? 'equilibrado' : 'experiencias',
      dias_disponibles: days, cantidad_personas: people, region_preferida: region,
      nivel_aventura: adventure, origen: origin.trim(), distancia_max: distance, completado: true,
    }));
    setSelectedRegion(region);
    setActiveTab('feed');
    close();
  };
  const trapFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === questionRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return (
    <dialog ref={dialogRef} className="planner-dialog" aria-labelledby="planner-title" aria-describedby="planner-description"
      onCancel={event => { event.preventDefault(); close(); }} onKeyDown={trapFocus}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}>
      <div className="planner-shell">
        <header className="planner-header">
          <div><h2 id="planner-title">{t('Arma tu plan')}</h2><p id="planner-description">{t('8 pasos y nos fuimos, wambra.')}</p></div>
          <button type="button" className="icon-button planner-close" onClick={close} aria-label={t('Cerrar planificador')}><X size={20} /></button>
        </header>
        <nav className="planner-progress" aria-label={t('Pasos del planificador')}>
          {STEPS.map((label, index) => (
            <button type="button" key={label} className={`planner-progress-step ${index < step ? 'is-complete' : ''} ${index === step ? 'is-current' : ''}`}
              disabled={index > furthestStep || (step === 0 && !passions.length && index > 0)} onClick={() => setStep(index)}
              aria-current={index === step ? 'step' : undefined} aria-label={`${t('Paso')} ${index + 1} / 8: ${t(label)}${index < step ? `, ${t('completado')}` : ''}`}>
              <span className="planner-progress-track" /><span className="planner-progress-label"><span>{index < step ? <Check size={12} aria-hidden="true" /> : index + 1}</span>{t(label)}</span>
            </button>
          ))}
        </nav>
        <div className="planner-main">
          <section className="planner-question-area" aria-labelledby="planner-question">
            <div className="planner-question-heading">
              <span className="planner-question-icon"><QuestionIcon size={23} aria-hidden="true" /></span>
              <div><p className="planner-step-caption">{t('Paso')} {step + 1} / 8</p><h3 id="planner-question" ref={questionRef} tabIndex={-1}>{t(QUESTIONS[step][0])}</h3><p>{t(QUESTIONS[step][1])}</p></div>
            </div>

            {step === 0 && <div className="planner-interests">
              <div className="planner-interest-grid" role="group" aria-label={t('Tus intereses')}>
                {PASSIONS.map(({ value, label, icon: Icon }) => <label key={value} className={`planner-choice planner-interest ${passions.includes(value) ? 'is-selected' : ''}`}>
                  <input className="planner-choice-input" type="checkbox" checked={passions.includes(value)} onChange={() => togglePassion(value)} />
                  <Icon size={24} aria-hidden="true" /><span>{t(label)}</span><span className="planner-choice-check" aria-hidden="true">{passions.includes(value) && <Check size={13} />}</span>
                </label>)}
              </div>
              <p className="planner-hint" role="status">{passions.length ? `${passions.length} ${t(passions.length === 1 ? 'interés seleccionado' : 'intereses seleccionados')}. ${t('Puedes elegir varios.')}` : t('Selecciona al menos un interés para continuar.')}</p>
            </div>}

            {step === 1 && <div className="planner-range-question">
              <output className="planner-big-value" htmlFor="planner-budget">{money(budget)}<span>{t('USD · presupuesto del grupo')}</span></output>
              <input id="planner-budget" className="planner-range" type="range" min={20} max={2000} step={10} value={budget} onChange={event => setBudget(Number(event.target.value))} aria-label={t('Presupuesto total del grupo en dólares')} aria-valuetext={`${budget} USD`} style={{ '--planner-range-fill': `${(budget - 20) / 1980 * 100}%` } as React.CSSProperties} />
              <div className="planner-range-scale"><span>$20</span><span>$1.000</span><span>$2.000</span></div>
              <div className="planner-budget-presets" role="group" aria-label={t('Presupuestos sugeridos')}>
                {[{ value: 20, label: 'Plan de un día' }, { value: 50, label: 'Escapada' }, { value: 150, label: 'Mochilero' }, { value: 500, label: 'Equilibrado' }].map(preset => <button key={preset.value} type="button" className={`planner-preset ${budget === preset.value ? 'is-selected' : ''}`} aria-pressed={budget === preset.value} onClick={() => setBudget(preset.value)}><strong>{money(preset.value)}</strong><span>{t(preset.label)}</span></button>)}
              </div>
              <p className="planner-hint">{t('Referencia por persona y día')}: {money(budget / people / days)}. {t('Los paseos locales económicos suponen que ya estás en el destino. Transporte y extras van aparte.')}</p>
            </div>}

            {(step === 2 || step === 3) && <div className="planner-range-question">
              <output className="planner-big-value" htmlFor={step === 2 ? 'planner-days' : 'planner-people'}>{step === 2 ? days : people}<span>{t(step === 2 ? (days === 1 ? 'día para descubrir' : 'días para descubrir') : (people === 1 ? 'wambra en la ruta' : 'wambras en la ruta'))}</span></output>
              <input id={step === 2 ? 'planner-days' : 'planner-people'} className="planner-range" type="range" min={1} max={step === 2 ? 14 : 10} step={1} value={step === 2 ? days : people} onChange={event => (step === 2 ? setDays : setPeople)(Number(event.target.value))} aria-label={t(step === 2 ? 'Días disponibles' : 'Cantidad de viajeros')} style={{ '--planner-range-fill': `${((step === 2 ? days : people) - 1) / (step === 2 ? 13 : 9) * 100}%` } as React.CSSProperties} />
              <div className="planner-range-scale"><span>1 {t(step === 2 ? 'día' : 'persona')}</span><span>{t(step === 2 ? '14 días' : '10 personas')}</span></div>
              <div className="planner-counter-controls">
                <button type="button" className="planner-counter" disabled={(step === 2 ? days : people) === 1} aria-label={t(step === 2 ? 'Un día menos' : 'Una persona menos')} onClick={() => (step === 2 ? setDays : setPeople)(value => Math.max(1, value - 1))}><Minus size={20} /></button>
                <span>{t(step === 2 ? 'Haz espacio para lo que te mueve.' : people === 1 ? 'Tu viaje, a tu ritmo.' : 'Las buenas historias se comparten.')}</span>
                <button type="button" className="planner-counter" disabled={(step === 2 ? days : people) === (step === 2 ? 14 : 10)} aria-label={t(step === 2 ? 'Un día más' : 'Una persona más')} onClick={() => (step === 2 ? setDays : setPeople)(value => Math.min(step === 2 ? 14 : 10, value + 1))}><Plus size={20} /></button>
              </div>
            </div>}

            {step === 4 && <div className="planner-region-grid" role="radiogroup" aria-label={t('Región preferida')}>
              {REGIONS.map(({ value, label, description, icon: Icon }) => <label key={value} className={`planner-choice planner-region ${region === value ? 'is-selected' : ''}`}>
                <input className="planner-choice-input" type="radio" name="planner-region" value={value} checked={region === value} onChange={() => setRegion(value)} />
                <Icon size={30} aria-hidden="true" /><strong>{t(label)}</strong><span>{t(description)}</span><span className="planner-choice-check" aria-hidden="true">{region === value && <Check size={13} />}</span>
              </label>)}
            </div>}

            {step === 5 && <div className="planner-adventure-list" role="radiogroup" aria-label={t('Nivel de aventura')}>
              {ADVENTURE.map(({ value, label, description, icon: Icon }) => <label key={value} className={`planner-choice planner-adventure ${adventure === value ? 'is-selected' : ''}`}>
                <input className="planner-choice-input" type="radio" name="planner-adventure" value={value} checked={adventure === value} onChange={() => setAdventure(value)} />
                <Icon size={26} aria-hidden="true" /><span><strong>{t(label)}</strong><span>{t(description)}</span></span><span className="planner-choice-check" aria-hidden="true">{adventure === value && <Check size={13} />}</span>
              </label>)}
            </div>}

            {step === 6 && <div className="planner-origin">
              <label className="field-label" htmlFor="planner-city">{t('Buscar tu ciudad')}</label>
              <div className="planner-city-search"><Search size={18} aria-hidden="true" /><input id="planner-city" className="field" value={cityQuery} maxLength={80} placeholder={t('Ciudad o provincia: Tena, Manabí…')} onChange={event => setCityQuery(event.target.value)} autoComplete="off" /></div>
              <div className="planner-city-country"><Globe2 size={15} aria-hidden="true" /><strong>Ecuador</strong><span>{cityQuery.trim() ? `${filteredCities.length} ${t('resultados')}` : `${CITIES.length} ${t('ciudades')}`}</span></div>
              {origin && <p className="planner-origin-selected"><MapPin size={15} aria-hidden="true" />{t('Sales desde')}{' '}<strong>{origin}</strong><Check size={15} aria-hidden="true" /></p>}
              <div className="planner-city-list" role="group" aria-label={t('Ciudades de origen')}>
                {filteredCities.map(([city, province]) => <button type="button" key={city} className={`planner-city ${origin === city ? 'is-selected' : ''}`} onClick={() => { setOrigin(city); setCityQuery(''); }} aria-pressed={origin === city}><span className="planner-city-code" aria-hidden="true">EC</span><span><strong>{city}</strong><small>{province}</small></span>{origin === city && <Check size={16} aria-hidden="true" />}</button>)}
                {customCity && <button type="button" className="planner-custom-city" onClick={() => { setOrigin(cityQuery.trim()); setCityQuery(''); }}><Plus size={17} aria-hidden="true" /><span>{t('Usar como origen')}: {cityQuery.trim()}</span></button>}
                {!filteredCities.length && !customCity && <p className="planner-hint">{t('Escribe al menos dos letras para buscar o agregar tu ciudad.')}</p>}
              </div>
              {!origin && <p className="planner-hint">{t('Selecciona una ciudad para continuar.')}</p>}
            </div>}

            {step === 7 && <div className="planner-distance">
              <div className="planner-distance-list" role="radiogroup" aria-label={t('Alcance de la escapada')}>
                {[{ value: 100, label: 'Cerca de casa', detail: 'Prefiero escapadas cortas', icon: MapPin }, { value: 300, label: 'Una nueva región', detail: 'Tengo ganas de ir un poco más lejos', icon: Map }, { value: 1000, label: 'Todo Ecuador', detail: 'La distancia es parte de la aventura', icon: Globe2 }].map(({ value, label, detail, icon: Icon }) => <label key={value} className={`planner-choice planner-distance-choice ${distance === value ? 'is-selected' : ''}`}>
                  <input className="planner-choice-input" type="radio" name="planner-distance" value={value} checked={distance === value} onChange={() => setDistance(value)} />
                  <Icon size={24} aria-hidden="true" /><span><strong>{t(label)}</strong><small>{t(detail)}</small></span><span className="planner-choice-check" aria-hidden="true">{distance === value && <Check size={13} />}</span>
                </label>)}
              </div>
              <p className="planner-hint">{distance === 1000 ? t('Todo el país') : `${distance} km · ${t('Referencia')}`}. {t('Preferencia regional; no calcula carreteras.')}</p>
              <div className="planner-ready-note"><Check size={19} aria-hidden="true" /><p>{t('¡De una! Tu plan está listo.')}</p></div>
            </div>}
          </section>

          <aside className={`planner-aside ${step === 7 ? 'planner-aside-final' : ''}`} aria-label={t('Resumen de preferencias')}>
            <div className="planner-summary-route" aria-hidden="true"><MapPin size={19} /><span /><Mountain size={28} /></div>
            <h4>{t('Tu plan, de un vistazo')}</h4><p>{t('Puedes cambiarlo cuando quieras.')}</p>
            <dl className="planner-summary">
              <div><dt><Compass size={13} aria-hidden="true" />{t('Intereses')}</dt><dd>{passions.length ? passions.map(value => t(PASSIONS.find(item => item.value === value)?.label || value)).join(', ') : t('Tú eliges')}</dd></div>
              <div><dt><Wallet size={13} aria-hidden="true" />{t('Presupuesto')}</dt><dd>{money(budget)} <span>{t('para el grupo')}</span></dd></div>
              <div><dt><Users size={13} aria-hidden="true" />{t('Panas y días')}</dt><dd>{people} {t(people === 1 ? 'persona' : 'personas')} · {days} {t(days === 1 ? 'día' : 'días')}</dd></div>
              <div><dt><Mountain size={13} aria-hidden="true" />{t('Región y ritmo')}</dt><dd>{t(chosenRegionLabel)} · {t(chosenAdventureLabel)}</dd></div>
              <div><dt><MapPin size={13} aria-hidden="true" />{t('Arrancas desde')}</dt><dd>{origin || t('Por descubrir')}</dd></div>
            </dl>
            <p className="planner-summary-foot"><Leaf size={15} aria-hidden="true" />{t('Viaja bacán. Cuida el lugar.')}</p>
          </aside>
        </div>
        <footer className="planner-footer">
          {step > 0 ? <button type="button" className="button button-secondary planner-back" onClick={() => setStep(previous => previous - 1)}><ArrowLeft size={17} />{t('Atrás')}</button> : <button type="button" className="planner-cancel" onClick={close}>{t('Lo haré después')}</button>}
          <button type="button" className="button button-primary planner-next" disabled={!canContinue} onClick={step === 7 ? finish : next}>{t(step === 7 ? '¡De una, ver mi ruta!' : 'Continuar')}<ArrowRight size={17} /></button>
        </footer>
      </div>
    </dialog>
  );
};
