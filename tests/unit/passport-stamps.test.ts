import { describe, expect, it } from 'vitest';
import {
  STAMP_META, collectStamps, freshStampKeys, isVerifiedStamp, normalizeReceiptCode, passportAchievements, readDemoValidations, regionProgress,
  saveDemoValidations, validateDemoReceipt, verifiedVisitCount, type StampDestination, type WalletStampInput,
} from '../../src/domain/passport/stamps';

const destinations: StampDestination[] = [
  { id: 'quilotoa', title: 'Laguna Quilotoa', localizedRegion: 'sierra' },
  { id: 'montanita', title: 'Montañita', localizedRegion: 'costa' },
  { id: 'cuyabeno', title: 'Cuyabeno', localizedRegion: 'amazonia' },
  { id: 'tortuga', title: 'Bahía Tortuga', localizedRegion: 'galapagos' },
  { id: 'otavalo', title: 'Otavalo', localizedRegion: 'sierra' },
];
const purchase = (experienceId: string, code: string, status = 'test_approved'): WalletStampInput =>
  ({ experienceId, title: destinations.find(item => item.id === experienceId)?.title ?? experienceId, code, kind: 'test_purchase', status, updatedAt: '2026-11-14T12:00:00Z' });

describe('sellos por fuente', () => {
  it('cada fuente produce su propio estado y la más fuerte gana por lugar', () => {
    const stamps = collectStamps({
      destinations,
      serverStamps: [{ id: 's1', experience_id: 'quilotoa', region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-10T00:00:00Z' }],
      demoValidations: [{ code: 'PRB-ABC123', experienceId: 'montanita', title: 'Montañita', region: 'costa', validatedAt: '2026-11-12T00:00:00Z', mode: 'demo' }],
      wallet: [purchase('cuyabeno', 'PRB-XYZ789'), purchase('montanita', 'PRB-ABC123')],
      savedIds: ['tortuga', 'quilotoa'], exploredIds: ['otavalo', 'tortuga'],
    });
    const source = (id: string) => stamps.find(stamp => stamp.experienceId === id)?.source;
    expect(source('quilotoa')).toBe('verified_visit');
    expect(source('montanita')).toBe('demo_validated');
    expect(source('cuyabeno')).toBe('purchased');
    expect(source('tortuga')).toBe('planned');
    expect(source('otavalo')).toBe('explored');
    expect(stamps.find(stamp => stamp.experienceId === 'montanita')?.sources).toEqual(['demo_validated', 'purchased']);
    expect(new Set(stamps.map(stamp => STAMP_META[stamp.source].label)).size).toBe(5);
  });

  it('un sello demo nunca cuenta como verificado, ni en el total ni en los logros verificados', () => {
    const stamps = collectStamps({ destinations, demoValidations: destinations.map(item => ({ code: 'PRB-ABC123', experienceId: item.id, title: item.title, region: item.localizedRegion, validatedAt: '2026-11-12T00:00:00Z', mode: 'demo' as const })) });
    expect(stamps.every(stamp => stamp.source === 'demo_validated')).toBe(true);
    expect(stamps.some(isVerifiedStamp)).toBe(false);
    expect(verifiedVisitCount(stamps)).toBe(0);
    const achievements = passportAchievements(stamps);
    expect(achievements.filter(item => item.basis === 'verified').every(item => !item.earned)).toBe(true);
    expect(achievements.find(item => item.id === 'ensayo-general')).toMatchObject({ earned: true, basis: 'demo' });
    expect(achievements.find(item => item.id === 'cuatro-mundos')?.earned).toBe(true);
    expect(regionProgress(stamps, destinations).every(region => region.verified === 0)).toBe(true);
  });

  it('del servidor solo acepta filas verified_visit; self_reported o pending_sync no se convierten en visita', () => {
    const stamps = collectStamps({ destinations, serverStamps: [
      { id: 'a', experience_id: 'quilotoa', region_id: 'sierra', stamp_type: 'self_reported', awarded_at: '2026-11-10T00:00:00Z' },
      { id: 'b', experience_id: 'cuyabeno', region_id: 'amazonia', stamp_type: 'pending_sync', awarded_at: '2026-11-10T00:00:00Z' },
    ] });
    expect(stamps).toEqual([]);
  });

  it('ignora compras rechazadas o canceladas y solicitudes de cotización', () => {
    const stamps = collectStamps({ destinations, wallet: [purchase('quilotoa', 'PRB-AAAAAA', 'test_rejected'), { ...purchase('cuyabeno', 'PRB-BBBBBB'), kind: 'request', status: 'requested' }] });
    expect(stamps).toEqual([]);
  });

  it('progreso por las cuatro regiones', () => {
    const stamps = collectStamps({ destinations, savedIds: ['quilotoa', 'otavalo'], wallet: [purchase('tortuga', 'PRB-CCCCCC')] });
    const progress = regionProgress(stamps, destinations);
    expect(progress.map(item => item.region)).toEqual(['sierra', 'costa', 'amazonia', 'galapagos']);
    expect(progress[0]).toMatchObject({ total: 2, planned: 2, touched: 2 });
    expect(progress[3]).toMatchObject({ total: 1, purchased: 1 });
  });

  it('el golpe de sello se da una vez por sello nuevo y no por exploraciones', () => {
    const stamps = collectStamps({ destinations, savedIds: ['quilotoa'], exploredIds: ['otavalo'] });
    expect(freshStampKeys(stamps, [])).toEqual(['quilotoa:planned']);
    expect(freshStampKeys(stamps, ['quilotoa:planned'])).toEqual([]);
    const upgraded = collectStamps({ destinations, savedIds: ['quilotoa'], wallet: [purchase('quilotoa', 'PRB-DDDDDD')] });
    expect(freshStampKeys(upgraded, ['quilotoa:planned'])).toEqual(['quilotoa:purchased']);
  });
});

describe('validación demo con el código del comprobante de prueba', () => {
  const regionOf = (id: string) => destinations.find(item => item.id === id)?.localizedRegion ?? null;
  it('normaliza el código y solo acepta los de la billetera, una vez', () => {
    expect(normalizeReceiptCode(' prb abc123 ')).toBe('PRB-ABC123');
    expect(normalizeReceiptCode('prbabc123')).toBe('PRB-ABC123');
    const wallet = [purchase('quilotoa', 'PRB-ABC123')];
    expect(validateDemoReceipt('hola', wallet, [], regionOf)).toMatchObject({ ok: false, message: expect.stringMatching(/PRB-ABC123/) });
    expect(validateDemoReceipt('PRB-ZZZZZZ', wallet, [], regionOf)).toMatchObject({ ok: false, message: expect.stringMatching(/No encontramos/) });
    const first = validateDemoReceipt('prb-abc123', wallet, [], regionOf, new Date('2026-11-14T15:00:00Z'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.added).toEqual([{ code: 'PRB-ABC123', experienceId: 'quilotoa', title: 'Laguna Quilotoa', region: 'sierra', validatedAt: '2026-11-14T15:00:00.000Z', mode: 'demo' }]);
    expect(first.message).toMatch(/No acredita una visita real/);
    expect(validateDemoReceipt('PRB-ABC123', wallet, first.list, regionOf)).toMatchObject({ ok: false, message: expect.stringMatching(/ya se validó/) });
    expect(collectStamps({ destinations, demoValidations: first.list, wallet })[0]).toMatchObject({ source: 'demo_validated' });
  });
  it('rechaza comprobantes rechazados y valida todas las paradas de un mismo comprobante', () => {
    expect(validateDemoReceipt('PRB-AAAAAA', [purchase('quilotoa', 'PRB-AAAAAA', 'test_rejected')], [], regionOf)).toMatchObject({ ok: false, message: expect.stringMatching(/rechazado/) });
    const batch = validateDemoReceipt('PRB-BBBBBB', [purchase('quilotoa', 'PRB-BBBBBB'), purchase('tortuga', 'PRB-BBBBBB')], [], regionOf);
    expect(batch.ok && batch.added.map(item => item.experienceId)).toEqual(['quilotoa', 'tortuga']);
  });
  it('lo guardado se valida al leer: no se puede inyectar un sello «verificado» en el almacenamiento local', () => {
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    saveDemoValidations([{ code: 'PRB-ABC123', experienceId: 'quilotoa', title: 'Laguna Quilotoa', region: 'sierra', validatedAt: '2026-11-14T15:00:00Z', mode: 'demo' }], storage);
    expect(readDemoValidations(storage)).toHaveLength(1);
    memory.set('chullavida:passport-demo-validations:v1', JSON.stringify([{ code: 'PRB-ABC123', experienceId: 'quilotoa', title: 'X', region: 'sierra', validatedAt: '2026-11-14T15:00:00Z', mode: 'verified' }]));
    expect(readDemoValidations(storage)).toEqual([]);
    memory.set('chullavida:passport-demo-validations:v1', '{roto');
    expect(readDemoValidations(storage)).toEqual([]);
  });
});
