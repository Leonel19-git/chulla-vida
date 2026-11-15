import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, createDatabase, run, user } from './helpers/db';

const alice = '51111111-1111-4111-8111-111111111111';
const bob = '52222222-2222-4222-8222-222222222222';
const org = '53333333-3333-4333-8333-333333333333';
let db: PGlite;

describe('perfil de viajero y sellos del pasaporte con las migraciones reales', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'alice@example.test',now(),'{\"display_name\":\"Alicia\"}'),($2,'bob@example.test',now(),'{}')", [alice, bob]);
    await admin(db, "insert into public.regions(id,name) values('sierra','Sierra') on conflict do nothing");
    await admin(db, "insert into public.organizations(id,owner_id,name,kind,verification_status) values($1,$2,'Anfitrión de prueba','business','identity_reviewed')", [org, bob]);
    await admin(db, `insert into public.experiences(id,slug,organization_id,title,localized_region,price_type,operator_verification_status,status)
      values('sello-test','sello-test',$1,'Laguna de prueba','sierra','referential','identity_reviewed','published')`, [org]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('el registro crea el perfil con el nombre visible y la persona edita país, ciudad y preferencias de SU fila', async () => {
    const [own] = await run<{ display_name: string; home_country: string }>(db, user(alice), 'select display_name, home_country from public.profiles');
    expect(own).toEqual({ display_name: 'Alicia', home_country: '' });
    await run(db, user(alice), `update public.profiles set display_name='Alicia Viajera', home_country='Ecuador', home_city='Cuenca',
      travel_preferences='{"interests":["cultura"],"travelers":2}' where id=$1`, [alice]);
    const [saved] = await run<{ home_city: string; travel_preferences: { travelers: number } }>(db, user(alice), 'select home_city, travel_preferences from public.profiles where id=$1', [alice]);
    expect(saved.home_city).toBe('Cuenca'); expect(saved.travel_preferences.travelers).toBe(2);
    // Bob no ve ni modifica la fila de Alicia (RLS): la actualización no afecta filas.
    expect(await run(db, user(bob), 'select * from public.profiles where id=$1', [alice])).toEqual([]);
    await run(db, user(bob), "update public.profiles set home_city='Hackeado' where id=$1", [alice]);
    const [still] = await admin<{ home_city: string }>(db, 'select home_city from public.profiles where id=$1', [alice]);
    expect(still.home_city).toBe('Cuenca');
  });

  it('rechaza textos excesivos y nunca deja escribir consentimientos o términos desde el navegador', async () => {
    await expect(run(db, user(alice), "update public.profiles set home_city=repeat('x',121) where id=$1", [alice])).rejects.toThrow();
    await expect(run(db, user(alice), "update public.profiles set travel_preferences='[]' where id=$1", [alice])).rejects.toThrow();
    await expect(run(db, user(alice), 'update public.profiles set marketing_consent_at=now() where id=$1', [alice])).rejects.toThrow();
    await expect(run(db, user(alice), "update public.profiles set terms_accepted_version='x' where id=$1", [alice])).rejects.toThrow();
    // El consentimiento de marketing sí se registra con la función del servidor y queda reflejado en el perfil.
    await run(db, user(alice), "select public.record_consent('email_marketing', true, 'Novedades por correo', 'privacy-test', 'settings')");
    const [withConsent] = await admin<{ marketing_consent_at: string | null }>(db, 'select marketing_consent_at from public.profiles where id=$1', [alice]);
    expect(withConsent.marketing_consent_at).not.toBeNull();
    await run(db, user(alice), "select public.record_consent('email_marketing', false, 'Novedades por correo', 'privacy-test', 'settings')");
    const [revoked] = await admin<{ marketing_consent_at: string | null }>(db, 'select marketing_consent_at from public.profiles where id=$1', [alice]);
    expect(revoked.marketing_consent_at).toBeNull();
  });

  it('la cédula se guarda solo enmascarada: el navegador ve los últimos 4 y nunca la huella', async () => {
    const [{ result }] = await run<{ result: { last4: string } }>(db, user(alice), "select public.set_buyer_document('cedula', '1710034065') as result");
    expect(result.last4).toBe('4065');
    const [visible] = await run<Record<string, unknown>>(db, user(alice), 'select document_type, last4 from public.buyer_identity_documents');
    expect(visible).toEqual({ document_type: 'cedula', last4: '4065' });
    await expect(run(db, user(alice), 'select document_hash from public.buyer_identity_documents')).rejects.toThrow();
  });

  it('un viajero no puede fabricar un sello de visita verificada; solo el servidor lo emite y solo lo ve su dueña', async () => {
    await expect(run(db, user(alice), "insert into public.passport_stamps(user_id,experience_id,region_id,stamp_type) values($1,'sello-test','sierra','verified_visit')", [alice])).rejects.toThrow();
    const [{ id: visit }] = await admin<{ id: string }>(db, "insert into public.visit_verifications(user_id,experience_id,method,status,verified_at) values($1,'sello-test','host_one_time_code','verified',now()) returning id", [alice]);
    await admin(db, "insert into public.passport_stamps(user_id,experience_id,region_id,stamp_type,visit_verification_id) values($1,'sello-test','sierra','verified_visit',$2)", [alice, visit]);
    const mine = await run<{ stamp_type: string; experience_id: string }>(db, user(alice), "select stamp_type, experience_id from public.passport_stamps where stamp_type='verified_visit'");
    expect(mine).toEqual([{ stamp_type: 'verified_visit', experience_id: 'sello-test' }]);
    expect(await run(db, user(bob), 'select * from public.passport_stamps')).toEqual([]);
  });
});
