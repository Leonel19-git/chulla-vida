import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, anon, createDatabase, run, user } from './helpers/db';

const alice = '61111111-1111-4111-8111-111111111111';
const bob = '62222222-2222-4222-8222-222222222222';
const pending = '63333333-3333-4333-8333-333333333333';
let db: PGlite;

describe('resumen de cédula al registrarse con las migraciones reales', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, `insert into auth.users(id,email,email_confirmed_at) values
      ($1,'alice@signup.test',now()),($2,'bob@signup.test',now()),($3,'pending@signup.test',null)`, [alice, bob, pending]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('exige sesión y correo confirmado; no acepta escribir antes del OTP', async () => {
    await expect(run(db, anon, "select public.record_signup_identity('0400')")).rejects.toThrow();
    await expect(run(db, user(pending), "select public.record_signup_identity('0400')")).rejects.toThrow(/Confirmed account required/);
    expect(await admin(db, 'select * from public.signup_identity')).toEqual([]);
  });

  it('guarda únicamente cuatro dígitos y estado pendiente de SU cuenta; no emite verificación ni permisos', async () => {
    await run(db, user(alice), "select public.record_signup_identity('0400')");
    expect(await run(db, user(alice), 'select user_id,last4,status from public.signup_identity')).toEqual([{ user_id: alice, last4: '0400', status: 'unverified' }]);
    expect(await run(db, user(bob), 'select user_id,last4,status from public.signup_identity')).toEqual([]);
    expect(await run(db, user(alice), 'select user_id from public.buyer_identity_documents')).toEqual([]);
    expect(await admin(db, 'select * from public.user_roles where user_id=$1', [alice])).toEqual([]);
    const columns = await admin<{ column_name: string }>(db, "select column_name from information_schema.columns where table_schema='public' and table_name='signup_identity' order by ordinal_position");
    expect(columns.map(row => row.column_name)).toEqual(['user_id', 'last4', 'status', 'updated_at']);
  });

  it.each([null, '', '400', '04000', '0102030400', 'AB12', ' 0400'])('rechaza resúmenes inválidos (%s) sin alterar lo guardado', async value => {
    await expect(run(db, user(alice), 'select public.record_signup_identity($1)', [value])).rejects.toThrow(/Invalid document summary/);
    expect(await run(db, user(alice), 'select last4 from public.signup_identity')).toEqual([{ last4: '0400' }]);
  });

  it('impide insert/update/delete directos, elegir otro usuario o subir el estado a verificado', async () => {
    await expect(run(db, user(alice), "insert into public.signup_identity(user_id,last4) values($1,'9999')", [bob])).rejects.toThrow();
    await expect(run(db, user(alice), "update public.signup_identity set last4='9999' where user_id=$1", [bob])).rejects.toThrow();
    await expect(run(db, user(alice), "update public.signup_identity set status='verified' where user_id=$1", [alice])).rejects.toThrow();
    await expect(run(db, user(alice), 'delete from public.signup_identity')).rejects.toThrow();
    await expect(run(db, user(alice), "select public.record_signup_identity($1,'9999')", [bob])).rejects.toThrow();
    await expect(admin(db, "update public.signup_identity set status='verified' where user_id=$1", [alice])).rejects.toThrow();
  });

  it('reintentar actualiza solo al titular y eliminar su cuenta elimina el resumen', async () => {
    await run(db, user(bob), "select public.record_signup_identity('4065')");
    await run(db, user(bob), "select public.record_signup_identity('3511')");
    expect(await run(db, user(alice), 'select last4 from public.signup_identity')).toEqual([{ last4: '0400' }]);
    expect(await run(db, user(bob), 'select last4,status from public.signup_identity')).toEqual([{ last4: '3511', status: 'unverified' }]);
    await admin(db, 'delete from auth.users where id=$1', [bob]);
    expect(await admin(db, 'select user_id from public.signup_identity where user_id=$1', [bob])).toEqual([]);
  });
});
