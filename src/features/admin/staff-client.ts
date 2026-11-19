import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfiguration } from '../../lib/supabase';
import { normalizeStaffUsername,staffIdentifier } from './staff-identity';

export const STAFF_STORAGE_KEY='chullavida:staff:auth';
let staffClient:SupabaseClient|null|undefined;
export function getStaffClient(){
  if(staffClient!==undefined)return staffClient;
  const configuration=supabaseConfiguration();
  staffClient=configuration.available?createClient(configuration.url,configuration.key,{auth:{storageKey:STAFF_STORAGE_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
  return staffClient;
}
export interface StaffProfile { user_id:string;username:string;staff_role:'admin'|'reviewer';active:boolean;must_change_password:boolean }
export async function readStaffProfile(client:SupabaseClient):Promise<StaffProfile|null>{
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)return null;
  if(data.user.app_metadata?.lane!=='staff')return null;
  const account=await client.from('staff_accounts').select('user_id,username,staff_role,active,must_change_password').eq('user_id',data.user.id).maybeSingle();
  if(account.error)throw new Error('Staff unavailable');
  if(!account.data?.active)return null;
  if(!account.data.must_change_password){const permission=await client.rpc('is_reviewer');if(permission.error||permission.data!==true)return null;}
  return account.data as StaffProfile;
}
export async function signInStaff(client:SupabaseClient,username:string,password:string){
  const value=normalizeStaffUsername(username);
  if(!value)return {error:'invalid'} as const;
  const result=await client.auth.signInWithPassword({email:staffIdentifier(value),password});
  if(result.error)return {error:result.error.status===429?'rate_limit':'invalid'} as const;
  const profile=await readStaffProfile(client);
  if(!profile){await client.auth.signOut({scope:'local'});return {error:'invalid'} as const;}
  return {profile} as const;
}
export async function changeStaffPassword(client:SupabaseClient,profile:StaffProfile,password:string){
  const {data}=await client.auth.getSession();
  if(!data.session)throw new Error('Session missing');
  const response=await fetch('/api/admin/staff-password',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Password change failed');
  // New Auth session must postdate the server's credential cutoff; older sessions lose privileges.
  await client.auth.signOut({scope:'local'});
  const result=await signInStaff(client,profile.username,password);
  if(!('profile' in result)||!result.profile)throw new Error('Sign in again');
  return result.profile;
}
