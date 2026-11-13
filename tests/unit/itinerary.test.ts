import { describe, expect, it } from 'vitest';
import { experiences } from '../../src/domain/catalog';
import { exportJourney, isJourney, newJourney, summarizeJourney } from '../../src/domain/itinerary';

describe('borrador personal de viaje', () => {
  it('separa la base conocida del coste total y no suma EUR', () => {
    const usd = experiences.find(item => item.price.currency === 'USD' && item.price.max !== null)!;
    const eur = experiences.find(item => item.price.currency === 'EUR')!;
    const draft = { ...newJourney(), people: 2, budget: 1, stops: [usd.id, eur.id] };
    const result = summarizeJourney(draft, experiences);
    expect(result.experienceBase).toBe(usd.price.max! * 2);
    expect(result.missingPrice).toBe(true);
    expect(result.exceedsBudget).toBe(true);
    expect(result.totalConfirmed).toBe(false);
  });
  it('rechaza cantidades, paradas repetidas y listas corrompidas', () => {
    expect(isJourney(newJourney())).toBe(true);
    expect(isJourney({ ...newJourney(), stops: ['x', 'x'] })).toBe(false);
    expect(isJourney({ ...newJourney(), people: 0 })).toBe(false);
    expect(isJourney({ ...newJourney(), checked: ['inventado'] })).toBe(false);
    expect(isJourney({ ...newJourney(), notes: 'a'.repeat(2001) })).toBe(false);
  });
  it('rechaza fechas imposibles y conserva los días bisiestos válidos', () => {
    expect(isJourney({ ...newJourney(), date: '2026-02-31' })).toBe(false);
    expect(isJourney({ ...newJourney(), date: '2026-02-29' })).toBe(false);
    expect(isJourney({ ...newJourney(), date: '2028-02-29' })).toBe(true);
    expect(isJourney({ ...newJourney(), date: '2026-04-31' })).toBe(false);
  });
  it('exporta procedencia, exclusiones y notas como texto sin confirmar reservas', () => {
    const record = experiences[0];
    const text = exportJourney({ ...newJourney(), stops: [record.id], notes: '<script>literal</script>' }, experiences);
    expect(text).toContain(record.originalDocument);
    expect(text).toContain('No es una reserva');
    expect(text).toContain('<script>literal</script>');
    expect(text).toContain('El total del viaje no está confirmado');
  });
});
