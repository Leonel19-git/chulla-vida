import { useEffect, useId, useState, type FormEvent } from 'react';
import { CheckCircle2, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import { maskAccount, validateBankAccount, type AccountType, type BankAccount } from '../../domain/payments/transfer';
import { loadBankAccount, saveBankAccount } from './transferApi';
import './transfer.css';

const EMPTY: BankAccount = { bankName: '', accountType: 'ahorros', accountNumber: '', holderName: '', holderId: '' };

/**
 * Cuenta donde el negocio recibe transferencias. Para montar en el panel de negocio.
 * Solo los responsables (owner, manager, representante) pueden guardarla: lo impone la RLS.
 */
export function BankAccountForm({ organizationId }: { organizationId: string }) {
  const [value, setValue] = useState<BankAccount>(EMPTY);
  const [saved, setSaved] = useState<BankAccount | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof BankAccount, string>>>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(true);
  const radioName = useId();
  useEffect(() => {
    let live = true;
    loadBankAccount(organizationId).then(account => { if (!live) return; setSaved(account); if (account) setValue(account); }, () => { if (live) setNotice('No se pudo leer la cuenta.'); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [organizationId]);
  const set = (patch: Partial<BankAccount>) => { setValue(current => ({ ...current, ...patch })); setNotice(''); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateBankAccount(value); setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try { await saveBankAccount(organizationId, value); setSaved(value); setNotice('Cuenta guardada.'); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };
  const field = (key: keyof BankAccount, label: string, props: Record<string, unknown> = {}) => <label className="buy-form-field"><span>{label}</span><input className="field" value={value[key]} onChange={event => set({ [key]: event.target.value } as Partial<BankAccount>)} aria-invalid={errors[key] ? true : undefined} {...props} />{errors[key] && <small className="buy-error">{errors[key]}</small>}</label>;
  return <form className="tr-account buy-form" onSubmit={event => void submit(event)} noValidate aria-busy={busy}>
    <h3><Landmark size={20} aria-hidden="true" />Cuenta para transferencias</h3>
    {saved && <p className="tr-privacy"><CheckCircle2 size={15} aria-hidden="true" />Registrada: {saved.bankName} {maskAccount(saved.accountNumber)}</p>}
    {field('bankName', 'Banco o cooperativa', { autoComplete: 'off', maxLength: 80 })}
    <fieldset className="cedula-switch" aria-label="Tipo de cuenta">{(['ahorros', 'corriente'] as AccountType[]).map(type => <label key={type}><input type="radio" name={radioName} checked={value.accountType === type} onChange={() => set({ accountType: type })} />{type === 'ahorros' ? 'Ahorros' : 'Corriente'}</label>)}</fieldset>
    {field('accountNumber', 'Número de cuenta', { inputMode: 'numeric', autoComplete: 'off', maxLength: 24 })}
    {field('holderName', 'Titular', { autoComplete: 'off', maxLength: 120 })}
    {field('holderId', 'Cédula o RUC del titular', { inputMode: 'numeric', autoComplete: 'off', maxLength: 13 })}
    <p className="tr-privacy"><ShieldCheck size={15} aria-hidden="true" />Solo la ve quien inicia un pago por transferencia.</p>
    <button type="submit" className="button button-primary" disabled={busy}>{busy ? <Loader2 className="tr-spin" size={16} aria-hidden="true" /> : null}Guardar cuenta</button>
    <p className="tr-privacy" role="status">{notice}</p>
  </form>;
}
