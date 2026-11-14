import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, anon, createDatabase, run, service, user } from '../../supabase/tests/helpers/db';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const make = (first: string) => `${first}${cedulaCheckDigit(first)}`;
let db: PGlite;

describe('documento del comprador: protegido por RLS y sin número completo', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, 'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())', [alice, bob]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('la validación SQL coincide con la del navegador', async () => {
    const values = [make('010203040'), make('171054351'), make('300000001'), make('250000001'), make('176000001'), '0102030405', 'abc'];
    const rows = await run<{ v: string; ok: boolean }>(db, service, 'select v, public.is_valid_cedula(v) as ok from unnest($1::text[]) as v', [values]);
    expect(rows.map(row => row.ok)).toEqual([true, true, true, false, false, false, false]);
  });
  it('guarda solo los últimos 4 y una huella; rechaza formatos inválidos', async () => {
    const cedula = make('010203040');
    const [{ result }] = await run<{ result: Record<string, unknown> }>(db, user(alice), 'select public.set_buyer_document($1,$2) as result', ['cedula', cedula]);
    expect(result).toEqual({ documentType: 'cedula', last4: cedula.slice(-4), formatValid: true, identityVerified: false });
    const stored = await admin<Record<string, string>>(db, 'select * from public.buyer_identity_documents where user_id=$1', [alice]);
    expect(JSON.stringify(stored)).not.toContain(cedula);
    await expect(run(db, user(alice), 'select public.set_buyer_document($1,$2)', ['cedula', '0102030405'])).rejects.toThrow('Invalid document format');
    await expect(run(db, anon, 'select public.set_buyer_document($1,$2)', ['cedula', cedula])).rejects.toThrow();
  });
  it('el titular ve sus columnas no sensibles; nadie más ve la fila ni la huella', async () => {
    await run(db, user(bob), 'select public.set_buyer_document($1,$2)', ['passport', 'X1234567']);
    const own = await run<Record<string, unknown>>(db, user(alice), 'select user_id, document_type, last4, identity_verified from public.buyer_identity_documents');
    expect(own).toEqual([{ user_id: alice, document_type: 'cedula', last4: make('010203040').slice(-4), identity_verified: false }]);
    await expect(run(db, user(alice), 'select document_hash from public.buyer_identity_documents')).rejects.toThrow();
    await expect(run(db, user(alice), "update public.buyer_identity_documents set identity_verified=true")).rejects.toThrow();
    await expect(run(db, user(alice), 'delete from public.buyer_identity_documents')).rejects.toThrow();
    await expect(run(db, anon, 'select last4 from public.buyer_identity_documents')).rejects.toThrow();
  });
  it('solo el servidor compara un documento con la huella', async () => {
    const cedula = make('010203040');
    const [{ ok }] = await run<{ ok: boolean }>(db, service, 'select public.buyer_document_matches($1,$2,$3) as ok', [alice, 'cedula', cedula]);
    const [{ ok: other }] = await run<{ ok: boolean }>(db, service, 'select public.buyer_document_matches($1,$2,$3) as ok', [alice, 'cedula', make('171054351')]);
    expect([ok, other]).toEqual([true, false]);
    await expect(run(db, user(alice), 'select public.buyer_document_matches($1,$2,$3)', [alice, 'cedula', cedula])).rejects.toThrow();
  });
});
