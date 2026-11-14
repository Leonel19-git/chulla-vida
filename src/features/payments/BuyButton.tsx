import { lazy, Suspense, useState, type MouseEvent } from 'react';
import { BadgeCheck, MessageSquareQuote, ShoppingBag } from 'lucide-react';
import type { Experience } from '../../domain/catalog';
import { purchasePlan, stopStatus, STOP_STATUS_TEXT } from '../../domain/payments/purchase';
import { useWallet } from '../wallet/store';
import './checkout.css';

const Checkout = lazy(() => import('./Checkout').then(module => ({ default: module.Checkout })));
const QuoteRequest = lazy(() => import('./QuoteRequest').then(module => ({ default: module.QuoteRequest })));
const WalletPanel = lazy(() => import('../wallet/WalletPanel').then(module => ({ default: module.WalletPanel })));

/**
 * Botón «Comprar» para tarjeta (`card`) y ficha (`detail`). Abre el checkout en pasos; hoy la compra
 * termina en modo prueba sin cobro. Fichas en EUR o sin precio comparable muestran «Solicitar cotización».
 * Es autónomo: abre su propio checkout y, al terminar, la billetera.
 */
export function BuyButton({ experience, variant = 'card' }: { experience: Experience; variant?: 'card' | 'detail' }) {
  const [open, setOpen] = useState<'' | 'checkout' | 'wallet'>('');
  const records = useWallet();
  const plan = purchasePlan(experience);
  const status = stopStatus(experience.id, records);
  const quote = plan.kind === 'quote';
  const label = quote ? 'Solicitar cotización' : variant === 'detail' ? 'Comprar experiencia' : 'Comprar';
  const click = (event: MouseEvent) => { event.stopPropagation(); setOpen('checkout'); };
  const close = () => setOpen('');
  const wallet = () => setOpen('wallet');
  return <span className={`buy-button-wrap buy-${variant}`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <button type="button" className={`buy-button ${quote ? 'is-quote' : ''}`} onClick={click} aria-label={variant === 'card' ? `${label}: ${experience.title}` : undefined} aria-haspopup="dialog">
      {quote ? <MessageSquareQuote size={17} aria-hidden="true" /> : <ShoppingBag size={17} aria-hidden="true" />}{label}
    </button>
    {variant === 'detail' && <small className="buy-button-note">{quote ? 'Precio en otra moneda o sin precio comparable: te ayudamos a pedir cotización.' : `Modo prueba sin cobro hasta activar la pasarela · precio ${experience.price.type === 'proposed' ? 'propuesto' : 'referencial'} de la fuente`}</small>}
    {status !== 'none' && <small className="buy-owned"><BadgeCheck size={14} aria-hidden="true" />{STOP_STATUS_TEXT[status]} en tu billetera</small>}
    {open && <Suspense fallback={null}>
      {open === 'wallet' ? <WalletPanel onClose={close} />
        : quote ? <QuoteRequest experience={experience} reason={plan.reason} onClose={close} onViewWallet={wallet} />
          : <Checkout experiences={[experience]} onClose={close} onViewWallet={wallet} />}
    </Suspense>}
  </span>;
}
