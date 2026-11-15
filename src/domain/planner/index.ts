import type { Experience, RegionId } from '../catalog/types.js';

export type BudgetClassification = 'dentro_del_presupuesto' | 'posiblemente_viable' | 'supera_presupuesto' | 'sin_datos_suficientes';
export type CostKind = 'transport' | 'food' | 'lodging' | 'fees' | 'pet' | 'contingency';
export interface KnownCost { kind: CostKind; amount: number; source: string }
export interface TravelConstraints {
  origin: string;
  budgetTotal: number;
  people: number;
  maxHours: number;
  nights?: number;
  region?: RegionId;
  interests?: string[];
  pet?: { species: string; count: number };
  knownCosts?: KnownCost[];
  excludedIds?: string[];
}
export interface RouteOption {
  experience: Experience;
  classification: BudgetClassification;
  experienceSubtotal: number | null;
  totalEstimate: number | null;
  knownExtraCosts: number;
  missingCosts: CostKind[];
  reasons: string[];
  source: string;
  sourceCheckedAt: string;
  bookingEnabled: false;
  /** False when a known budget, time, access or pet restriction already rules this idea out. */
  fitsKnownConstraints: boolean;
}
const norm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const originProvinces: Record<string, string> = { quito: 'Pichincha', guayaquil: 'Guayas', manta: 'Manabí', cuenca: 'Azuay', loja: 'Loja', riobamba: 'Chimborazo', ambato: 'Tungurahua', otavalo: 'Imbabura', salinas: 'Santa Elena', esmeraldas: 'Esmeraldas' };
export function petAdmission(experience: Experience, pet: TravelConstraints['pet']): { allowed: boolean; reason: string } {
  if (!pet) return { allowed: true, reason: '' };
  const policy = experience.petPolicy;
  if (policy.status === 'prohibited_protected_area' || experience.localizedRegion === 'galapagos') return { allowed: false, reason: 'No se propone acceso con mascotas a zonas protegidas de Galápagos; requiere autorización expresa de la autoridad.' };
  if (policy.status !== 'confirmed_allowed' || !policy.confirmedBy || !policy.confirmedAt) return { allowed: false, reason: 'No existe política de mascotas confirmada por anfitrión y fecha.' };
  if (!policy.species.some(species => norm(species) === norm(pet.species)) || (policy.maxCount !== null && pet.count > policy.maxCount)) return { allowed: false, reason: 'La especie o cantidad no está admitida por la política confirmada.' };
  return { allowed: true, reason: 'Consultar tamaño, documentación y transporte con el anfitrión antes de viajar.' };
}
export function evaluateOption(experience: Experience, input: TravelConstraints): RouteOption {
  if (!Number.isFinite(input.budgetTotal) || input.budgetTotal < 0 || !Number.isInteger(input.people) || input.people < 1 || input.people > 50 || !Number.isFinite(input.maxHours) || input.maxHours <= 0) throw new Error('Revisa presupuesto, personas y tiempo disponible.');
  const costs = input.knownCosts ?? [];
  if (input.pet && (!Number.isInteger(input.pet.count) || input.pet.count < 1 || !input.pet.species.trim())) throw new Error('Revisa la especie y cantidad de mascotas.');
  if (input.nights !== undefined && (!Number.isInteger(input.nights) || input.nights < 0)) throw new Error('Revisa las noches del viaje.');
  if (costs.some(cost => !Number.isFinite(cost.amount) || cost.amount < 0 || !cost.source.trim())) throw new Error('Cada gasto necesita importe válido y fuente.');
  const required: CostKind[] = ['transport', 'food', 'fees', 'contingency'];
  if ((input.nights ?? 0) > 0) required.push('lodging');
  if (input.pet) required.push('pet');
  const missingCosts = required.filter(kind => !costs.some(cost => cost.kind === kind));
  const knownExtraCosts = Math.round(costs.reduce((sum, cost) => sum + cost.amount, 0) * 100) / 100;
  const base = experience.price.currency === 'USD' ? experience.price.max ?? experience.price.min : null;
  const subtotal = base === null ? null : Math.round(base * input.people * 100) / 100;
  const reasons: string[] = [];
  let classification: BudgetClassification = 'sin_datos_suficientes';
  if (base === null) reasons.push('Precio original en EUR o sin importe: no se convierte a USD sin tipo de cambio fechado.');
  if (subtotal !== null) {
    classification = subtotal + knownExtraCosts > input.budgetTotal ? 'supera_presupuesto' : missingCosts.length ? 'posiblemente_viable' : 'dentro_del_presupuesto';
    if (classification === 'supera_presupuesto') reasons.push('Solo las experiencias y gastos conocidos superan el presupuesto total.');
  }
  if (experience.price.max === null && experience.price.min !== null) {
    reasons.push('La fuente solo indica «desde»: el precio final no tiene un máximo confirmado.');
    if (classification === 'dentro_del_presupuesto') classification = 'posiblemente_viable';
  }
  if (missingCosts.length) reasons.push('Presupuesto incompleto: faltan transporte ida/vuelta, alimentación, tasas o contingencia según el desglose.');
  const hours = experience.duration.maxHours;
  const durationOverrun = (hours !== null && hours > input.maxHours)
    || (experience.duration.days !== null && experience.duration.days > Math.ceil(input.maxHours / 24));
  if (hours === null) { reasons.push('Duración en horas o tiempo de traslado sin confirmar.'); if (classification === 'dentro_del_presupuesto') classification = 'sin_datos_suficientes'; }
  if (durationOverrun) { reasons.push('La duración indicada en la fuente excede el tiempo disponible, antes de sumar traslados.'); classification = 'sin_datos_suficientes'; }
  if (experience.accessStatus === 'closed_reported' || experience.accessStatus === 'partially_closed_reported') { reasons.push('La fuente contiene un cierre histórico: revalidar acceso; no se recomienda como ruta abierta.'); classification = 'sin_datos_suficientes'; }
  const pet = petAdmission(experience, input.pet);
  if (!pet.allowed) { reasons.push(pet.reason); classification = 'sin_datos_suficientes'; }
  if (experience.localizedRegion === 'galapagos' && input.budgetTotal <= 20) { reasons.push('Galápagos con $20 totales no se considera viable: vuelos, tasas y traslados no están confirmados ni incluidos.'); classification = 'supera_presupuesto'; }
  reasons.push('Precios referenciales/propuestos; no hay cupos, trayectos ni venta confirmados.');
  const fitsKnownConstraints = !durationOverrun && pet.allowed
    && experience.accessStatus !== 'closed_reported' && experience.accessStatus !== 'partially_closed_reported'
    && !(subtotal !== null && subtotal + knownExtraCosts > input.budgetTotal)
    && !(experience.localizedRegion === 'galapagos' && input.budgetTotal <= 20);
  return { experience, classification, experienceSubtotal: subtotal, totalEstimate: subtotal !== null && !missingCosts.length && experience.price.max !== null ? Math.round((subtotal + knownExtraCosts) * 100) / 100 : null, knownExtraCosts, missingCosts, reasons, source: experience.originalDocument, sourceCheckedAt: experience.sourceCheckedAt, bookingEnabled: false, fitsKnownConstraints };
}
export function planItinerary(input: TravelConstraints, catalog: Experience[]): RouteOption[] {
  const origin = norm(input.origin);
  const province = originProvinces[origin];
  const options = catalog.filter(e => (!input.region || e.localizedRegion === input.region) && !input.excludedIds?.includes(e.id)).map(e => evaluateOption(e, input));
  const score = (option: RouteOption) => {
    const e = option.experience;
    const budget = { dentro_del_presupuesto: 0, posiblemente_viable: 2, sin_datos_suficientes: 6, supera_presupuesto: 10 }[option.classification];
    const locality = origin.length > 2 && norm(e.locality).includes(origin) ? -3
      : province && norm(e.province) === norm(province) ? -1
      : origin.length > 2 && norm(e.title).includes(origin) ? -0.25 : 0;
    const interest = input.interests?.some(i => norm(e.tags.join(' ') + ' ' + e.activities.join(' ')).includes(norm(i))) ? -1 : 0;
    return budget + locality + interest;
  };
  return options.sort((a, b) => score(a) - score(b) || (a.experienceSubtotal ?? Infinity) - (b.experienceSubtotal ?? Infinity));
}

