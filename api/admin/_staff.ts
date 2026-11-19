import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requestBoundary } from '../_request.js';
export function staffMethod(req:VercelRequest,res:VercelResponse){
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).json({error:'Método no permitido.'});return false;}
  return requestBoundary(req,res);
}
export function staffService(){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  try{if(!url||!key||new URL(url).protocol!=='https:')return null;
    return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  }catch{return null;}
}
