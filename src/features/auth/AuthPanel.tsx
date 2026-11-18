import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FileCheck2, MailCheck, PlayCircle, RefreshCw, Store, UserRound } from 'lucide-react';
import { TravelerProfile } from '../traveler/TravelerProfile';
import { HostDashboard, type HostApplication, type HostDocument, type HostOrganization } from '../host/HostDashboard';
import { RoleSwitch, useRole } from '../roles/RoleContext';
import { roleStore } from '../roles/role';
import { getSupabase, supabaseConfiguration } from '../../lib/supabase';
import { AccessFlow, type AccessTab } from './AccessFlow';
import { demoGateway, supabaseGateway } from './auth-gateway';
import { DeleteAccount } from './DeleteAccount';
import './auth.css';

import { useT, tr } from '../../i18n/v3';
type Application = HostApplication;
type Organization = HostOrganization;
type PrivateDocument = HostDocument;
interface Membership { organization_id: string; user_id: string; status: string }
interface Inquiry { id: string; experience_id: string; message: string; status: string; created_at: string; traveler_id?: string }
const statusLabel: Record<string, string> = { submitted: 'Pendiente de revisión', approved: 'Aprobada', rejected: 'Rechazada',
  unverified: 'Sin verificar', in_review: 'En revisión', identity_reviewed: 'Identidad revisada', official_registry_verified: 'Registro oficial comprobado',
  requested: 'Consulta registrada', acknowledged: 'Revisada por el equipo', cancelled: 'Cancelada' };

/** Organizaciones que son de la persona: dueña o miembro activo. Un administrador ve todas, pero no por eso es anfitrión. */
export function ownOrganizationIds(userId: string, organizations: Organization[], memberships: Membership[]): string[] {
  const ids = new Set<string>();
  organizations.forEach(org => { if (org.owner_id === userId) ids.add(org.id); });
  memberships.forEach(member => { if (member.user_id === userId && member.status === 'active') ids.add(member.organization_id); });
  return [...ids];
}

/** Connected accounts are separate from the local role selector used by the prototype. */
export function AuthPanel({ experienceId, initialTab }: { experienceId?: string; initialTab?: AccessTab }) {
  return <AccountPanel key={experienceId ?? 'account'} experienceId={experienceId} initialTab={initialTab} />;
}

