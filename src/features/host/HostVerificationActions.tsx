import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useT } from '../../i18n/v3';
import type { HostApplication } from './HostDashboard';

export function HostVerificationActions({ client, application }: { client: SupabaseClient; application: HostApplication }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!['needs_changes', 'rejected'].includes(application.status)) return;
    let active = true;
    void Promise.resolve(client.from('verification_reviews').select('note').eq('request_id', application.id).order('created_at', { ascending: false }).limit(1)).then(result => {
      if (active && !result.error && typeof result.data?.[0]?.note === 'string') setFeedback(result.data[0].note.slice(0, 2000));
    }).catch(() => {});
    return () => { active = false; };
  }, [client, application.id, application.status]);
  if (!['needs_changes','rejected'].includes(application.status)) return null;
  const appeal = application.status === 'rejected';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || sent) return;
    setBusy(true); setNotice('');
    try {
      const result = await client.rpc(appeal ? 'appeal_verification_request' : 'resubmit_verification_request', { p_request_id: application.id, p_note: note.trim() || null });
      if (result.error) throw new Error('Review unavailable');
      setSent(true); setNotice('Enviado a revisión humana. Tu negocio aún no está aprobado.');
      window.dispatchEvent(new Event('cv3:host-updated'));
    } catch { setNotice('No se pudo enviar. Comprueba el estado de la solicitud y vuelve a intentar.'); }
    finally { setBusy(false); }
  };
  return <form className="auth-form" onSubmit={event => void submit(event)}>
    {feedback && <p><strong>{t('Observaciones del equipo')}</strong><br />{feedback}</p>}
    {!sent && <><label>{t(appeal ? 'Motivo de la apelación' : 'Qué corregiste')}<textarea className="field" value={note} minLength={appeal ? 10 : undefined} maxLength={2000} required={appeal} disabled={busy} rows={3} onChange={event => setNote(event.target.value)} /></label>
      <button className="button button-secondary" disabled={busy || (appeal && note.trim().length < 10)}>{t(appeal ? 'Enviar apelación' : 'Enviar correcciones')}</button></>}
    <p role="status">{t(notice)}</p>
  </form>;
}