export interface RouteAlert {
  kind: 'weather_warning' | 'road_closure' | 'site_closed' | 'provider_cancelled' | 'time_overrun' | 'budget_overrun';
  affectedExperienceIds: string[];
  reliability: 'official_verified' | 'provider_verified' | 'crowdsourced_unverified' | 'unknown';
  simulation: boolean;
  source: string | null;
  issuedAt: string;
  expiresAt: string;
}
export function proposeReplacements(currentId: string, input: TravelConstraints, alert: RouteAlert, catalog: Experience[], now = new Date()) {
  const fresh = Date.parse(alert.expiresAt) > now.getTime() && Date.parse(alert.issuedAt) <= now.getTime();
  const reliable = alert.simulation || ((alert.reliability === 'official_verified' || alert.reliability === 'provider_verified') && Boolean(alert.source) && fresh);
  const current = catalog.find(e => e.id === currentId);
  const excluded = reliable ? alert.affectedExperienceIds : [];
  const options = planItinerary({ ...input, region: input.region ?? current?.localizedRegion, excludedIds: [...(input.excludedIds ?? []), currentId, ...excluded] }, catalog)
    .filter(o => (o.classification === 'dentro_del_presupuesto' || o.classification === 'posiblemente_viable') && o.experienceSubtotal !== null && o.experienceSubtotal + o.knownExtraCosts <= input.budgetTotal && o.experience.accessStatus !== 'closed_reported' && o.experience.accessStatus !== 'partially_closed_reported' && petAdmission(o.experience, input.pet).allowed && o.experience.duration.maxHours !== null && o.experience.duration.maxHours <= input.maxHours).slice(0, 3);
  return { mode: alert.simulation ? 'simulation' as const : 'proposal' as const, needsConfirmation: true as const, changedReservation: false as const, options, notice: alert.simulation ? 'SIMULACIÓN: este cierre no es un aviso real. Solo se propone un cambio.' : reliable ? 'Aviso fechado aportado por fuente. Revisa cancelaciones y confirma con el operador antes de cambiar.' : 'Aviso no verificado o vencido. No confirma un cierre actual. Las alternativas son ideas, no rutas seguras garantizadas.' };
}

