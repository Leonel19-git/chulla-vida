import { useEffect,useState,type FormEvent } from 'react';
import { ClipboardCheck,KeyRound,LogOut,ShieldCheck,Eye,EyeOff } from 'lucide-react';
import { useT } from '../../i18n/v3';
import { AdminWorkspace } from './AdminPanel';
import { changeStaffPassword,getStaffClient,readStaffProfile,signInStaff,type StaffProfile } from './staff-client';
import { validStaffPassword } from './staff-identity';
import './staff.css';

export default function StaffApp(){
  const t=useT(),client=getStaffClient();
  const [profile,setProfile]=useState<StaffProfile|null>(null),[checking,setChecking]=useState(true);
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[tab,setTab]=useState<'reviews'|'access'>('reviews');
  useEffect(()=>{
    document.title='Equipo · CHULLA VIDA';
    if(!client){setChecking(false);return;}
    let active=true,epoch=0;
    const check=async()=>{const current=++epoch;try{const next=await readStaffProfile(client);if(active&&current===epoch)setProfile(next);}catch{if(active&&current===epoch){setProfile(null);setNotice(t('No se pudo conectar con el equipo. Reintenta en un momento.'));}}finally{if(active&&current===epoch)setChecking(false);}};
    void check();
    const {data:{subscription}}=client.auth.onAuthStateChange(()=>{++epoch;setProfile(null);setChecking(true);queueMicrotask(()=>{if(active)void check();});});
    return()=>{active=false;++epoch;subscription.unsubscribe();};
  },[client]);
  const login=async(event:FormEvent)=>{
    event.preventDefault();if(!client||busy)return;setBusy(true);setNotice('');
    try{const result=await signInStaff(client,username,password);setPassword('');if('profile'in result&&result.profile)setProfile(result.profile);else setNotice(t(result.error==='rate_limit'?'Demasiados intentos. Espera un momento y vuelve a entrar.':'Usuario o contraseña incorrectos.'));}
    catch{setNotice(t('No se pudo conectar con el equipo. Reintenta en un momento.'));}finally{setBusy(false);}
  };
  const logout=async()=>{setProfile(null);setPassword('');setNotice('');setTab('reviews');if(client)await client.auth.signOut({scope:'local'});};
  const brand=<div className="staff-brand"><img src="/chulla-vida-logo.png" alt="CHULLA VIDA"/><span>{t('Equipo CHULLA VIDA')}</span></div>;
  if(!profile)return <main className="staff-shell staff-entry">{brand}<section className="staff-login"><span className="staff-eyebrow"><ShieldCheck size={18}/>{t('Acceso del equipo')}</span><h1>{t('Tu espacio de trabajo.')}</h1><p>{t('Entra con tu usuario del equipo.')}</p>
    {checking?<p role="status">{t('Comprobando tu cuenta…')}</p>:<form onSubmit={event=>void login(event)}>
      <label>{t('Usuario')}<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={48} value={username} onChange={event=>setUsername(event.target.value)} disabled={busy||!client}/></label>
      <label>{t('Contraseña')}<span className="staff-password"><input name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy||!client}/><button type="button" aria-label={t(visible?'Ocultar contraseña':'Mostrar contraseña')} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
      <button className="staff-primary" disabled={busy||!client}>{t(busy?'Entrando…':'Entrar al dashboard')}</button>
    </form>}
    <p role="status">{notice||(!client?t('El acceso del equipo aún no está configurado.'):'')}</p>
    <small>{t('Si necesitas recuperar el acceso, contacta con el responsable del equipo.')}</small>
  </section></main>;
  return <div className="staff-shell staff-dashboard"><aside className="staff-sidebar">{brand}<nav aria-label={t('Herramientas del equipo')}>
    <button aria-current={tab==='reviews'&&!profile.must_change_password?'page':undefined} disabled={profile.must_change_password} onClick={()=>setTab('reviews')}><ClipboardCheck size={20}/>{t('Negocios y documentos')}</button>
    <button aria-current={tab==='access'||profile.must_change_password?'page':undefined} onClick={()=>setTab('access')}><KeyRound size={20}/>{t('Mi acceso')}</button>
  </nav><div className="staff-identity"><strong>{profile.username}</strong><span>{t(profile.staff_role==='admin'?'Administrador':'Revisor')}</span><button onClick={()=>void logout()}><LogOut size={18}/>{t('Cerrar sesión')}</button></div></aside>
    <main className="staff-main"><header className="staff-top"><span>{t('Dashboard del equipo')}</span><strong>{profile.username}</strong></header>
      {profile.must_change_password||tab==='access'?<PasswordSettings key={profile.user_id} required={profile.must_change_password} onSave={async value=>{if(!client)throw new Error('Unavailable');setChecking(true);try{const next=await changeStaffPassword(client,profile,value);setProfile(next);setTab('reviews');}finally{setChecking(false);}}}/>:client&&<div className="admin-panel"><AdminWorkspace client={client} actorId={profile.user_id} onDenied={()=>void logout()}/></div>}
    </main>
  </div>;
}

function PasswordSettings({required,onSave}:{required:boolean;onSave:(password:string)=>Promise<void>}){
  const t=useT();const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const submit=async(event:FormEvent)=>{event.preventDefault();if(busy||!validStaffPassword(password)||password!==confirm)return;setBusy(true);setNotice('');try{await onSave(password);setPassword('');setConfirm('');}catch{setNotice(t('No se pudo completar el cambio. Vuelve a entrar con la contraseña nueva o contacta con el responsable.'));}finally{setBusy(false);}};
  return <section className="staff-settings"><KeyRound size={28}/><h1>{t(required?'Crea tu contraseña.':'Cambia tu contraseña.')}</h1><p>{t(required?'Tu clave inicial es temporal. Elige una nueva para abrir el dashboard.':'Las sesiones anteriores perderán acceso al cambiar la contraseña.')}</p>
    <form onSubmit={event=>void submit(event)}><label>{t('Nueva contraseña')}<input type="password" autoComplete="new-password" minLength={14} maxLength={128} required disabled={busy} value={password} onChange={event=>setPassword(event.target.value)}/></label><small>{t('Al menos 14 caracteres, con mayúsculas, minúsculas, un número y un símbolo.')}</small><label>{t('Repite la contraseña')}<input type="password" autoComplete="new-password" required disabled={busy} value={confirm} onChange={event=>setConfirm(event.target.value)}/></label><button className="staff-primary" disabled={busy||!validStaffPassword(password)||password!==confirm}>{t(busy?'Guardando…':'Guardar y abrir dashboard')}</button></form><p role="status">{notice}</p>
  </section>;
}
