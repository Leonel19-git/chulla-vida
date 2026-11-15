import { CreditCard } from 'lucide-react';
import { CARD_BRANDS, type CardBrand } from '../../domain/payments/card';
import './card.css';

/* Distintivo propio de cada marca: tipografía y color, sin reproducir logotipos oficiales. */
const TEXT: Record<CardBrand, string> = { visa: 'VISA', mastercard: 'master', amex: 'AMEX', diners: 'Diners', discover: 'DISCOVER' };

export function CardBrandMark({ brand, size = 'md' }: { brand: CardBrand | null; size?: 'sm' | 'md' | 'lg' }) {
  if (!brand) return <span className={`card-mark is-unknown is-${size}`} aria-hidden="true"><CreditCard size={size === 'lg' ? 24 : 18} /></span>;
  return <span className={`card-mark is-${brand} is-${size}`} role="img" aria-label={CARD_BRANDS[brand].label}>
    <span aria-hidden="true">{TEXT[brand]}</span>{brand === 'mastercard' && <i aria-hidden="true">card</i>}{brand === 'diners' && <i aria-hidden="true">Club</i>}
  </span>;
}
