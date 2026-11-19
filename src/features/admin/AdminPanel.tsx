import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ClipboardCheck, FileLock2, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { getSupabase } from '../../lib/supabase';
import { useT, msg } from '../../i18n/v3';
import { openAccount } from '../workspace/AccountButton';
import { AdminAccessError, decideRequest, loadAdminRequests, loadReviewDetail, PAGE_SIZE, privateDocumentLink, requireAdministrator, type AdminRequest, type ReviewDecision, type ReviewDetail, type ReviewFilter } from './api';
import './admin.css';

const STATUS: Record<string, string> = { submitted: msg('Pendiente de revisión'), in_review: msg('En revisión'), appealed: msg('Apelación en revisión'), needs_changes: msg('Necesita cambios'), approved: msg('Aprobada'), rejected: msg('Rechazada'), expired: msg('Revisión vencida') };
const FILTERS: [ReviewFilter, string][] = [['pending', msg('Pendientes')], ['needs_changes', msg('Necesita cambios')], ['resolved', msg('Resueltas')], ['all', msg('Todas')]];
type Access = 'checking' | 'signed_out' | 'denied' | 'unavailable' | 'ready';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const client = getSupabase();
  const [access, setAccess] = useState<Access>('checking');
  const [actorId, setActorId] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!client) return;
    let active = true, epoch = 0;
    const check = async () => {
      const current = ++epoch;
      setAccess('checking'); setActorId('');
      try { const id = await requireAdministrator(client); if (active && current === epoch) { setActorId(id); setAccess('ready'); } }
      catch (error) { if (active && current === epoch) setAccess(error instanceof AdminAccessError ? error.reason : 'unavailable'); }
    };
    void check();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      if (!active) return;
      ++epoch; setAccess('checking'); setActorId('');
      queueMicrotask(() => { if (active) void check(); });
    });
    return () => { active = false; ++epoch; subscription.unsubscribe(); };
  }, [client, retry]);
  const state = client ? access : 'unavailable';
  return <Dialog title={t('Administración')} onClose={onClose} wide><div className="admin-panel">
    {state === 'ready' && client ? <AdminWorkspace key={actorId} client={client} actorId={actorId} onDenied={() => { setActorId(''); setAccess('denied'); }} /> : <section className="admin-gate">
      <ShieldCheck size={32} aria-hidden="true" /><h3>{t(state === 'checking' ? 'Comprobando tu cuenta…' : 'Acceso de administración')}</h3>
      <p role={state === 'checking' ? 'status' : undefined}>{t(state === 'checking' ? 'Un momento, por favor.' : state === 'signed_out' ? 'Entra con tu correo confirmado para abrir tu espacio.' : state === 'denied' ? 'Tu cuenta no tiene permiso para revisar negocios.' : 'No se pudo conectar con la revisión. Vuelve a intentarlo.')}</p>
      {state === 'signed_out' && <button className="button button-primary" onClick={() => { onClose(); openAccount('login'); }}>{t('Entrar')}</button>}
      {state !== 'checking' && <button className="button button-secondary" onClick={() => setRetry(value => value + 1)}>{t('Reintentar')}</button>}
    </section>}
  </div></Dialog>;
}

