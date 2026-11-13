import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { openDB } from 'idb';
import { experiences } from '../../src/domain/catalog';
import { clearOfflineLibrary, deleteOfflineExperience, isDownloadedExperience, OFFLINE_DB_NAME, readOfflineLibrary, saveExperienceOffline } from '../../src/features/offline/library';

beforeEach(async () => { await clearOfflineLibrary(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('biblioteca pública descargada', () => {
  it('guarda una instantánea estructurada con fecha, versión y tamaño y conserva los euros', async () => {
    const record = experiences.find(experience => experience.price.currency === 'EUR')!;
    await saveExperienceOffline(record);
    const saved = await readOfflineLibrary();
    expect(saved.experiences).toEqual([record]);
    expect(saved.experiences[0]).not.toBe(record);
    expect(saved.experiences[0].price.currency).toBe('EUR');
    expect(saved.experiences[0].bookingEnabled).toBe(false);
    expect(saved.bytes).toBeGreaterThan(100);
    expect(Number.isFinite(Date.parse(saved.downloadedAt!))).toBe(true);
    expect(saved.discardedRecords).toBe(0);
  });
  it('descargar dos veces actualiza la ficha sin duplicarla y permite borrar una o todas', async () => {
    await saveExperienceOffline(experiences[0]);
    await saveExperienceOffline(experiences[0]);
    await saveExperienceOffline(experiences[1]);
    expect((await readOfflineLibrary()).experiences).toHaveLength(2);
    await deleteOfflineExperience(experiences[0].id);
    expect((await readOfflineLibrary()).experiences.map(experience => experience.id)).toEqual([experiences[1].id]);
    await clearOfflineLibrary();
    expect(await readOfflineLibrary()).toEqual({ experiences: [], downloadedAt: undefined, bytes: 0, discardedRecords: 0 });
  });
  it('omite datos dañados sin borrar ni ocultar descargas válidas', async () => {
    await saveExperienceOffline(experiences[0]);
    const db = await openDB(OFFLINE_DB_NAME, 1);
    await db.put('experiences', { id: 'corrupto', schemaVersion: 1, downloadedAt: 'ayer', bytes: 1, experience: {} });
    db.close();
    const result = await readOfflineLibrary();
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0].id).toBe(experiences[0].id);
    expect(result.discardedRecords).toBe(1);
  });
  it('rechaza estructuras que romperían detalle, precios o acceso a mascotas', () => {
    expect(experiences.every(isDownloadedExperience)).toBe(true);
    expect(isDownloadedExperience({ ...experiences[0], price: { ...experiences[0].price, separateCosts: 'datos rotos' } })).toBe(false);
    expect(isDownloadedExperience({ ...experiences[0], bookingEnabled: true })).toBe(false);
    expect(isDownloadedExperience({ ...experiences[0], petPolicy: null })).toBe(false);
    expect(isDownloadedExperience({ ...experiences[0], warnings: [{ text: 'Sin fecha' }] })).toBe(false);
  });
  it('rechaza opciones, desgloses y ubicaciones anidados dañados antes de mostrarlos', () => {
    const record = experiences[0];
    expect(isDownloadedExperience({ ...record, price: { ...record.price, options: 'datos rotos' } })).toBe(false);
    expect(isDownloadedExperience({ ...record, price: { ...record.price, options: [{ id: 'sin-importes' }] } })).toBe(false);
    expect(isDownloadedExperience({ ...record, price: { ...record.price, costBreakdown: [{ concept: 'Guía', amount: null, currency: 'USD', detail: 'Sin importe' }] } })).toBe(false);
    expect(isDownloadedExperience({ ...record, locationInfo: { accessSummary: 'Acceso', transportOptions: 'datos rotos', references: [] } })).toBe(false);
    expect(isDownloadedExperience({ ...record, locationInfo: { accessSummary: 'Acceso', transportOptions: [], references: [{ title: 'Fuente', url: 'javascript:alert(1)', checkedAt: '2026-11-13' }] } })).toBe(false);
    expect(isDownloadedExperience({ ...record, locationInfo: { accessSummary: 'Acceso', transportOptions: [], references: [], approximatePoint: { lat: 'quito' } } })).toBe(false);
  });
  it('una ficha privada o inexistente no entra en la biblioteca pública', async () => {
    await expect(saveExperienceOffline({ ...experiences[0], id: 'private-reservation' })).rejects.toThrow(/no se puede descargar/);
    expect((await readOfflineLibrary()).experiences).toHaveLength(0);
  });
  it('indica error real cuando el almacenamiento no está disponible', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(readOfflineLibrary()).rejects.toThrow(/no permite guardar/);
    await expect(saveExperienceOffline(experiences[0])).rejects.toThrow(/No se pudo guardar/);
  });
});
