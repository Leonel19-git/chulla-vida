import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createHash,randomBytes } from 'node:crypto';
import { staffIdentifier,normalizeStaffUsername } from '../../src/features/admin/staff-identity.js';
import { staffService,staffMethod } from './_staff.js';

/** One-use, ten-minute owner-issued ticket. No open registration or client role assignment. */
export default async function handler(req:VercelRequest,res:VercelResponse){
  if(!staffMethod(req,res))return;
  const token=req.body?.ticket;
  if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))return res.status(401).json({error:'Acceso de preparación no válido.'});
  const client=staffService();if(!client)return res.status(503).json({error:'El acceso de equipo no está configurado.'});
  try{
    const ticket=await client.rpc('consume_staff_provisioning_ticket',{p_hash:createHash('sha256').update(token).digest('hex')});
    if(ticket.error||!ticket.data)return res.status(401).json({error:'Acceso de preparación vencido o ya utilizado.'});
    const username=normalizeStaffUsername(ticket.data.username);
    if(!username||!['admin','reviewer'].includes(ticket.data.staff_role))throw new Error('Invalid ticket');
    const password=randomBytes(24).toString('base64url')+'!Aa7';
    const created=await client.auth.admin.createUser({email:staffIdentifier(username),password,email_confirm:true,app_metadata:{lane:'staff'},user_metadata:{display_name:username}});
    if(created.error||!created.data.user)return res.status(409).json({error:'No se pudo crear la identidad del equipo.',stage:'identity',reasonCode:created.error?.code??'identity_unavailable'});
    const registered=await client.rpc('register_staff_account',{p_ticket_id:ticket.data.id,p_user_id:created.data.user.id});
    if(registered.error){await client.auth.admin.deleteUser(created.data.user.id);return res.status(409).json({error:'No se pudo registrar el acceso del equipo.',stage:'registration',reasonCode:registered.error.code,reason:registered.error.message});}
    return res.status(201).json({username,password,role:ticket.data.staff_role,mustChangePassword:true});
  }catch{return res.status(409).json({error:'No se pudo preparar el acceso. Solicita una nueva autorización al propietario.'});}
}
