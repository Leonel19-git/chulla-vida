import { useEffect, useRef, useState } from 'react';
import { acceptCheckoutTerms, loadCheckoutTerms, type ApprovedCheckoutTerms } from './terms';

import { useT, tr } from '../../i18n/v3';
export interface CheckoutTermsProps { onAccepted: (accepted: boolean) => void; disabled: boolean }
export function CheckoutTerms({ onAccepted, disabled }: CheckoutTermsProps) {
  const t = useT();
  const [terms, setTerms] = useState<ApprovedCheckoutTerms | null>();
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const active = useRef(true), lock = useRef(false), notify = useRef(onAccepted);
  useEffect(() => { notify.current = onAccepted; }, [onAccepted]);
  useEffect(() => { active.current = true; return () => { active.current = false; notify.current(false); }; }, []);
  useEffect(() => {
    let current = true;
    notify.current(false);
    void loadCheckoutTerms().then(value => { if (current) setTerms(value); })
      .catch(reason => { if (current) setError(reason instanceof Error ? reason.message : tr("No se pudieron consultar los términos aprobados.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]);
  async function accept() {
    if (disabled || lock.current || !terms || !checked || accepted) return;
    lock.current = true; setBusy(true); setError(''); setNotice(''); notify.current(false);
    try {
      await acceptCheckoutTerms(terms);
      if (active.current) { setAccepted(true); setNotice(tr("Aceptación registrada por el servidor para esta versión. Puedes continuar con el pago.")); notify.current(true); }
    } catch (reason) {
      if (active.current) { setTerms(undefined); setChecked(false); setAccepted(false); setError(reason instanceof Error ? reason.message : tr("No se pudo registrar la aceptación. El pago permanece bloqueado.")); notify.current(false); }
    } finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <section className="payments-checkout-terms" aria-label={t("Términos del pago")} aria-busy={loading || busy}>
    <h4>{t("Términos antes de pagar")}</h4>
    {loading ? <p role="status">{t("Consultando los términos publicados y vigentes…")}</p> : error ? <p role="alert">{error}</p> : terms ? <>
      <p><strong>{terms.title}</strong>{' '}{t("· Versión")}{' '}{terms.version}</p>
      <p className="payments-footnote">{t("Publicado:")}{' '}<time dateTime={terms.publishedAt}>{terms.publishedAt.slice(0, 10)}</time> · {terms.effectiveFrom ? <>{t("Vigente desde")}{' '}<time dateTime={terms.effectiveFrom}>{terms.effectiveFrom}</time></> : t("Vigencia sin fecha diferida")}</p>
      <details><summary>{t("Leer los términos completos")}</summary><article aria-label={terms.title} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65 }}>{terms.content}</article><p className="payments-footnote" style={{ overflowWrap: 'anywhere' }}>{t("Referencia del contenido:")}{' '}{terms.hash}</p></details>
      <label><input type="checkbox" checked={checked} disabled={disabled || busy} onChange={event => { setChecked(event.target.checked); setAccepted(false); setNotice(''); notify.current(false); }} />{t("He leído y acepto estos términos publicados para continuar con este pago.")}</label>
      <div className="payments-actions"><button type="button" className="button button-secondary" disabled={disabled || busy || !checked || accepted} onClick={() => void accept()}>{busy ? t("Registrando aceptación…") : accepted ? t("Aceptación registrada") : t("Registrar aceptación de esta versión")}</button></div>
    </> : <p role="status">{t("Todavía no hay términos públicos aprobados y vigentes disponibles para este pago. La aceptación y el cobro real permanecen bloqueados.")}</p>}
    <p className="payments-notice" role="status">{notice}</p>
    <button type="button" className="text-button" disabled={disabled || busy || loading} onClick={() => { notify.current(false); setAccepted(false); setChecked(false); setTerms(undefined); setLoading(true); setError(''); setNotice(''); setRevision(value => value + 1); }}>{t("Volver a consultar los términos")}</button>
  </section>;
}
