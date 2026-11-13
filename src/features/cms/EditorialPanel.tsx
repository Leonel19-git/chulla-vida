import { useEffect, useRef, useState } from 'react';
import { Download, FileCheck2, Save, Search, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { experiences, formatExperiencePrice, type Experience } from '../../domain/catalog';
import { applyEditorialFields, editableFields, fieldsFromPublicRecord, makeEditorialDraft, validateEditorialFields, type EditorialFields } from '../../domain/editorial';
import { commercialReadiness } from '../../domain/legal';
import { getSupabase, supabaseConfiguration } from '../../lib/supabase';
import { loadConnectedDraft, readLocalEditorialDrafts, saveConnectedDraft, saveLocalEditorialDraft } from './api';
import './editorial.css';

const splitLines = (text: string) => text.split('\n');
const cleanLines = (lines: string[]) => lines.map(item => item.trim()).filter(Boolean);
const defaultNote = 'Borrador editorial local: confirmar datos con la fuente antes de solicitar revisión.';
export interface EditorialPanelProps { onClose?: () => void; onPublished?: () => void }
/** Panel content: the workspace owns modal focus and presentation. */
export function EditorialPanel({ onClose }: EditorialPanelProps) {
  const [selectedId, setSelectedId] = useState(experiences[0].id);
  const canonical = experiences.find(item => item.id === selectedId)!;
  const [initialDraft] = useState(() => readLocalEditorialDrafts().find(item => item.experienceId === experiences[0].id));
  const [fields, setFields] = useState<EditorialFields>(() => initialDraft?.fields ?? editableFields(experiences[0]));
  const [sourceNote, setSourceNote] = useState(initialDraft?.sourceNote ?? defaultNote);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'content' | 'price' | 'access' | 'preview'>('content');
  const [notice, setNotice] = useState('');
  const [localIds, setLocalIds] = useState<string[]>(() => readLocalEditorialDrafts().map(item => item.experienceId));
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState<{ revision: number; catalogUpdatedAt: string; status: string }>();
  const [audit, setAudit] = useState<{ id: string; action: string; note: string; created_at: string }[]>([]);
  const accountEpoch = useRef(0);
  const client = getSupabase();
  const draftFields = { ...fields, activities: cleanLines(fields.activities), price: { ...fields.price, includes: cleanLines(fields.price.includes), excludes: cleanLines(fields.price.excludes) } };
  const validation = validateEditorialFields(draftFields);
  const preview = validation.ok ? applyEditorialFields(canonical, validation.value) : null;
  const visible = experiences.filter(item => (item.title + ' ' + item.province).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  useEffect(() => {
    if (!client) return;
    let active = true; let eventSeen = false;
    const applySession = (next: Session | null) => {
      const epoch = ++accountEpoch.current;
      setSession(next); setAdmin(false); setCloud(undefined); setAudit([]);
      if (next) void client.rpc('is_admin').then(result => { if (active && epoch === accountEpoch.current) setAdmin(!result.error && result.data === true); });
    };
    void client.auth.getSession().then(result => { if (active && !eventSeen) applySession(result.data.session); }).catch(() => undefined);
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => { eventSeen = true; applySession(next); });
    return () => { active = false; accountEpoch.current += 1; subscription.unsubscribe(); };
  }, [client]);
  const choose = (experience: Experience) => {
    const local = readLocalEditorialDrafts().find(item => item.experienceId === experience.id);
    setSelectedId(experience.id); setFields(local?.fields ?? editableFields(experience)); setSourceNote(local?.sourceNote ?? defaultNote);
    setCloud(undefined); setAudit([]); setNotice(local ? 'Borrador local recuperado. El catálogo público no cambia.' : 'Editando una copia de la fuente. El catálogo público no cambia.'); setTab('content');
  };
  const update = <K extends keyof EditorialFields>(key: K, value: EditorialFields[K]) => setFields(previous => ({ ...previous, [key]: value }));
  const saveLocal = () => {
    try { saveLocalEditorialDraft(makeEditorialDraft(canonical, draftFields, sourceNote)); setLocalIds(readLocalEditorialDrafts().map(item => item.experienceId)); setNotice('Borrador guardado solo en este navegador. No se publicó ni modificó la fuente original.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo guardar el borrador.'); }
  };
  const exportDraft = () => {
    try {
      const draft = makeEditorialDraft(canonical, draftFields, sourceNote);
      const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `borrador-${canonical.slug}.json`; anchor.click(); URL.revokeObjectURL(url);
      setNotice('JSON exportado como borrador editorial. No es contenido publicado.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Revisa el borrador antes de exportar.'); }
  };
  const loadCloud = async () => {
    if (!admin || busy) return; setBusy(true); const epoch = accountEpoch.current;
    try {
      const result = await loadConnectedDraft(selectedId);
      if (epoch !== accountEpoch.current) return;
      if (result.draft) {
        const content = fieldsFromPublicRecord(result.draft.content, canonical);
        if (!content) throw new Error('La revisión contiene datos no compatibles; no se cargó.');
        setFields(content); setSourceNote(result.draft.source_note);
      }
      setCloud({ revision: result.draft?.revision ?? 0, catalogUpdatedAt: result.catalogUpdatedAt, status: result.draft?.status ?? 'Sin borrador conectado' });
      const history = await client!.from('editorial_audit').select('id,action,note,created_at').eq('experience_id', selectedId).order('created_at', { ascending: false }).limit(8);
      if (epoch === accountEpoch.current) { setAudit(history.error ? [] : history.data ?? []); setNotice('Revisión cargada. Guardar en el servidor conserva un borrador privado; no publica.'); }
    } catch (error) { if (epoch === accountEpoch.current) setNotice(error instanceof Error ? error.message : 'No se pudo cargar la revisión.'); }
    finally { setBusy(false); }
  };
  const saveCloud = async () => {
    if (!admin || busy || !cloud) return; setBusy(true); const epoch = accountEpoch.current;
    try {
      const local = makeEditorialDraft(canonical, draftFields, sourceNote); saveLocalEditorialDraft(local);
      const result = await saveConnectedDraft(local, cloud.catalogUpdatedAt, cloud.revision);
      if (epoch !== accountEpoch.current) return;
      setCloud({ ...cloud, revision: result.revision, status: result.status });
      setLocalIds(readLocalEditorialDrafts().map(item => item.experienceId)); setNotice(`Revisión privada ${result.revision} guardada con auditoría. El catálogo público permanece igual.`);
    } catch (error) { if (epoch === accountEpoch.current) setNotice(error instanceof Error ? error.message : 'No se pudo guardar en el servidor.'); }
    finally { setBusy(false); }
  };
  const requestReview = async () => {
    if (!client || !admin || !cloud?.revision || busy) return; setBusy(true); const epoch = accountEpoch.current;
    try {
      const { error } = await client.rpc('review_editorial_draft', { p_experience_id: selectedId, p_expected_revision: cloud.revision, p_decision: 'ready_for_legal', p_note: sourceNote });
      if (error) throw new Error('No se pudo registrar la revisión. Recarga la versión y comprueba permisos.');
      if (epoch === accountEpoch.current) { setCloud({ ...cloud, status: 'ready_for_legal' }); setNotice('Marcado para revisión legal. Todavía no está publicado ni es una oferta verificable.'); }
    } catch (error) { if (epoch === accountEpoch.current) setNotice(error instanceof Error ? error.message : 'Error de revisión.'); }
    finally { setBusy(false); }
  };
  return <div className="editorial-panel"><header className="editorial-heading"><FileCheck2 size={28} /><div><h2>Estudio editorial</h2><p>Edita una copia, revisa su información y prepara la siguiente versión.</p></div>{onClose && <button className="text-button" onClick={onClose}>Cerrar estudio</button>}</header>
    <p className="editorial-scope"><ShieldCheck size={20} /><span><strong>{admin ? 'Cuenta administradora conectada' : 'Borradores locales, sin publicación'}</strong>{!client ? supabaseConfiguration().available ? '' : ' Conecta Supabase para revisiones compartidas.' : session ? admin ? ' Las revisiones conectadas tienen permisos y registro de cambios.' : ' Esta cuenta no tiene permisos de administración.' : ' Inicia una cuenta administradora desde «Cuenta y negocio» para usar la revisión conectada.'} El editor no activa reservas, verificaciones ni cobros.</span></p>
    <div className="editorial-layout"><aside className="editorial-list"><label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar ficha o provincia" aria-label="Buscar ficha para editar" /></label><p>{visible.length} de {experiences.length} fichas</p><div>{visible.map(item => <button key={item.id} disabled={busy} aria-pressed={item.id === selectedId} onClick={() => choose(item)}><strong>{item.title}</strong><small>{item.province}{localIds.includes(item.id) ? ' · borrador local' : ''}</small></button>)}</div></aside><section className="editorial-work"><h3>{canonical.title}</h3><p className="editorial-original">Fuente original conservada: {canonical.originalDocument}</p><nav className="editorial-tabs" aria-label="Secciones del editor">{([['content','Contenido'],['price','Precios'],['access','Cómo llegar'],['preview','Vista previa']] as const).map(([id,label]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <fieldset disabled={busy} className="editorial-fields">{tab === 'content' && <><label>Título<input value={fields.title} maxLength={160} onChange={event => update('title', event.target.value)} /></label><label>Resumen<textarea value={fields.summary} maxLength={1200} rows={3} onChange={event => update('summary', event.target.value)} /></label><label>Descripción<textarea value={fields.description} maxLength={20000} rows={7} onChange={event => update('description', event.target.value)} /></label><label>Actividades · una por línea<textarea value={fields.activities.join('\n')} rows={5} onChange={event => update('activities', splitLines(event.target.value))} /></label></>}
      {tab === 'price' && <><p>Importes referenciales. Cambiar moneda no realiza una conversión. Mantén los costes sin confirmar vacíos.</p><div className="editorial-price-fields"><label>Mínimo<input type="number" min={0} max={1000000} step="0.01" value={fields.price.min ?? ''} onChange={event => update('price', { ...fields.price, min: event.target.value === '' ? null : +event.target.value })} /></label><label>Máximo<input type="number" min={0} max={1000000} step="0.01" value={fields.price.max ?? ''} onChange={event => update('price', { ...fields.price, max: event.target.value === '' ? null : +event.target.value })} /></label><label>Moneda<select value={fields.price.currency} onChange={event => update('price', { ...fields.price, currency: event.target.value as 'USD' | 'EUR' })}><option value="USD">USD</option><option value="EUR">EUR</option></select></label></div><label>Texto del precio y sus supuestos<input value={fields.price.originalLabel} maxLength={1000} onChange={event => update('price', { ...fields.price, originalLabel: event.target.value })} /></label><label>Incluye · una línea por servicio<textarea value={fields.price.includes.join('\n')} rows={4} onChange={event => update('price', { ...fields.price, includes: splitLines(event.target.value) })} /></label><label>No incluye · una línea por concepto<textarea value={fields.price.excludes.join('\n')} rows={4} onChange={event => update('price', { ...fields.price, excludes: splitLines(event.target.value) })} /></label></>}
      {tab === 'access' && <><label>Resumen de acceso<textarea value={fields.accessSummary} rows={4} maxLength={5000} onChange={event => update('accessSummary', event.target.value)} /></label><p>Los puntos cartográficos y fuentes de ubicación originales no se modifican en este editor.</p>{fields.transportOptions.map((option,index) => <div className="editorial-transport" key={index}><label>Tramo {index+1}<input value={option.label} onChange={event => update('transportOptions', fields.transportOptions.map((item,i) => i === index ? { ...item,label:event.target.value } : item))} /></label><label>Tiempo referencial<input value={option.durationLabel ?? ''} onChange={event => update('transportOptions', fields.transportOptions.map((item,i) => i === index ? { ...item,durationLabel:event.target.value || null } : item))} /></label><label>Coste y base<input value={option.priceLabel ?? ''} onChange={event => update('transportOptions', fields.transportOptions.map((item,i) => i === index ? { ...item,priceLabel:event.target.value || null } : item))} /></label><label>Notas<textarea rows={2} value={option.notes} onChange={event => update('transportOptions', fields.transportOptions.map((item,i) => i === index ? { ...item,notes:event.target.value } : item))} /></label><button className="text-button" onClick={() => update('transportOptions', fields.transportOptions.filter((_,i) => i !== index))}>Quitar tramo del borrador</button></div>)}<button className="button button-secondary" onClick={() => update('transportOptions', [...fields.transportOptions,{label:'Tramo por confirmar',mode:'local',durationLabel:null,priceLabel:null,notes:'Datos pendientes de validación.'}])}>Añadir tramo</button></>}
      {tab === 'preview' && (preview ? <article className="editorial-preview"><p>Borrador privado · vista previa</p><h4>{preview.title}</h4><strong>{formatExperiencePrice(preview)}</strong><p>{preview.summary}</p><p>{preview.description}</p><h5>Actividades</h5><ul>{preview.activities.map((item,index) => <li key={index}>{item}</li>)}</ul><h5>Cómo llegar</h5><p>{preview.locationInfo?.accessSummary || 'Acceso por confirmar.'}</p>{preview.locationInfo?.transportOptions.map((item,index) => <p key={index}>{item.label} · {item.durationLabel ?? 'Tiempo por confirmar'} · {item.priceLabel ?? 'Precio por confirmar'}</p>)}<p>Sin venta online · Operador sin verificar · Esta copia no aparece en el catálogo público.</p></article> : <p>Corrige los campos indicados para generar una vista previa válida.</p>)}</fieldset>
      <div className="editorial-provenance"><label>Fecha de revisión editorial<input type="date" value={fields.sourceCheckedAt} onChange={event => update('sourceCheckedAt', event.target.value)} /></label><label>Fuente y motivo de la revisión · no incluyas datos privados<textarea rows={3} value={sourceNote} maxLength={2000} onChange={event => setSourceNote(event.target.value)} /></label></div>{!validation.ok && <ul className="editorial-errors" role="alert">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul>}<div className="editorial-actions"><button className="button button-primary" disabled={!validation.ok || busy} onClick={saveLocal}><Save size={17} />Guardar borrador local</button><button className="button button-secondary" disabled={!validation.ok || busy} onClick={exportDraft}><Download size={17} />Exportar JSON</button></div>
      <details className="editorial-cloud"><summary>Revisión compartida con Supabase</summary><p>{admin ? `Revisión: ${cloud?.revision ?? 'sin cargar'} · ${cloud?.status ?? 'carga primero la versión del servidor'}` : 'Requiere Supabase y una cuenta con rol administrador asignado por servidor.'}</p><div className="editorial-actions"><button className="button button-secondary" disabled={!admin || busy} onClick={() => void loadCloud()}>Cargar revisión del servidor</button><button className="button button-secondary" disabled={!admin || !cloud || !validation.ok || busy} onClick={() => void saveCloud()}>Guardar revisión privada</button><button className="button button-secondary" disabled={!admin || !cloud?.revision || busy} onClick={() => void requestReview()}>Enviar a revisión legal</button><button className="button button-secondary" disabled title="Revisión legal y procedimiento de publicación pendientes">Publicación bloqueada</button></div><p>La publicación está bloqueada en el servidor. Cambiar un estado local no puede habilitarla. {commercialReadiness().blockers.length} verificaciones legales pendientes.</p>{audit.length > 0 && <ul>{audit.map(item => <li key={item.id}>{item.created_at.slice(0,10)} · {item.action} · {item.note}</li>)}</ul>}</details><p className="editorial-notice" role="status">{busy ? 'Procesando la revisión…' : notice}</p>
    </section></div></div>;
}
