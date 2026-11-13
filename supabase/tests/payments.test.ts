import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin,createDatabase,run,service,user } from './helpers/db';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const org = '33333333-3333-4333-8333-333333333333';
const slot = '44444444-4444-4444-8444-444444444444';
let db: PGlite;
let sequence = 100;
async function payable(currency = 'USD',environment = 'sandbox') {
  const [{ id }] = await admin<{id:string}>(db,`insert into public.bookings(traveler_id,experience_id,slot_id,participants,status,unit_price,total_amount,currency,payment_environment)
    values($1,'pay-test',$2,1,'requested',0,0,$3,$4) returning id`,[alice,slot,currency,environment]);
  await admin(db,"update public.bookings set status='confirmed' where id=$1",[id]);
  await admin(db,"update public.bookings set status='awaiting_payment' where id=$1",[id]);
  return id;
}
async function claim(bookingId: string,payer = alice,key = crypto.randomUUID(),environment = 'sandbox') {
  const [{ checkout }] = await run<{checkout:Record<string,unknown>}>(db,service,'select public.claim_payphone_checkout($1,$2,$3,$4) as checkout',[bookingId,payer,key,environment]);
  return checkout;
}
async function prepared(bookingId: string) {
  const checkout = await claim(bookingId);
  await run(db,service,'select public.finish_payphone_prepare($1,$2,$3)',[checkout.reference,'https://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=test','test']);
  return checkout;
}
async function confirm(reference: unknown,amount = 1234,currency = 'USD',outcome = 'captured',transaction = ++sequence) {
  return run(db,service,'select public.record_payphone_confirmation($1,$2,$3,$4,$5) as checkout',[reference,transaction,amount,currency,outcome]);
}

