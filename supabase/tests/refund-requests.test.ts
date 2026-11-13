import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, createDatabase, run, service, user } from './helpers/db';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const org = '33333333-3333-4333-8333-333333333333';
const slot = '44444444-4444-4444-8444-444444444444';
let db: PGlite;
async function booking(paymentStatus = 'captured', amount = 24.68, verified = true) {
  const [{ id }] = await admin<{ id: string }>(db, `insert into public.bookings(traveler_id,experience_id,slot_id,participants,status,unit_price,total_amount,currency,payment_environment)
    values($1,'refund-test',$2,2,'requested',0,0,'USD','sandbox') returning id`, [alice, slot]);
  await admin(db, "update public.bookings set status='confirmed' where id=$1", [id]);
  await admin(db, "update public.bookings set status='awaiting_payment' where id=$1", [id]);
  const [{ id: paymentId }] = await admin<{ id: string }>(db, `insert into public.payments(booking_id,payer_id,organization_id,provider,environment,provider_payment_id,amount,currency,status,idempotency_key,server_verified_at,verification_source)
    values($1,$2,$3,'payphone','sandbox',$4,$5,'USD',$6,$4,$7,'provider_api') returning id`, [id, alice, org, crypto.randomUUID(), amount, paymentStatus, verified ? new Date().toISOString() : null]);
  if (paymentStatus === 'captured' && amount === 24.68 && verified) await admin(db, "update public.bookings set status='paid' where id=$1", [id]);
  return { id, paymentId };
}
async function request(id: string, payer = alice, key = crypto.randomUUID(), reason = 'Cambio de fechas del viaje', environment = 'sandbox') {
  const [{ request: result }] = await run<{ request: Record<string, unknown> }>(db, service,
    'select public.request_refund_review($1,$2,$3,$4,$5) as request', [id, payer, environment, reason, key]);
  return result;
}
async function read(id: string, payer = alice, environment = 'sandbox') {
  const [{ request: result }] = await run<{ request: Record<string, unknown> | null }>(db, service,
    'select public.read_refund_review_request($1,$2,$3) as request', [id, payer, environment]);
  return result;
}

