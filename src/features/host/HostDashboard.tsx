import { useEffect, useId, useState, type FormEvent } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { Banknote, Compass, Landmark, FileCheck2, FileLock2, Inbox, LogOut, Map as MapIcon, Plus, ReceiptText, Store } from 'lucide-react';
import { roleStore } from '../roles/role';
import { TransferReviewList } from '../payments/TransferReviewList';
import { HostBankAccount } from './HostBankAccount';
import { HostExperiences } from './HostExperiences';
import { HostVerificationActions } from './HostVerificationActions';
import { useT, msg } from '../../i18n/v3';
import './host-dashboard.css';

export interface HostOrganization { id: string; name: string; kind: string; verification_status: string; owner_id?: string | null }
export interface HostApplication { id: string; organization_id: string; status: string; created_at: string }
export interface HostDocument { id: string; request_id: string; object_path: string }

/** Números del negocio: `null` = no se pudo leer (se muestra «—», nunca un número inventado). */
export interface HostStats { experiences: number | null; requests: number | null; paymentsToReview: number | null; payoutsPaid: number | null; payoutsPending: number | null; currency: string }
const EMPTY_STATS: HostStats = { experiences: null, requests: null, paymentsToReview: null, payoutsPaid: null, payoutsPending: null, currency: 'USD' };

const STATUS: Record<string, string> = { submitted: msg('En revisión'), approved: msg('Aprobada'), rejected: msg('Rechazada'), unverified: msg('Sin verificar'), in_review: msg('En revisión'),
  identity_reviewed: msg('Identidad revisada'), official_registry_verified: msg('Registro oficial comprobado'), needs_changes: msg('Necesita cambios'), appealed: msg('Apelación en revisión'), expired: msg('Revisión vencida'), suspended: msg('Suspendido') };

type Query = PromiseLike<{ data: unknown; error: unknown }>;
interface Filterable extends Query { in?: (column: string, values: string[]) => Filterable }
async function rows<T>(query: Query): Promise<T[] | null> {
  try { const { data, error } = await query; return error || !Array.isArray(data) ? null : data as T[]; } catch { return null; }
}
/** Lee las cifras del panel con las políticas RLS del servidor; cada consulta falla por separado. */
export async function loadHostStats(client: SupabaseClient, organizationIds: string[]): Promise<HostStats> {
  if (!organizationIds.length) return { ...EMPTY_STATS, experiences: 0, requests: 0, paymentsToReview: 0, payoutsPaid: 0, payoutsPending: 0 };
  const scoped = (table: string, columns: string) => {
    const query = client.from(table).select(columns) as unknown as Filterable;
    return typeof query.in === 'function' ? query.in('organization_id', organizationIds) : query;
  };
  const mine = <T extends { organization_id?: string | null }>(list: T[] | null) => list ? list.filter(row => Boolean(row.organization_id && organizationIds.includes(row.organization_id))) : null;
  const [experiences, requests, bookings, transfers, payoutRows] = await Promise.all([
    rows<{ id: string; organization_id: string | null }>(scoped('experiences', 'id,organization_id,status')),
    rows<{ id: string; organization_id: string | null; status: string }>(scoped('experience_requests', 'id,organization_id,status')),
    rows<{ id: string; organization_id: string | null; status: string }>(scoped('bookings', 'id,organization_id,status')),
    rows<{ organization_id: string; status: string }>(scoped('transfer_payments', 'organization_id,status')),
    rows<{ amount: number | string; currency: string; status: string; beneficiaries: { organization_id: string } | { organization_id: string }[] }>((() => {
      const query = client.from('payouts').select('amount,currency,status,beneficiaries!inner(organization_id)') as unknown as Filterable;
      return typeof query.in === 'function' ? query.in('beneficiaries.organization_id', organizationIds) : query;
    })()),
  ]);
  const ownBookings = mine(bookings);
  const payouts = payoutRows?.filter(row => {
    const beneficiary = Array.isArray(row.beneficiaries) ? row.beneficiaries[0] : row.beneficiaries;
    return beneficiary && organizationIds.includes(beneficiary.organization_id);
  }) ?? null;
  const validPayouts = payouts && payouts.every(row => Number.isFinite(Number(row.amount)) && Number(row.amount) >= 0 && ['USD','EUR'].includes(row.currency))
    && new Set(payouts.map(row => row.currency)).size <= 1;
  const sum = (status: string[]) => validPayouts ? Math.round(payouts!.filter(row => status.includes(row.status)).reduce((total, row) => total + Number(row.amount), 0) * 100) / 100 : null;
  return {
    experiences: mine(experiences)?.length ?? null,
    requests: (() => { const open = mine(requests)?.filter(row => row.status === 'requested').length; const toConfirm = ownBookings?.filter(row => row.status === 'awaiting_merchant_confirmation').length; return open === undefined || toConfirm === undefined ? null : open + toConfirm; })(),
    paymentsToReview: mine(transfers)?.filter(row => row.status === 'receipt_submitted').length ?? null,
    payoutsPaid: sum(['paid']), payoutsPending: sum(['pending', 'scheduled']), currency: payouts?.[0]?.currency ?? 'USD',
  };
}

