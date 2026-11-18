import { useState, type ReactNode } from 'react';
import { ArrowUpRight, CalendarPlus, Check, Copy, HeartHandshake, MapPin, MessageCircleQuestion, PawPrint, Plus, Sparkles, Wallet } from 'lucide-react';
import { formatExperiencePrice, type Experience, type RegionId } from '../../domain/catalog';
import { COST_LABELS, evaluateOption, PET_WELFARE_TIPS, petCandidates, petInquiryTemplate, planItinerary, suggestRelaxations, type PetTone, type Relaxation, type RouteOption, type TravelConstraints } from '../../domain/planner';

import { useT } from '../../i18n/v3';
const usd = (value: number) => `USD ${value.toFixed(value % 1 ? 2 : 0)}`;
interface Draftish { people: number; date: string; origin: string; stops: string[] }
interface Actions { onSelect: (id: string) => void; onAdd: (id: string) => void; onRelax: (relaxation: Relaxation) => void }

/** Lo que sabemos y lo que falta del costo, sin inventar montos. */
export function CostLine({ option, people }: { option: RouteOption; people: number }) {
  const t = useT();
  const missing = option.missingCosts.map(kind => t(COST_LABELS[kind]));
  return <div className="flex-cost">
    {option.experienceSubtotal === null
      ? <p><strong>{t("Precio sin sumar.")}</strong> {option.experience.price.currency === 'EUR' ? t("Está en euros y no lo convertimos.") : t("La fuente no da un importe.")}</p>
      : <p><strong>{usd(option.experienceSubtotal)}</strong>{' '}{t("de experiencia para")}{' '}{people === 1 ? '1 persona' : t("{people} personas", { people: people })}{option.experience.price.max === null ? t(" (precio «desde»)") : ''}.</p>}
    {missing.length > 0 && <p className="flex-cost-missing">{t("Falta sumar:")}{' '}{missing.join(', ')}.</p>}
  </div>;
}

function OptionCard({ experience, draft, actions, children, chip }: { experience: Experience; draft: Draftish; actions: Actions; children?: ReactNode; chip?: { label: string; tone: PetTone } }) {
  const t = useT();
  const photo = experience.media[0];
  const added = draft.stops.includes(experience.id);
  return <article className="flex-card">
    <div className="flex-card-media">{photo ? <img src={photo.src} alt={photo.alt} loading="lazy" width={640} height={420} /> : <span className="flex-card-placeholder"><MapPin size={28} aria-hidden="true" /></span>}{chip && <span className={`flex-pet-chip is-${chip.tone}`}><PawPrint size={13} aria-hidden="true" />{chip.label}</span>}</div>
    <div className="flex-card-body">
      <h5>{experience.title}</h5>
      <p>{experience.province} · {experience.duration.label}</p>
      <strong>{formatExperiencePrice(experience)}</strong>
      {children}
      <div className="flex-card-actions">
        <button type="button" className="flex-link" onClick={() => actions.onSelect(experience.id)}>{t("Revisar ficha")}<ArrowUpRight size={14} aria-hidden="true" /></button>
        <button type="button" className="flex-add" aria-label={t("Añadir {title} al borrador", { title: experience.title })} disabled={added} onClick={() => actions.onAdd(experience.id)}>{added ? <Check size={19} /> : <Plus size={19} />}</button>
      </div>
      {photo && <small className="flex-credit">{t(photo.referencePhoto ? "Foto de referencia · no muestra este sitio" : "Foto:")}{' '}{photo.credit}</small>}
    </div>
  </article>;
}

function PetAsk({ experience, draft }: { experience: Experience; draft: Draftish }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const text = petInquiryTemplate(experience, { people: draft.people, date: draft.date || undefined, origin: draft.origin.trim() || undefined });
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(t("Consulta copiada. Pégala en el WhatsApp o correo del anfitrión.")); }
    catch { setCopied(t("Tu navegador no dejó copiar. Selecciona el texto y cópialo a mano.")); }
  };
  return <div className="flex-ask">
    <button type="button" className="flex-ask-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><MessageCircleQuestion size={16} aria-hidden="true" />{t("Preguntar al anfitrión")}</button>
    {open && <div className="flex-ask-body"><label>{t("Tu consulta, lista para enviar")}<textarea className="field" readOnly rows={6} value={text} /></label><button type="button" className="button button-secondary" onClick={() => void copy()}><Copy size={16} aria-hidden="true" />{t("Copiar consulta")}</button><p role="status">{copied}</p><small>{t("No la enviamos por ti: tú decides a quién escribir.")}</small></div>}
  </div>;
}

function Relaxations({ relaxations, actions }: { relaxations: Relaxation[]; actions: Actions }) {
  const t = useT();
  if (!relaxations.length) return null;
  return <div className="flex-relax" role="group" aria-label={t("Qué puedes ajustar")}>
    <h5><Sparkles size={17} aria-hidden="true" />{t("Prueba con un toque")}</h5>
    <ul>{relaxations.map(item => <li key={`${item.kind}-${item.value}`}><button type="button" onClick={() => actions.onRelax(item)}>{item.kind === 'budget' ? <Wallet size={16} aria-hidden="true" /> : item.kind === 'days' ? <CalendarPlus size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}<span><strong>{t(item.label)}</strong><small>{t(item.detail)}</small></span></button></li>)}</ul>
  </div>;
}