describe('PayPhone checkout service boundaries and accounting',() => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db,"update public.payment_environment_binding set environment='sandbox',note='Isolated automated test database'");
    await admin(db,"insert into public.regions(id,name) values('sierra','Sierra')");
    await admin(db,'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[alice,bob]);
    await admin(db,"insert into public.organizations(id,owner_id,name,kind,verification_status) values($1,$2,'Prueba de pagos','business','identity_reviewed')",[org,bob]);
    await admin(db,`insert into public.experiences(id,slug,organization_id,title,localized_region,price_type,price_min,operator_verification_status,booking_enabled,status)
      values('pay-test','pay-test',$1,'Prueba de pagos','sierra','verified_offer',12.34,'identity_reviewed',true,'published')`,[org]);
    await admin(db,"insert into public.availability_slots(id,experience_id,starts_at,capacity,price_amount,currency) values($1,'pay-test',now()+interval '30 days',100,12.34,'USD')",[slot]);
  },120000);
  afterAll(async () => { await db?.close(); });
  it('keeps every payment write and checkout detail private from browser roles',async () => {
    await expect(run(db,user(alice),'select * from public.payment_checkouts')).rejects.toThrow();
    await expect(run(db,user(alice),'select public.claim_payphone_checkout($1,$2,$3,$4)',[crypto.randomUUID(),alice,crypto.randomUUID(),'sandbox'])).rejects.toThrow();
    await expect(run(db,user(alice),"insert into public.payments(payer_id) values($1)",[alice])).rejects.toThrow();
  });
  it('claims canonical cents exactly once and rejects another payer or changed environment',async () => {
    const id = await payable(); const key = crypto.randomUUID();
    await expect(claim(id,bob)).rejects.toThrow('Booking unavailable');
    const one = await claim(id,alice,key); const two = await claim(id,alice,key);
    expect(one.amount_cents).toBe(1234); expect(one.claimed).toBe(true); expect(two.reference).toBe(one.reference); expect(two.claimed).toBe(false);
    await expect(claim(id,alice,key,'live')).rejects.toThrow('Idempotency conflict');
    expect((await claim(id)).reference).toBe(one.reference);
  });
  it('blocks live payments while commercial configuration is incomplete',async () => {
    await admin(db,"update public.payment_environment_binding set environment='live'");
    await expect(claim(await payable('USD','live'),alice,crypto.randomUUID(),'live')).rejects.toThrow('Commercial configuration pending');
    await admin(db,"update public.payment_environment_binding set environment='sandbox'");
  });
  it('rejects mismatched money and applies duplicate verified confirmations once',async () => {
    const booking = await payable(); const c = await prepared(booking); const transaction = ++sequence;
    await expect(confirm(c.reference,1235,'USD','captured',transaction)).rejects.toThrow('Amount or currency mismatch');
    await expect(confirm(c.reference,1234,'EUR','captured',transaction)).rejects.toThrow('Amount or currency mismatch');
    await confirm(c.reference,1234,'USD','captured',transaction);
    await confirm(c.reference,1234,'USD','captured',transaction);
    await confirm(c.reference,1234,'USD','cancelled',transaction);
    const [state] = await admin(db,'select status,paid_at from public.bookings where id=$1',[booking]);
    expect(state.status).toBe('paid'); expect(state.paid_at).toBeTruthy();
    const [payment] = await admin(db,'select status,server_verified_at,verification_source,verified_via_webhook_at from public.payments where booking_id=$1',[booking]);
    expect(payment).toMatchObject({status:'captured',verification_source:'provider_api',verified_via_webhook_at:null});
    expect(payment.server_verified_at).toBeTruthy();
    expect(await admin(db,'select id from public.receipts where booking_id=$1',[booking])).toHaveLength(1);
    expect(await admin(db,'select id from public.payments where booking_id=$1',[booking])).toHaveLength(1);
  });
  it('does not accept another provider transaction for an already verified reference',async () => {
    const c = await prepared(await payable()); const transaction = ++sequence;
    await confirm(c.reference,1234,'USD','captured',transaction);
    await expect(confirm(c.reference,1234,'USD','captured',transaction+1000)).rejects.toThrow('Provider transaction mismatch');
  });
  it('records late captured money for review without reviving a cancelled booking',async () => {
    const booking = await payable(); const c = await prepared(booking);
    await admin(db,"update public.bookings set status='cancelled' where id=$1",[booking]);
    await confirm(c.reference);
    expect((await admin(db,'select status from public.bookings where id=$1',[booking]))[0].status).toBe('cancelled');
    expect((await admin(db,'select state,requires_review from public.payment_checkouts where reference=$1',[c.reference]))[0])
      .toMatchObject({state:'captured',requires_review:true});
  });
  it('prevents reusing the prepared URL after cancellation and accepts rejection without payment',async () => {
    const booking = await payable(); const key = crypto.randomUUID(); const c = await claim(booking,alice,key);
    await run(db,service,'select public.finish_payphone_prepare($1,$2,$3)',[c.reference,'https://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=test','test']);
    await admin(db,"update public.bookings set status='cancelled' where id=$1",[booking]);
    await expect(claim(booking,alice,key)).rejects.toThrow('Booking not payable');
    const otherBooking = await payable(); const other = await prepared(otherBooking);
    await confirm(other.reference,1234,'USD','cancelled');
    expect((await admin(db,'select status from public.bookings where id=$1',[otherBooking]))[0].status).toBe('awaiting_payment');
    expect(await admin(db,'select id from public.receipts where booking_id=$1',[otherBooking])).toHaveLength(0);
  });
  it('blocks EUR, expired reservations and unverified accounts before preparing',async () => {
    await admin(db,"update public.availability_slots set currency='EUR' where id=$1",[slot]);
    const euro = await payable('EUR');
    await admin(db,"update public.availability_slots set currency='USD' where id=$1",[slot]);
    await expect(claim(euro)).rejects.toThrow('Booking not payable');
    const expired = await payable();
    await admin(db,"update public.bookings set expires_at=now()-interval '1 minute' where id=$1",[expired]);
    await expect(claim(expired)).rejects.toThrow('Booking not payable');
    const unverified = await payable();
    await admin(db,'update auth.users set email_confirmed_at=null where id=$1',[alice]);
    await expect(claim(unverified)).rejects.toThrow('Verified account required');
    await admin(db,'update auth.users set email_confirmed_at=now() where id=$1',[alice]);
  });
  it('requires accepted published terms and canonical reviewed tax allocation in live mode',async () => {
    await admin(db,"update public.payment_environment_binding set environment='live'");
    await admin(db,'update public.commercial_readiness set legal_entity_confirmed=true,legal_documents_approved=true,payment_gateway_live=true');
    const booking = await payable('USD','live');
    await admin(db,"update public.bookings set cancellation_policy_snapshot='Test fixture cancellation policy' where id=$1",[booking]);
    await expect(claim(booking,alice,crypto.randomUUID(),'live')).rejects.toThrow('Approved checkout terms required');
    await admin(db,"insert into public.legal_documents(id,title,kind,requires_acceptance) values('payment-test-terms','Test fixture terms','terms',true)");
    const [{id:version}] = await admin<{id:string}>(db,`insert into public.legal_document_versions(document_id,version,content,content_hash,status,has_pending_placeholders,reviewed_by_counsel,approved_at)
      values('payment-test-terms','test','Test fixture terms only',$1,'published',false,'Fixture reviewer',now()) returning id`,['a'.repeat(64)]);
    await admin(db,"insert into public.legal_acceptances(user_id,document_version_id,content_hash,is_draft_acknowledgement,method) values($1,$2,$3,false,'checkout')",[alice,version,'a'.repeat(64)]);
    await expect(claim(booking,alice,crypto.randomUUID(),'live')).rejects.toThrow('Reviewed tax allocation required');
    await admin(db,'insert into public.booking_payment_breakdowns(booking_id,amount_without_tax_cents,amount_with_tax_cents,tax_cents) values($1,0,1000,234)',[booking]);
    const live = await claim(booking,alice,crypto.randomUUID(),'live');
    expect(live.environment).toBe('live');expect(live.prepare_components).toEqual({amountWithoutTax:0,amountWithTax:1000,tax:234,service:0,tip:0});
    await admin(db,'update public.commercial_readiness set legal_entity_confirmed=false,legal_documents_approved=false,payment_gateway_live=false');
    await admin(db,"update public.payment_environment_binding set environment='sandbox'");
  });
  it('derives ordinary traveler booking environment from the private database setting',async () => {
    const [{id}] = await run<{id:string}>(db,user(alice),'select public.request_booking($1,$2,1,$3) as id',['pay-test',slot,crypto.randomUUID()]);
    expect((await admin(db,'select payment_environment from public.bookings where id=$1',[id]))[0].payment_environment).toBe('sandbox');
    await expect(run(db,user(alice),"update public.payment_environment_binding set environment='live'")).rejects.toThrow();
    await expect(run(db,user(alice),"update public.bookings set payment_environment='live' where id=$1",[id])).rejects.toThrow();
    await expect(admin(db,"update public.bookings set payment_environment='live' where id=$1",[id])).rejects.toThrow('immutable');
    const live = await payable('USD','live');
    await expect(claim(live)).rejects.toThrow('Booking payment environment mismatch');
  });
  it('records capture for review when the operator closes the slot after preparing',async () => {
    const booking = await payable();const c = await prepared(booking);
    await admin(db,"update public.availability_slots set status='cancelled' where id=$1",[slot]);
    await confirm(c.reference);
    expect((await admin(db,'select status from public.bookings where id=$1',[booking]))[0].status).toBe('awaiting_payment');
    expect((await admin(db,'select state,requires_review from public.payment_checkouts where reference=$1',[c.reference]))[0])
      .toMatchObject({state:'captured',requires_review:true});
    await admin(db,"update public.availability_slots set status='open' where id=$1",[slot]);
  });
});
