import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { maskAccount } from '../../domain/payments/transfer';
import { useT } from '../../i18n/v3';
import { BankAccountForm } from '../payments/BankAccountForm';
import { loadBankAccount } from '../payments/transferApi';

/** Missing ownership is read-only. RLS remains the authority even for a forged browser prop. */
export function HostBankAccount({ organizationId, isOwner }: { organizationId: string; isOwner: boolean }) {
  const t = useT();
  const [summary, setSummary] = useState('Cargando cuenta…');
  useEffect(() => {
    let live = true;
    if (!isOwner) {
      loadBankAccount(organizationId).then(account => { if (live) setSummary(account ? `${account.bankName} · ${maskAccount(account.accountNumber)}` : 'Sin cuenta bancaria registrada.'); }, () => {
        if (live) setSummary('No se pudo consultar la cuenta bancaria.');
      });
    }
    return () => { live = false; };
  }, [organizationId, isOwner]);
  if (isOwner) return <BankAccountForm organizationId={organizationId} />;
  return <section className="host-bank-readonly"><h3><Landmark size={20} aria-hidden="true" />{t('Cuenta para transferencias')}</h3><p>{t(summary)}</p><p>{t('Solo el dueño puede cambiar la cuenta bancaria.')}</p></section>;
}
