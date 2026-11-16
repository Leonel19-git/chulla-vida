import { useEffect, useRef, useState } from 'react';
import { Check, Copy, FileText, FlaskConical, ImageUp, Landmark, Loader2, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';
import { formatUsd } from '../../domain/payments/purchase';
import { ACCOUNT_TYPE_TEXT, fileSize, RECEIPT_ACCEPT, TEST_BANK_ACCOUNT, TEST_BANK_LABEL, type BankAccount } from '../../domain/payments/transfer';
import { prepareReceipt, type PreparedReceipt } from './receiptFile';
import { startTransfer, submitReceipt, TransferError, type TransferRecord } from './transferApi';
import './transfer.css';

import { useT } from '../../i18n/v3';
export type TransferOutcome =
  | { mode: 'test'; reference: string; receiptKind: 'image' | 'pdf' }
  | { mode: 'live'; reference: string; receiptKind: 'image' | 'pdf'; transfer: TransferRecord };

export interface TransferRequest { experienceId: string; startDate: string; endDate: string; adults: number; children: number }

type Setup = { state: 'loading' } | { state: 'live'; transfer: TransferRecord; bank: BankAccount } | { state: 'test'; why: string };

function CopyButton({ label, value, text }: { label: string; value: string; text?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } };
  return <button type="button" className={`tr-copy ${text ? 'has-text' : ''}`} onClick={() => void copy()} aria-label={t("Copiar {v}", { v: label.toLowerCase() })}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{text && <span aria-hidden="true">{copied ? t("Copiado") : text}</span>}</button>;
}
function CopyValue({ label, value }: { label: string; value: string }) {
  return <div className="tr-row"><dt>{label}</dt><dd><span>{value}</span><CopyButton label={label} value={value} /></dd></div>;
}

/**
 * Pago por transferencia en el checkout: datos del anfitrión, monto, referencia y comprobante.
 * - En línea: crea la transferencia en Supabase y sube el comprobante a un bucket privado.
 * - Modo prueba (sin sesión, sin Supabase, compra de varias paradas o negocio sin cuenta): datos de prueba
 *   rotulados y el archivo NO sale del navegador.
 */
