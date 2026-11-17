import { lazy, Suspense, useState, type MouseEvent } from 'react';
import { BadgeCheck, MessageSquareQuote, ShoppingBag } from 'lucide-react';
import type { Experience } from '../../domain/catalog';
import { purchasePlan, stopStatus, STOP_STATUS_TEXT } from '../../domain/payments/purchase';
import { useWallet } from '../wallet/store';
import './checkout.css';

import { useT } from '../../i18n/v3';
const Checkout = lazy(() => import('./Checkout').then(module => ({ default: module.Checkout })));
const QuoteRequest = lazy(() => import('./QuoteRequest').then(module => ({ default: module.QuoteRequest })));
const WalletPanel = lazy(() => import('../wallet/WalletPanel').then(module => ({ default: module.WalletPanel })));

/**
 * Botón «Comprar» para tarjeta (`card`) y ficha (`detail`). Abre el checkout en pasos; hoy la compra
 * termina en modo prueba sin cobro. Fichas en EUR o sin precio comparable muestran «Solicitar cotización».
 * Es autónomo: abre su propio checkout y, al terminar, la billetera.
 */
export function BuyButton({ experience, variant = 'card' }: { experience: Experience; variant?: 'card' | 'detail' }) {
  const t = useT();
  const [open, setOpen] = useState<'' | 'checkout' | 'wallet'>('');
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const records = useWallet();
  const plan = purchasePlan(experience);
  const status = stopStatus(experience.id, records);
  const quote = plan.kind === 'quote';
  const label = quote ? 'Solicitar cotización' : variant === 'detail' ? 'Comprar experiencia' : 'Comprar';
  const click = async (event: MouseEvent) => {
    event.stopPropagation();
    if (checking) return;
    setChecking(true); setNotice('');
    try {
      const { getSupabase } = await import('../../lib/supabase');
      const client = getSupabase();
      if (!client) { setNotice(t('Entra a tu cuenta para continuar.')); window.dispatchEvent(new CustomEvent('cv3:account', { detail: { tab: 'signup' } })); return; }
      const { data, error } = await client.auth.getUser();
      if (error || !data.user?.email_confirmed_at) {
        setNotice(t('Confirma tu correo para continuar.'));
        window.dispatchEvent(new CustomEvent('cv3:account', { detail: { tab: data.user ? 'login' : 'signup' } }));
        return;
      }
      setOpen('checkout');
    } catch { setNotice(t('No pudimos comprobar tu cuenta. Reintenta con conexión.')); }
    finally { setChecking(false); }
  };
  const close = () => setOpen('');
  const wallet = () => setOpen('wallet');
  return <span className={`buy-button-wrap buy-${variant}`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <button type="button" className={`buy-button ${quote ? 'is-quote' : ''}`} disabled={checking} onClick={click} aria-label={variant === 'card' ? `${t(label)}: ${experience.title}` : undefined} aria-haspopup="dialog">
      {quote ? <MessageSquareQuote size={17} aria-hidden="true" /> : <ShoppingBag size={17} aria-hidden="true" />}{checking ? t('Comprobando tu cuenta…') : t(label)}
    </button>
    {notice && <small className="buy-button-note" role="status">{notice}</small>}
    {variant === 'detail' && <small className="buy-button-note">{quote ? t("Precio en otra moneda o sin precio comparable: te ayudamos a pedir cotización.") : `Modo prueba: pagas con una tarjeta de prueba, sin cobro, hasta activar la pasarela · precio ${experience.price.type === 'proposed' ? 'propuesto' : 'referencial'} de la fuente`}</small>}
    {status !== 'none' && <small className="buy-owned"><BadgeCheck size={14} aria-hidden="true" />{STOP_STATUS_TEXT[status]}{' '}{t("en tu billetera")}</small>}
    {open && <Suspense fallback={null}>
      {open === 'wallet' ? <WalletPanel onClose={close} />
        : quote ? <QuoteRequest experience={experience} reason={plan.reason} onClose={close} onViewWallet={wallet} />
          : <Checkout experiences={[experience]} onClose={close} onViewWallet={wallet} />}
    </Suspense>}
  </span>;
}
