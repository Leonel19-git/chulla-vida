import { describe, expect, it } from 'vitest';
import { experiences, type Experience } from '../../src/domain/catalog';
import { evaluateOption, petAdmission, planItinerary, proposeReplacements, type TravelConstraints } from '../../src/domain/planner';

const base = (changes: Partial<Experience> = {}): Experience => ({ ...experiences[0], id: 'local-quito', title: 'Quito', province: 'Pichincha', locality: 'Quito',
  duration: { label: '4 horas', minHours: 4, maxHours: 4, days: 1, nights: 0 }, accessStatus: 'unknown',
  price: { ...experiences[0].price, currency: 'USD', min: 8, max: 8 }, ...changes });
const input: TravelConstraints = { origin: 'Quito', budgetTotal: 20, people: 1, maxHours: 8 };
describe('Chulla Flex, presupuesto y mascotas', () => {
  it('Quito con $20 propone ideas locales pero no presenta el coste base como viaje completo', () => {
    const option = evaluateOption(base(), input);
    expect(option.classification).toBe('posiblemente_viable');
    expect(option.experienceSubtotal).toBe(8);
    expect(option.totalEstimate).toBeNull();
    expect(option.missingCosts).toContain('transport');
    expect(option.bookingEnabled).toBe(false);
    expect(planItinerary(input, [base({ id: 'other', title: 'Cuenca', locality: 'Cuenca', province: 'Azuay' }), base()])[0].experience.id).toBe('local-quito');
    expect(planItinerary(input, [base({ id: 'title-only', title: 'Ruta Quito y Cuenca', locality: 'Cuenca', province: 'Azuay' }), base()])[0].experience.id).toBe('local-quito');
  });
  it('no convierte EUR y no presenta Galápagos con $20 como viable', () => {
    expect(evaluateOption(base({ price: { ...base().price, currency: 'EUR' } }), input)).toMatchObject({ classification: 'sin_datos_suficientes', experienceSubtotal: null });
    expect(evaluateOption(base({ localizedRegion: 'galapagos' }), input).classification).toBe('supera_presupuesto');
  });
  it('«desde» sin máximo no produce un total confirmado aunque se completen extras', () => {
    const knownCosts = (['transport', 'food', 'fees', 'contingency'] as const).map(kind => ({ kind, amount: 0, source: 'Supuesto de prueba explícito' }));
    const option = evaluateOption(base({ price: { ...base().price, max: null } }), { ...input, knownCosts });
    expect(option.totalEstimate).toBeNull(); expect(option.classification).toBe('posiblemente_viable');
  });
  it('rechaza mascotas sin política confirmada y acceso a zonas protegidas', () => {
    const pet = { species: 'perro', count: 1 };
    expect(petAdmission(base(), pet).allowed).toBe(false);
    const accepted = { ...base().petPolicy, status: 'confirmed_allowed' as const, species: ['perro'], confirmedBy: 'Anfitrión de prueba', confirmedAt: '2026-11-12', maxCount: 1 };
    expect(petAdmission(base({ petPolicy: accepted }), pet).allowed).toBe(true);
    expect(petAdmission(base({ petPolicy: accepted, localizedRegion: 'galapagos' }), pet).allowed).toBe(false);
    expect(petAdmission(base({ petPolicy: accepted }), { ...pet, count: 2 }).allowed).toBe(false);
  });
  it('Flex solo propone, etiqueta simulación y excluye cierres, EUR y costes fuera de presupuesto', () => {
    const catalog = [base(), base({ id: 'allowed' }), base({ id: 'closed', accessStatus: 'closed_reported' }),
      base({ id: 'expensive', price: { ...base().price, min: 100, max: 100 } }), base({ id: 'euros', price: { ...base().price, currency: 'EUR' } })];
    const proposal = proposeReplacements('local-quito', input, { kind: 'site_closed', affectedExperienceIds: ['local-quito'], reliability: 'unknown', simulation: true, source: null, issuedAt: '2026-11-12T12:00:00Z', expiresAt: '2026-11-13T12:00:00Z' }, catalog, new Date('2026-11-12T13:00:00Z'));
    expect(proposal.mode).toBe('simulation'); expect(proposal.changedReservation).toBe(false); expect(proposal.needsConfirmation).toBe(true);
    expect(proposal.options.map(option => option.experience.id)).toEqual(['allowed']);
    expect(proposal.notice).toContain('SIMULACIÓN');
  });
  it('no considera un cierre vencido como aviso actual', () => {
    const proposal = proposeReplacements('local-quito', input, { kind: 'road_closure', affectedExperienceIds: [], reliability: 'official_verified', simulation: false, source: 'https://example.test/alert', issuedAt: '2026-10-01T12:00:00Z', expiresAt: '2026-10-02T12:00:00Z' }, [base()], new Date('2026-11-12T12:00:00Z'));
    expect(proposal.notice).toContain('no verificado o vencido'); expect(proposal.changedReservation).toBe(false);
  });
  it('excluye actividades de dos días aunque la fuente no tenga duración en horas', () => {
    const option = evaluateOption(base({ duration: { label: '2 días', minHours: null, maxHours: null, days: 2, nights: null } }), { ...input, maxHours: 24 });
    expect(option.fitsKnownConstraints).toBe(false);
    expect(option.reasons.join(' ')).toContain('excede el tiempo disponible');
    expect(evaluateOption(base({ accessStatus: 'closed_reported' }), input).fitsKnownConstraints).toBe(false);
  });
  it('valida límites de personas, presupuesto, mascotas y noches', () => {
    expect(() => evaluateOption(base(), { ...input, people: 0 })).toThrow();
    expect(() => evaluateOption(base(), { ...input, budgetTotal: NaN })).toThrow();
    expect(() => evaluateOption(base(), { ...input, pet: { species: 'perro', count: -1 } })).toThrow();
    expect(() => evaluateOption(base(), { ...input, nights: -1 })).toThrow();
  });
});
