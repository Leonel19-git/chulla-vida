import { describe, expect, it } from 'vitest';
import { ALBUM_EXPERIENCES, ALBUM_TOTAL, albumNumber, albumPage, experienceByAlbumNumber } from '../../src/domain/album';
import { freshSlotKeys, passportSlots, slotCounts, slotStampKey, slotsByRegion, slotsInRange } from '../../src/domain/passport/slots';
import { collectStamps, freshStampKeys, type WalletStampInput } from '../../src/domain/passport/stamps';

const cromo = (number: number) => experienceByAlbumNumber(number)!;
const slotOf = (slots: ReturnType<typeof passportSlots>, number: number) => slots.find(slot => slot.number === number)!;
const purchase = (number: number, code: string, status = 'test_approved', kind = 'test_purchase'): WalletStampInput =>
  ({ experienceId: cromo(number).id, title: cromo(number).title, code, kind, status, updatedAt: '2026-11-14T12:00:00Z' });

describe('casillas del pasaporte (01–51)', () => {
  it('devuelve las 51 casillas en orden de álbum con la numeración de src/domain/album', () => {
    const slots = passportSlots();
    expect(slots).toHaveLength(ALBUM_TOTAL);
    expect(ALBUM_TOTAL).toBe(51);
    expect(slots.map(slot => slot.number)).toEqual(Array.from({ length: 51 }, (_, index) => index + 1));
    for (const slot of slots) {
      expect(albumNumber(slot.experienceId)).toBe(slot.number);
      expect(slot.label).toMatch(/^\d{2}$/);
      expect(slot.estado).toBe('album');
    }
    expect(slotOf(slots, 2).label).toBe('02');
    expect(slots.map(slot => slot.experienceId)).toEqual(ALBUM_EXPERIENCES.map(experience => experience.id));
  });

  it('cada fuente da su estado', () => {
    const slots = passportSlots({
      serverStamps: [{ id: 's1', experience_id: cromo(2).id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-08T16:00:00Z' }],
      demoValidations: [{ code: 'PRB-ABC123', experienceId: cromo(15).id, title: cromo(15).title, region: 'costa', validatedAt: '2026-11-12T00:00:00Z', mode: 'demo' }],
      wallet: [purchase(4, 'PRB-K7Q2MX'), purchase(23, 'PRB-TR4NSF', 'test_transfer_review')],
      savedIds: [cromo(8).id], tripIds: [cromo(27).id], exploredIds: [cromo(3).id],
    });
    expect(slotOf(slots, 2)).toMatchObject({ estado: 'pegado', fecha: '2026-11-08T16:00:00Z' });
    expect(slotOf(slots, 2).demo).toBeUndefined();
    expect(slotOf(slots, 15)).toMatchObject({ estado: 'pegado_demo', demo: true, fecha: '2026-11-12T00:00:00Z' });
    expect(slotOf(slots, 4)).toMatchObject({ estado: 'comprado', prueba: true, fecha: '2026-11-14T12:00:00Z' });
    expect(slotOf(slots, 23)).toMatchObject({ estado: 'comprado', prueba: true, revision: true });
    expect(slotOf(slots, 8).estado).toBe('en_sobre');
    expect(slotOf(slots, 27).estado).toBe('en_sobre');
    expect(slotOf(slots, 3).estado).toBe('visto');
    expect(slotOf(slots, 5).estado).toBe('album');
  });

  it('gana el estado más avanzado y se conservan todos los que aplican', () => {
    const id = cromo(10).id;
    const base = { savedIds: [id], exploredIds: [id] };
    expect(slotOf(passportSlots(base), 10).estado).toBe('en_sobre');
    expect(slotOf(passportSlots({ ...base, wallet: [purchase(10, 'PRB-AAAAAA')] }), 10).estado).toBe('comprado');
    const demo = { ...base, wallet: [purchase(10, 'PRB-AAAAAA')], demoValidations: [{ code: 'PRB-AAAAAA', experienceId: id, title: 'X', region: 'sierra' as const, validatedAt: '2026-11-12T00:00:00Z', mode: 'demo' as const }] };
    expect(slotOf(passportSlots(demo), 10)).toMatchObject({ estado: 'pegado_demo', estados: ['pegado_demo', 'comprado', 'en_sobre', 'visto'] });
    const verified = { ...demo, serverStamps: [{ id: 'v', experience_id: id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-13T00:00:00Z' }] };
    expect(slotOf(passportSlots(verified), 10)).toMatchObject({ estado: 'pegado', estados: ['pegado', 'pegado_demo', 'comprado', 'en_sobre', 'visto'] });
  });

  it('un sello demo NUNCA da «pegado», ni aunque alguien manipule el modo', () => {
    const all = ALBUM_EXPERIENCES.map(experience => ({ code: 'PRB-ABC123', experienceId: experience.id, title: experience.title, region: experience.localizedRegion, validatedAt: '2026-11-12T00:00:00Z', mode: 'demo' as const }));
    const slots = passportSlots({ demoValidations: all });
    expect(slots.every(slot => slot.estado === 'pegado_demo' && slot.demo)).toBe(true);
    expect(slotCounts(slots)).toMatchObject({ pegado: 0, pegado_demo: 51 });
    const forged = [{ ...all[0]!, mode: 'verified' as unknown as 'demo' }];
    expect(slotOf(passportSlots({ demoValidations: forged }), 1).estado).toBe('album');
  });

  it('del servidor solo cuenta verified_visit; self_reported, pending_sync o fechas inválidas no pegan nada', () => {
    const slots = passportSlots({ serverStamps: [
      { id: 'a', experience_id: cromo(1).id, region_id: 'sierra', stamp_type: 'self_reported', awarded_at: '2026-11-10T00:00:00Z' },
      { id: 'b', experience_id: cromo(2).id, region_id: 'sierra', stamp_type: 'pending_sync', awarded_at: '2026-11-10T00:00:00Z' },
      { id: 'c', experience_id: cromo(3).id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: 'ayer' },
      { id: 'd', experience_id: null, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-10T00:00:00Z' },
      { id: 'e', experience_id: 'no-existe', region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-10T00:00:00Z' },
    ] });
    expect(slotCounts(slots).pegado).toBe(0);
    expect(slotCounts(slots).album).toBe(51);
  });

  it('abrir una ficha nunca da más que «visto»', () => {
    const slots = passportSlots({ exploredIds: ALBUM_EXPERIENCES.map(experience => experience.id) });
    expect(new Set(slots.map(slot => slot.estado))).toEqual(new Set(['visto']));
    expect(slotCounts(slots)).toMatchObject({ visto: 51, pegado: 0, pegado_demo: 0, comprado: 0 });
  });

  it('la billetera solo aparta con compras de prueba aprobadas o en revisión (no pendientes, rechazadas, canceladas ni cotizaciones)', () => {
    const slots = passportSlots({ wallet: [
      purchase(1, 'PRB-AAAAAA', 'test_pending'), purchase(2, 'PRB-BBBBBB', 'test_rejected'), purchase(3, 'PRB-CCCCCC', 'test_transfer_rejected'),
      purchase(4, 'PRB-DDDDDD', 'cancelled'), purchase(5, 'PRB-EEEEEE', 'requested', 'request'), purchase(6, 'PRB-FFFFFF'),
    ] });
    expect([1, 2, 3, 4, 5].map(number => slotOf(slots, number).estado)).toEqual(['album', 'album', 'album', 'album', 'album']);
    expect(slotOf(slots, 6).estado).toBe('comprado');
  });

  it('los totales cuadran a 51 y el resumen por región respeta los rangos 01–13, 14–20, 21–39 y 40–51', () => {
    const slots = passportSlots({
      serverStamps: [{ id: 's', experience_id: cromo(41).id, region_id: 'galapagos', stamp_type: 'verified_visit', awarded_at: '2026-09-02T00:00:00Z' }],
      wallet: [purchase(4, 'PRB-AAAAAA')], savedIds: [cromo(16).id, cromo(30).id], exploredIds: [cromo(22).id, cromo(9).id],
    });
    const counts = slotCounts(slots);
    expect(counts.pegado + counts.pegado_demo + counts.comprado + counts.en_sobre + counts.visto + counts.album).toBe(51);
    expect(counts).toEqual({ total: 51, pegado: 1, pegado_demo: 0, comprado: 1, en_sobre: 2, visto: 2, album: 45 });
    const regions = slotsByRegion(slots);
    expect(regions.map(region => [region.region, region.first, region.last, region.counts.total])).toEqual([
      ['sierra', 1, 13, 13], ['costa', 14, 20, 7], ['amazonia', 21, 39, 19], ['galapagos', 40, 51, 12],
    ]);
    expect(regions.reduce((sum, region) => sum + region.counts.total, 0)).toBe(51);
    expect(regions[3]!.counts.pegado).toBe(1);
    const amazonia = albumPage('amazonia');
    expect(slotsInRange(slots, amazonia.first, amazonia.last)).toHaveLength(19);
  });

  it('el golpe de sello es solo para lo nuevo, con las mismas claves que collectStamps', () => {
    const sources = { wallet: [purchase(4, 'PRB-AAAAAA')], savedIds: [cromo(1).id], exploredIds: [cromo(3).id] };
    const slots = passportSlots(sources);
    expect(slotStampKey(slotOf(slots, 4))).toBe(`${cromo(4).id}:purchased`);
    expect(slotStampKey(slotOf(slots, 3))).toBeNull();
    expect(freshSlotKeys(slots, [])).toEqual([`${cromo(1).id}:planned`, `${cromo(4).id}:purchased`]);
    expect(freshSlotKeys(slots, [`${cromo(1).id}:planned`])).toEqual([`${cromo(4).id}:purchased`]);
    const stamps = collectStamps({ destinations: ALBUM_EXPERIENCES, ...sources });
    expect(new Set(freshStampKeys(stamps, []))).toEqual(new Set(freshSlotKeys(slots, [])));
  });
});