export function TransferPayment({ amountCents, testReference, request, onSubmitted, busy }: { amountCents: number; testReference: string; request: TransferRequest | null; onSubmitted: (outcome: TransferOutcome) => void; busy?: boolean }) {
  const t = useT();
  const [setup, setSetup] = useState<Setup>({ state: 'loading' });
  const [file, setFile] = useState<Extract<PreparedReceipt, { ok: true }> | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const key = useRef(crypto.randomUUID());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    if (!request) { setSetup({ state: 'test', why: 'Varias paradas: la transferencia en línea es por experiencia.' }); return; }
    startTransfer({ ...request, amount: amountCents / 100, idempotencyKey: key.current })
      .then(transfer => { if (!live) return; setSetup(transfer.bank ? { state: 'live', transfer, bank: transfer.bank } : { state: 'test', why: 'El negocio aún no registró su cuenta.' }); })
      .catch(reason => { if (live) setSetup({ state: 'test', why: reason instanceof TransferError && reason.reason !== 'no_backend' ? reason.message : 'Pagos en línea por transferencia aún no conectados.' }); });
    return () => { live = false; };
  }, [request, amountCents]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (picked: File | undefined) => {
    setError('');
    if (!picked) return;
    setWorking(true);
    const prepared = await prepareReceipt(picked);
    setWorking(false);
    if (input.current) input.current.value = '';
    if (!prepared.ok) { setFile(null); setPreview(''); setError(prepared.message); return; }
    setFile(prepared);
    setPreview(prepared.kind === 'image' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(prepared.blob) : '');
  };
  const clear = () => { setFile(null); setPreview(''); setError(''); };
  const send = async () => {
    if (!file) { setError(t("Adjunta la foto o el PDF del comprobante.")); return; }
    setError('');
    if (setup.state === 'live') {
      setWorking(true);
      try { const transfer = await submitReceipt(setup.transfer, file.blob, file.type); onSubmitted({ mode: 'live', reference: transfer.reference, receiptKind: file.kind, transfer }); }
      catch (reason) { setError(reason instanceof Error ? reason.message : t("No se pudo enviar el comprobante.")); }
      finally { setWorking(false); }
      return;
    }
    onSubmitted({ mode: 'test', reference: testReference, receiptKind: file.kind });
  };

  if (setup.state === 'loading') return <p className="tr-loading" role="status"><Loader2 className="tr-spin" size={18} aria-hidden="true" />{t("Preparando los datos de la transferencia…")}</p>;
  const test = setup.state === 'test';
  const bank = test ? TEST_BANK_ACCOUNT : setup.bank;
  const reference = test ? testReference : setup.transfer.reference;

  return <section className="tr" aria-label={t("Pago por transferencia")} aria-busy={working || busy}>
    <ol className="tr-steps" aria-label={t("Cómo pagar por transferencia")}>
      <li><span>1</span>{t("Transfiere")}</li><li><span>2</span>{t("Escribe la referencia")}</li><li><span>3</span>{t("Sube el comprobante")}</li>
    </ol>
    <div className={`tr-bank ${test ? 'is-test' : ''}`}>
      <p className="tr-bank-head"><Landmark size={20} aria-hidden="true" /><strong>{test ? TEST_BANK_LABEL : t("Cuenta del anfitrión")}</strong>{test && <span className="tr-badge"><FlaskConical size={13} aria-hidden="true" />{t("Prueba")}</span>}</p>
      {test && <p className="tr-why">{setup.why}{' '}{t("No transfieras a estos datos.")}</p>}
      <dl>
        <div className="tr-row"><dt>{t("Banco")}</dt><dd><span>{bank.bankName}</span></dd></div>
        <div className="tr-row"><dt>{t("Tipo")}</dt><dd><span>{ACCOUNT_TYPE_TEXT[bank.accountType]}</span></dd></div>
        <CopyValue label={t("Número de cuenta")} value={bank.accountNumber} />
        <div className="tr-row"><dt>{t("Titular")}</dt><dd><span>{bank.holderName}</span></dd></div>
        <CopyValue label={bank.holderId.length === 13 ? 'RUC' : t("Cédula")} value={bank.holderId} />
      </dl>
    </div>
    <div className="tr-amount">
      <div><span>{t("Monto exacto")}</span><strong>{formatUsd(amountCents)}</strong></div>
      <div><span>{t("Referencia · concepto")}</span><strong className="tr-ref">{reference}</strong><CopyButton label={t("Referencia")} value={reference} text="Copiar" /></div>
    </div>

    <div className="tr-upload" data-has-file={file ? true : undefined}>
      {file ? <div className="tr-file">
        {preview ? <img src={preview} alt="Vista previa del comprobante" /> : <span className="tr-file-icon" aria-hidden="true"><FileText size={30} /></span>}
        <p><strong>{file.kind === 'pdf' ? t("PDF listo") : t("Foto lista")}</strong><small>{fileSize(file.size)}{file.compressed ? t(" · reducida desde {v}", { v: fileSize(file.originalSize) }) : ''}</small></p>
        <button type="button" className="tr-icon-button" onClick={clear} aria-label={t("Quitar archivo")}><X size={18} /></button>
      </div>
        : <label className="tr-drop">
          <ImageUp size={28} aria-hidden="true" />
          <strong>{t("Sube tu comprobante")}</strong>
          <small>{t("Foto o PDF · máx. 5 MB")}</small>
          <input ref={input} type="file" accept={RECEIPT_ACCEPT} onChange={event => void pick(event.target.files?.[0])} aria-describedby="tr-privacy" />
        </label>}
      {file && <label className="tr-change"><RefreshCw size={15} aria-hidden="true" />{t("Cambiar archivo")}<input ref={input} type="file" accept={RECEIPT_ACCEPT} onChange={event => void pick(event.target.files?.[0])} /></label>}
    </div>
    <p id="tr-privacy" className="tr-privacy"><ShieldCheck size={15} aria-hidden="true" />{test ? t("Prueba: el archivo no sale de tu teléfono.") : t("Privado: solo tú y el anfitrión lo ven.")}</p>
    <p className="buy-error" role="alert">{error}</p>
    <button type="button" className="button button-primary tr-send" disabled={working || busy} onClick={() => void send()}>
      {working ? <Loader2 className="tr-spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
      {test ? t("Enviar comprobante de prueba") : t("Enviar comprobante")}
    </button>
  </section>;
}
