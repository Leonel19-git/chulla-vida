import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, anon, createDatabase, run, service, user } from './helpers/db';

const owner = '10000000-0000-4000-8000-000000000001';
const manager = '10000000-0000-4000-8000-000000000002';
const traveler = '10000000-0000-4000-8000-000000000003';
const stranger = '10000000-0000-4000-8000-000000000004';
const unverified = '10000000-0000-4000-8000-000000000005';
const org = '20000000-0000-4000-8000-000000000001';
let db: PGlite;
const account = `insert into public.organization_bank_accounts(organization_id,bank_name,account_type,account_number,holder_name,holder_id)
  values($1,'Banco de prueba','ahorros','1234567890','Titular de prueba','1234567890')`;

describe('autorización y negocio: migraciones reales en base local', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, 'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now()),($3,now()),($4,now()),($5,null)', [owner, manager, traveler, stranger, unverified]);
    await admin(db, `update auth.users set raw_user_meta_data='{"role":"admin","verified":true}' where id=$1`, [stranger]);
    await admin(db, "insert into public.regions(id,name) values('sierra','Sierra')");
    await admin(db, "insert into public.organizations(id,owner_id,name,kind,verification_status) values($1,$2,'Negocio de prueba','business','identity_reviewed')", [org, owner]);
    await admin(db, "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'manager')", [org, manager]);
    await admin(db, `insert into public.experiences(id,slug,organization_id,title,localized_region,price_type,price_min,status,operator_verification_status,booking_enabled)
      values('security-offer','security-offer',$1,'Oferta de prueba','sierra','verified_offer',30,'published','identity_reviewed',true)`, [org]);
    await admin(db, `insert into public.catalog_experiences(id,data,organization_id) values('security-offer','{"bookingEnabled":false}',$1)`, [org]);
    await run(db, user(owner), account, [org]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('solo el dueño puede modificar o eliminar la cuenta; un manager conserva lectura', async () => {
    expect(await run(db, user(manager), 'select organization_id from public.organization_bank_accounts')).toHaveLength(1);
    expect(await run(db, user(manager), "update public.organization_bank_accounts set account_number='9999999999' where organization_id=$1 returning organization_id", [org])).toEqual([]);
    expect(await run(db, user(manager), 'delete from public.organization_bank_accounts where organization_id=$1 returning organization_id', [org])).toEqual([]);
    await run(db, user(owner), "update public.organization_bank_accounts set bank_name='Banco actualizado' where organization_id=$1", [org]);
    expect(await run(db, user(owner), 'select bank_name,updated_by from public.organization_bank_accounts')).toEqual([{ bank_name: 'Banco actualizado', updated_by: owner }]);
  });

  it('un manager tampoco registra una cuenta nueva en nombre del dueño', async () => {
    const [{ id }] = await admin<{ id: string }>(db, "insert into public.organizations(owner_id,name,kind) values($1,'Otro negocio','business') returning id", [owner]);
    await admin(db, "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'manager')", [id, manager]);
    await expect(run(db, user(manager), account, [id])).rejects.toThrow();
  });

  it('anon no lee datos privados ni ejecuta funciones de pagos o solicitudes', async () => {
    for (const table of ['organization_bank_accounts', 'transfer_payments', 'merchant_verification_requests', 'experience_requests', 'user_roles']) {
      await expect(run(db, anon, `select * from public.${table}`)).rejects.toThrow();
    }
    expect(await run(db, anon, "select name from storage.objects where bucket_id='payment-receipts'")).toEqual([]);
    await expect(run(db, anon, "select public.submit_merchant_application('Negocio','business',true)")).rejects.toThrow();
  });

  it('metadatos o preferencias del cliente no conceden roles ni verificación', async () => {
    expect(await run(db, user(stranger), 'select public.is_admin() as admin')).toEqual([{ admin: false }]);
    await expect(run(db, user(stranger), "insert into public.user_roles(user_id,role) values($1,'admin')", [stranger])).rejects.toThrow();
    await expect(run(db, user(stranger), "select public.grant_role($1,'admin','Intento desde navegador')", [stranger])).rejects.toThrow();
    await expect(run(db, user(manager), "update public.organization_members set role='owner' where organization_id=$1 and user_id=$2", [org, manager])).rejects.toThrow();
    await expect(run(db, user(owner), "update public.organizations set verification_status='official_registry_verified' where id=$1", [org])).rejects.toThrow();
  });

  it('solicitudes conectadas requieren correo confirmado aunque se invoque el RPC directamente', async () => {
    await expect(run(db, user(unverified), "select public.submit_merchant_application('Negocio','business',true)")).rejects.toThrow('Verified account required');
    await expect(run(db, user(unverified), "select public.submit_experience_request('security-offer','information','Consulta',gen_random_uuid())")).rejects.toThrow('Verified account required');
  });

  it('la solicitud pertenece al viajero autenticado y se dirige al negocio del servidor', async () => {
    const key = crypto.randomUUID();
    const sql = "select public.submit_experience_request('security-offer','information','Consulta',$1) as id";
    const result = await run(db, user(traveler), sql, [key]);
    expect(await run(db, user(traveler), sql, [key])).toEqual(result);
    expect(await run(db, user(stranger), 'select id from public.experience_requests')).toEqual([]);
    expect(await run(db, user(owner), 'select traveler_id,organization_id from public.experience_requests')).toEqual([{ traveler_id: traveler, organization_id: org }]);
    await expect(run(db, user(traveler), "update public.experience_requests set traveler_id=$1", [stranger])).rejects.toThrow();
    await expect(run(db, user(stranger), "insert into public.experience_requests(traveler_id,experience_id,kind,message,idempotency_key) values($1,'security-offer','information','Suplantación',gen_random_uuid())", [traveler])).rejects.toThrow();
  });

  async function transfer(amount = 30) {
    return run<{ t: { id: string; organizationId: string } }>(db, user(traveler),
      "select public.start_transfer_payment('security-offer',current_date+5,current_date+5,1,0,$1,gen_random_uuid()) as t", [amount]);
  }
  it('el importe del navegador no cambia el precio del servidor', async () => {
    await expect(transfer(0.01)).rejects.toThrow('Transfer amount does not match server price');
    await expect(run(db, user(traveler), "update public.transfer_payments set amount=0.01")).rejects.toThrow();
  });

  it('live tampoco permite un pagador ajeno, correo sin confirmar ni saltarse la preparación comercial', async () => {
    const slot = crypto.randomUUID();
    await admin(db, "insert into public.availability_slots(id,experience_id,starts_at,capacity,price_amount,currency) values($1,'security-offer',now()+interval '20 days',20,30,'USD')", [slot]);
    const [{ id }] = await admin<{ id: string }>(db, `insert into public.bookings(traveler_id,experience_id,slot_id,participants,status,unit_price,total_amount,currency,payment_environment)
      values($1,'security-offer',$2,1,'requested',0,0,'USD','live') returning id`, [traveler, slot]);
    await admin(db, "update public.bookings set status='confirmed' where id=$1", [id]);
    await admin(db, "update public.bookings set status='awaiting_payment' where id=$1", [id]);
    await admin(db, "update public.payment_environment_binding set environment='live'");
    const sql = 'select public.claim_payphone_checkout($1,$2,$3,$4)';
    await expect(run(db, anon, sql, [id, traveler, crypto.randomUUID(), 'live'])).rejects.toThrow();
    await expect(run(db, user(traveler), sql, [id, traveler, crypto.randomUUID(), 'live'])).rejects.toThrow();
    await expect(run(db, service, sql, [id, stranger, crypto.randomUUID(), 'live'])).rejects.toThrow('Booking unavailable');
    await admin(db, 'update auth.users set email_confirmed_at=null where id=$1', [traveler]);
    await expect(run(db, service, sql, [id, traveler, crypto.randomUUID(), 'live'])).rejects.toThrow('Verified account required');
    await admin(db, 'update auth.users set email_confirmed_at=now() where id=$1', [traveler]);
    await expect(run(db, service, sql, [id, traveler, crypto.randomUUID(), 'live'])).rejects.toThrow('Commercial configuration pending');
    expect(await admin(db, 'select reference from public.payment_checkouts where booking_id=$1', [id])).toEqual([]);
  });

  it('contrasta tamaño y tipo con el objeto almacenado, no con declaraciones del navegador', async () => {
    const [{ t }] = await transfer();
    const path = `${org}/${traveler}/${t.id}/recibo.pdf`;
    await run(db, user(traveler), "insert into storage.objects(bucket_id,name,metadata) values('payment-receipts',$1,$2)", [path, { mimetype: 'application/pdf', size: 200 }]);
    await expect(run(db, user(traveler), 'select public.submit_transfer_receipt($1,$2,$3,$4)', [t.id, path, 'image/jpeg', 1])).rejects.toThrow('Receipt metadata mismatch');
    await run(db, user(traveler), 'select public.submit_transfer_receipt($1,$2,$3,$4)', [t.id, path, 'application/pdf', 200]);
    await expect(run(db, user(stranger), 'select public.submit_transfer_receipt($1,$2,$3,$4)', [t.id, path, 'application/pdf', 200])).rejects.toThrow('Transfer unavailable');
    expect(await run(db, user(stranger), "select name from storage.objects where bucket_id='payment-receipts' and name=$1", [path])).toEqual([]);
    expect(await admin(db, "select public from storage.buckets where id='payment-receipts'")).toEqual([{ public: false }]);
  });

  it('permite aportar documentos cuando la revisión humana pide cambios', async () => {
    const [{ id }] = await run<{ id: string }>(db, user(traveler), "select public.submit_merchant_application('Nuevo negocio','business',true) as id");
    const [{ organization_id: applicationOrg }] = await admin<{ organization_id: string }>(db, 'update public.merchant_verification_requests set status=$1 where id=$2 returning organization_id', ['needs_changes', id]);
    const path = `${applicationOrg}/${traveler}/correccion.pdf`;
    await run(db, user(traveler), "insert into storage.objects(bucket_id,name) values('merchant-verification',$1)", [path]);
    await run(db, user(traveler), 'insert into public.verification_documents(request_id,uploaded_by,object_path) values($1,$2,$3)', [id, traveler, path]);
    await expect(run(db, user(stranger), "select public.resubmit_verification_request($1,'Datos corregidos')", [id])).rejects.toThrow('Request not found');
    await run(db, user(traveler), "select public.resubmit_verification_request($1,'Datos corregidos')", [id]);
    expect(await run(db, user(traveler), 'select status from public.merchant_verification_requests where id=$1', [id])).toEqual([{ status: 'submitted' }]);
  });
});
