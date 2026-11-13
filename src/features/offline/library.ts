import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { getExperienceById, type Experience } from '../../domain/catalog';
import { preparePublicShell } from './registration';

export const OFFLINE_DB_NAME = 'chullavida-public-offline-v1';
interface DownloadRecord { id: string; schemaVersion: 1; downloadedAt: string; bytes: number; experience: Experience }
interface DownloadDB extends DBSchema { experiences: { key: string; value: DownloadRecord } }
export interface OfflineLibrary { experiences: Experience[]; downloadedAt: string | undefined; bytes: number; discardedRecords: number }
let database: Promise<IDBPDatabase<DownloadDB>> | undefined;
function getDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Este navegador no permite guardar descargas. Prueba otro navegador o revisa el modo privado.'));
  if (!database) database = openDB<DownloadDB>(OFFLINE_DB_NAME, 1, {
    upgrade(db) { db.createObjectStore('experiences', { keyPath: 'id' }); },
    terminated() { database = undefined; },
  }).catch(error => { database = undefined; throw error; });
  return database;
}
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 100000;
const list = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 300 && value.every(text);
const nullableNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const nullableText = (value: unknown) => value === null || text(value);
const httpUrl = (value: unknown) => {
  if (!text(value)) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
};
const boundedArray = (value: unknown, valid: (item: unknown) => boolean) => Array.isArray(value) && value.length <= 300 && value.every(valid);
function validLocation(value: unknown): boolean {
  if (!object(value) || !text(value.accessSummary)
    || !boundedArray(value.transportOptions, item => object(item) && text(item.label) && ['bus', 'flight', 'boat', 'taxi', 'walk', 'local', 'mixed'].includes(String(item.mode)) && nullableText(item.durationLabel) && nullableText(item.priceLabel) && text(item.notes))
    || !boundedArray(value.references, item => object(item) && text(item.title) && httpUrl(item.url) && date(item.checkedAt))) return false;
  if (value.approximatePoint === undefined) return true;
  const point = value.approximatePoint;
  return object(point) && typeof point.lat === 'number' && Number.isFinite(point.lat) && point.lat >= -6 && point.lat <= 2
    && typeof point.lon === 'number' && Number.isFinite(point.lon) && point.lon >= -92 && point.lon <= -75
    && text(point.label) && point.scope === 'locality_reference' && httpUrl(point.sourceUrl) && date(point.checkedAt);
}
/** Reject malformed browser data before a downloaded snapshot reaches UI or MIJIN. */
export function isDownloadedExperience(value: unknown): value is Experience {
  if (!object(value) || !object(value.price) || !object(value.duration) || !object(value.capacity) || !object(value.petPolicy)) return false;
  const fields = ['id', 'slug', 'originalDocument', 'contentVersion', 'title', 'province', 'locality', 'summary', 'description', 'sourceText', 'difficultyLabel'];
  if (!fields.every(key => text(value[key])) || !value.id || !date(value.sourceCheckedAt)) return false;
  if (!['experienceName', 'subregion', 'meetingPoint', 'context'].every(key => value[key] === null || text(value[key]))
    || typeof value.sourceOrder !== 'number' || !Number.isInteger(value.sourceOrder) || value.sourceOrder < 1) return false;
  if (!['catalogo-general-14', 'catalogo-costa-7', 'catalogo-galapagos-12', 'catalogo-amazonia-usuario'].includes(String(value.contentSourceId))
    || !['sierra', 'costa', 'amazonia', 'galapagos'].includes(String(value.localizedRegion))
    || !['experience', 'multi_day_program', 'trip_plan'].includes(String(value.kind))
    || value.bookingEnabled !== false || value.geospatialCoordinatesVerified !== false
    || value.operatorVerificationStatus !== 'unverified' || value.verifiedBy !== null || value.editorialStatus !== 'referential') return false;
  if (!['attractions', 'activities', 'recommendations', 'conditions', 'activityConstraints', 'tags'].every(key => list(value[key]))) return false;
  const price = value.price;
  if (!['USD', 'EUR'].includes(String(price.currency)) || !['proposed', 'referential'].includes(String(price.type))
    || !nullableNumber(price.min) || !nullableNumber(price.max) || !text(price.originalLabel)
    || !['includes', 'excludes', 'assumptions'].every(key => list(price[key]))) return false;
  if (price.groupBreakdown !== undefined && (!Array.isArray(price.groupBreakdown) || !price.groupBreakdown.every(group => object(group) && typeof group.groupSize === 'number' && Number.isInteger(group.groupSize) && group.groupSize > 0 && typeof group.amountPerPerson === 'number' && nullableNumber(group.amountPerPerson)))) return false;
  if (price.separateCosts !== undefined && (!Array.isArray(price.separateCosts) || !price.separateCosts.every(cost => object(cost) && text(cost.concept) && text(cost.detail) && ['USD', 'EUR'].includes(String(cost.currency)) && nullableNumber(cost.min) && nullableNumber(cost.max) && cost.requiresRevalidation === true))) return false;
  if (price.options !== undefined && !boundedArray(price.options, option => object(option) && text(option.id) && text(option.label)
    && nullableNumber(option.min) && nullableNumber(option.max) && ['USD', 'EUR'].includes(String(option.currency))
    && ['per_person', 'per_person_per_day', 'per_night', 'per_trip', 'unknown'].includes(String(option.unit)) && nullableText(option.durationLabel) && text(option.notes))) return false;
  if (price.costBreakdown !== undefined && !boundedArray(price.costBreakdown, cost => object(cost) && text(cost.concept) && typeof cost.amount === 'number' && nullableNumber(cost.amount) && ['USD', 'EUR'].includes(String(cost.currency)) && text(cost.detail))) return false;
  if (value.locationInfo !== undefined && !validLocation(value.locationInfo)) return false;
  const duration = value.duration;
  if (!text(duration.label) || !['minHours', 'maxHours', 'days', 'nights'].every(key => nullableNumber(duration[key]))
    || !text(value.capacity.label) || !nullableNumber(value.capacity.max)) return false;
  if (!Array.isArray(value.warnings) || value.warnings.length > 300
    || !value.warnings.every(warning => object(warning) && text(warning.text) && warning.historical === true && (warning.asOf === null || date(warning.asOf)))) return false;
  if (!Array.isArray(value.itinerary) || value.itinerary.length > 300
    || !value.itinerary.every(step => object(step) && text(step.text) && (step.time === null || text(step.time)))) return false;
  if (!['confirmed_allowed', 'ask_conditions', 'not_allowed', 'unverified', 'prohibited_protected_area'].includes(String(value.petPolicy.status)) || !text(value.petPolicy.note) || !list(value.petPolicy.species) || !list(value.petPolicy.requirements)
    || !nullableText(value.petPolicy.maxSize) || !nullableNumber(value.petPolicy.maxCount) || !nullableText(value.petPolicy.confirmedBy)
    || !(value.petPolicy.confirmedAt === null || date(value.petPolicy.confirmedAt))
    || !(value.petPolicy.fee === null || object(value.petPolicy.fee) && typeof value.petPolicy.fee.amount === 'number' && nullableNumber(value.petPolicy.fee.amount) && ['USD', 'EUR'].includes(String(value.petPolicy.fee.currency)))) return false;
  if (!Array.isArray(value.connectivity) || !value.connectivity.every(tag => object(tag) && text(tag.id))) return false;
  if (value.weatherReference !== null && (!object(value.weatherReference) || !text(value.weatherReference.placeName)
    || typeof value.weatherReference.lat !== 'number' || !Number.isFinite(value.weatherReference.lat) || Math.abs(value.weatherReference.lat) > 90
    || typeof value.weatherReference.lon !== 'number' || !Number.isFinite(value.weatherReference.lon) || Math.abs(value.weatherReference.lon) > 180
    || value.weatherReference.precision !== 'locality_approx')) return false;
  if (!Array.isArray(value.media) || !value.media.every(media => object(media) && ['src', 'alt', 'credit', 'license'].every(key => text(media[key])) && typeof media.depictsThisPlace === 'boolean')) return false;
  return JSON.stringify(value).length < 500000;
}
function validRecord(value: unknown): value is DownloadRecord {
  return object(value) && value.schemaVersion === 1 && date(value.downloadedAt) && isDownloadedExperience(value.experience)
    && value.id === value.experience.id && typeof value.bytes === 'number' && Number.isFinite(value.bytes) && value.bytes > 0;
}
export async function saveExperienceOffline(experience: Experience): Promise<void> {
  // Only the public editorial catalog is eligible; no account, booking, chat or payment data.
  const canonical = getExperienceById(experience.id);
  if (!canonical || !isDownloadedExperience(canonical)) throw new Error('Esta ficha no se puede descargar. Vuelve al catálogo y reintenta.');
  const snapshot = JSON.parse(JSON.stringify(canonical)) as Experience;
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
  try {
    const db = await getDatabase();
    await db.put('experiences', { id: snapshot.id, schemaVersion: 1, downloadedAt: new Date().toISOString(), bytes, experience: snapshot });
  } catch {
    throw new Error('No se pudo guardar la ficha. Revisa el espacio disponible o los permisos de almacenamiento y reintenta.');
  }
  // Public-shell caching is best effort. A failed SW never turns a saved snapshot into a claim of offline startup.
  void preparePublicShell().catch(() => undefined);
}
export async function readOfflineLibrary(): Promise<OfflineLibrary> {
  const db = await getDatabase();
  const records: unknown[] = await db.getAll('experiences');
  const valid = records.filter(validRecord);
  return { experiences: valid.map(record => record.experience).sort((a, b) => a.title.localeCompare(b.title, 'es')),
    downloadedAt: valid.map(record => record.downloadedAt).sort().at(-1),
    bytes: valid.reduce((sum, record) => sum + record.bytes, 0), discardedRecords: records.length - valid.length };
}
export async function deleteOfflineExperience(id: string): Promise<void> { const db = await getDatabase(); await db.delete('experiences', id); }
export async function clearOfflineLibrary(): Promise<void> { const db = await getDatabase(); await db.clear('experiences'); }
