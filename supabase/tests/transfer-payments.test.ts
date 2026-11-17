import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, anon, as, createDatabase, run, user } from './helpers/db';

/* Pago por transferencia: cuenta del negocio, comprobante privado y verificación solo del anfitrión. */
const traveler = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const guide = '44444444-4444-4444-8444-444444444444';
const outsider = '55555555-5555-4555-8555-555555555555';
const org = '66666666-6666-4666-8666-666666666666';
const otherOrg = '77777777-7777-4777-8777-777777777777';
let db: PGlite;

const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
type Transfer = { id: string; reference: string; status: string; organizationId: string; amount: number; bank: Record<string, string> | null; rejectionReason: string | null };
async function start(actor = traveler, experience = 'transfer-test', key = crypto.randomUUID(), amount = 90) {
  const [{ t }] = await run<{ t: Transfer }>(db, user(actor), 'select public.start_transfer_payment($1,$2,$3,$4,$5,$6,$7) as t',
    [experience, future(10), future(11), 2, 1, amount, key]);
  return t;
}
const path = (transfer: Transfer, actor = traveler, file = 'recibo.jpg') => `${transfer.organizationId}/${actor}/${transfer.id}/${file}`;
async function upload(transfer: Transfer, actor = traveler, file = 'recibo.jpg') {
  await run(db, user(actor), "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [path(transfer, actor, file)]);
  return path(transfer, actor, file);
}
async function submit(transfer: Transfer, receipt: string, actor = traveler) {
  const [{ t }] = await run<{ t: Transfer }>(db, user(actor), 'select public.submit_transfer_receipt($1,$2,$3,$4) as t', [transfer.id, receipt, 'image/jpeg', 120000]);
  return t;
}
async function review(transfer: Transfer, actor: string, decision: 'paid' | 'rejected', reason: string | null = null) {
  const [{ t }] = await run<{ t: Transfer }>(db, user(actor), 'select public.review_transfer_payment($1,$2,$3) as t', [transfer.id, decision, reason]);
  return t;
}

describe('transferencia bancaria con comprobante', () => {
  beforeAll(async () => {
    db = await createDatabase();
    await admin(db, "insert into public.regions(id,name) values('sierra','Sierra')");
    await admin(db, 'insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now()),($3,now()),($4,now()),($5,now())', [traveler, owner, other, guide, outsider]);
    await admin(db, "insert into public.organizations(id,owner_id,name,kind,verification_status) values($1,$2,'Negocio de prueba','business','identity_reviewed'),($3,$4,'Otro negocio','business','identity_reviewed')", [org, owner, otherOrg, outsider]);
    await admin(db, "insert into public.organization_members(organization_id,user_id,role,status) values($1,$2,'guide','active')", [org, guide]);
    await admin(db, `insert into public.experiences(id,slug,organization_id,title,localized_region,price_type,price_min,status,operator_verification_status,booking_enabled)
      values('transfer-test','transfer-test',$1,'Experiencia de prueba','sierra','verified_offer',30,'published','identity_reviewed',true),
            ('no-account','no-account',$2,'Sin cuenta','sierra','verified_offer',30,'published','identity_reviewed',true),
            ('proposed-only','proposed-only',$1,'Solo propuesta','sierra','proposed',30,'published','identity_reviewed',false)`, [org, otherOrg]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it('solo los responsables del negocio registran y leen su cuenta bancaria', async () => {
    const insert = 'insert into public.organization_bank_accounts(organization_id,bank_name,account_type,account_number,holder_name,holder_id) values($1,$2,$3,$4,$5,$6)';
    await expect(run(db, user(traveler), insert, [org, 'Banco X', 'ahorros', '2201234567', 'Ana Pérez', '1710543518'])).rejects.toThrow();
    await expect(run(db, user(guide), insert, [org, 'Banco X', 'ahorros', '2201234567', 'Ana Pérez', '1710543518'])).rejects.toThrow();
    await expect(run(db, user(owner), insert, [org, 'Banco X', 'ahorros', '12AB', 'Ana Pérez', '1710543518'])).rejects.toThrow();
    await run(db, user(owner), insert, [org, '  Banco Comunitario ', 'ahorros', '2201234567', 'Ana Pérez', '1710543518']);
    expect(await run(db, user(owner), 'select bank_name,updated_by from public.organization_bank_accounts')).toEqual([{ bank_name: 'Banco Comunitario', updated_by: owner }]);
    expect(await run(db, user(traveler), 'select * from public.organization_bank_accounts')).toEqual([]);
    expect(await run(db, user(guide), 'select * from public.organization_bank_accounts')).toEqual([]);
    await expect(run(db, anon, 'select * from public.organization_bank_accounts')).rejects.toThrow();
  });

  it('sin cuenta registrada no se abre ninguna transferencia', async () => {
    await expect(start(traveler, 'no-account')).rejects.toThrow('Host bank account missing');
    await expect(start(traveler, 'no-existe')).rejects.toThrow('Host unavailable');
    expect(await admin(db, "select id from public.transfer_payments where experience_id='no-account'")).toEqual([]);
  });

  it('valida fechas, personas y monto, y exige cuenta verificada', async () => {
    const call = (start: string, end: string, adults: number, children: number, amount: number) => run(db, user(traveler),
      'select public.start_transfer_payment($1,$2,$3,$4,$5,$6,$7)', ['transfer-test', start, end, adults, children, amount, crypto.randomUUID()]);
    await expect(call(future(5), future(4), 1, 0, 30)).rejects.toThrow('Invalid transfer request');
    await expect(call(future(5), future(5), 0, 1, 30)).rejects.toThrow('Invalid transfer request');
    await expect(call(future(5), future(5), 40, 11, 30)).rejects.toThrow('Invalid transfer request');
    await expect(call(future(5), future(5), 1, 0, 0)).rejects.toThrow('Invalid transfer request');
    await expect(call(future(-2), future(1), 1, 0, 30)).rejects.toThrow('Invalid transfer request');
    await expect(call(future(5), future(70), 1, 0, 30)).rejects.toThrow('Invalid transfer request');
    await admin(db, 'update auth.users set email_confirmed_at=null where id=$1', [traveler]);
    await expect(start()).rejects.toThrow('Verified account required');
    await admin(db, 'update auth.users set email_confirmed_at=now() where id=$1', [traveler]);
    await expect(run(db, anon, 'select public.start_transfer_payment($1,$2,$3,$4,$5,$6,$7)', ['transfer-test', future(5), future(5), 1, 0, 30, crypto.randomUUID()])).rejects.toThrow();
  });

  it('crea referencia única, entrega los datos del negocio y repite la misma con la misma clave', async () => {
    const key = crypto.randomUUID();
    const first = await start(traveler, 'transfer-test', key);
    expect(first.reference).toMatch(/^CV-T-[A-Z0-9]{6}$/);
    expect(first).toMatchObject({ status: 'awaiting_receipt', amount: 90, bank: { bankName: 'Banco Comunitario', accountNumber: '2201234567', holderId: '1710543518' } });
    expect((await start(traveler, 'transfer-test', key)).id).toBe(first.id);
    await expect(start(owner)).rejects.toThrow('Hosts cannot pay their own experience');
    const audit = await admin(db, "select action from public.admin_audit_logs where target_id=$1", [first.id]);
    expect(audit).toEqual([{ action: 'transfer.started' }]);
  });

  it('el viajero no puede escribir la tabla ni marcarse pagado', async () => {
    const transfer = await start();
    await expect(run(db, user(traveler), "update public.transfer_payments set status='paid' where id=$1", [transfer.id])).rejects.toThrow();
    await expect(run(db, user(traveler), "insert into public.transfer_payments(reference,traveler_id,organization_id,experience_id,start_date,end_date,adults,amount,idempotency_key,status) values('CV-T-AAAAAA',$1,$2,'transfer-test',current_date+1,current_date+1,1,1,gen_random_uuid(),'paid')", [traveler, org])).rejects.toThrow();
    const receipt = await upload(transfer);
    await submit(transfer, receipt);
    await expect(review(transfer, traveler, 'paid')).rejects.toThrow('Not allowed');
    await expect(review(transfer, guide, 'paid')).rejects.toThrow('Not allowed');
    await expect(review(transfer, outsider, 'paid')).rejects.toThrow('Not allowed');
    expect((await admin(db, 'select status from public.transfer_payments where id=$1', [transfer.id]))[0].status).toBe('receipt_submitted');
  });

  it('rechaza un precio forjado desde el navegador y una oferta no verificada sin crear transferencias', async () => {
    const before = (await admin(db, 'select count(*)::integer as n from public.transfer_payments'))[0].n;
    await expect(start(traveler, 'transfer-test', crypto.randomUUID(), 0.01)).rejects.toThrow('Transfer amount does not match server price');
    await expect(start(traveler, 'transfer-test', crypto.randomUUID(), 89.99)).rejects.toThrow('Transfer amount does not match server price');
    await expect(start(traveler, 'proposed-only')).rejects.toThrow('Verified fixed offer required');
    expect((await admin(db, 'select count(*)::integer as n from public.transfer_payments'))[0].n).toBe(before);
  });

  it('no reutiliza una clave de intento para cambiar precio, fechas o personas', async () => {
    const key = crypto.randomUUID();
    const transfer = await start(traveler, 'transfer-test', key);
    await expect(start(traveler, 'transfer-test', key, 0.01)).rejects.toThrow('Idempotency conflict');
    await expect(run(db, user(traveler), 'select public.start_transfer_payment($1,$2,$3,$4,$5,$6,$7)',
      ['transfer-test', future(12), future(13), 2, 1, 90, key])).rejects.toThrow('Idempotency conflict');
    await expect(run(db, user(traveler), 'select public.start_transfer_payment($1,$2,$3,$4,$5,$6,$7)',
      ['transfer-test', future(10), future(11), 1, 2, 90, key])).rejects.toThrow('Idempotency conflict');
    expect((await start(traveler, 'transfer-test', key)).id).toBe(transfer.id);
  });

  it('el comprobante es privado: solo el viajero y los miembros del negocio lo leen', async () => {
    const transfer = await start();
    const receipt = await upload(transfer);
    const read = (actor: string) => run(db, user(actor), "select name from storage.objects where bucket_id='payment-receipts' and name=$1", [receipt]);
    expect(await read(traveler)).toHaveLength(1);
    expect(await read(owner)).toHaveLength(1);
    expect(await read(guide)).toHaveLength(1);
    expect(await read(other)).toHaveLength(0);
    expect(await read(outsider)).toHaveLength(0);
    expect(await run(db, anon, "select name from storage.objects where bucket_id='payment-receipts'")).toEqual([]);
    expect((await admin(db, "select public from storage.buckets where id='payment-receipts'"))[0]).toEqual({ public: false });
    // Otro viajero no puede subir en carpeta ajena ni suplantar la ruta.
    await expect(upload(transfer, other)).rejects.toThrow();
    await expect(run(db, user(other), "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [path(transfer, traveler, 'falso.jpg')])).rejects.toThrow();
    // Nadie lo borra ni lo cambia desde el cliente.
    expect(await run(db, user(traveler), "delete from storage.objects where bucket_id='payment-receipts' and name=$1 returning name", [receipt])).toEqual([]);
    expect(await run(db, user(owner), "update storage.objects set name='x' where bucket_id='payment-receipts' and name=$1 returning name", [receipt])).toEqual([]);
    // Las filas de la transferencia tampoco se ven fuera de viajero y negocio.
    expect(await run(db, user(other), 'select id from public.transfer_payments where id=$1', [transfer.id])).toEqual([]);
    expect(await run(db, user(outsider), 'select id from public.transfer_payments where id=$1', [transfer.id])).toEqual([]);
    expect(await run(db, user(guide), 'select id from public.transfer_payments where id=$1', [transfer.id])).toHaveLength(1);
    await expect(run(db, user(other), 'select public.transfer_instructions($1)', [transfer.id])).rejects.toThrow('Transfer unavailable');
  });

  it('exige que el archivo exista en su carpeta antes de pasar a revisión', async () => {
    const transfer = await start();
    await expect(submit(transfer, path(transfer, traveler, 'nunca-subido.jpg'))).rejects.toThrow('Receipt file not found');
    const foreign = await start();
    const receipt = await upload(foreign);
    await expect(submit(transfer, receipt)).rejects.toThrow('Invalid receipt');
    await expect(submit(transfer, `${transfer.organizationId}/${traveler}/${transfer.id}/../x.jpg`)).rejects.toThrow('Invalid receipt');
    await expect(submit(transfer, receipt, other)).rejects.toThrow('Transfer unavailable');
  });

  it('el anfitrión rechaza con motivo, el viajero sube otro y luego el anfitrión marca pagado con auditoría', async () => {
    const transfer = await start();
    const firstReceipt = await upload(transfer, traveler, 'primero.jpg');
    expect((await submit(transfer, firstReceipt)).status).toBe('receipt_submitted');
    await expect(review(transfer, owner, 'rejected', ' ')).rejects.toThrow('Rejection reason required');
    const rejected = await review(transfer, owner, 'rejected', 'El monto no coincide');
    expect(rejected).toMatchObject({ status: 'rejected', rejectionReason: 'El monto no coincide' });
    expect((await run<{ t: Transfer }>(db, user(traveler), 'select public.transfer_instructions($1) as t', [transfer.id]))[0].t.bank).not.toBeNull();
    const second = await upload(transfer, traveler, 'segundo.pdf');
    expect((await submit(transfer, second)).status).toBe('receipt_submitted');
    const paid = await review(transfer, owner, 'paid');
    expect(paid).toMatchObject({ status: 'paid', rejectionReason: null });
    await expect(review(transfer, owner, 'paid')).rejects.toThrow('Transfer is not waiting for review');
    await expect(upload(transfer, traveler, 'tercero.jpg')).rejects.toThrow();
    const audit = await admin<{ action: string; actor_id: string }>(db, 'select action,actor_id from public.admin_audit_logs where target_id=$1 order by id', [transfer.id]);
    expect(audit.map(row => row.action)).toEqual(['transfer.started', 'transfer.receipt_submitted', 'transfer.rejected', 'transfer.receipt_submitted', 'transfer.paid']);
    expect(audit.at(-1)?.actor_id).toBe(owner);
    expect((await run<{ t: Transfer }>(db, user(traveler), 'select public.transfer_instructions($1) as t', [transfer.id]))[0].t.bank).toBeNull();
  });

  it('un responsable de otro negocio no ve ni decide', async () => {
    const transfer = await start();
    await submit(transfer, await upload(transfer));
    await expect(as(db, user(outsider), session => session.query('select public.review_transfer_payment($1,$2,$3)', [transfer.id, 'paid', null]))).rejects.toThrow('Not allowed');
  });
});