describe('refund requests are private review tasks without money movement', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, "update public.payment_environment_binding set environment='sandbox',note='Automated tests only'");
    await admin(db, "insert into public.regions(id,name) values('sierra','Sierra')");
    await admin(db, 'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())', [alice, bob]);
    await admin(db, "insert into public.organizations(id,owner_id,name,kind,verification_status) values($1,$2,'Refund test business','business','identity_reviewed')", [org, bob]);
    await admin(db, `insert into public.experiences(id,slug,organization_id,title,localized_region,price_type,price_min,operator_verification_status,booking_enabled,status)
      values('refund-test','refund-test',$1,'Refund fixture','sierra','verified_offer',12.34,'identity_reviewed',true,'published')`, [org]);
    await admin(db, "insert into public.availability_slots(id,experience_id,starts_at,capacity,price_amount,currency) values($1,'refund-test',now()+interval '30 days',200,12.34,'USD')", [slot]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('denies browser writes and direct RPC execution', async () => {
    const { id } = await booking();
    await expect(run(db, user(alice), 'select public.request_refund_review($1,$2,$3,$4,$5)', [id, alice, 'sandbox', 'Cambio del viaje', crypto.randomUUID()])).rejects.toThrow();
    await expect(run(db, user(alice), "insert into public.refunds(reason) values('falso')")).rejects.toThrow();
    await expect(run(db, user(alice), 'select public.read_refund_review_request($1,$2,$3)', [id, alice, 'sandbox'])).rejects.toThrow();
  });
  it('rejects another payer for requests and status reads without exposing the booking', async () => {
    const { id } = await booking();
    await expect(request(id, bob)).rejects.toThrow('Booking unavailable');
    await expect(read(id, bob)).rejects.toThrow('Booking unavailable');
    expect(await read(id)).toBeNull();
  });
  it('uses the canonical full booking amount and creates only a requested review', async () => {
    const { id, paymentId } = await booking();
    const review = await request(id, alice, crypto.randomUUID(), '  Cambio de fechas  ');
    expect(review).toMatchObject({ bookingId: id, status: 'requested', amount: 24.68, currency: 'USD', reason: 'Cambio de fechas', environment: 'sandbox' });
    expect(review.id).toBeTruthy(); expect(review.createdAt).toBeTruthy();
    expect((await admin(db, 'select status from public.bookings where id=$1', [id]))[0].status).toBe('paid');
    expect((await admin(db, 'select status from public.payments where id=$1', [paymentId]))[0].status).toBe('captured');
    const [refund] = await admin(db, 'select status,provider_refund_id from public.refunds where id=$1', [review.id]);
    expect(refund).toEqual({ status: 'requested', provider_refund_id: null });
    expect(await admin(db, "select id from public.receipts where booking_id=$1 and kind='refund_note'", [id])).toHaveLength(0);
  });
  it('returns one active request for repeated clicks, refreshed keys and approved reviews', async () => {
    const { id } = await booking(); const key = crypto.randomUUID();
    const first = await request(id, alice, key); const retry = await request(id, alice, key); const refreshed = await request(id);
    expect(retry.id).toBe(first.id); expect(refreshed.id).toBe(first.id);
    await admin(db, "update public.refunds set status='approved' where id=$1", [first.id]);
    expect((await request(id)).id).toBe(first.id);
    expect((await read(id))?.status).toBe('approved');
    expect(await admin(db, 'select id from public.refunds where booking_id=$1', [id])).toHaveLength(1);
  });
  it('rejects a key reused for a different booking', async () => {
    const first = await booking(); const second = await booking(); const key = crypto.randomUUID();
    await request(first.id, alice, key);
    await expect(request(second.id, alice, key)).rejects.toThrow('Idempotency conflict');
  });
  it('blocks any completed refund from producing another full total', async () => {
    const { id } = await booking(); const first = await request(id);
    await admin(db, "update public.refunds set amount=1,status='succeeded' where id=$1", [first.id]);
    await expect(request(id)).rejects.toThrow('Existing refund requires manual review');
    expect((await read(id))?.status).toBe('succeeded');
  });
  it('rejects pending, unverified, mismatched and partially refunded payment evidence', async () => {
    await expect(request((await booking('pending')).id)).rejects.toThrow('Captured payment requires manual review');
    await expect(request((await booking('captured', 24.68, false)).id)).rejects.toThrow('Captured payment requires manual review');
    await expect(request((await booking('captured', 1)).id)).rejects.toThrow('Captured payment requires manual review');
    await expect(request((await booking('partially_refunded')).id)).rejects.toThrow('Captured payment requires manual review');
  });
  it('rejects a verification timestamp with unknown provenance', async () => {
    const { id, paymentId } = await booking();
    await admin(db, 'update public.payments set verification_source=null where id=$1', [paymentId]);
    await expect(request(id)).rejects.toThrow('Captured payment requires manual review');
    expect(await admin(db, 'select id from public.refunds where booking_id=$1', [id])).toHaveLength(0);
  });
  it('never mixes live requests, sandbox bookings and database environment', async () => {
    const { id, paymentId } = await booking();
    await expect(request(id, alice, crypto.randomUUID(), 'Cambio del viaje', 'live')).rejects.toThrow('Payment environment mismatch');
    await expect(read(id, alice, 'live')).rejects.toThrow('Payment environment mismatch');
    await admin(db, "update public.payments set environment='live' where id=$1", [paymentId]);
    await expect(request(id)).rejects.toThrow('Captured payment requires manual review');
  });
  it('validates reason and confirmed account before saving', async () => {
    const { id } = await booking();
    await expect(request(id, alice, crypto.randomUUID(), '  ')).rejects.toThrow('Invalid refund request');
    await expect(request(id, alice, crypto.randomUUID(), 'x'.repeat(1001))).rejects.toThrow('Invalid refund request');
    await admin(db, 'update auth.users set email_confirmed_at=null where id=$1', [alice]);
    await expect(request(id)).rejects.toThrow('Verified account required');
    await admin(db, 'update auth.users set email_confirmed_at=now() where id=$1', [alice]);
  });
});