function AccountPanel({ experienceId, initialTab }: { experienceId?: string; initialTab?: AccessTab }) {
  const t = useT();
  const configuration = supabaseConfiguration();
  const client = getSupabase();
  const gateway = useMemo(() => client ? supabaseGateway(client) : null, [client]);
  const demoAuth = useMemo(() => demoGateway(), []);
  const { isHost } = useRole();
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [ownIds, setOwnIds] = useState<string[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [documents, setDocuments] = useState<PrivateDocument[]>([]);
  const [documentLinks, setDocumentLinks] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [registryReference, setRegistryReference] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const sessionUser = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authEventObserved = false;
    const applySession = (nextSession: Session | null) => {
      const nextId = nextSession?.user.id ?? null;
      if (sessionUser.current !== nextId) {
        setApplications([]); setOrganizations([]); setOwnIds([]); setInquiries([]); setDocuments([]); setDocumentLinks({}); setAdmin(false);
        setReviewNote(''); setRegistryReference(''); setMessage(''); setRequestKey(crypto.randomUUID());
        if (!nextId) setWelcomeName(null);
        roleStore.setServer(null);
        sessionUser.current = nextId;
      }
      setSession(nextSession);
    };
    client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventObserved) return;
      if (error) setNotice(tr("No se pudo recuperar tu sesión. Vuelve a iniciar sesión."));
      else applySession(data.session);
    }).catch(() => { if (active) setNotice(tr("No se pudo recuperar la sesión. Comprueba tu conexión.")); });
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
    const userId = session?.user.id;
    if (!client || !userId) return;
    let active = true;
    Promise.all([
      client.from('user_roles').select('role').eq('user_id', userId),
      client.from('organizations').select('id,name,kind,verification_status,owner_id'),
      client.from('organization_members').select('organization_id,user_id,status'),
      client.from('merchant_verification_requests').select('id,organization_id,status,created_at').order('created_at', { ascending: false }),
      client.from('experience_requests').select('id,experience_id,message,status,created_at,traveler_id').order('created_at', { ascending: false }).limit(30),
      client.from('verification_documents').select('id,request_id,object_path'),
    ]).then(([roles, orgs, members, requests, questions, evidence]) => {
      if (!active) return;
      if ([roles, orgs, requests, questions, evidence].some(result => result.error)) {
        roleStore.setServer({ userId, hostOrganizations: 0, admin: false });
        setNotice(tr("Tu sesión está abierta, pero no se pudo cargar el servicio. Revisa las migraciones o vuelve a intentarlo.")); return;
      }
      const isAdmin = (roles.data as { role: string }[] | null)?.some(role => role.role === 'admin') ?? false;
      const orgList = (orgs.data ?? []) as Organization[];
      const own = ownOrganizationIds(userId, orgList, members.error ? [] : (members.data ?? []) as Membership[]);
      setAdmin(isAdmin); setOrganizations(orgList); setOwnIds(own);
      setApplications((requests.data ?? []) as Application[]);
      setInquiries(((questions.data ?? []) as Inquiry[]).filter(item => !item.traveler_id || item.traveler_id === userId));
      setDocuments((evidence.data ?? []) as PrivateDocument[]);
      roleStore.setServer({ userId, hostOrganizations: own.length, admin: isAdmin });
    }).catch(() => { if (active) setNotice(tr("No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.")); });
    return () => { active = false; };
  }, [client, session?.user.id, revision]);

  async function apply(name: string, kind: string, consent: boolean): Promise<boolean> {
    if (!client || busy || !consent) return false;
    setBusy(true); setNotice('');
    try {
      const { error } = await client.rpc('submit_merchant_application', { p_name: name.trim(), p_kind: kind, p_treatment_consent: consent });
      if (error) throw error;
      setRevision(value => value + 1);
      setNotice(tr("Solicitud enviada. Una persona la revisará; todavía no habilita ventas."));
      return true;
    } catch { setNotice(tr("No se pudo enviar la solicitud. Comprueba tu sesión y vuelve a intentarlo.")); return false; }
    finally { setBusy(false); }
  }

  async function inquire(event: FormEvent) {
    event.preventDefault(); if (!client || !experienceId || busy) return;
    setBusy(true); setNotice('');
    try {
      const { error } = await client.rpc('submit_experience_request', { p_experience_id: experienceId, p_kind: 'information', p_message: message.trim(), p_idempotency_key: requestKey });
      if (error) throw error;
      setMessage(''); setRequestKey(crypto.randomUUID()); setRevision(value => value + 1);
      setNotice(tr("Consulta registrada. El equipo te responde; aún no es reserva ni pago."));
    } catch { setNotice(tr("No se pudo registrar la consulta. Puedes reintentar sin duplicarla.")); }
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
      setNotice(tr("Revisión registrada con tu usuario. Aprobar la identidad no habilita compras ni certifica seguridad."));
    } catch { setNotice(tr("No se pudo registrar la revisión. Revisa permisos, estado y conexión.")); }
    finally { setBusy(false); }
  }

  async function upload(application: Application, file: File | undefined) {
    if (!client || !session || !file || busy) return;
    if (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setNotice(tr("Utiliza PDF, JPG o PNG de hasta 5 MB.")); return;
    }
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${application.organization_id}/${session.user.id}/${crypto.randomUUID()}.${extension}`;
    setBusy(true); setNotice('');
    try {
      const result = await client.storage.from('merchant-verification').upload(path, file, { upsert: false, contentType: file.type });
      if (result.error) throw result.error;
      const { error } = await client.from('verification_documents').insert({ request_id: application.id, uploaded_by: session.user.id, object_path: path });
      if (error) { setNotice(tr("El archivo quedó privado, pero no se asoció a tu solicitud. Pide al equipo que lo revise antes de repetirlo.")); return; }
      setNotice(tr("Documento guardado en tu espacio privado. No tiene enlace público."));
      setRevision(value => value + 1);
    } catch { setNotice(tr("No se pudo subir el documento. Comprueba tu conexión y el estado de tu solicitud.")); }
    finally { setBusy(false); }
  }

  async function openDocument(document: PrivateDocument) {
    if (!client || busy) return;
    setBusy(true);
    try {
      const { data, error } = await client.storage.from('merchant-verification').createSignedUrl(document.object_path, 60);
      if (error || !data) throw error;
      setDocumentLinks(value => ({ ...value, [document.id]: data.signedUrl }));
      setNotice(tr("Enlace privado listo por 60 segundos. No lo compartas."));
    } catch { setNotice(tr("No se pudo abrir el documento. Comprueba tu permiso y vuelve a intentarlo.")); }
    finally { setBusy(false); }
  }

  if (!configuration.available || !gateway) return <section className="auth-panel">
    <div className="auth-hero"><span className="auth-hero-mark" aria-hidden="true"><MailCheck size={26} /></span><div><h2>{t("Tu cuenta de CHULLA VIDA")}</h2>
      <p>{t("Tu perfil, compras y sellos en cualquier dispositivo.")}</p></div></div>
    {demo ? <><p className="auth-demo-banner" role="note"><PlayCircle size={18} aria-hidden="true" />{t("Demostración: no se crean cuentas ni se envían correos.")}</p>
      <AccessFlow key="demo" gateway={demoAuth} initialTab={initialTab} /><button type="button" className="text-button auth-demo-exit" onClick={() => setDemo(false)}>{t("Salir de la demostración")}</button></>
      : <button type="button" className="button button-primary auth-demo-start" onClick={() => setDemo(true)}><PlayCircle size={17} />{t("Ver recorrido de demostración")}</button>}
    <p className="auth-limit">{configuration.available ? t("Las cuentas en línea todavía no están disponibles.") : configuration.reason}</p>
    <details><summary>{t("Qué falta para conectar las cuentas")}</summary><p>{t("URL y clave pública de Supabase, migraciones y plantillas de correo. Detalle en docs/SUPABASE_SETUP.md.")}</p></details>
  </section>;

  const signOut = async () => {
    if (!client) return;
    setBusy(true);
    try { const { error } = await client.auth.signOut(); setNotice(error ? t("No se pudo cerrar la sesión. Vuelve a intentarlo.") : t("Sesión cerrada. ¡Vuelve pronto!")); }
    catch { setNotice(t("No se pudo cerrar la sesión. Revisa tu conexión.")); }
    finally { setBusy(false); }
  };
  const signedIn = Boolean(session && !recovering);
  const hostView = signedIn && isHost;
  const ownOrganizations = organizations.filter(org => ownIds.includes(org.id));
  const ownApplications = applications.filter(item => ownIds.includes(item.organization_id));
  const HeadingIcon = hostView ? Store : UserRound;
  return <section className="auth-panel" aria-busy={busy}><div className="auth-heading"><HeadingIcon size={25} /><h2>{!signedIn ? t("Entrar / Crear cuenta") : hostView ? t("Tu cuenta de negocio") : t("Tu cuenta viajera")}</h2>
    {signedIn && <button type="button" className="auth-refresh" disabled={busy} onClick={() => setRevision(value => value + 1)} aria-label={t("Actualizar datos")}><RefreshCw size={18} aria-hidden="true" /></button>}</div>
    {!signedIn ? <><p className="auth-lead">{t("Tu perfil, compras y sellos en cualquier dispositivo.")}{' '}{t("Confirmas tu correo con un")}{' '}<strong>{t("código de 6 números")}</strong>.</p>
      <AccessFlow gateway={gateway} initialTab={initialTab} startWithNewPassword={recovering} onSignedUp={displayName => setWelcomeName(displayName)} onRecoveryVerified={() => setRecovering(true)} onPasswordUpdated={() => { setRecovering(false); setNotice(t("Contraseña actualizada. Tu sesión sigue abierta.")); }} /></> : <>
      <RoleSwitch />
      <DeleteAccount client={client!} session={session!} />
      {hostView
        ? <HostDashboard client={client!} session={session!} organizations={ownOrganizations} applications={ownApplications} documents={documents} documentLinks={documentLinks} busy={busy}
          onApply={apply} onUpload={(application, file) => void upload(application, file)} onOpenDocument={document => void openDocument(document)} onSignOut={() => void signOut()} />
        : <>
          <TravelerProfile key={session!.user.id} client={client!} session={session!} welcomeName={welcomeName} onSignOut={() => void signOut()} busy={busy} />
          {experienceId && <form className="auth-form" onSubmit={inquire}><h3>{t("Consultar esta experiencia")}</h3><p className="auth-fine">{t("Llega al equipo de CHULLA VIDA. Aún no hay disponibilidad confirmada.")}</p><label>{t("Tu pregunta")}<textarea className="field" maxLength={2000} minLength={1} value={message} onChange={event => setMessage(event.target.value)} required /></label><button className="button button-primary" disabled={busy || !message.trim()}>{t("Registrar consulta")}</button></form>}
          {inquiries.length > 0 && <section className="auth-section"><h3>{t("Tus consultas")}</h3>{inquiries.map(inquiry => <article className="auth-request" key={inquiry.id}><strong>{inquiry.experience_id}</strong><p>{inquiry.message}</p><span>{statusLabel[inquiry.status] ?? inquiry.status}</span></article>)}</section>}
        </>}
      {hostView && admin && applications.length > 0 && <section className="auth-section"><h3><FileCheck2 size={20} />{t("Solicitudes para revisión")}</h3><p className="auth-fine">{t("Eres administrador según el servidor.")}</p>{applications.map(application => { const org = organizations.find(item => item.id === application.organization_id); return <article className="auth-request" key={application.id}><strong>{org?.name ?? t("Organización")}</strong><span>{statusLabel[application.status] ?? application.status}{org && ` · ${statusLabel[org.verification_status] ?? org.verification_status}`}</span><small>{t("Referencia:")}{' '}{application.id}</small>{documents.filter(document => document.request_id === application.id).map((document, index) => <div className="auth-actions" key={document.id}><button className="button button-secondary" disabled={busy} onClick={() => void openDocument(document)}>{t("Preparar acceso privado al documento")}{' '}{index + 1}</button>{documentLinks[document.id] && <a href={documentLinks[document.id]} target="_blank" rel="noreferrer" className="button button-secondary">{t("Abrir documento · vence en 60 s")}</a>}</div>)}{application.status === 'submitted' && <div className="auth-actions"><button className="button button-secondary" disabled={busy || reviewNote.trim().length < 5} onClick={() => review(application.id, 'rejected')}>{t("Rechazar con motivo")}</button><button className="button button-primary" disabled={busy || reviewNote.trim().length < 5} onClick={() => review(application.id, 'approved')}>{t("Registrar aprobación")}</button></div>}</article>; })}<div className="auth-form"><label>{t("Motivo de la revisión (mínimo 5 caracteres)")}<textarea className="field" value={reviewNote} onChange={event => setReviewNote(event.target.value)} minLength={5} maxLength={2000} /></label><label>{t("Referencia oficial comprobada, solo si corresponde")}<input className="field" value={registryReference} onChange={event => setRegistryReference(event.target.value)} maxLength={1000} /></label><p className="auth-fine">{t("Sin referencia oficial solo se registra la revisión de identidad.")}</p></div></section>}
    </>}
    <p role="status" className="auth-notice">{notice}</p>
  </section>;
}
