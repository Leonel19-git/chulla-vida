import type { VercelRequest,VercelResponse } from '@vercel/node';
import { validStaffPassword } from '../../src/features/admin/staff-identity.js';
import { staffMethod,staffService } from './_staff.js';

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(!staffMethod(req,res))return;
  const password=req.body?.password;
  if(typeof password!=='string'||!validStaffPassword(password))return res.status(400).json({error:'La contraseña necesita al menos 14 caracteres, mayúsculas, minúsculas, un número y un símbolo.'});
  const token=typeof req.headers.authorization==='string'&&/^Bearer \S+$/.test(req.headers.authorization)?req.headers.authorization.slice(7):'';
  if(!token)return res.status(401).json({error:'Vuelve a entrar al equipo.'});
  const client=staffService();if(!client)return res.status(503).json({error:'El acceso de equipo no está configurado.'});
  try{
    const {data,error}=await client.auth.getUser(token);
    if(error||!data.user||data.user.app_metadata?.lane!=='staff')return res.status(401).json({error:'Vuelve a entrar al equipo.'});
    // Claims are read only after the provider has authenticated this exact token.
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
    if(!/^[a-f0-9-]{36}$/i.test(claims.session_id??''))return res.status(401).json({error:'Vuelve a entrar al equipo.'});
    const allowed=await client.rpc('staff_session_current',{p_user_id:data.user.id,p_session_id:claims.session_id});
    if(allowed.error||allowed.data!==true)return res.status(403).json({error:'Este acceso no está habilitado.'});
    const changed=await client.auth.admin.updateUserById(data.user.id,{password});
    if(changed.error)throw new Error('Password update failed');
    const saved=await client.rpc('complete_staff_password_change',{p_user_id:data.user.id});
    if(saved.error)throw new Error('Password state failed');
    return res.status(200).json({changed:true,signInAgain:true});
  }catch{return res.status(503).json({error:'No se pudo completar el cambio. Vuelve a entrar con la contraseña nueva antes de reintentar.'});}
}