export function AdminWorkspace({ client, actorId, onDenied, onEditorial }: { client: SupabaseClient; actorId: string; onDenied: () => void; onEditorial?: () => void }) {
  const t = useT();
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setNotice(''); setRows([]); setSelected('');
    loadAdminRequests(client, filter, page).then(result => {
      if (!active) return;
      setRows(result.rows); setCount(result.count); setSelected(result.rows[0]?.id ?? '');
    }).catch(error => {
      if (!active) return;
      if (error instanceof AdminAccessError && error.reason !== 'unavailable') onDenied();
      else setNotice(t('No se pudo cargar la bandeja. Actualiza para volver a intentar.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, filter, page, revision]);
  const request = rows.find(row => row.id === selected);
  return <>
    <header className="admin-heading"><div><span><ClipboardCheck size={18} aria-hidden="true" />{t('Revisión humana de negocios')}</span><h3>{t('Negocios y documentos')}</h3><p>{t('Revisa la evidencia antes de decidir. Subir documentos no aprueba un negocio.')}</p></div><button className="button button-secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} />{t('Actualizar datos')}</button></header>
    <nav className="admin-filters" aria-label={t('Filtrar solicitudes')}>{FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => { setFilter(id); setPage(0); }}>{t(label)}</button>)}</nav>
    {notice && <p role="alert">{notice}</p>}
    {success && <p role="status">{success}</p>}
    <div className="admin-layout" aria-busy={loading}>
      <aside className="admin-inbox"><p>{t('Solicitudes: {n}', { n: loading ? '—' : count })}</p>
        {loading ? <p role="status">{t('Cargando solicitudes…')}</p> : rows.length ? <ul>{rows.map(row => <li key={row.id}><button aria-pressed={selected === row.id} onClick={() => setSelected(row.id)}><strong>{row.organization?.name ?? t('Organización')}</strong><span>{t(STATUS[row.status] ?? row.status)}</span><small>{row.created_at.slice(0, 10)}</small></button></li>)}</ul> : !notice && <p>{t('No hay solicitudes en este estado. Las nuevas aparecerán aquí.')}</p>}
        <nav className="admin-pages" aria-label={t('Páginas de solicitudes')}><button className="button button-secondary" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>{t('Anterior')}</button><span>{page + 1}</span><button className="button button-secondary" disabled={loading || (page + 1) * PAGE_SIZE >= count} onClick={() => setPage(value => value + 1)}>{t('Siguiente')}</button></nav>
      </aside>
      <div className="admin-work">{request && <RequestReview key={`${request.id}:${revision}`} client={client} actorId={actorId} request={request} onSaved={() => { setSuccess(t('Decisión registrada con tu usuario.')); setRevision(value => value + 1); }} onDenied={onDenied} />}</div>
    </div>
    <p className="admin-footnote">{t('La aprobación de identidad no activa ventas ni acredita seguridad o permisos turísticos.')}</p>
    {onEditorial && <button className="text-button" onClick={onEditorial}>{t('Estudio de contenido')}</button>}
  </>;
}

function RequestReview({ client, actorId, request, onSaved, onDenied }: { client: SupabaseClient; actorId: string; request: AdminRequest; onSaved: () => void; onDenied: () => void }) {
  const t = useT();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<ReviewDecision | ''>('');
  const [note, setNote] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [official, setOfficial] = useState(false);
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const requirementsId = useId();
  const [links, setLinks] = useState<Record<string, string>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    loadReviewDetail(client, request.id).then(value => { if (live.current) setDetail(value); }).catch(() => { if (live.current) setError(t('No se pudo cargar la evidencia. Actualiza la bandeja.')); });
    return () => { live.current = false; timers.current.forEach(clearTimeout); };
  }, [client, request.id]);
  const own = request.applicant_id === actorId || request.organization?.owner_id === actorId;
  const pending = ['submitted', 'in_review', 'appealed'].includes(request.status);
  const missing: { field: string; message: string }[] = [];
  if (!decision) missing.push({ field: 'decision', message: t('Elige qué decisión vas a registrar.') });
  if (decision === 'approved') {
    if (!detail?.documents.length) missing.push({ field: '', message: t('Faltan documentos. Solicítalos antes de aprobar.') });
    const unchecked = ['identity', 'representation', 'documents'].find(key => !checklist[key]);
    if (unchecked) missing.push({ field: unchecked, message: t('Marca las tres comprobaciones después de revisar la evidencia.') });
    if (official && (reference.trim().length < 5 || reference.trim().length > 1000)) missing.push({ field: 'registry', message: t('Añade una referencia oficial de 5 a 1000 caracteres.') });
  }
  if (note.trim().length < 5 || note.trim().length > 2000) missing.push({ field: 'note', message: t('Escribe el motivo de la decisión (mínimo 5 caracteres).') });
  if (!confirmed) missing.push({ field: 'confirmation', message: t('Confirma que quieres registrar esta decisión.') });
  const ready = Boolean(detail && !missing.length && !own && pending);
  const focusField = (name: string) => {
    const field = form.current?.elements.namedItem(name);
    if (field instanceof HTMLElement) field.focus();
  };
  const requestDocuments = () => {
    setDecision('needs_changes'); setConfirmed(false); setAttempted(false); setError('');
    if (!note.trim()) setNote(t('Adjunta documentos de identidad y representación del negocio para continuar la revisión.'));
    focusField('note');
  };
  const openDocument = async (document: ReviewDetail['documents'][number]) => {
    setBusy(true); setError('');
    try {
      const url = await privateDocumentLink(client, document);
      if (!live.current) return;
      setLinks(current => ({ ...current, [document.id]: url }));
      timers.current.push(setTimeout(() => setLinks(current => { const next = { ...current }; delete next[document.id]; return next; }), 60000));
    } catch { if (live.current) setError(t('No se pudo abrir el documento. Revisa permisos y conexión.')); }
    finally { if (live.current) setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !detail || own || !pending) return;
    setAttempted(true); setError('');
    if (!ready || !decision) { focusField(missing.find(item => item.field)?.field ?? ''); return; }
    setBusy(true); setError('');
    try { await decideRequest(client, actorId, request, { decision, note, checklist: { ...checklist, official_registry: official }, registryReference: official ? reference : undefined }); if (live.current) onSaved(); }
    catch (problem) { if (live.current) { if (problem instanceof AdminAccessError && problem.reason === 'denied') onDenied(); else setError(t('No se pudo registrar la revisión. Actualiza el estado antes de reintentar.')); } }
    finally { if (live.current) setBusy(false); }
  };
  return <article className="admin-request" aria-busy={busy}>
    <header><h4>{request.organization?.name ?? t('Organización')}</h4><span className="admin-status">{t(STATUS[request.status] ?? request.status)}</span></header>
    <small>{t('Referencia:')} {request.id}</small>
    {request.applicant_note && <p>{request.applicant_note}</p>}{request.appeal_note && <p>{t('Motivo de la apelación')}: {request.appeal_note}</p>}
    <section><h5><FileLock2 size={18} />{t('Documentos privados')}</h5>{detail ? detail.documents.length ? <ul className="admin-documents">{detail.documents.map((document, index) => <li key={document.id}><span>{t('Documento {n}', { n: index + 1 })}</span><button className="button button-secondary" disabled={busy || Boolean(links[document.id])} onClick={() => void openDocument(document)}>{t('Preparar acceso privado al documento')}</button>{links[document.id] && <a className="button button-secondary" href={links[document.id]} target="_blank" rel="noreferrer noopener">{t('Abrir documento · vence en 60 s')}</a>}</li>)}</ul> : <p>{t('Todavía no hay documentos. Pide que los adjunten antes de aprobar.')}</p> : <p role="status">{t('Cargando documentos…')}</p>}</section>
    {own ? <p role="note">{t('No puedes revisar tu propio negocio.')}</p> : pending && detail && <form ref={form} className="auth-form" noValidate onSubmit={event => void submit(event)}><fieldset disabled={busy}>
      <legend>{t('Registrar decisión')}</legend><label>{t('Decisión')}<select name="decision" className="field" value={decision} required aria-invalid={attempted && !decision || undefined} onChange={event => { setDecision(event.target.value as ReviewDecision); setConfirmed(false); }}><option value="">{t('Elige una opción')}</option><option value="needs_changes">{t('Solicitar correcciones')}</option><option value="rejected">{t('Rechazar con motivo')}</option><option value="approved">{t('Aprobar identidad')}</option></select></label>
      {decision === 'approved' && <div className="admin-checklist">{([['identity', 'Identidad contrastada'], ['representation', 'Representación del negocio comprobada'], ['documents', 'Documentos revisados']] as const).map(([key, label]) => <label key={key}><input name={key} type="checkbox" checked={Boolean(checklist[key])} aria-invalid={attempted && !checklist[key] || undefined} onChange={event => setChecklist(current => ({ ...current, [key]: event.target.checked }))} />{t(label)}</label>)}<label><input type="checkbox" checked={official} onChange={event => setOfficial(event.target.checked)} />{t('También comprobé un registro oficial')}</label>{official && <label>{t('Referencia oficial comprobada, solo si corresponde')}<input name="registry" className="field" value={reference} required minLength={5} maxLength={1000} aria-invalid={attempted && missing.some(item => item.field === 'registry') || undefined} onChange={event => setReference(event.target.value)} /></label>}</div>}
      <label>{t('Motivo de la revisión (mínimo 5 caracteres)')}<textarea name="note" className="field" rows={3} minLength={5} maxLength={2000} required value={note} aria-invalid={attempted && missing.some(item => item.field === 'note') || undefined} onChange={event => setNote(event.target.value)} /></label>
      <label className="admin-confirm"><input name="confirmation" type="checkbox" checked={confirmed} aria-invalid={attempted && !confirmed || undefined} onChange={event => setConfirmed(event.target.checked)} />{t('Confirmo esta decisión. Quedará registrada con mi usuario.')}</label>
      <div id={requirementsId} className={`admin-requirements${ready ? ' is-ready' : ''}`}>
        <strong>{t(ready ? 'Todo listo para guardar.' : 'Para guardar esta decisión')}</strong>
        {!ready && <ul>{missing.map(item => <li key={item.field}>{item.message}</li>)}</ul>}
        {decision === 'approved' && !detail.documents.length && <button type="button" className="button button-secondary" onClick={requestDocuments}>{t('Solicitar documentos')}</button>}
      </div>
      {attempted && !ready && <p role="alert" className="admin-validation">{t('Completa los requisitos indicados. La decisión todavía no se ha guardado.')}</p>}
      <button className="button button-primary" type="submit" aria-describedby={requirementsId} disabled={busy}>{busy ? t('Guardando…') : t('Guardar decisión')}</button>
    </fieldset></form>}
    {error && <p role="alert">{error}</p>}
    {detail && <section><h5><History size={18} />{t('Historial de revisión')}</h5>{detail.history.length ? <ol className="admin-history">{detail.history.map(item => <li key={item.id}><strong>{t(STATUS[item.decision] ?? item.decision)}</strong><time>{item.created_at.slice(0, 10)}</time><p>{item.note}</p>{item.registry_reference && <small>{item.registry_reference}</small>}</li>)}</ol> : <p>{t('Sin decisiones anteriores.')}</p>}</section>}
  </article>;
}
