import { useId, useRef, useState, type FormEvent } from 'react';
import { CreditCard, FlaskConical, Lock, ShieldAlert } from 'lucide-react';
import {
  CARD_BRANDS, checkTestCard, cvvLength, detectBrand, digitsOnly, formatCardNumber, formatExpiry, luhn, maxNumberLength,
  numberComplete, REAL_CARD_MESSAGE, sampleCvv, sampleExpiry, testCard, TEST_CARDS, type CardField, type CardSummary, type TestOutcome,
} from '../../domain/payments/card';
import { CardBrandMark } from './CardBrandMark';
import './card.css';

import { useT } from '../../i18n/v3';
export interface CardPayment { summary: CardSummary; outcome: TestOutcome; reason: string }

/**
 * Formulario de tarjeta SOLO para el modo prueba. Acepta únicamente las tarjetas de prueba públicas.
 * Número, vencimiento y CVV viven solo en el estado local de este componente: no se guardan, no se
 * envían ni se registran, y se borran al confirmar. Hacia fuera solo sale marca + últimos 4.
 */
export function CardForm({ amountLabel, defaultHolder = '', busy = false, onPay }: { amountLabel: string; defaultHolder?: string; busy?: boolean; onPay: (payment: CardPayment) => void }) {
  const t = useT();
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holder, setHolder] = useState(defaultHolder.toUpperCase());
  const [flipped, setFlipped] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<CardField, string>>>({});
  const [picked, setPicked] = useState('');
  const id = useId();
  const numberRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);
  const holderRef = useRef<HTMLInputElement>(null);
  const refs: Record<CardField, typeof numberRef> = { number: numberRef, expiry: expiryRef, cvv: cvvRef, holder: holderRef };

  const digits = digitsOnly(number);
  const brand = detectBrand(digits);
  const complete = numberComplete(digits);
  const passes = complete && luhn(digits);
  const isTest = passes && Boolean(testCard(digits));
  const realCard = passes && !isTest;
  const cvvSize = cvvLength(brand);
  const groups = (brand ? CARD_BRANDS[brand].groups : [4, 4, 4, 4]).slice(0, brand === 'amex' ? 3 : brand === 'diners' ? 3 : 4);
  const starts = groups.map((_, index) => groups.slice(0, index).reduce((sum, size) => sum + size, 0));
  const preview = groups.map((size, index) => digits.slice(starts[index], starts[index] + size).padEnd(size, '•')).join(' ');
  const numberHint = !digits ? 'Visa, Mastercard, American Express, Diners Club o Discover.'
    : !brand ? 'Todavía no reconocemos la marca.'
      : realCard ? REAL_CARD_MESSAGE
        : complete && !passes ? 'Revisa el número: no pasa la verificación de la tarjeta.'
          : isTest ? `${CARD_BRANDS[brand].label} de prueba · ${testCard(digits)?.outcome === 'declined' ? 'el banco simulará un rechazo' : 'se aprobará sin cobro'}`
            : `${CARD_BRANDS[brand].label} detectada`;

  const clearError = (field: CardField) => setErrors(current => { if (!current[field]) return current; const copy = { ...current }; delete copy[field]; return copy; });
  function pickTestCard(value: string) {
    setPicked(value);
    const card = TEST_CARDS.find(item => item.number === value);
    if (!card) return;
    setNumber(formatCardNumber(card.number)); setExpiry(sampleExpiry()); setCvv(sampleCvv(card.brand));
    if (!holder.trim()) setHolder('VIAJERA DE PRUEBA');
    setErrors({});
  }
  function wipe() { setNumber(''); setExpiry(''); setCvv(''); setPicked(''); setFlipped(false); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const result = checkTestCard({ number, expiry, cvv, holder });
    if (!result.ok) {
      setErrors({ [result.field]: result.message });
      if (result.realCard) { setNumber(''); setCvv(''); setExpiry(''); setPicked(''); }
      refs[result.field].current?.focus();
      return;
    }
    setErrors({});
    wipe();
    onPay({ summary: result.summary, outcome: result.outcome, reason: result.reason });
  }
  const described = (field: CardField) => `${id}-${field}-hint${errors[field] ? ` ${id}-${field}-error` : ''}`;
  const err = (field: CardField) => errors[field] ? <span id={`${id}-${field}-error`} className="card-field-error" role="alert">{errors[field]}</span> : null;

  return <form className="card-form" onSubmit={submit} noValidate autoComplete="off" aria-label={t("Pago con tarjeta de prueba")}>
    <div className={`card-scene ${flipped ? 'is-flipped' : ''}`} aria-hidden="true">
      <div className={`card-face card-front is-${brand ?? 'none'}`}>
        <div className="card-face-top"><span className="card-chip" /><span className="card-test-tag"><FlaskConical size={12} />{t("PRUEBA")}</span></div>
        <p className="card-preview-number">{preview}</p>
        <div className="card-face-bottom">
          <div><small>{t("Titular")}</small><span>{holder.trim() || 'TU NOMBRE'}</span></div>
          <div><small>{t("Vence")}</small><span>{expiry || 'MM/AA'}</span></div>
          <CardBrandMark brand={brand} size="lg" />
        </div>
      </div>
      <div className={`card-face card-back is-${brand ?? 'none'}`}>
        <span className="card-stripe" />
        <div className="card-sign"><span>{t("CHULLA VIDA · PRUEBA")}</span><b>{'•'.repeat(cvv.length) || '•'.repeat(cvvSize)}</b></div>
        <p className="card-back-note">{t("Código de seguridad:")}{' '}{cvvSize}{' '}{t("dígitos. No lo guardamos nunca.")}</p>
      </div>
    </div>

    <div className="card-test-picker"><label htmlFor={`${id}-pick`}><FlaskConical size={16} aria-hidden="true" />{t("Usar una tarjeta de prueba")}</label>
      <select id={`${id}-pick`} className="field" value={picked} onChange={event => pickTestCard(event.target.value)}>
        <option value="">{t("Elige una para rellenar el formulario…")}</option>
        {TEST_CARDS.map(card => <option key={card.number} value={card.number}>{CARD_BRANDS[card.brand].label} · {formatCardNumber(card.number)} · {card.outcome === 'approved' ? 'aprobada' : `rechazada${card.reason?.includes('Fondos') ? ' por fondos' : ''}`}</option>)}
      </select>
    </div>

    <div className="card-field card-number-field"><label htmlFor={`${id}-number`}>{t("Número de la tarjeta")}</label>
      <span className="card-input-box">
        <input id={`${id}-number`} ref={numberRef} className="field" inputMode="numeric" autoComplete="off" name={`${id}-n`} spellCheck={false} placeholder="0000 0000 0000 0000"
          value={number} maxLength={maxNumberLength(brand) + 4} aria-invalid={Boolean(errors.number) || realCard || (complete && !passes) || undefined} aria-describedby={described('number')}
          onChange={event => { setNumber(formatCardNumber(event.target.value)); setPicked(''); clearError('number'); }} onFocus={() => setFlipped(false)} />
        <CardBrandMark brand={brand} size="sm" />
      </span>
      <span id={`${id}-number-hint`} className={`card-hint ${realCard ? 'is-warning' : isTest ? 'is-ok' : ''}`}>{realCard && <ShieldAlert size={15} aria-hidden="true" />}{numberHint}</span>
      {err('number')}
    </div>
    <div className="card-row">
      <div className="card-field"><label htmlFor={`${id}-expiry`}>{t("Vence (MM/AA)")}</label>
        <input id={`${id}-expiry`} ref={expiryRef} className="field" inputMode="numeric" autoComplete="off" name={`${id}-e`} placeholder={t("MM/AA")} maxLength={5} value={expiry}
          aria-invalid={Boolean(errors.expiry) || undefined} aria-describedby={described('expiry')}
          onChange={event => { setExpiry(formatExpiry(event.target.value, expiry)); clearError('expiry'); }} onFocus={() => setFlipped(false)} />
        <span id={`${id}-expiry-hint`} className="card-hint">{t("Mes y año, sin vencer.")}</span>
        {err('expiry')}
      </div>
      <div className="card-field"><label htmlFor={`${id}-cvv`}>{t("CVV")}</label>
        <input id={`${id}-cvv`} ref={cvvRef} className="field" inputMode="numeric" autoComplete="off" name={`${id}-c`} type="password" placeholder={'•'.repeat(cvvSize)} maxLength={cvvSize} value={cvv}
          aria-invalid={Boolean(errors.cvv) || undefined} aria-describedby={described('cvv')}
          onChange={event => { setCvv(event.target.value.replace(/\D/g, '').slice(0, cvvSize)); clearError('cvv'); }} onFocus={() => setFlipped(brand !== 'amex')} onBlur={() => setFlipped(false)} />
        <span id={`${id}-cvv-hint`} className="card-hint">{cvvSize}{' '}{t("dígitos")}{' '}{brand === 'amex' ? 'al frente' : 'detrás'}.</span>
        {err('cvv')}
      </div>
    </div>
    <div className="card-field"><label htmlFor={`${id}-holder`}>{t("Titular (como aparece en la tarjeta)")}</label>
      <input id={`${id}-holder`} ref={holderRef} className="field" autoComplete="off" name={`${id}-h`} maxLength={60} value={holder} aria-invalid={Boolean(errors.holder) || undefined} aria-describedby={described('holder')}
        onChange={event => { setHolder(event.target.value.toUpperCase()); clearError('holder'); }} onFocus={() => setFlipped(false)} />
      <span id={`${id}-holder-hint`} className="card-hint">{t("Nombre y apellido.")}</span>
      {err('holder')}
    </div>

    <p className="card-safety"><Lock size={15} aria-hidden="true" />{t("En modo prueba solo aceptamos tarjetas de prueba. No guardamos el número, el vencimiento ni el CVV: al pagar, solo queda la marca y los últimos 4 dígitos.")}</p>
    <button type="submit" className="button button-primary card-pay" disabled={busy}><CreditCard size={17} aria-hidden="true" />{t("Pagar")}{' '}{amountLabel}{' '}{t("· prueba")}</button>
  </form>;
}
