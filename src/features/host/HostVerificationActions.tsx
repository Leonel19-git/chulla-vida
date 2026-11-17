import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useT } from '../../i18n/v3';
import type { HostApplication } from './HostDashboard';

export function HostVerificationActions({ client, application }: { client: SupabaseClient; application: HostApplication }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState('');
  if (!['needs_changes','rejected'].includes(application.status)) return null;
  const appeal = application.status === 'rejected';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || sent) return;
    setBusy(true); setNotice('');
    try {
      const result = await client.rpc(appeal ? 'appeal_verification_request' : 'resubmit_verification_request', { p_request_id: application.id, p_note: note.trim() || null });
      if (result.error) throw new Error('Review unavailable');
      setSent(true); setNotice('Enviado a revisión humana. Tu negocio aún no está aprobado.');
    } catch { setNotice('No se pudo enviar. Comprueba el estado de la solicitud y vuelve a intentar.'); }
    finally { setBusy(false); }
  };
  return <form className="auth-form" onSubmit={event => void submit(event)}>
    {!sent && <><label>{t(appeal ? 'Motivo de la apelación' : 'Qué corregiste')}<textarea className="field" value={note} minLength={appeal ? 10 : undefined} maxLength={2000} required={appeal} disabled={busy} rows={3} onChange={event => setNote(event.target.value)} /></label>
      <button className="button button-secondary" disabled={busy || (appeal && note.trim().length < 10)}>{t(appeal ? 'Enviar apelación' : 'Enviar correcciones')}</button></>}
    <p role="status">{t(notice)}</p>
  </form>;
}
