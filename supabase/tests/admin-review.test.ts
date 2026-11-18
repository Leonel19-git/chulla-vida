import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { admin, createDatabase, run, user } from './helpers/db';
const owner='10000000-0000-4000-8000-000000000001',reviewer='10000000-0000-4000-8000-000000000002',other='10000000-0000-4000-8000-000000000003';
let db:PGlite,requestId:string,orgId:string;
const checklist=JSON.stringify({identity:true,representation:true,documents:true});
beforeAll(async()=>{
  db=await createDatabase();
  for(const id of [owner,reviewer,other])await admin(db,'insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${id}@example.test`]);
  await admin(db,"insert into public.user_roles(user_id,role) values($1,'admin')",[reviewer]);
  const [row]=await run<{id:string}>(db,user(owner),"select public.submit_merchant_application('Negocio de prueba','business',true) as id");requestId=row.id;
  const [request]=await admin<{organization_id:string}>(db,'select organization_id from public.merchant_verification_requests where id=$1',[requestId]);orgId=request.organization_id;
},120000);
afterAll(async()=>{await db?.close();});
it('rechaza aprobaciones por la función antigua sin checklist y por usuarios ajenos',async()=>{
  await expect(run(db,user(reviewer),"select public.review_merchant_application($1,'approved','Identidad comprobada')",[requestId])).rejects.toThrow('checklist');
  await expect(run(db,user(other),"select public.review_verification_request($1,'approved','Identidad comprobada',$2::jsonb)",[requestId,checklist])).rejects.toThrow();
});
it('no permite aprobar sin documento ni revisar el propio negocio',async()=>{
  await expect(run(db,user(reviewer),"select public.review_verification_request($1,'approved','Identidad comprobada',$2::jsonb)",[requestId,checklist])).rejects.toThrow('document');
  await admin(db,"insert into public.user_roles(user_id,role) values($1,'admin')",[owner]);
  await expect(run(db,user(owner),"select public.review_merchant_application($1,'rejected','Motivo de rechazo')",[requestId])).rejects.toThrow('own organization');
});
it('guarda decisión, checklist e historial tras una revisión válida',async()=>{
  await admin(db,'insert into public.verification_documents(request_id,uploaded_by,object_path) values($1,$2,$3)',[requestId,owner,`${orgId}/${owner}/evidence.pdf`]);
  await run(db,user(reviewer),"select public.review_verification_request($1,'approved','Identidad y representación comprobadas',$2::jsonb)",[requestId,checklist]);
  expect(await run(db,user(owner),'select status from public.merchant_verification_requests where id=$1',[requestId])).toEqual([{status:'approved'}]);
  expect(await run(db,user(reviewer),'select reviewer_id,decision,checklist from public.verification_reviews where request_id=$1',[requestId])).toEqual([{reviewer_id:reviewer,decision:'approved',checklist:JSON.parse(checklist)}]);
  expect(await run(db,user(reviewer),'select action from public.verification_audit_logs where request_id=$1 and to_status=$2',[requestId,'approved'])).toHaveLength(1);
});
it('permite al solicitante corregir evidencia y reenviarla, sin abrir acceso a otra cuenta',async()=>{
  const [created]=await run<{id:string}>(db,user(other),"select public.submit_merchant_application('Otro negocio','business',true) as id");
  const [request]=await admin<{organization_id:string}>(db,'select organization_id from public.merchant_verification_requests where id=$1',[created.id]);
  await run(db,user(reviewer),"select public.review_verification_request($1,'needs_changes','Adjunta representación del negocio')",[created.id]);
  const path=`${request.organization_id}/${other}/correction.pdf`;
  await run(db,user(other),"insert into storage.objects(bucket_id,name) values('merchant-verification',$1)",[path]);
  await run(db,user(other),'insert into public.verification_documents(request_id,uploaded_by,object_path) values($1,$2,$3)',[created.id,other,path]);
  await expect(run(db,user(owner),'insert into public.verification_documents(request_id,uploaded_by,object_path) values($1,$2,$3)',[created.id,owner,path])).rejects.toThrow();
  await run(db,user(other),"select public.resubmit_verification_request($1,'Documento corregido')",[created.id]);
  expect(await run(db,user(other),'select status from public.merchant_verification_requests where id=$1',[created.id])).toEqual([{status:'submitted'}]);
});