/* ───────── Salidas cuando nada encaja: mascotas y restricciones a relajar ───────── */

export const COST_LABELS: Record<CostKind, string> = {
  transport: 'transporte ida y vuelta', food: 'alimentación', lodging: 'alojamiento', fees: 'entradas y tasas', pet: 'gastos de tu mascota', contingency: 'imprevistos',
};
export type PetLabel = 'Política confirmada' | 'Consultar condiciones' | 'No admite en áreas protegidas' | 'No admite mascotas' | 'No verificado';
export type PetTone = 'ok' | 'ask' | 'blocked' | 'unknown';
export interface PetCandidate { experience: Experience; label: PetLabel; tone: PetTone; reason: string; canAsk: boolean }

/** Etiqueta honesta de mascotas: «Política confirmada» solo con anfitrión y fecha. Nunca se inventa un sello pet-friendly. */
export function petLabel(experience: Experience): Omit<PetCandidate, 'experience'> {
  const policy = experience.petPolicy;
  if (policy.status === 'prohibited_protected_area' || experience.localizedRegion === 'galapagos') return { label: 'No admite en áreas protegidas', tone: 'blocked', reason: 'Área protegida: las mascotas no entran sin autorización expresa de la autoridad ambiental.', canAsk: false };
  if (policy.status === 'not_allowed') return { label: 'No admite mascotas', tone: 'blocked', reason: policy.note || 'La fuente indica que no se admiten mascotas.', canAsk: false };
  if (policy.status === 'confirmed_allowed' && policy.confirmedBy && policy.confirmedAt) return { label: 'Política confirmada', tone: 'ok', reason: `Confirmado por ${policy.confirmedBy} el ${policy.confirmedAt}. Revisa tamaño y requisitos.`, canAsk: true };
  if (policy.status === 'ask_conditions') return { label: 'Consultar condiciones', tone: 'ask', reason: policy.note || 'El lugar pide consultar condiciones antes de ir.', canAsk: true };
  return { label: 'No verificado', tone: 'unknown', reason: 'Nadie ha confirmado todavía si se admiten mascotas. Pregunta antes de planificar.', canAsk: true };
}
const PET_ORDER: Record<PetTone, number> = { ok: 0, ask: 1, unknown: 2, blocked: 3 };
/** Fichas que encajan con presupuesto y tiempo, ordenadas por lo que se sabe de mascotas. Las bloqueadas quedan al final, rotuladas. */
export function petCandidates(input: TravelConstraints, catalog: Experience[], limit = 6): PetCandidate[] {
  return planItinerary({ ...input, pet: undefined }, catalog).filter(option => option.fitsKnownConstraints)
    .map(option => ({ experience: option.experience, ...petLabel(option.experience) }))
    .sort((a, b) => PET_ORDER[a.tone] - PET_ORDER[b.tone]).slice(0, limit);
}
export const PET_WELFARE_TIPS = [
  'Lleva agua, plato plegable y sombra: en la Sierra el sol pica y en la Costa el calor sube rápido.',
  'Ten a mano su carné de vacunas y desparasitación; algunos lugares y transportes lo piden.',
  'Correa siempre en senderos y comunidades: cuida a la fauna silvestre y a otros animales.',
  'Recoge sus desechos y nunca lo dejes solo dentro del carro.',
  'En altura avanza despacio y fíjate si jadea demasiado: también siente el soroche.',
  'Galápagos y otras áreas protegidas no admiten mascotas: busca quién lo cuide en casa.',
];
export function petInquiryTemplate(experience: Experience, details: { people: number; date?: string; species?: string; origin?: string }): string {
  return [
    `Hola, vi la ficha «${experience.title}» (${experience.province}) en CHULLA VIDA.`,
    `Queremos ir ${details.people === 1 ? '1 persona' : `${details.people} personas`}${details.date ? ` el ${details.date}` : ''}${details.origin ? `, saliendo desde ${details.origin}` : ''}, con ${details.species || 'mi perro'}.`,
    '¿Se admiten mascotas? ¿Hay límite de tamaño, cantidad o algún costo extra?',
    '¿Piden carné de vacunas, correa u otro requisito? ¿Hay zonas donde no puede entrar?',
    '¡Gracias! Quedo pendiente de su respuesta.',
  ].join('\n');
}

