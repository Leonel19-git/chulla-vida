import type { Experience, RegionId } from '../catalog/types';

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
