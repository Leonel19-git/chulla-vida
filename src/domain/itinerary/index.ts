import type { Experience } from '../catalog';
export const JOURNEY_KEY = 'chullavida:journey:v3';
export const PACKING_LIST = ['Documento y permisos necesarios', 'Agua y botella reutilizable', 'Calzado adecuado y capa de lluvia', 'Protección solar y repelente según destino', 'Contacto del guía y acceso confirmados', 'Ficha descargada y batería suficiente', 'Plan de regreso y gastos de transporte revisados'];
export interface JourneyDraft { version: 1; origin: string; people: number; days: number; budget: number; date: string; stops: string[]; checked: string[]; notes: string; updatedAt: string }
export function newJourney(): JourneyDraft { return { version: 1, origin: 'Quito', people: 1, days: 1, budget: 20, date: '', stops: [], checked: [], notes: '', updatedAt: new Date().toISOString() }; }
export function isJourney(value: unknown): value is JourneyDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as JourneyDraft;
  return v.version === 1 && typeof v.origin === 'string' && v.origin.length <= 100 && typeof v.notes === 'string' && v.notes.length <= 2000
    && Number.isInteger(v.people) && v.people >= 1 && v.people <= 50 && Number.isInteger(v.days) && v.days >= 1 && v.days <= 30
    && Number.isFinite(v.budget) && v.budget >= 1 && v.budget <= 100000 && typeof v.date === 'string' && (v.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(v.date) && Number.isFinite(Date.parse(v.date)) && new Date(v.date).toISOString().slice(0, 10) === v.date)
    && Array.isArray(v.stops) && v.stops.length <= 5 && v.stops.every(id => typeof id === 'string' && id.length <= 150) && new Set(v.stops).size === v.stops.length
    && Array.isArray(v.checked) && v.checked.length <= PACKING_LIST.length && v.checked.every(item => PACKING_LIST.includes(item))
    && typeof v.updatedAt === 'string' && Number.isFinite(Date.parse(v.updatedAt));
}
export function summarizeJourney(draft: JourneyDraft, records: Experience[]) {
  const stops = draft.stops.map(id => records.find(item => item.id === id)).filter((item): item is Experience => Boolean(item));
  let base = 0; let missingPrice = false; let days = 0; let missingDuration = false;
  for (const stop of stops) {
    const price = stop.price.currency === 'USD' ? stop.price.max ?? stop.price.min : null;
    if (price === null) missingPrice = true; else base += Math.round(price * draft.people * 100);
    const duration = stop.duration.days ?? (stop.duration.maxHours === null ? null : Math.ceil(stop.duration.maxHours / 24));
    if (duration === null) missingDuration = true; else days += duration;
  }
  return { stops, experienceBase: base / 100, missingPrice, knownDays: days, missingDuration, exceedsBudget: base > draft.budget * 100, exceedsDays: days > draft.days, missingStops: draft.stops.length - stops.length, totalConfirmed: false as const };
}
export function exportJourney(draft: JourneyDraft, records: Experience[]): string {
  const summary = summarizeJourney(draft, records);
  return ['CHULLA VIDA · Mi borrador de viaje', `Salida: ${draft.origin} · ${draft.date || 'fecha pendiente'} · ${draft.people} personas · ${draft.days} días`, `Presupuesto total del grupo: USD ${draft.budget}`, '', ...summary.stops.flatMap((stop, index) => [`${index + 1}. ${stop.title} · ${stop.province}`, `${stop.locality} · ${stop.duration.label}`, `Referencia de origen: ${stop.price.originalLabel}`, `Fuente: ${stop.originalDocument} · ${stop.sourceCheckedAt}`, `Gastos aparte: ${stop.price.excludes.join('; ') || 'Confirmar con el anfitrión'}`, '']), `Base conocida de experiencias: USD ${summary.experienceBase.toFixed(2)}${summary.missingPrice ? ' · hay precios en otra moneda o sin confirmar' : ''}`, 'El total del viaje no está confirmado. Faltan trayectos, horarios, alimentación, alojamiento, tasas y contingencia según el caso.', 'No es una reserva, cotización ni cálculo de carreteras.', '', 'ANTES DE SALIR', ...PACKING_LIST.map(item => `[${draft.checked.includes(item) ? 'x' : ' '}] ${item}`), '', 'MIS NOTAS', draft.notes, '', `Borrador local actualizado: ${draft.updatedAt}`].join('\n');
}
