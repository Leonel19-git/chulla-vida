import type { Experience, LocationInfo } from '../catalog';

export interface EditorialFields {
  title: string;
  summary: string;
  description: string;
  activities: string[];
  price: { min: number | null; max: number | null; currency: 'USD' | 'EUR'; originalLabel: string; includes: string[]; excludes: string[] };
  sourceCheckedAt: string;
  accessSummary: string;
  transportOptions: LocationInfo['transportOptions'];
}
export interface EditorialDraft {
  schemaVersion: 1;
  experienceId: string;
  basedOnVersion: string;
  fields: EditorialFields;
  sourceNote: string;
  savedAt: string;
}
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number, min = 0): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const lines = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(item => text(item, 1000));
const amount = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000);
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function editableFields(experience: Experience): EditorialFields {
  return { title: experience.title, summary: experience.summary, description: experience.description,
    activities: [...experience.activities], price: { min: experience.price.min, max: experience.price.max, currency: experience.price.currency,
      originalLabel: experience.price.originalLabel, includes: [...experience.price.includes], excludes: [...experience.price.excludes] },
    sourceCheckedAt: experience.sourceCheckedAt, accessSummary: experience.locationInfo?.accessSummary ?? '', transportOptions: structuredClone(experience.locationInfo?.transportOptions ?? []) };
}
export function validateEditorialFields(value: unknown): { ok: true; value: EditorialFields } | { ok: false; errors: string[] } {
  if (!object(value)) return { ok: false, errors: ['El borrador no tiene una estructura válida.'] };
  const errors: string[] = [];
  if (!text(value.title, 160, 3)) errors.push('El título necesita entre 3 y 160 caracteres.');
  if (!text(value.summary, 1200, 10)) errors.push('El resumen necesita entre 10 y 1200 caracteres.');
  if (!text(value.description, 20000, 20)) errors.push('La descripción necesita entre 20 y 20000 caracteres.');
  if (!lines(value.activities)) errors.push('Revisa las actividades: máximo 100 líneas de 1000 caracteres.');
  const price = value.price;
  if (!object(price) || !amount(price.min) || !amount(price.max) || !['USD', 'EUR'].includes(String(price.currency)) || !text(price.originalLabel, 1000, 3) || !lines(price.includes) || !lines(price.excludes)) errors.push('Revisa moneda, importe, etiqueta e inclusiones/exclusiones.');
  else if (typeof price.min === 'number' && typeof price.max === 'number' && price.min > price.max) errors.push('El precio mínimo no puede superar al máximo.');
  if (!date(value.sourceCheckedAt)) errors.push('La fecha editorial debe ser una fecha real en formato AAAA-MM-DD.');
  if (!text(value.accessSummary, 5000)) errors.push('El resumen de acceso excede 5000 caracteres.');
  if (!Array.isArray(value.transportOptions) || value.transportOptions.length > 30 || !value.transportOptions.every(item => object(item) && text(item.label, 300, 1) && ['bus', 'flight', 'boat', 'taxi', 'walk', 'local', 'mixed'].includes(String(item.mode)) && (item.durationLabel === null || text(item.durationLabel, 200)) && (item.priceLabel === null || text(item.priceLabel, 300)) && text(item.notes, 1500))) errors.push('Revisa los tramos de acceso y sus notas.');
  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(value) as unknown as EditorialFields };
}
/** The editable envelope cannot promote verification, booking, coordinates or immutable source provenance. */
export function applyEditorialFields(canonical: Experience, fields: EditorialFields): Experience {
  const validation = validateEditorialFields(fields);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  return { ...structuredClone(canonical), title: fields.title.trim(), summary: fields.summary.trim(), description: fields.description.trim(),
    activities: [...fields.activities], sourceCheckedAt: fields.sourceCheckedAt,
    price: { ...structuredClone(canonical.price), ...structuredClone(fields.price), type: 'referential' },
    locationInfo: { ...structuredClone(canonical.locationInfo ?? { references: [] }), accessSummary: fields.accessSummary, transportOptions: structuredClone(fields.transportOptions) },
    bookingEnabled: false, operatorVerificationStatus: 'unverified', verifiedBy: null, geospatialCoordinatesVerified: false, editorialStatus: 'referential' };
}
export function makeEditorialDraft(canonical: Experience, fields: EditorialFields, sourceNote: string, now = new Date()): EditorialDraft {
  const validation = validateEditorialFields(fields);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  if (!text(sourceNote, 2000, 10)) throw new Error('Describe la fuente o el motivo de la revisión con al menos 10 caracteres.');
  return { schemaVersion: 1, experienceId: canonical.id, basedOnVersion: canonical.contentVersion, fields: validation.value, sourceNote: sourceNote.trim(), savedAt: now.toISOString() };
}
export function isEditorialDraft(value: unknown): value is EditorialDraft {
  return object(value) && value.schemaVersion === 1 && text(value.experienceId, 200, 1) && text(value.basedOnVersion, 100, 1)
    && text(value.sourceNote, 2000, 10) && text(value.savedAt, 100) && Number.isFinite(Date.parse(value.savedAt as string)) && validateEditorialFields(value.fields).ok;
}
export function fieldsFromPublicRecord(value: unknown, canonical: Experience): EditorialFields | null {
  if (!object(value) || value.id !== canonical.id || value.contentSourceId !== canonical.contentSourceId
    || value.originalDocument !== canonical.originalDocument || value.bookingEnabled !== false || value.verifiedBy !== null
    || value.operatorVerificationStatus !== 'unverified' || value.geospatialCoordinatesVerified !== false || value.editorialStatus !== 'referential' || !object(value.price)) return null;
  const location = object(value.locationInfo) ? value.locationInfo : {};
  const candidate = { title: value.title, summary: value.summary, description: value.description, activities: value.activities,
    price: { min: value.price.min, max: value.price.max, currency: value.price.currency, originalLabel: value.price.originalLabel, includes: value.price.includes, excludes: value.price.excludes },
    sourceCheckedAt: value.sourceCheckedAt, accessSummary: location.accessSummary ?? '', transportOptions: location.transportOptions ?? [] };
  const validation = validateEditorialFields(candidate);
  return validation.ok ? validation.value : null;
}
