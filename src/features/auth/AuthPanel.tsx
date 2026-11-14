import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FileCheck2, MailCheck, PlayCircle, Store, UserRound } from 'lucide-react';
import { getSupabase, supabaseConfiguration } from '../../lib/supabase';
import { AccessFlow } from './AccessFlow';
import { demoGateway, supabaseGateway } from './auth-gateway';
import './auth.css';

interface Application { id: string; organization_id: string; status: string; created_at: string }
interface Organization { id: string; name: string; kind: string; verification_status: string }
interface Inquiry { id: string; experience_id: string; message: string; status: string; created_at: string }
interface PrivateDocument { id: string; request_id: string; object_path: string }
const statusLabel: Record<string, string> = { submitted: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'Rechazada',
  unverified: 'Sin verificar', in_review: 'En revisión', identity_reviewed: 'Identidad revisada', official_registry_verified: 'Registro oficial comprobado',
  requested: 'Consulta registrada', acknowledged: 'Revisada por el equipo', cancelled: 'Cancelada' };

/** Connected accounts are separate from the local role selector used by the prototype. */
export function AuthPanel({ experienceId }: { experienceId?: string }) {
  return <AccountPanel key={experienceId ?? 'account'} experienceId={experienceId} />;
}

function AccountPanel({ experienceId }: { experienceId?: string }) {
  const configuration = supabaseConfiguration();
  const client = getSupabase();
  const gateway = useMemo(() => client ? supabaseGateway(client) : null, [client]);
  const demoAuth = useMemo(() => demoGateway(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [organization, setOrganization] = useState('');
  const [kind, setKind] = useState('business');
  const [treatmentConsent, setTreatmentConsent] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [documents, setDocuments] = useState<PrivateDocument[]>([]);
  const [documentLinks, setDocumentLinks] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [registryReference, setRegistryReference] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const sessionUser = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authEventObserved = false;
    const applySession = (nextSession: Session | null) => {
      const nextId = nextSession?.user.id ?? null;
      if (sessionUser.current !== nextId) {
        setApplications([]); setOrganizations([]); setInquiries([]); setDocuments([]); setDocumentLinks({}); setAdmin(false);
        setReviewNote(''); setRegistryReference(''); setMessage(''); setRequestKey(crypto.randomUUID());
        sessionUser.current = nextId;
      }
      setSession(nextSession);
    };
    client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventObserved) return;
      if (error) setNotice('No se pudo recuperar tu sesión. Vuelve a iniciar sesión.');
      else applySession(data.session);
    }).catch(() => { if (active) setNotice('No se pudo recuperar la sesión. Comprueba tu conexión.'); });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      authEventObserved = true;
      applySession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (!nextSession) setRecovering(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    if (!client || !session?.user.id) return;
    let active = true;
    Promise.all([
      client.from('user_roles').select('role'),
      client.from('organizations').select('id,name,kind,verification_status'),
      client.from('merchant_verification_requests').select('id,organization_id,status,created_at').order('created_at', { ascending: false }),
      client.from('experience_requests').select('id,experience_id,message,status,created_at').order('created_at', { ascending: false }).limit(30),
      client.from('verification_documents').select('id,request_id,object_path'),
    ]).then(([roles, orgs, requests, questions, evidence]) => {
      if (!active) return;
      if ([roles, orgs, requests, questions, evidence].some(result => result.error)) {
        setNotice('Tu sesión está abierta, pero no se pudo cargar el servicio. Revisa las migraciones o vuelve a intentarlo.'); return;
      }
      setAdmin(roles.data?.some(role => role.role === 'admin') ?? false);
      setOrganizations(orgs.data ?? []); setApplications(requests.data ?? []); setInquiries(questions.data ?? []); setDocuments(evidence.data ?? []);
    }).catch(() => { if (active) setNotice('No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.'); });
    return () => { active = false; };
  }, [client, session?.user.id, revision]);

  async function apply(event: FormEvent) {
    event.preventDefault(); if (!client || busy || !treatmentConsent) return;
    setBusy(true); setNotice('');
    try {
      const { error } = await client.rpc('submit_merchant_application', { p_name: organization.trim(), p_kind: kind, p_treatment_consent: treatmentConsent });
      if (error) throw error;
      setOrganization(''); setTreatmentConsent(false); setRevision(value => value + 1);
      setNotice('Solicitud enviada para revisión humana. No representa verificación ni habilita ventas.');
    } catch { setNotice('No se pudo enviar la solicitud. Comprueba tu sesión y vuelve a intentarlo.'); }
    finally { setBusy(false); }
  }

  async function inquire(event: FormEvent) {
    event.preventDefault(); if (!client || !experienceId || busy) return;
    setBusy(true); setNotice('');
    try {
      const { error } = await client.rpc('submit_experience_request', { p_experience_id: experienceId, p_kind: 'information', p_message: message.trim(), p_idempotency_key: requestKey });
      if (error) throw error;
      setMessage(''); setRequestKey(crypto.randomUUID()); setRevision(value => value + 1);
      setNotice('Consulta registrada para el equipo de CHULLA VIDA. No confirma disponibilidad, reserva ni pago; no se ha enviado a un anfitrión externo.');
    } catch { setNotice('No se pudo registrar la consulta. Puedes reintentar; conservaremos su identificador para evitar duplicados.'); }
    finally { setBusy(false); }
  }

  async function review(requestId: string, decision: 'approved' | 'rejected') {
    if (!client || busy || reviewNote.trim().length < 5) return;
    setBusy(true); setNotice('');
    try {
      const { error } = await client.rpc('review_merchant_application', { p_request_id: requestId, p_decision: decision,
        p_note: reviewNote.trim(), p_registry_reference: registryReference.trim() || null });
      if (error) throw error;
      setReviewNote(''); setRegistryReference(''); setRevision(value => value + 1);
      setNotice('Revisión registrada con tu usuario. La aprobación de identidad no habilita compras ni certifica seguridad.');
    } catch { setNotice('No se pudo registrar la revisión. Revisa permisos, estado de la solicitud y conexión.'); }
    finally { setBusy(false); }
  }

  async function upload(application: Application, file: File | undefined) {
    if (!client || !session || !file || busy) return;
    if (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setNotice('Utiliza PDF, JPG o PNG de hasta 5 MB.'); return;
    }
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${application.organization_id}/${session.user.id}/${crypto.randomUUID()}.${extension}`;
    setBusy(true); setNotice('');
    try {
      const result = await client.storage.from('merchant-verification').upload(path, file, { upsert: false, contentType: file.type });
      if (result.error) throw result.error;
      const { error } = await client.from('verification_documents').insert({ request_id: application.id, uploaded_by: session.user.id, object_path: path });
      if (error) { setNotice('El archivo quedó privado, pero no se pudo asociar a tu solicitud. Pide al administrador que revise los archivos pendientes antes de repetirlo.'); return; }
      setNotice('Documento guardado en el espacio privado de tu solicitud. No se genera un enlace público.');
      setRevision(value => value + 1);
    } catch { setNotice('No se pudo subir el documento. Comprueba tu conexión y el estado de tu solicitud.'); }
    finally { setBusy(false); }
  }

  async function openDocument(document: PrivateDocument) {
    if (!client || busy) return;
    setBusy(true);
    try {
      const { data, error } = await client.storage.from('merchant-verification').createSignedUrl(document.object_path, 60);
      if (error || !data) throw error;
      setDocumentLinks(value => ({ ...value, [document.id]: data.signedUrl }));
      setNotice('Enlace privado preparado durante 60 segundos. Ábrelo con el botón del documento y no lo compartas.');
    } catch { setNotice('No se pudo abrir el documento. Comprueba tu permiso y solicita un enlace nuevo.'); }
    finally { setBusy(false); }
  }

  if (!configuration.available || !gateway) return <section className="auth-panel">
    <div className="auth-hero"><span className="auth-hero-mark" aria-hidden="true"><MailCheck size={26} /></span><div><h2>Tu cuenta de CHULLA VIDA</h2>
      <p>Crearás tu cuenta con tu correo y un <strong>código de 6 números</strong> que te llega al instante. Las cuentas se activan cuando conectemos el servidor; mientras tanto puedes explorar todo y guardar tus ideas en este dispositivo.</p></div></div>
    {demo ? <><p className="auth-demo-banner" role="note"><PlayCircle size={18} aria-hidden="true" />Recorrido de demostración: nada sale de tu navegador, no se crean cuentas ni se envían correos.</p>
      <AccessFlow key="demo" gateway={demoAuth} /><button type="button" className="text-button auth-demo-exit" onClick={() => setDemo(false)}>Salir de la demostración</button></>
      : <button type="button" className="button button-primary auth-demo-start" onClick={() => setDemo(true)}><PlayCircle size={17} />Ver recorrido de demostración</button>}
    <p className="auth-limit">{configuration.available ? 'Las cuentas en línea todavía no están disponibles.' : configuration.reason} El selector de viajero o negocio es una demostración local.</p>
    <details><summary>Qué falta para conectar las cuentas</summary><p>Configurar la URL y la clave pública de Supabase, aplicar las migraciones, cargar las plantillas de correo con código y probar el envío. Las instrucciones están en docs/SUPABASE_SETUP.md del proyecto.</p></details>
  </section>;

  return <section className="auth-panel" aria-busy={busy}><div className="auth-heading"><UserRound size={25} /><h2>{session && !recovering ? 'Tu cuenta conectada' : 'Tu cuenta de CHULLA VIDA'}</h2></div>
    {(!session || recovering) ? <AccessFlow gateway={gateway} startWithNewPassword={recovering} onRecoveryVerified={() => setRecovering(true)} onPasswordUpdated={() => { setRecovering(false); setNotice('Contraseña actualizada. Tu sesión sigue abierta.'); }} /> : <><p>Sesión de <strong>{session.user.email}</strong>. {admin ? 'Administrador autorizado por el servidor.' : 'Viajero. Representar un negocio requiere revisión.'}</p><div className="auth-actions"><button className="button button-secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Actualizar datos</button><button className="button button-secondary" onClick={async () => { setBusy(true); const { error } = await client!.auth.signOut(); setNotice(error ? 'No se pudo cerrar la sesión. Vuelve a intentarlo.' : 'Sesión cerrada.'); setBusy(false); }}>Cerrar sesión</button></div>
      {experienceId && <form className="auth-form" onSubmit={inquire}><h3>Consultar esta experiencia</h3><p>Tu consulta llegará al equipo de la plataforma. No hay disponibilidad ni operador confirmado para estas fichas.</p><label>Tu pregunta<textarea className="field" maxLength={2000} minLength={1} value={message} onChange={event => setMessage(event.target.value)} required /></label><button className="button button-primary" disabled={busy || !message.trim()}>Registrar consulta</button></form>}
      <section className="auth-section"><h3><Store size={20} />Representar un negocio o comunidad</h3><form onSubmit={apply} className="auth-form"><label>Nombre de tu organización<input className="field" value={organization} onChange={event => setOrganization(event.target.value)} minLength={2} maxLength={160} required /></label><label>Represento<select className="field" value={kind} onChange={event => setKind(event.target.value)}><option value="business">Un negocio</option><option value="community">Una comunidad</option></select></label><label className="auth-check"><input type="checkbox" checked={treatmentConsent} onChange={event => setTreatmentConsent(event.target.checked)} required /><span>Autorizo el tratamiento de los datos que envío para revisar esta solicitud. No autorizo publicidad y no recibiré verificación automática.</span></label><button className="button button-primary" disabled={busy || !treatmentConsent}>Solicitar revisión</button></form></section>
      {applications.length > 0 && <section className="auth-section"><h3><FileCheck2 size={20} />{admin ? 'Solicitudes para revisión' : 'Tus solicitudes'}</h3>{applications.map(application => { const org = organizations.find(item => item.id === application.organization_id); return <article className="auth-request" key={application.id}><strong>{org?.name ?? 'Organización'}</strong><span>{statusLabel[application.status] ?? application.status}{org && ` · ${statusLabel[org.verification_status] ?? org.verification_status}`}</span><small>Referencia: {application.id}</small>{documents.filter(document => document.request_id === application.id).map((document, index) => <div className="auth-actions" key={document.id}><button className="button button-secondary" disabled={busy} onClick={() => openDocument(document)}>Preparar acceso privado al documento {index + 1}</button>{documentLinks[document.id] && <a href={documentLinks[document.id]} target="_blank" rel="noreferrer" className="button button-secondary">Abrir documento · vence en 60 s</a>}</div>)}{application.status === 'submitted' && !admin && <label>Adjuntar documento privado (PDF, JPG o PNG; máximo 5 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => { void upload(application, event.target.files?.[0]); event.target.value = ''; }} /></label>}{admin && application.status === 'submitted' && <div className="auth-actions"><button className="button button-secondary" disabled={busy || reviewNote.trim().length < 5} onClick={() => review(application.id, 'rejected')}>Rechazar con motivo</button><button className="button button-primary" disabled={busy || reviewNote.trim().length < 5} onClick={() => review(application.id, 'approved')}>Registrar aprobación</button></div>}</article>; })}{admin && <div className="auth-form"><label>Motivo de la revisión (mínimo 5 caracteres)<textarea className="field" value={reviewNote} onChange={event => setReviewNote(event.target.value)} minLength={5} maxLength={2000} /></label><label>Referencia oficial comprobada, solo si corresponde<input className="field" value={registryReference} onChange={event => setRegistryReference(event.target.value)} maxLength={1000} /></label><p>Sin referencia oficial se registra únicamente revisión de identidad. Verifica la documentación antes de aprobar.</p></div>}</section>}
      {inquiries.length > 0 && <section className="auth-section"><h3>Consultas registradas</h3>{inquiries.map(inquiry => <article className="auth-request" key={inquiry.id}><strong>{inquiry.experience_id}</strong><p>{inquiry.message}</p><span>{statusLabel[inquiry.status] ?? inquiry.status}</span></article>)}</section>}
    </>}
    <p role="status" className="auth-notice">{notice}</p><p className="auth-limit">La cuenta conectada no modifica los datos ni permisos de los perfiles locales de demostración. No hay cobros ni reservas comerciales habilitados.</p>
  </section>;
}