export type Relaxation =
  | { kind: 'budget'; value: number; label: string; detail: string }
  | { kind: 'days'; value: number; label: string; detail: string }
  | { kind: 'region'; value: RegionId | ''; label: string; detail: string };
export interface NearMiss { option: RouteOption; blockers: string[] }
const REGION_NAMES: Record<RegionId, string> = { sierra: 'Sierra', costa: 'Costa', amazonia: 'Amazonía', galapagos: 'Galápagos' };
export function daysNeeded(experience: Experience): number | null {
  if (experience.duration.days !== null) return experience.duration.days;
  return experience.duration.maxHours === null ? null : Math.max(1, Math.ceil(experience.duration.maxHours / 24));
}
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
/**
 * Cuando ninguna idea encaja: las opciones más cercanas y qué restricción relajar, con valores de un toque.
 * Solo usa precios USD de la fuente; no convierte EUR ni inventa los costos que faltan.
 */
export function suggestRelaxations(input: TravelConstraints, catalog: Experience[]): { nearest: NearMiss[]; relaxations: Relaxation[] } {
  const days = Math.max(1, Math.ceil(input.maxHours / 24));
  const open = catalog.filter(e => e.accessStatus !== 'closed_reported' && e.accessStatus !== 'partially_closed_reported'
    && !input.excludedIds?.includes(e.id) && !(input.pet && petLabel(e).tone === 'blocked'));
  const cost = (e: Experience) => { const base = e.price.currency === 'USD' ? e.price.max ?? e.price.min : null; return base === null ? null : Math.round(base * input.people * 100) / 100; };
  const inRegion = (e: Experience) => !input.region || e.localizedRegion === input.region;
  const galapagosBlocked = (e: Experience, budget: number) => e.localizedRegion === 'galapagos' && budget <= 20;
  const fitsBudget = (e: Experience, budget = input.budgetTotal) => { const c = cost(e); return c !== null && c <= budget && !galapagosBlocked(e, budget); };
  const fitsDays = (e: Experience, d = days) => { const need = daysNeeded(e); return need === null || need <= d; };
  const relaxations: Relaxation[] = [];
  const budgetNeeds = open.filter(e => inRegion(e) && fitsDays(e) && !fitsBudget(e)).map(cost).filter((c): c is number => c !== null).sort((a, b) => a - b);
  for (const need of budgetNeeds) {
    const value = Math.min(100000, Math.max(Math.ceil(need), 21));
    const count = open.filter(e => inRegion(e) && fitsDays(e) && fitsBudget(e, value)).length;
    if (!count) continue;
    relaxations.push({ kind: 'budget', value, label: `Subir a USD ${value}`, detail: `Con USD ${value} para el grupo se ${count === 1 ? 'abre' : 'abren'} ${plural(count, 'idea', 'ideas')} (solo la experiencia, sin traslados).` });
    break;
  }
  const dayNeeds = open.filter(e => inRegion(e) && fitsBudget(e) && !fitsDays(e)).map(daysNeeded).filter((d): d is number => d !== null && d <= 30).sort((a, b) => a - b);
  if (dayNeeds.length) {
    const value = dayNeeds[0];
    const count = open.filter(e => inRegion(e) && fitsBudget(e) && fitsDays(e, value)).length;
    relaxations.push({ kind: 'days', value, label: `Viajar ${plural(value, 'día', 'días')}`, detail: `Con ${plural(value, 'día', 'días')} ${count === 1 ? 'entra' : 'entran'} ${plural(count, 'idea', 'ideas')} que ya caben en tu presupuesto.` });
  }
  if (input.region) {
    const counts = (Object.keys(REGION_NAMES) as RegionId[]).filter(id => id !== input.region)
      .map(id => ({ id, count: open.filter(e => e.localizedRegion === id && fitsBudget(e) && fitsDays(e)).length }))
      .filter(item => item.count > 0).sort((a, b) => b.count - a.count);
    if (counts.length) {
      const total = counts.reduce((sum, item) => sum + item.count, 0);
      relaxations.push({ kind: 'region', value: '', label: 'Buscar en todo Ecuador', detail: `Fuera de ${REGION_NAMES[input.region]} hay ${plural(total, 'idea que encaja', 'ideas que encajan')}.` });
      relaxations.push({ kind: 'region', value: counts[0].id, label: `Probar ${REGION_NAMES[counts[0].id]}`, detail: `Allí ${counts[0].count === 1 ? 'encaja' : 'encajan'} ${plural(counts[0].count, 'idea', 'ideas')} con lo que tienes.` });
    }
  }
  const gap = (e: Experience) => {
    const c = cost(e); const need = daysNeeded(e) ?? days;
    return (c === null ? 1e6 : Math.max(0, c - input.budgetTotal) / Math.max(1, input.budgetTotal)) + (galapagosBlocked(e, input.budgetTotal) ? 5 : 0) + Math.max(0, need - days) * 0.5 + (inRegion(e) ? 0 : 0.75);
  };
  const nearest = open.filter(e => cost(e) !== null).sort((a, b) => Number(!inRegion(a)) - Number(!inRegion(b)) || gap(a) - gap(b)).slice(0, 3).map(e => {
    const option = evaluateOption(e, { ...input, pet: undefined });
    const blockers: string[] = [];
    const c = cost(e);
    if (c !== null && c > input.budgetTotal) blockers.push(`Te faltan USD ${(Math.round((c - input.budgetTotal) * 100) / 100).toFixed(2)} solo para la experiencia.`);
    if (galapagosBlocked(e, input.budgetTotal)) blockers.push('Galápagos no es viable con USD 20: vuelos y tasas van aparte.');
    if (!fitsDays(e)) blockers.push(`Necesita ${plural(daysNeeded(e) ?? 0, 'día', 'días')} y tienes ${plural(days, 'día', 'días')}.`);
    if (!inRegion(e)) blockers.push(`Queda en ${REGION_NAMES[e.localizedRegion]}, fuera de la región que elegiste.`);
    return { option, blockers };
  });
  return { nearest, relaxations };
}