export interface HostDashboardProps {
  client: SupabaseClient;
  session: Session;
  organizations: HostOrganization[];
  applications: HostApplication[];
  documents: HostDocument[];
  documentLinks: Record<string, string>;
  busy: boolean;
  onApply: (name: string, kind: string, consent: boolean) => Promise<boolean>;
  onUpload: (application: HostApplication, file: File | undefined) => void;
  onOpenDocument: (document: HostDocument) => void;
  onSignOut: () => void;
}

/** Panel del negocio: solo lo suyo. Nada de perfil viajero, compras ni pasaporte. */
export function HostDashboard({ client, session, organizations, applications, documents, documentLinks, busy, onApply, onUpload, onOpenDocument, onSignOut }: HostDashboardProps) {
  const t = useT();
  const ids = useId();
  const [stats, setStats] = useState<HostStats>(EMPTY_STATS);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('business');
  const [consent, setConsent] = useState(false);
  const orgKey = organizations.map(org => org.id).join(',');
  useEffect(() => {
    let active = true;
    loadHostStats(client, orgKey ? orgKey.split(',') : []).then(value => { if (active) setStats(value); }).catch(() => { if (active) setStats(EMPTY_STATS); });
    return () => { active = false; };
  }, [client, orgKey]);
  const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('es-EC', { style: 'currency', currency: stats.currency === 'EUR' ? 'EUR' : 'USD', maximumFractionDigits: 2 }).format(value);
  const count = (value: number | null) => value === null ? '—' : String(value);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await onApply(name, kind, consent)) { setName(''); setConsent(false); }
  };
  const label = session.user.email ?? '';
  const first = organizations[0];
  const needsChanges = applications.some(item => item.status === 'needs_changes');
  const awaitingReview = organizations.some(org => !['identity_reviewed','official_registry_verified'].includes(org.verification_status));
  const nextStep = !organizations.length ? 'Registra tu negocio para solicitar revisión.' : needsChanges ? 'Sube los documentos corregidos y envíalos a revisión.'
    : stats.paymentsToReview ? 'Revisa los comprobantes recibidos antes de confirmar el pago.'
      : awaitingReview
        ? 'Completa tus documentos. Una persona revisará tu solicitud.' : 'Revisa tus experiencias y prepara el siguiente borrador.';
  const tiles = [
    { id: 'exp', icon: MapIcon, value: count(stats.experiences), label: msg('Experiencias') },
    { id: 'req', icon: Inbox, value: count(stats.requests), label: msg('Solicitudes') },
    { id: 'pay', icon: ReceiptText, value: count(stats.paymentsToReview), label: msg('Pagos por revisar') },
    { id: 'out', icon: Banknote, value: money(stats.payoutsPaid), label: msg('Cobrado'), extra: stats.payoutsPending ? t('{amount} en camino', { amount: money(stats.payoutsPending) }) : undefined },
  ];
  return <div className="host-dash">
    <header className="host-dash-card" data-tour="host">
      <span className="host-dash-mark" aria-hidden="true"><Store size={26} /></span>
      <div><h3>{first?.name ?? t('Tu negocio')}</h3><p>{label}</p>
        <span className="host-dash-badge">{first ? t(STATUS[first.verification_status] ?? first.verification_status) : t('Sin registrar')}</span></div>
      <button type="button" className="button button-secondary host-dash-signout" disabled={busy} onClick={onSignOut}><LogOut size={16} />{t('Cerrar sesión')}</button>
    </header>

    <section className="host-dash-next" aria-label={t('Siguiente paso')}><h3>{t('Siguiente paso')}</h3><p>{t(nextStep)}</p>
      <a className="button button-primary" href={`#${ids}-${!organizations.length ? 'apply' : needsChanges || stats.paymentsToReview || awaitingReview ? 'orgs' : 'experiences'}`}>{t(!organizations.length ? 'Registrar negocio' : needsChanges || awaitingReview ? 'Ver solicitud' : stats.paymentsToReview ? 'Revisar comprobantes' : 'Ver experiencias')}</a>
    </section>

    <ul className="host-dash-tiles" aria-label={t('Resumen de tu negocio')}>
      {tiles.map(({ id, icon: Icon, value, label: text, extra }) => <li key={id}><Icon size={22} aria-hidden="true" /><strong>{value}</strong><span>{t(text)}</span>{extra && <small>{extra}</small>}</li>)}
    </ul>

    {organizations.length > 0 && <section className="host-dash-section" data-tour="host-requests" aria-labelledby={`${ids}-orgs`}>
      <h3 id={`${ids}-orgs`}><FileCheck2 size={20} aria-hidden="true" />{t('Verificación y cobros')}</h3>
      <p>{t('La revisión es humana. Registrar una cuenta bancaria no activa ventas.')}</p>
      <ul className="host-dash-list">{organizations.map(org => {
        const orgApplications = applications.filter(item => item.organization_id === org.id);
        return <li key={org.id}><div className="host-dash-row"><strong>{org.name}</strong><span className="host-dash-pill">{t(STATUS[org.verification_status] ?? org.verification_status)}</span></div>
          {orgApplications.map(application => <div key={application.id} className="host-dash-app">
            <small>{t(STATUS[application.status] ?? application.status)} · {t('ref.')} {application.id.slice(0, 8)}</small>
            {documents.filter(doc => doc.request_id === application.id).map((doc, index) => <div className="auth-actions" key={doc.id}>
              <button type="button" className="button button-secondary" disabled={busy} onClick={() => onOpenDocument(doc)}><FileLock2 size={16} />{t('Documento {n}', { n: index + 1 })}</button>
              {documentLinks[doc.id] && <a href={documentLinks[doc.id]} target="_blank" rel="noreferrer" className="button button-secondary">{t('Abrir · 60 s')}</a>}</div>)}
            {['submitted','needs_changes'].includes(application.status) && <label className="host-dash-upload"><Plus size={16} aria-hidden="true" />{t('Subir documento privado')} <small>{t('PDF, JPG o PNG · máx. 5 MB')}</small>
              <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => { onUpload(application, event.target.files?.[0]); event.target.value = ''; }} /></label>}
            <HostVerificationActions key={`${application.id}-${application.status}`} client={client} application={application} />
          </div>)}
          {/* Transferencias: la cuenta del negocio y los comprobantes por revisar (RLS: solo responsables). */}
          <details className="host-dash-transfers"><summary><Landmark size={18} aria-hidden="true" />{t('Cobros por transferencia')}</summary>
            <HostBankAccount organizationId={org.id} isOwner={org.owner_id === session.user.id} />
            <TransferReviewList organizationId={org.id} />
          </details>
        </li>;
      })}</ul>
    </section>}

    {organizations.length > 0 && <div id={`${ids}-experiences`}><HostExperiences key={`${session.user.id}-${orgKey}`} client={client} organizationIds={organizations.map(org => org.id)} /></div>}

    <p className="host-hub-note">{t("De una, anfitrión. Prepara tus experiencias y deja claros los servicios, precios y condiciones.")}</p><details id={`${ids}-apply`} className="host-dash-section host-dash-apply" open={organizations.length === 0 ? true : undefined}>
      <summary><Store size={20} aria-hidden="true" />{organizations.length ? t('Registrar otro negocio') : t('Registra tu negocio o comunidad')}</summary>
      <form onSubmit={event => void submit(event)} className="auth-form">
        <label>{t('Nombre')}<input className="field" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={160} required /></label>
        <label>{t('Represento')}<select className="field" value={kind} onChange={event => setKind(event.target.value)}><option value="business">{t('Un negocio')}</option><option value="community">{t('Una comunidad')}</option></select></label>
        <label className="auth-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>{t('Autorizo usar estos datos solo para revisar mi solicitud.')}</span></label>
        <button className="button button-primary" disabled={busy || !consent || name.trim().length < 2}>{t('Solicitar revisión')}</button>
        <p className="auth-fine">{t('Una persona revisa cada solicitud. No es una verificación automática.')}</p>
      </form>
    </details>

    <button type="button" className="text-button host-dash-traveler" onClick={() => roleStore.requestTraveler()}><Compass size={16} aria-hidden="true" />{t('También viajo: activar modo viajero')}</button>
  </div>;
}
