import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCatalog } from '../../scripts/build-catalog-seed.mjs';
import catalog from '../../src/domain/catalog/data.json';
import { canBookExperience, catalogSourceDownload, catalogSources, experiences, filterExperiences, formatExperiencePrice, getExperienceById } from '../../src/domain/catalog';
import { culturalEvents, eventStatus, filterCulturalEvents } from '../../src/domain/culture';
import { isDownloadedExperience } from '../../src/features/offline/library';

describe('ingestión fiel y no comercializable de los catálogos', () => {
  it('conserva las 33 fichas originales e incorpora 18 inspiraciones amazónicas con procedencia estable', () => {
    expect(experiences.filter(record => record.contentSourceId !== 'catalogo-amazonia-usuario')).toHaveLength(33);
    expect(experiences).toHaveLength(51);
    expect(new Set(experiences.map(record => record.id)).size).toBe(51);
    expect(new Set(experiences.map(record => record.slug)).size).toBe(51);
    for (const source of catalogSources) {
      const records = experiences.filter(record => record.contentSourceId === source.id);
      expect(records).toHaveLength(source.expectedCount);
      expect(records.map(record => record.sourceOrder)).toEqual(Array.from({ length: source.expectedCount }, (_, index) => index + 1));
      const original = readFileSync(resolve(source.originalDocument), 'utf8');
      expect(readFileSync(resolve('public' + catalogSourceDownload(source)), 'utf8')).toBe(original);
      records.forEach(record => {
        expect(original).toContain(record.sourceText);
        expect(record.description.length).toBeGreaterThan(60);
        expect(record.price.originalLabel).not.toBe('');
      });
    }
    expect(buildCatalog()).toEqual(catalog);
  });
  it('ninguna ficha editorial habilita una reserva, verificación ni coordenada contractual', () => {
    for (const record of experiences) {
      expect(record.bookingEnabled).toBe(false);
      expect(canBookExperience(record)).toBe(false);
      expect(record.operatorVerificationStatus).toBe('unverified');
      expect(record.verifiedBy).toBeNull();
      expect(record.editorialStatus).toBe('referential');
      expect(record.geospatialCoordinatesVerified).toBe(false);
      expect(record.accessStatus).not.toBe('open_reported');
    }
    expect(getExperienceById('no-existe')).toBeUndefined();
  });
  it('preserva las siete tarifas propuestas de Costa y su programa, exclusiones y condiciones', () => {
    const coast = experiences.filter(record => record.contentSourceId === 'catalogo-costa-7');
    expect(coast.map(record => record.price.min)).toEqual([25, 39, 49, 39, 49, 69, 59]);
    coast.forEach(record => {
      expect(record.price.type).toBe('proposed');
      expect(record.price.includes.length).toBeGreaterThanOrEqual(5);
      expect(record.price.excludes.join(' ')).toMatch(/transporte|traslado|desplazamiento/i);
      expect(record.itinerary.length).toBeGreaterThanOrEqual(5);
      expect(record.meetingPoint).toBeTruthy();
      expect(record.context).toBeTruthy();
      expect(record.conditions.join(' ')).toMatch(/confirmaci[oó]n/i);
    });
  });
  it('conserva euros y rangos; un filtro USD no convierte ni mezcla EUR', () => {
    const euro = experiences.filter(record => record.price.currency === 'EUR');
    expect(euro.map(record => record.price.min)).toEqual([46.4, 56]);
    expect(euro.map(record => record.price.max)).toEqual([null, null]);
    expect(formatExperiencePrice(euro[0])).toMatch(/EUR.*46,40/);
    expect(filterExperiences({ maxPrice: 60 })).toEqual([]);
    expect(filterExperiences({ maxPrice: 60, currency: 'USD' }).every(record => record.price.currency === 'USD')).toBe(true);
    const galapagos = experiences.filter(record => record.contentSourceId === 'catalogo-galapagos-12');
    expect(galapagos.slice(0, 2).map(record => [record.price.min, record.price.max])).toEqual([[270, 315], [300, 315]]);
    expect(galapagos[8].price.groupBreakdown).toEqual([
      { groupSize: 2, amountPerPerson: 1135 }, { groupSize: 3, amountPerPerson: 1010 },
      { groupSize: 4, amountPerPerson: 915 }, { groupSize: 5, amountPerPerson: 880 }, { groupSize: 6, amountPerPerson: 855 },
    ]);
    expect(galapagos.slice(10).map(record => record.kind)).toEqual(['trip_plan', 'trip_plan']);
    expect(galapagos.slice(10).map(record => record.price.min)).toEqual([510, 1193]);
    galapagos.forEach(record => {
      expect(record.price.separateCosts?.some(cost => /vuelo/i.test(cost.concept))).toBe(true);
      expect(record.price.separateCosts?.every(cost => cost.requiresRevalidation)).toBe(true);
      expect(record.warnings.length).toBeGreaterThan(0);
      expect(record.warnings.every(warning => warning.historical)).toBe(true);
    });
  });
  it('permite buscar sin tildes y conserva la asignación territorial de Oyacachi y Chocó Andino', () => {
    expect(filterExperiences({ query: 'saraguro' })).toHaveLength(1);
    expect(filterExperiences({ query: 'mompiche', region: 'costa' })).toHaveLength(1);
    expect(filterExperiences({ query: 'oyacachi', region: 'amazonia' })).toHaveLength(1);
    expect(filterExperiences({ query: 'mindo', region: 'sierra' })).toHaveLength(1);
    expect(filterExperiences({ region: 'galapagos' })).toHaveLength(12);
    expect(filterExperiences({ maxDays: 1 }).some(record => record.duration.days === 2)).toBe(false);
  });
});

