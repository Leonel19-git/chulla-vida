import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, Download, FileText, Info, LogIn, Send } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import { getSupabase } from '../../lib/supabase';
import { PRIVACY_DOCUMENTS } from './documents';
import {
  buildRows, buildSummary, DESCRIPTION_MAX, emptyRequest, isValidCedulaFormat, maskDocument, normalizeDocument,
  PRIVACY_CONTACT_PLACEHOLDER, RESPONSE_TERM_PLACEHOLDER, RIGHTS, validateRequest,
  type RequestErrors, type RightId, type RightsRequestDraft,
} from './rights';
import './privacy-rights.css';

type Outcome = { kind: 'idle' } | { kind: 'offline' } | { kind: 'signin' } | { kind: 'sent'; count: number } | { kind: 'error'; message: string };

/**
 * Formulario en línea de derechos LOPDP. El borrador vive solo en memoria: nada (ni la cédula) se guarda en
 * localStorage, sessionStorage ni IndexedDB. Con Supabase y sesión iniciada inserta en `privacy_requests`.
 */
export function RightsRequestForm({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<RightsRequestDraft>(emptyRequest);
  const [errors, setErrors] = useState<RequestErrors>({});
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const set = <K extends keyof RightsRequestDraft>(key: K, value: RightsRequestDraft[K]) => { setDraft(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: undefined })); };
  const toggleRight = (right: RightId, on: boolean) => set('rights', on ? [...draft.rights, right] : draft.rights.filter(item => item !== right));
  const normalized = normalizeDocument(draft.documentType, draft.documentNumber);
  const cedulaOk = draft.documentType === 'cedula' && isValidCedulaFormat(normalized);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateRequest(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    const client = getSupabase();
    if (!client) { setOutcome({ kind: 'offline' }); requestAnimationFrame(() => summaryRef.current?.focus()); return; }
    setBusy(true);
    try {
      const { data } = await client.auth.getUser();
      if (!data.user) { setOutcome({ kind: 'signin' }); return; }
      const { error } = await client.from('privacy_requests').insert(buildRows(draft, data.user.id));
      if (error) throw error;
      setOutcome({ kind: 'sent', count: draft.rights.length });
      setDraft(emptyRequest());
    } catch {
      setOutcome({ kind: 'error', message: 'No pudimos registrar tu solicitud ahora. Tus datos no se guardaron. Intenta de nuevo o descarga el resumen y envíalo por correo.' });
    } finally { setBusy(false); requestAnimationFrame(() => summaryRef.current?.focus()); }
  };
  const downloadSummary = () => {
    const url = URL.createObjectURL(new Blob([buildSummary(draft)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'solicitud-derechos-chulla-vida.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const field = (key: keyof RightsRequestDraft, label: string, input: ReactNode, help?: ReactNode) => <div className={`rights-field ${errors[key] ? 'has-error' : ''}`}>
    <label htmlFor={`${id}-${key}`}>{label}</label>{input}
    {help && <p className="rights-help" id={`${id}-${key}-help`}>{help}</p>}
    {errors[key] && <p className="rights-error" id={`${id}-${key}-error`} role="alert">{errors[key]}</p>}
  </div>;
  const describe = (key: keyof RightsRequestDraft, help = false) => [help ? `${id}-${key}-help` : '', errors[key] ? `${id}-${key}-error` : ''].filter(Boolean).join(' ') || undefined;

  return <Dialog title="Ejercer mis derechos sobre mis datos" onClose={onClose} wide><div className="dialog-content rights-form">
    <p className="rights-lead">Con este formulario pides acceso, corrección, eliminación u otro derecho de la LOPDP. Lo que escribes se queda en esta pantalla hasta que lo envíes; no lo guardamos en tu navegador.</p>
    <p className="rights-draft"><Info size={18} aria-hidden="true" /><span>Borrador pendiente de revisión jurídica. Plazo de respuesta: {RESPONSE_TERM_PLACEHOLDER}.</span></p>

    {outcome.kind !== 'idle' && <div ref={summaryRef} tabIndex={-1} className={`rights-outcome rights-outcome-${outcome.kind}`} role="status">
      {outcome.kind === 'sent' && <><CheckCircle2 size={22} aria-hidden="true" /><div><strong>Recibimos tu solicitud.</strong><p>Registramos {outcome.count === 1 ? 'un derecho' : `${outcome.count} derechos`} con estado «recibida». Un responsable validará tu identidad antes de responder a tu correo.</p></div></>}
      {outcome.kind === 'offline' && <><FileText size={22} aria-hidden="true" /><div><strong>Aún no podemos recibirla en línea.</strong><p>Descarga el resumen o el formulario en PDF y envíalo a {PRIVACY_CONTACT_PLACEHOLDER} con una copia de tu documento de identidad.</p><div className="rights-outcome-actions"><button type="button" className="button button-primary" onClick={downloadSummary}><Download size={16} aria-hidden="true" />Descargar mi resumen</button><a className="button button-secondary" href={PRIVACY_DOCUMENTS.form.href} download={PRIVACY_DOCUMENTS.form.file}>Formulario en PDF</a></div></div></>}
      {outcome.kind === 'signin' && <><LogIn size={22} aria-hidden="true" /><div><strong>Inicia sesión para enviarla en línea.</strong><p>Así confirmamos que la cuenta es tuya. Si prefieres, descarga el resumen y envíalo por correo.</p><div className="rights-outcome-actions"><button type="button" className="button button-primary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }}>Ir a mi cuenta</button><button type="button" className="button button-secondary" onClick={downloadSummary}>Descargar mi resumen</button></div></div></>}
      {outcome.kind === 'error' && <><Info size={22} aria-hidden="true" /><div><strong>Algo falló.</strong><p>{outcome.message}</p><div className="rights-outcome-actions"><button type="button" className="button button-secondary" onClick={downloadSummary}>Descargar mi resumen</button></div></div></>}
    </div>}

    <form noValidate onSubmit={submit} aria-busy={busy}>
      <fieldset className="rights-group"><legend><span>1</span>Tus datos</legend>
        {field('fullName', 'Nombres y apellidos completos', <input id={`${id}-fullName`} className="field" autoComplete="name" value={draft.fullName} onChange={event => set('fullName', event.target.value)} aria-invalid={!!errors.fullName} aria-describedby={describe('fullName')} />)}
        <div className="rights-row">
          {field('documentType', 'Documento', <select id={`${id}-documentType`} className="field" value={draft.documentType} onChange={event => { set('documentType', event.target.value as RightsRequestDraft['documentType']); set('documentNumber', ''); }}><option value="cedula">Cédula de ciudadanía</option><option value="passport">Pasaporte</option></select>)}
          {field('documentNumber', draft.documentType === 'cedula' ? 'Número de cédula' : 'Número de pasaporte',
            <div className="rights-doc"><input id={`${id}-documentNumber`} className="field" inputMode={draft.documentType === 'cedula' ? 'numeric' : 'text'} autoComplete="off" maxLength={draft.documentType === 'cedula' ? 10 : 20} value={draft.documentNumber} onChange={event => set('documentNumber', normalizeDocument(draft.documentType, event.target.value))} aria-invalid={!!errors.documentNumber} aria-describedby={describe('documentNumber', true)} />{cedulaOk && <span className="rights-doc-ok" aria-hidden="true"><CheckCircle2 size={18} /></span>}</div>,
            draft.documentType === 'cedula' ? (cedulaOk ? <span className="rights-ok">Formato válido ({maskDocument(normalized)}). Esto revisa el dígito verificador; no confirma tu identidad.</span> : 'Revisamos el dígito verificador mientras escribes. No consultamos el Registro Civil.') : 'Letras y números, sin espacios.')}
        </div>
        <div className="rights-row">
          {field('email', 'Correo para responderte', <input id={`${id}-email`} className="field" type="email" autoComplete="email" value={draft.email} onChange={event => set('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={describe('email')} />)}
          {field('phone', 'Teléfono (opcional)', <input id={`${id}-phone`} className="field" type="tel" autoComplete="tel" value={draft.phone} onChange={event => set('phone', event.target.value)} aria-invalid={!!errors.phone} aria-describedby={describe('phone')} />)}
        </div>
        <label className="rights-check"><input type="checkbox" checked={draft.hasRepresentative} onChange={event => set('hasRepresentative', event.target.checked)} /><span>Actúo mediante un representante (o soy representante de la persona titular)</span></label>
        {draft.hasRepresentative && <div className="rights-row rights-reveal">
          {field('representativeName', 'Nombre del representante', <input id={`${id}-representativeName`} className="field" value={draft.representativeName} onChange={event => set('representativeName', event.target.value)} aria-invalid={!!errors.representativeName} aria-describedby={describe('representativeName')} />)}
          {field('representativeDocument', 'Cédula o pasaporte del representante', <input id={`${id}-representativeDocument`} className="field" autoComplete="off" value={draft.representativeDocument} onChange={event => set('representativeDocument', event.target.value)} aria-invalid={!!errors.representativeDocument} aria-describedby={describe('representativeDocument')} />)}
        </div>}
      </fieldset>

      <fieldset className={`rights-group ${errors.rights ? 'has-error' : ''}`} aria-describedby={errors.rights ? `${id}-rights-error` : undefined}><legend id={`${id}-rights`} tabIndex={-1}><span>2</span>¿Qué derecho quieres ejercer?</legend>
        <div className="rights-options">{RIGHTS.map(right => <label key={right.id} className={`rights-option ${draft.rights.includes(right.id) ? 'is-on' : ''}`}><input type="checkbox" checked={draft.rights.includes(right.id)} onChange={event => toggleRight(right.id, event.target.checked)} /><span><strong>{right.title}</strong><small>{right.hint}</small></span></label>)}</div>
        {errors.rights && <p className="rights-error" id={`${id}-rights-error`} role="alert">{errors.rights}</p>}
      </fieldset>

      <fieldset className="rights-group"><legend><span>3</span>Cuéntanos más</legend>
        {field('description', 'Descripción de tu solicitud', <textarea id={`${id}-description`} className="field" rows={4} maxLength={DESCRIPTION_MAX} value={draft.description} onChange={event => set('description', event.target.value)} aria-invalid={!!errors.description} aria-describedby={describe('description', true)} />, `${draft.description.length}/${DESCRIPTION_MAX} caracteres. No incluyas datos de salud ni contraseñas.`)}
        {field('attachments', 'Documentos que adjuntarás (opcional)', <input id={`${id}-attachments`} className="field" placeholder="Ej.: copia de cédula, poder del representante" value={draft.attachments} onChange={event => set('attachments', event.target.value)} aria-describedby={describe('attachments', true)} />, 'Por ahora los adjuntos se envían por correo; este formulario no sube archivos.')}
        <label className={`rights-check ${errors.declaration ? 'has-error' : ''}`}><input id={`${id}-declaration`} type="checkbox" checked={draft.declaration} onChange={event => set('declaration', event.target.checked)} aria-invalid={!!errors.declaration} aria-describedby={errors.declaration ? `${id}-declaration-error` : undefined} /><span>Declaro que la información es verdadera y que soy la persona titular de los datos o su representante autorizado.</span></label>
        {errors.declaration && <p className="rights-error" id={`${id}-declaration-error`} role="alert">{errors.declaration}</p>}
      </fieldset>

      <div className="dialog-actions rights-actions">
        <a className="button button-secondary" href={PRIVACY_DOCUMENTS.form.href} download={PRIVACY_DOCUMENTS.form.file}>Prefiero el PDF</a>
        <button type="submit" className="button button-primary" disabled={busy}><Send size={16} aria-hidden="true" />{busy ? 'Enviando…' : 'Enviar solicitud'}</button>
      </div>
    </form>
  </div></Dialog>;
}
