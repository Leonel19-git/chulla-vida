import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
async function asUser(userId: string | null, sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || '']);
  await db.exec(userId ? 'set role authenticated' : 'set role anon');
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
}

describe('Supabase migration authorization in PostgreSQL', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
      create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:greatest(array_length(string_to_array($1,'/'),1)-1,0)] $$;
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    await db.exec(readFileSync(resolve('supabase/migrations/202611130001_foundation.sql'), 'utf8'));
    await db.exec(readFileSync(resolve('supabase/migrations/202611130002_private_documents.sql'), 'utf8'));
    await db.query('insert into auth.users(id) values($1),($2),($3)', [alice, bob, admin]);
    await db.query("insert into public.user_roles values($1,'admin')", [admin]);
    await db.exec(`insert into public.catalog_experiences(id,data) values('source-1','{"bookingEnabled":false,"editorialStatus":"referential"}');`);
  }, 60000);
  afterAll(async () => { await db?.close(); });

  it('publishes source catalog while keeping profiles private', async () => {
    expect((await asUser(null, 'select id,data from public.catalog_experiences')).rows).toHaveLength(1);
    await expect(asUser(null, 'select verified_by from public.catalog_experiences')).rejects.toThrow();
    await expect(asUser(alice, 'select organization_id from public.catalog_experiences')).rejects.toThrow();
    await expect(asUser(null, 'select * from public.profiles')).rejects.toThrow();
    expect((await asUser(alice, 'select * from public.profiles')).rows).toHaveLength(1);
    expect((await asUser(alice, 'select * from public.profiles where id=$1', [bob])).rows).toHaveLength(0);
  });
  it('prevents role escalation and writes to catalog or verification flags', async () => {
    await expect(asUser(alice, "insert into public.user_roles values($1,'admin')", [alice])).rejects.toThrow();
    await expect(asUser(alice, "update public.catalog_experiences set booking_enabled=true")).rejects.toThrow();
    await expect(asUser(alice, 'update public.profiles set id=$1 where id=$2', [bob, alice])).rejects.toThrow();
    await expect(asUser(alice, "update public.organizations set verification_status='official_registry_verified'")).rejects.toThrow();
    expect((await asUser(alice, "update public.profiles set display_name='Alicia' returning display_name")).rows).toEqual([{ display_name: 'Alicia' }]);
  });
  it('requires consent and admin review; applicants cannot approve themselves', async () => {
    await expect(asUser(alice, "select public.submit_merchant_application('Comunidad','community',false)")).rejects.toThrow('Treatment consent required');
    const created = await asUser(alice, "select public.submit_merchant_application('Comunidad','community',true) as id");
    const id = (created.rows[0] as { id: string }).id;
    await expect(asUser(alice, "select public.review_merchant_application($1,'approved','Revisión ficticia')", [id])).rejects.toThrow('Administrator required');
    expect((await asUser(bob, 'select * from public.merchant_verification_requests')).rows).toHaveLength(0);
    await asUser(admin, "select public.review_merchant_application($1,'approved','Identidad revisada')", [id]);
    expect((await asUser(alice, 'select verification_status from public.organizations')).rows).toEqual([{ verification_status: 'identity_reviewed' }]);
    await expect(asUser(admin, "select public.review_merchant_application($1,'approved','Otra revisión')", [id])).rejects.toThrow('Request not pending');
  });
  it('isolates information requests and rejects all commercial booking attempts', async () => {
    const key = '44444444-4444-4444-8444-444444444444';
    const args = ['source-1', 'information', 'Consultar disponibilidad', key];
    const first = await asUser(alice, 'select public.submit_experience_request($1,$2,$3,$4) as id', args);
    expect((await asUser(alice, 'select public.submit_experience_request($1,$2,$3,$4) as id', args)).rows).toEqual(first.rows);
    await expect(asUser(alice, 'select public.submit_experience_request($1,$2,$3,$4)', ['source-1','information','Mensaje distinto',key])).rejects.toThrow('Idempotency key reused');
    expect((await asUser(bob, 'select * from public.experience_requests')).rows).toHaveLength(0);
    await expect(asUser(alice, 'select public.submit_experience_request($1,$2,$3,$4)', ['source-1','booking','Reservar','55555555-5555-4555-8555-555555555555'])).rejects.toThrow('Online booking unavailable');
    await expect(asUser(null, 'select public.submit_experience_request($1,$2,$3,$4)', args)).rejects.toThrow();
  });
  it('keeps consent append only and disallows recording consent for someone else', async () => {
    await asUser(alice, "insert into public.consent_events(subject_id,category,granted,purpose,policy_version) values($1,'voice',false,'Asistencia de voz','1')", [alice]);
    await expect(asUser(alice, "insert into public.consent_events(subject_id,category,granted,purpose,policy_version) values($1,'voice',true,'Asistencia de voz','1')", [bob])).rejects.toThrow();
    await expect(asUser(alice, 'delete from public.consent_events')).rejects.toThrow();
    expect((await asUser(bob, 'select * from public.consent_events')).rows).toHaveLength(0);
  });
  it('keeps verification objects private and prevents path-based impersonation', async () => {
    await asUser(alice, "select public.submit_merchant_application('Negocio nuevo','business',true)");
    const org = (await asUser(alice, "select id from public.organizations where verification_status='in_review'")).rows[0] as { id: string };
    const path = `${org.id}/${alice}/document.pdf`;
    await asUser(alice, "insert into storage.objects(bucket_id,name) values('merchant-verification',$1)", [path]);
    expect((await asUser(bob, 'select * from storage.objects')).rows).toHaveLength(0);
    expect((await asUser(admin, 'select * from storage.objects')).rows).toHaveLength(1);
    await expect(asUser(bob, "insert into storage.objects(bucket_id,name) values('merchant-verification',$1)", [`${org.id}/${bob}/foreign.pdf`])).rejects.toThrow();
    await expect(asUser(alice, "insert into storage.objects(bucket_id,name) values('merchant-verification',$1)", [`${org.id}/${bob}/spoof.pdf`])).rejects.toThrow();
    const reviewedOrg = (await asUser(alice, "select id from public.organizations where verification_status='identity_reviewed'")).rows[0] as { id: string };
    await expect(asUser(alice, "insert into storage.objects(bucket_id,name) values('merchant-verification',$1)", [`${reviewedOrg.id}/${alice}/after-review.pdf`])).rejects.toThrow();
    expect((await db.query("select public from storage.buckets where id='merchant-verification'")).rows).toEqual([{ public: false }]);
  });
  it('preserves EUR currency in indexed metadata and prevents pending privacy status spoofing', async () => {
    await db.exec(`insert into public.catalog_experiences(id,data) values('euro-price','{"price":{"currency":"EUR","type":"referential"},"bookingEnabled":false}');`);
    expect((await asUser(null, "select currency,price_type,booking_enabled from public.catalog_experiences where id='euro-price'")).rows)
      .toEqual([{ currency: 'EUR', price_type: 'referential', booking_enabled: false }]);
    await asUser(alice, "insert into public.privacy_requests(subject_id,kind) values($1,'access')", [alice]);
    expect((await asUser(bob, 'select * from public.privacy_requests')).rows).toHaveLength(0);
    await expect(asUser(alice, "insert into public.privacy_requests(subject_id,kind,status) values($1,'access','fulfilled')", [alice])).rejects.toThrow();
  });
});