describe('Amazonía aportada por el usuario sin confundir precios ni ubicaciones', () => {
  const amazon = experiences.filter(record => record.contentSourceId === 'catalogo-amazonia-usuario');
  const named = (name: string) => amazon.find(record => record.title === name)!;
  it('incluye 18 nombres separados en las seis provincias y admite descargar las nuevas fuentes', () => {
    expect(amazon).toHaveLength(18);
    expect(new Set(amazon.map(record => record.province))).toEqual(new Set(['Sucumbíos', 'Napo', 'Orellana', 'Pastaza', 'Morona Santiago', 'Zamora Chinchipe']));
    expect(amazon.every(record => record.localizedRegion === 'amazonia' && isDownloadedExperience(record))).toBe(true);
    expect(amazon.every(record => record.locationInfo?.accessSummary && record.locationInfo.transportOptions.length)).toBe(true);
    expect(amazon.every(record => record.conditions.join(' ').includes('consentimiento'))).toBe(true);
  });
  it('conserva los tres programas de Cuyabeno y no suma de nuevo una entrada posiblemente incluida', () => {
    const cuyabeno = named('Reserva Cuyabeno');
    expect(cuyabeno.price.options?.map(option => [option.id, option.min, option.max])).toEqual([
      ['3d', 239, 419], ['4d', 279, 499], ['5d', 349, 579], ['entrada', 5, 15],
    ]);
    expect(cuyabeno.price.options?.find(option => option.id === 'entrada')?.notes).toMatch(/No sumar/);
    expect(cuyabeno.locationInfo?.transportOptions.map(option => option.durationLabel)).toEqual(['8–10 h', '1,5–2,5 h', '1–2 h', null]);
    expect(cuyabeno.price.min).toBe(239);
  });
  it('separa habitación por noche, tours por persona y transportes con base desconocida', () => {
    const misahualli = named('Puerto Misahuallí');
    expect(misahualli.price.options?.find(option => option.id === 'alojamiento')).toMatchObject({ min: 15, max: 40, unit: 'per_night' });
    expect(misahualli.price.min).toBe(40);
    const panacocha = named('Laguna Pañacocha');
    expect(panacocha.price.min).toBeNull();
    expect(panacocha.price.options?.[0]).toMatchObject({ min: 50, max: 120, unit: 'unknown' });
    const yasuni = named('Parque Nacional Yasuní');
    expect(yasuni.price.min).toBe(1635);
    expect(yasuni.price.options?.find(option => option.id === 'otros')).toMatchObject({ min: 400, max: 900, unit: 'unknown' });
    expect(yasuni.locationInfo?.transportOptions[0].priceLabel).toContain('ida y vuelta');
  });
  it('mantiene el extremo abierto 400+ de Tayos y no fabrica una cotización de El Quimi', () => {
    expect(named('Cueva de los Tayos').price).toMatchObject({ min: 150, max: null });
    expect(named('Cueva de los Tayos').price.options?.[0].notes).toContain('puede superar USD 400');
    expect(named('Reserva Biológica El Quimi').price.min).toBeNull();
    expect(named('Reserva Biológica El Quimi').locationInfo?.accessSummary).toContain('No se ofrece una ruta abierta');
  });
  it('un nombre no identificado no recibe un pin preciso y cada referencia de mapa tiene fuente', () => {
    for (const title of ['Torre Amani', 'Cueva del Duende', 'Laguna Taracoa', 'Laguna Añango', 'Laguna Ila Kucha', 'Mirador de Shinguipata']) {
      expect(named(title).locationInfo?.approximatePoint).toBeUndefined();
      expect(named(title).activityConstraints[0]).toMatch(/pendiente de verificación/);
    }
    const points = amazon.flatMap(record => record.locationInfo?.approximatePoint ? [record.locationInfo.approximatePoint] : []);
    expect(points).toHaveLength(2);
    points.forEach(point => {
      expect(point.scope).toBe('locality_reference');
      expect(point.sourceUrl).toMatch(/^https:\/\//);
      expect(point.checkedAt).toBe('2026-11-13');
    });
  });
});

describe('Cultura Viva sin fechas comerciales inventadas', () => {
  it('presenta diez referencias y mantiene Kasama en Costa y Loja en Sierra', () => {
    expect(culturalEvents).toHaveLength(10);
    expect(filterCulturalEvents({ query: 'kasama', region: 'costa' })).toHaveLength(1);
    expect(filterCulturalEvents({ query: 'artes vivas', region: 'sierra' })).toHaveLength(1);
    expect(filterCulturalEvents({ month: 6 }).length).toBeGreaterThan(0);
    expect(culturalEvents.filter(event => event.category === 'raymi').map(event => event.id)).toEqual(['inti-raymi']);
  });
  it('un mes habitual nunca se muestra como próxima edición confirmada', () => {
    const undatedEvents = culturalEvents.filter(event => !event.editions.some(edition => edition.confirmation === 'confirmed_official'));
    expect(undatedEvents.length).toBeGreaterThan(0);
    undatedEvents.forEach(event => {
      expect(eventStatus(event, new Date('2026-11-12T12:00:00Z')).upcoming).toBe(false);
      expect(eventStatus(event, new Date('2027-01-01T12:00:00Z')).upcoming).toBe(false);
      expect(event.editions.every(edition => edition.startDate === null && edition.endDate === null)).toBe(true);
    });
  });
  it('una edición fechada necesita procedencia y deja de ser próxima cuando empieza o termina', () => {
    const loja = culturalEvents.find(event => event.id === 'artes-vivas-loja')!;
    expect(loja.editions[0]).toMatchObject({ confirmation: 'confirmed_official', startDate: '2026-11-12', endDate: '2026-11-22' });
    expect(loja.editions[0].sourceUrl).toMatch(/^https:\/\//);
    expect(eventStatus(loja, new Date('2026-11-11T17:00:00Z')).upcoming).toBe(true);
    expect(eventStatus(loja, new Date('2026-11-12T17:00:00Z')).upcoming).toBe(false);
    expect(eventStatus(loja, new Date('2027-01-01T17:00:00Z'))).toMatchObject({ upcoming: false, label: expect.stringContaining('finalizada') });
  });
});
