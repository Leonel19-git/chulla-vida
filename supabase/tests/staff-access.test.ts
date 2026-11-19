import {afterAll,beforeAll,expect,it} from 'vitest';
import type {PGlite} from '@electric-sql/pglite';
import {admin,anon,as,createDatabase,run,service,user,type Session} from './helpers/db';
const owner='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002',reviewer='10000000-0000-4000-8000-000000000003';
const oldSession='20000000-0000-4000-8000-000000000001',newSession='20000000-0000-4000-8000-000000000002';
let db:PGlite;
const withStaff=<T>(id:string,sessionId:string,work:(session:Session)=>Promise<T>)=>as(db,user(id),async session=>{await session.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:'authenticated',sub:id,session_id:sessionId})]);return work(session);});
beforeAll(async()=>{
 db=await createDatabase();await admin(db,'insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[owner,'owner@example.test']);
 await admin(db,"insert into public.user_roles(user_id,role) values($1,'admin')",[owner]);
},120000);
afterAll(async()=>{await db?.close();});
it('reserva identificadores internos y cierra la creación de accesos a visitantes y usuarios normales',async()=>{
 await expect(admin(db,'insert into auth.users(id,email) values($1,$2)',[staff,'chulla.admin@staff.chulla-vida.invalid'])).rejects.toThrow('trusted provisioning');
 for(const actor of [anon,user(owner)]){
  await expect(run(db,actor,'select public.consume_staff_provisioning_ticket($1)',['a'.repeat(64)])).rejects.toThrow();
  await expect(run(db,actor,"insert into public.staff_accounts(user_id,username,staff_role,created_by) values($1,'intruso','admin',$1)",[owner])).rejects.toThrow();
 }
});
it('consume cada autorización una sola vez y asigna un actor individual con su alcance',async()=>{
 for(const [id,username,role,hash]of [[staff,'chulla.admin','admin','a'],[reviewer,'chulla.revision','reviewer','b']]){
  await admin(db,'insert into public.staff_provisioning_tickets(token_hash,username,staff_role,requested_by,expires_at) values($1,$2,$3,$4,now()+interval \'10 minutes\')',[hash.repeat(64),username,role,owner]);
  const [{ticket}]=await run<{ticket:{id:string}}>(db,service,'select public.consume_staff_provisioning_ticket($1) as ticket',[hash.repeat(64)]);
  await expect(run(db,service,'select public.consume_staff_provisioning_ticket($1)',[hash.repeat(64)])).rejects.toThrow('Invalid provisioning ticket');
  await admin(db,"insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values($1,$2,now(),'{\"lane\":\"staff\"}')",[id,`${username}@staff.chulla-vida.invalid`]);
  await run(db,service,'select public.register_staff_account($1,$2)',[ticket.id,id]);
 }
 expect(await run(db,user(staff),'select username from public.staff_accounts')).toEqual([{username:'chulla.admin'}]);
 expect(await run(db,user(reviewer),'select role from public.user_roles')).toEqual([{role:'verification_reviewer'}]);
});
it('admite el alta transaccional del proveedor sin permitir identidades públicas de equipo',async()=>{
 const staged='10000000-0000-4000-8000-000000000004';
 await db.transaction(async tx=>{
  await tx.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[staged,'staged.staff@staff.chulla-vida.invalid']);
  await tx.query("update auth.users set raw_app_meta_data='{\"lane\":\"staff\"}' where id=$1",[staged]);
 });
 expect(await admin(db,'select id from auth.users where id=$1',[staged])).toEqual([{id:staged}]);
});
it('bloquea la revisión hasta cambiar la clave y rechaza sesiones emitidas antes del cambio',async()=>{
 await admin(db,"insert into auth.sessions(id,user_id,created_at) values($1,$2,now()-interval '1 hour')",[oldSession,staff]);
 expect(await withStaff(staff,oldSession,s=>s.query('select public.is_admin() as allowed'))).toEqual([{allowed:false}]);
 await run(db,service,'select public.complete_staff_password_change($1)',[staff]);
 expect(await withStaff(staff,oldSession,s=>s.query('select public.is_admin() as allowed'))).toEqual([{allowed:false}]);
 await admin(db,"insert into auth.sessions(id,user_id,created_at) values($1,$2,now()+interval '1 second')",[newSession,staff]);
 expect(await withStaff(staff,newSession,s=>s.query('select public.is_admin() as allowed'))).toEqual([{allowed:true}]);
});
it('el revisor no obtiene administración y las cuentas de equipo no crean negocios de viajeros',async()=>{
 const sessionId='20000000-0000-4000-8000-000000000003';
 await run(db,service,'select public.complete_staff_password_change($1)',[reviewer]);
 await admin(db,"insert into auth.sessions(id,user_id,created_at) values($1,$2,now()+interval '1 second')",[sessionId,reviewer]);
 expect(await withStaff(reviewer,sessionId,s=>s.query('select public.is_admin() as admin,public.is_reviewer() as reviewer'))).toEqual([{admin:false,reviewer:true}]);
 await expect(withStaff(staff,newSession,s=>s.query("select public.submit_merchant_application('Negocio no permitido','business',true)"))).rejects.toThrow('Verified account required');
 await admin(db,'update public.staff_accounts set active=false where user_id=$1',[reviewer]);
 expect(await withStaff(reviewer,sessionId,s=>s.query('select public.is_reviewer() as allowed'))).toEqual([{allowed:false}]);
});
it('permite registrar una aprobación real de revisión con cada tipo de acceso de equipo',async()=>{
 await admin(db,'update public.staff_accounts set active=true where user_id=$1',[reviewer]);
 for(const [actor,sessionId]of [[staff,newSession],[reviewer,'20000000-0000-4000-8000-000000000003']]){
  const [{id}]=await run<{id:string}>(db,user(owner),"select public.submit_merchant_application('Negocio de prueba para aprobación','business',true) as id");
  const [{organization_id}]=await admin<{organization_id:string}>(db,'select organization_id from public.merchant_verification_requests where id=$1',[id]);
  const path=`${organization_id}/${owner}/evidence.pdf`;
  await run(db,user(owner),"insert into storage.objects(bucket_id,name) values('merchant-verification',$1)",[path]);
  await run(db,user(owner),'insert into public.verification_documents(request_id,uploaded_by,object_path) values($1,$2,$3)',[id,owner,path]);
  await withStaff(actor,sessionId,s=>s.query("select public.review_verification_request($1,'approved','Evidencia ficticia comprobada en prueba',$2::jsonb)",[id,JSON.stringify({identity:true,representation:true,documents:true})]));
  expect(await run(db,user(owner),'select status from public.merchant_verification_requests where id=$1',[id])).toEqual([{status:'approved'}]);
 }
});
