import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import type {VercelRequest,VercelResponse} from '@vercel/node';
const state=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn(),createUser:vi.fn(),deleteUser:vi.fn(),updateUserById:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({rpc:state.rpc,auth:{getUser:state.getUser,admin:{createUser:state.createUser,deleteUser:state.deleteUser,updateUserById:state.updateUserById}}})}));
import provision from '../../api/admin/staff-provision';
import passwordChange from '../../api/admin/staff-password';
const id='10000000-0000-4000-8000-000000000001',session='20000000-0000-4000-8000-000000000001';
const jwt=`test.${Buffer.from(JSON.stringify({session_id:session})).toString('base64url')}.signature`;
function response(){return{code:0,value:undefined as unknown,headers:{}as Record<string,unknown>,setHeader(name:string,value:unknown){this.headers[name]=value;return this;},status(code:number){this.code=code;return this;},json(value:unknown){this.value=value;return this;}};}
const request=(body:unknown,headers:Record<string,string>={})=>({method:'POST',headers:{host:'chulla-vida.vercel.app','content-type':'application/json',...headers},query:{},body})as VercelRequest;
beforeEach(()=>{Object.values(state).forEach(fn=>fn.mockReset());vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-server-secret');state.rpc.mockResolvedValue({data:true,error:null});state.getUser.mockResolvedValue({data:{user:{id,app_metadata:{lane:'staff'}}},error:null});state.updateUserById.mockResolvedValue({data:{user:{id}},error:null});});
afterEach(()=>vi.unstubAllEnvs());
it('rechaza la preparación sin autorización y solicitudes desde otro origen',async()=>{
 for(const req of [request({}),request({ticket:'x'.repeat(43)},{'sec-fetch-site':'cross-site'})]){const res=response();await provision(req,res as unknown as VercelResponse);expect([401,403]).toContain(res.code);}
 expect(state.createUser).not.toHaveBeenCalled();
});
it('crea una identidad individual con clave aleatoria solo tras consumir la autorización del propietario',async()=>{
 state.rpc.mockImplementation(async(name:string)=>({data:name==='consume_staff_provisioning_ticket'?{id:'ticket',username:'chulla.admin',staff_role:'admin'}:null,error:null}));
 state.createUser.mockResolvedValue({data:{user:{id}},error:null});const res=response();await provision(request({ticket:'x'.repeat(43)}),res as unknown as VercelResponse);
 expect(res.code).toBe(201);expect(res.headers['Cache-Control']).toBe('no-store');expect(res.value).toMatchObject({username:'chulla.admin',mustChangePassword:true,password:expect.stringMatching(/.{32,}/)});
 expect(state.createUser).toHaveBeenCalledWith(expect.objectContaining({email:'chulla.admin@staff.chulla-vida.invalid',app_metadata:{lane:'staff'}}));
 expect(state.rpc).toHaveBeenCalledWith('register_staff_account',{p_ticket_id:'ticket',p_user_id:id});
});
it('no cambia contraseñas con sesión inválida ni permite elegir otro usuario',async()=>{
 state.rpc.mockResolvedValue({data:false,error:null});const res=response();await passwordChange(request({password:'Contraseña-Segura-2099!',userId:'another'},{authorization:`Bearer ${jwt}`}),res as unknown as VercelResponse);
 expect(res.code).toBe(403);expect(state.updateUserById).not.toHaveBeenCalled();
});
it('cambia solo la contraseña del titular autenticado y registra el corte de sesiones',async()=>{
 const res=response();await passwordChange(request({password:'Contraseña-Segura-2099!',userId:'another'},{authorization:`Bearer ${jwt}`}),res as unknown as VercelResponse);
 expect(res.code).toBe(200);expect(state.updateUserById).toHaveBeenCalledWith(id,{password:'Contraseña-Segura-2099!'});
 expect(state.rpc).toHaveBeenCalledWith('complete_staff_password_change',{p_user_id:id});
});
