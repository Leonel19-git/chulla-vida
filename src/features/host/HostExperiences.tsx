import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Pencil, Save } from 'lucide-react';
import { useT } from '../../i18n/v3';
import { loadBusinessExperiences, saveBusinessExperience, type BusinessExperience } from '../cms/api';

export function HostExperiences({ client, organizationIds }: { client: SupabaseClient; organizationIds: string[] }) {
  const t = useT();
  const [items, setItems] = useState<BusinessExperience[]>([]);
  const [draft, setDraft] = useState<BusinessExperience | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const key = organizationIds.join(',');
  useEffect(() => {
    let live = true;
    loadBusinessExperiences(client, key ? key.split(',') : []).then(result => { if (live) setItems(result); }, () => {
      if (live) setNotice('No se pudieron cargar las experiencias. Vuelve a abrir el panel.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [client, key]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true); setNotice('');
    try {
      const saved = await saveBusinessExperience(client, draft);
      setItems(current => current.map(item => item.id === saved.id ? saved : item)); setDraft(null);
      setNotice('Borrador guardado. La publicación y los cobros requieren revisión.');
    } catch { setNotice('No se pudo guardar. Recarga la ficha y comprueba tus permisos.'); }
    finally { setSaving(false); }
  };
  return <section className="host-dash-section host-experiences" data-tour="host-experiences" aria-label={t('Editar experiencias')} aria-busy={loading || saving}>
    <h3>{t('Tus experiencias')}</h3>
    <p>{t('Edita los borradores de tu negocio. Las fichas publicadas se revisan con el equipo.')}</p>
    {loading ? <p role="status">{t('Cargando experiencias…')}</p> : !notice && !items.length ? <p>{t('Aún no hay experiencias asignadas a este negocio.')}</p> : null}
    <ul className="host-dash-list">{items.map(item => <li key={item.id}>
      <div className="host-dash-row"><strong>{item.title}</strong><span className="host-dash-pill">{t(item.status === 'draft' ? 'Borrador' : item.status === 'published' ? 'Publicada' : 'Archivada')}</span></div>
      <p>{t(item.booking_enabled ? 'Venta habilitada en esta ficha; editar requiere revisión.' : 'Ventas deshabilitadas en esta ficha.')}</p>
      {item.status === 'draft' && !item.booking_enabled && <button type="button" className="button button-secondary" disabled={saving} onClick={() => { setDraft(item); setNotice(''); }}><Pencil size={16} />{t('Editar borrador')}</button>}
    </li>)}</ul>
    {draft && <form className="auth-form host-experience-form" onSubmit={event => void submit(event)}>
      <fieldset disabled={saving}><legend>{t('Editar borrador')}</legend>
        <label>{t('Título')}<input className="field" value={draft.title} minLength={2} maxLength={200} required onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>{t('Resumen')}<textarea className="field" value={draft.summary} maxLength={1200} rows={3} onChange={event => setDraft({ ...draft, summary: event.target.value })} /></label>
        <label>{t('Descripción')}<textarea className="field" value={draft.description} maxLength={20000} rows={6} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
        <div className="auth-actions"><button className="button button-primary" type="submit"><Save size={16} />{t('Guardar borrador')}</button><button className="button button-secondary" type="button" onClick={() => setDraft(null)}>{t('Cancelar')}</button></div>
      </fieldset>
    </form>}
    <p role="status">{t(notice)}</p>
  </section>;
}
