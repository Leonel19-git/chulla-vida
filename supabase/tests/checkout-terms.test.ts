import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, anon, createDatabase, run, service, user } from './helpers/db';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const draftHash = 'a'.repeat(64);
const publishedHash = 'b'.repeat(64);
let db: PGlite;
let version: string;
async function accept(uid: string, id = version, method = 'checkout') {
  const [{ acceptance }] = await run<{ acceptance: string }>(db, user(uid), 'select public.accept_legal_document($1,$2) as acceptance', [id, method]);
  return acceptance;
}

describe('checkout terms preserve distinct draft and published evidence', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, 'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())', [alice, bob]);
    await admin(db, "insert into public.legal_documents(id,title,kind,requires_acceptance) values('checkout-test-terms','Checkout test terms','terms',true)");
    const [{ id }] = await admin<{ id: string }>(db, `insert into public.legal_document_versions(document_id,version,content,content_hash,status)
      values('checkout-test-terms','test-v1','Draft fixture content',$1,'draft') returning id`, [draftHash]);
    version = id;
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('appends formal acceptance after publishing the acknowledged draft without rewriting it', async () => {
    const draftId = await accept(alice, version, 'signup');
    const [draft] = await admin(db, 'select * from public.legal_acceptances where id=$1', [draftId]);
    expect(draft).toMatchObject({ user_id: alice, document_version_id: version, content_hash: draftHash, is_draft_acknowledgement: true, method: 'signup' });
    expect(await accept(alice, version, 'settings')).toBe(draftId);
    await admin(db, `update public.legal_document_versions set content='Reviewed published fixture content',content_hash=$2,status='published',
      has_pending_placeholders=false,reviewed_by_counsel='Test fixture reviewer',approved_at=now(),published_at=now(),effective_from=current_date where id=$1`, [version, publishedHash]);
    const formalId = await accept(alice);
    expect(formalId).not.toBe(draftId);
    const [formal] = await admin(db, 'select * from public.legal_acceptances where id=$1', [formalId]);
    expect(formal).toMatchObject({ user_id: alice, document_version_id: version, content_hash: publishedHash, is_draft_acknowledgement: false, method: 'checkout' });
    expect((await admin(db, 'select * from public.legal_acceptances where id=$1', [draftId]))[0]).toEqual(draft);
    expect(await accept(alice)).toBe(formalId);
    expect(await admin(db, 'select id from public.legal_acceptances where user_id=$1 and document_version_id=$2', [alice, version])).toHaveLength(2);
    const [profile] = await admin(db, 'select terms_accepted_version,terms_accepted_at from public.profiles where id=$1', [alice]);
    expect(profile.terms_accepted_version).toBe('test-v1'); expect(profile.terms_accepted_at).toBeTruthy();
  });
  it('keeps both kinds append-only and rejects direct browser forgery', async () => {
    await expect(run(db, user(alice), `insert into public.legal_acceptances(user_id,document_version_id,content_hash,is_draft_acknowledgement)
      values($1,$2,$3,false)`, [bob, version, publishedHash])).rejects.toThrow();
    await expect(run(db, user(alice), 'update public.legal_acceptances set content_hash=$1 where user_id=$2', ['c'.repeat(64), alice])).rejects.toThrow();
    await expect(admin(db, 'update public.legal_acceptances set content_hash=$1 where user_id=$2', ['c'.repeat(64), alice])).rejects.toThrow(/append-only/i);
  });
  it('records acceptance only for the caller and denies anonymous or missing identities', async () => {
    const bobId = await accept(bob);
    expect((await admin(db, 'select user_id from public.legal_acceptances where id=$1', [bobId]))[0].user_id).toBe(bob);
    expect(await run(db, user(bob), 'select id from public.legal_acceptances where user_id=$1', [alice])).toHaveLength(0);
    await expect(run(db, anon, 'select public.accept_legal_document($1,$2)', [version, 'checkout'])).rejects.toThrow();
    await expect(run(db, service, 'select public.accept_legal_document($1,$2)', [version, 'checkout'])).rejects.toThrow('Authentication required');
  });
  it('does not accept a future published version or invent a formal acceptance', async () => {
    await admin(db, "insert into public.legal_documents(id,title,kind,requires_acceptance) values('future-test-terms','Future test terms','terms',true)");
    const [{ id }] = await admin<{ id: string }>(db, `insert into public.legal_document_versions(document_id,version,content,content_hash,status,has_pending_placeholders,reviewed_by_counsel,approved_at,published_at,effective_from)
      values('future-test-terms','future-v1','Reviewed future fixture',$1,'published',false,'Test fixture reviewer',now(),now(),current_date+1) returning id`, ['c'.repeat(64)]);
    await expect(accept(alice, id)).rejects.toThrow('Document version is not effective yet');
    expect(await admin(db, 'select id from public.legal_acceptances where document_version_id=$1', [id])).toHaveLength(0);
  });
});
