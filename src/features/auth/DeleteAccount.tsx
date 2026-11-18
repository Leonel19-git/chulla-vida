import { useState, type FormEvent } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { Trash2 } from 'lucide-react';
import { useT } from '../../i18n/v3';

/** Solicitud privada de supresión: conserva la revisión de reservas y obligaciones pendientes. */
export function DeleteAccount({ client, session }: { client: SupabaseClient; session: Session }) {
  const t=useT(); const [open,setOpen]=useState(false); const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState(''); const [requestId,setRequestId]=useState('');
  const submit=async(event:FormEvent)=>{
    event.preventDefault(); if(busy||requestId||confirmation!=='ELIMINAR')return;
    setBusy(true);setNotice('');
    try {
      const {data:user,error:authError}=await client.auth.getUser();
      if(authError||user.user?.id!==session.user.id)throw new Error('session');
      const {data,error}=await client.from('privacy_requests').insert({subject_id:user.user.id,kind:'erasure',detail:'Solicitud de eliminación de la cuenta y datos personales desde el perfil. Confirmada por la persona titular.'}).select('id').single();
      if(error||!data?.id)throw new Error('save');
      setRequestId(data.id);setConfirmation('');setNotice(t('Solicitud registrada. El equipo revisará las reservas pendientes y te informará antes de cerrar la cuenta.'));
    }catch{setNotice(t('No se pudo registrar la solicitud. Revisa tu conexión y vuelve a entrar.'));}
    finally{setBusy(false);}
  };
  return <section className="account-delete">
    <button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}><Trash2 size={16}/>{t('Eliminar mi cuenta')}</button>
    {open&&<form onSubmit={event=>void submit(event)} className="auth-form">
      <h3>{t('Solicitar eliminación de cuenta')}</h3>
      <p>{t('Tu cuenta seguirá activa hasta completar la revisión. Los comprobantes y obligaciones pendientes se revisan antes de eliminar datos.')}</p>
      {!requestId&&<><label>{t('Escribe ELIMINAR para confirmar')}<input className="field" value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" maxLength={8} disabled={busy}/></label><button className="button button-secondary" disabled={confirmation!=='ELIMINAR'||busy}>{busy?t('Enviando…'):t('Confirmar solicitud de eliminación')}</button></>}
      <p role="status">{notice}{requestId&&<> {t('Referencia:')} {requestId}</>}</p>
    </form>}
  </section>;
}