/** Resultados de Chulla Flex: nunca un callejón sin salida. */
export function PlannerResults({ constraints, records, draft, region, actions }: { constraints: TravelConstraints; records: Experience[]; draft: Draftish; region: RegionId | ''; actions: Actions }) {
  const t = useT();
  const pet = Boolean(constraints.pet);
  const options = planItinerary(constraints, records).filter(option => option.fitsKnownConstraints).slice(0, 6);
  const candidates = pet ? petCandidates(constraints, records) : [];
  const priced = options.filter(option => option.experienceSubtotal !== null);
  const stuck = pet ? !candidates.some(candidate => candidate.tone !== 'blocked') : !priced.length;
  const help = stuck ? suggestRelaxations(constraints, records) : null;
  const evaluate = (experience: Experience) => evaluateOption(experience, constraints);
  const subtotals = options.map(option => option.experienceSubtotal).filter((value): value is number => value !== null);
  return <section className="flex-options" aria-live="polite">
    {region === 'galapagos' && constraints.budgetTotal <= 20 && <p className="flex-warning">{t("Galápagos con USD 20 totales no es viable: vuelos, tasas y traslados van aparte. Abajo tienes alternativas.")}</p>}
    {pet ? <>
      <h4><PawPrint size={22} aria-hidden="true" />{t("Viajar con tu perro, con honestidad")}</h4>
      <p>{t("Ninguna ficha tiene todavía una política de mascotas confirmada por su anfitrión. Estas encajan con tu presupuesto y tiempo; la etiqueta dice lo que sabemos de verdad.")}</p>
      {candidates.length > 0 && <div className="flex-cards">{candidates.map(candidate => <OptionCard key={candidate.experience.id} experience={candidate.experience} draft={draft} actions={actions} chip={{ label: candidate.label, tone: candidate.tone }}>
        <p className="flex-pet-reason">{t(candidate.reason)}</p>
        <CostLine option={evaluate(candidate.experience)} people={draft.people} />
        {candidate.canAsk && <PetAsk experience={candidate.experience} draft={draft} />}
      </OptionCard>)}</div>}
      <div className="flex-tips"><h5><HeartHandshake size={18} aria-hidden="true" />{t("Para que tu perro también la pase bien")}</h5><ul>{PET_WELFARE_TIPS.map(tip => <li key={tip}>{t(tip)}</li>)}</ul></div>
    </> : options.length > 0 ? <>
      <h4>{t("Para empezar tu recorrido")}</h4>
      <p className="flex-summary"><strong>{options.length} {t(options.length === 1 ? 'idea encaja' : 'ideas encajan')}</strong>{subtotals.length > 0 && <>{' '}{t("· desde")}{' '}{usd(Math.min(...subtotals))}{' '}{t("de experiencia para el grupo")}</>}{' '}{t("· tu presupuesto:")}{' '}{usd(constraints.budgetTotal)}</p>
      <div className="flex-cards">{options.map(option => <OptionCard key={option.experience.id} experience={option.experience} draft={draft} actions={actions}><CostLine option={option} people={draft.people} /></OptionCard>)}</div>
    </> : null}
    {stuck && help && <div className="flex-stuck">
      <h4>{pet ? t("Afinemos para encontrar más opciones") : options.length ? t("Con precio conocido nada entra aún, pero hay salida") : t("Casi: nada encaja del todo, pero hay salida")}</h4>
      <p>{t("Con")}{' '}{usd(constraints.budgetTotal)} para {draft.people === 1 ? '1 persona' : t("{people} personas", { people: draft.people })}, {Math.ceil(constraints.maxHours / 24)} {t(Math.ceil(constraints.maxHours / 24) === 1 ? 'día' : 'días')}{region ? t(" y la región elegida") : ''}{t(", no hay fichas con precio conocido que quepan. Esto es lo más cercano y lo que puedes mover.")}</p>
      <Relaxations relaxations={help.relaxations} actions={actions} />
      {help.nearest.length > 0 && <div className="flex-cards">{help.nearest.map(({ option, blockers }) => <OptionCard key={option.experience.id} experience={option.experience} draft={draft} actions={actions}>
        {blockers.length > 0 && <ul className="flex-blockers">{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>}
        <CostLine option={option} people={draft.people} />
      </OptionCard>)}</div>}
      {!help.relaxations.length && !help.nearest.length && <p>{t("No hay precios comparables en dólares. Explora el catálogo o solicita una cotización al anfitrión.")}</p>}
    </div>}
    <p className="flex-cost-note">{t("Precios referenciales de la fuente, sin conversión de euros. Transporte, comida, tasas e imprevistos se confirman con cada anfitrión.")}</p>
  </section>;
}
