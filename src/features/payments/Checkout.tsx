import { partyLabel, rangeSummary, shortDay } from '../../i18n/travel';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, Clock3, CreditCard, Download, FlaskConical, Landmark, Lock, ReceiptText, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import type { Experience } from '../../domain/catalog';
import { choiceLabel, clampChoice, formatUsd, isEmail, isRange, lineTotalCents, maskEmail, purchasePlan, testCode, TEST_RECEIPT_LABEL, type PriceChoice, type WalletRecord, type WalletStatus } from '../../domain/payments/purchase';
import { clampParty, experienceDays, isIsoDate, localDay, partyCapacity, partySize, RANGE_ERROR_TEXT, suggestEnd, validateRange, type Party } from '../../domain/payments/travel';
import { TRANSFER_STATUS_TEXT } from '../../domain/payments/transfer';
import { CedulaField, documentValidity, type DocumentValue } from './CedulaField';
import { getPaymentConfiguration, type PaymentConfiguration } from './api';
import { CARD_BRANDS, cardLabel, type CardBrand, type CardSummary } from '../../domain/payments/card';
import { CardForm, type CardPayment } from './CardForm';
import { CardBrandMark } from './CardBrandMark';
import { PeopleStepper } from './PeopleStepper';
import { DateRangeField, type DateRange } from './DateRangeField';
import { TransferPayment, type TransferOutcome, type TransferRequest } from './TransferPayment';
import './card.css';
import { openWallet, upsertRecords } from '../wallet/store';
import { downloadReceipt, receiptQr } from '../wallet/receipt';
import './checkout.css';

import { useT, tr } from '../../i18n/v3';
/* Checkout en pasos. Hoy cierra en MODO PRUEBA SIN COBRO con una tarjeta de prueba o una transferencia de prueba;
   el cobro con tarjeta real solo existe en el flujo PayPhone de «Reservas y pagos», y la transferencia real solo
   cuando el negocio registró su cuenta en Supabase y la persona entró en su cuenta. */

const STEPS = ['Fechas y personas', 'Tus datos', 'Resumen', 'Método de pago', 'Comprobante'] as const;
const BRAND_ORDER = Object.keys(CARD_BRANDS) as CardBrand[];
const PRICE_TYPE: Record<Experience['price']['type'], string> = { referential: 'Precio referencial', proposed: 'Precio propuesto', verified_offer: 'Oferta verificada' };
const tomorrow = () => localDay(1);
const serverEnabled = (experience: Experience) => (experience as { bookingEnabled: boolean }).bookingEnabled === true;
function cancellation(experience: Experience): string[] {
  const lines = [...experience.conditions, ...experience.price.assumptions].filter(line => /cancel|reembols|devoluc/i.test(line));
  return lines.length ? lines.slice(0, 3) : ['La fija el anfitrión al confirmar. En esta prueba no hay nada que cancelar.'];
}

type Method = 'card' | 'transfer';
type Done = { method: 'card'; card: CardSummary } | { method: 'transfer'; mode: 'test' | 'live'; reference: string };
interface Line { experience: Experience; choices: PriceChoice[]; choiceId: string; valueCents: number }
export interface CheckoutProps {
  experiences: Experience[];
  /** Paradas sin precio comparable que, en una compra de todo el viaje, quedan como solicitud. */
  quoteExperiences?: Experience[];
  defaults?: { date?: string; endDate?: string; people?: number; children?: number; days?: number; trip?: string };
  onClose: () => void;
  /** Abre la billetera; por defecto emite `cv3:wallet`. */
  onViewWallet?: () => void;
}

export function Checkout({ experiences, quoteExperiences = [], defaults, onClose, onViewWallet = openWallet }: CheckoutProps) {
  const t = useT();
  const initialLines = useMemo(() => [...new Map(experiences.map(item => [item.id,item])).values()].flatMap((experience): Line[] => {
    const plan = purchasePlan(experience);
    return plan.kind === 'buy' ? [{ experience, choices: plan.choices, choiceId: (plan.choices.find(choice => choice.fixedPeople === (defaults?.people ?? 1)) ?? plan.choices[0]).id, valueCents: (plan.choices.find(choice => choice.fixedPeople === (defaults?.people ?? 1)) ?? plan.choices[0]).minCents }] : [];
  }), [experiences, defaults?.people]);
  const capacity = partyCapacity(...experiences.map(item => item.capacity.max));
  const single = initialLines.length === 1 && quoteExperiences.length === 0;
  const durationDays = single ? experienceDays(initialLines[0].experience.duration) : defaults?.days && defaults.days > 0 ? defaults.days : null;
  const [lines, setLines] = useState(initialLines);
  const [step, setStep] = useState(0);
  const [range, setRange] = useState<DateRange>(() => {
    const start = defaults?.date && isIsoDate(defaults.date) && defaults.date >= tomorrow() ? defaults.date : '';
    const end = start && defaults?.endDate && isIsoDate(defaults.endDate) && defaults.endDate >= start ? defaults.endDate : suggestEnd(start, durationDays);
    return { start, end };
  });
  const [party, setParty] = useState<Party>(() => { const total = Math.max(1, defaults?.people ?? 1); const children = Math.max(0, Math.min(total - 1, defaults?.children ?? 0)); return clampParty({ adults: total - children, children }, capacity); });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState<DocumentValue>({ type: 'cedula', number: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PaymentConfiguration | null>();
  const [method, setMethod] = useState<Method>('card');
  const [rejected, setRejected] = useState<{ card: CardSummary; reason: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<WalletRecord[]>([]);
  const [qr, setQr] = useState('');
  const [storageNotice, setStorageNotice] = useState('');
  const ids = useRef(lines.map(() => crypto.randomUUID()));
  const quoteIds = useRef(quoteExperiences.map(() => crypto.randomUUID()));
  const [code] = useState(testCode);
  const batchId = useRef(lines.length + quoteExperiences.length > 1 ? crypto.randomUUID() : null);
  const attempts = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { let live = true; getPaymentConfiguration().then(value => { if (live) setConfig(value); }).catch(() => { if (live) setConfig(null); }); return () => { live = false; }; }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const people = partySize(party);
  const linePeople = (line: Line) => line.choices.find(choice => choice.id === line.choiceId)?.fixedPeople ?? people;
  const lineUnit = (line: Line) => { const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0]; return clampChoice(choice, line.valueCents); };
  const total = lines.reduce((sum, line) => sum + lineTotalCents(lineUnit(line), linePeople(line)), 0);
  const docState = documentValidity(identity);
  const realAvailable = single && Boolean(config?.enabled) && lines.every(line => serverEnabled(line.experience));
  const trip = defaults?.trip ?? 'Compras sueltas';
  const summary = rangeSummary(range.start, range.end);
  const transferRequest = useMemo<TransferRequest | null>(() => single && lines[0] && range.start && range.end
    ? { experienceId: lines[0].experience.id, startDate: range.start, endDate: range.end, adults: party.adults, children: party.children } : null,
  [single, lines, range.start, range.end, party.adults, party.children]);

  function next(event: FormEvent) {
    event.preventDefault(); setError('');
    if (step === 0) {
      const problem = validateRange(range.start, range.end, tomorrow());
      if (problem) return setError(problem === 'start_missing' || problem === 'start_past' ? tr("Elige una fecha a partir de mañana.") : RANGE_ERROR_TEXT[problem]);
      const mismatch=lines.find(line=>{const choice=line.choices.find(item=>item.id===line.choiceId);return choice?.fixedPeople && choice.fixedPeople!==people;});
      if(mismatch) return setError(tr('La tarifa de {title} no corresponde al número de viajeros. Elige la opción del grupo correcto o solicita cotización.',{title:mismatch.experience.title}));
      if (people < 1 || people > capacity) return setError(tr("Indica entre 1 y {capacity} personas.", { capacity: capacity }));
    }
    if (step === 1) {
      if (name.trim().length < 3) return setError(tr("Escribe tu nombre y apellido."));
      if (!isEmail(email)) return setError(tr("Revisa tu correo: debe tener la forma nombre@dominio.ec"));
      if (!docState.valid) return setError(identity.type === 'cedula' ? tr("Revisa tu cédula: el formato todavía no es válido.") : tr("Revisa el número de pasaporte."));
    }
    if (step === 2 && !accepted) return setError(tr("Para seguir, acepta las condiciones de la compra de prueba."));
    setStep(value => Math.min(value + 1, 3));
  }
  function records(status: WalletStatus, pay: { card: CardSummary } | { transfer: { reference: string; receiptKind: 'image' | 'pdf' } }): WalletRecord[] {
    const now = new Date().toISOString();
    const buyer = { name: name.trim().slice(0, 120), emailMasked: maskEmail(email), documentType: identity.type, documentMasked: docState.masked || null };
    const when = { date: range.start, ...(range.end ? { endDate: range.end } : {}) };
    const payment = 'card' in pay ? { method: 'card' as const, card: { brand: pay.card.brand, last4: pay.card.last4 } } : { method: 'transfer' as const, transfer: { reference: pay.transfer.reference, receiptKind: pay.transfer.receiptKind } };
    const purchases = lines.map((line, index): WalletRecord => {
      const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0];
      const unit = lineUnit(line); const count = linePeople(line);
      const kids = choice.fixedPeople ? 0 : party.children;
      return { id: ids.current[index], code: code, kind: 'test_purchase', status, mode: 'test', experienceId: line.experience.id, title: line.experience.title, province: line.experience.province, ...when, people: count, ...(kids > 0 && kids < count ? { children: kids } : {}), currency: 'USD', unitCents: unit, totalCents: lineTotalCents(unit, count), priceNote: `${PRICE_TYPE[line.experience.price.type]} · ${choice.label}${isRange(choice) ? ` · elegiste ${formatUsd(unit)} dentro del rango` : ''}`.slice(0, 600), buyer, trip, batchId: batchId.current, attempts: attempts.current, ...payment, createdAt: now, updatedAt: now };
    });
    const kept = status === 'test_approved' || status === 'test_transfer_review';
    const requests = kept ? quoteExperiences.map((experience, index): WalletRecord => ({ id: quoteIds.current[index], code: code, kind: 'request', status: 'requested', mode: 'test', experienceId: experience.id, title: experience.title, province: experience.province, ...when, people, ...(party.children ? { children: party.children } : {}), currency: experience.price.currency, unitCents: null, totalCents: null, priceNote: `Sin precio comparable: ${experience.price.originalLabel}`.slice(0, 600), buyer, trip, batchId: batchId.current, attempts: 0, createdAt: now, updatedAt: now })) : [];
    return [...purchases, ...requests];
  }
  async function finish(values: WalletRecord[], result: Done) {
    const persisted = upsertRecords(values);
    if (!persisted) setStorageNotice(tr("Tu navegador no permitió guardar la billetera: la verás mientras esta página siga abierta."));
    setSaved(values); setRejected(null); setDone(result); setStep(4);
    try { setQr(await receiptQr(code)); } catch { setQr(''); }
  }
  /** Solo recibe marca + últimos 4: el número completo, el vencimiento y el CVV se quedaron en CardForm. */
  async function settle({ summary: card, outcome, reason }: CardPayment) {
    if (busy) return;
    const approve = outcome === 'approved';
    setBusy(true); setError(''); attempts.current += 1;
    try {
      const values = records(approve ? 'test_approved' : 'test_rejected', { card });
      if (approve) await finish(values, { method: 'card', card });
      else {
        if (!upsertRecords(values)) setStorageNotice(tr("Tu navegador no permitió guardar la billetera."));
        setRejected({ card, reason: reason || 'El banco rechazó la tarjeta (simulado).' });
      }
    } catch { setError(tr("No se pudo registrar la prueba. Vuelve a intentarlo.")); }
    finally { setBusy(false); }
  }
  async function transferSent(outcome: TransferOutcome) {
    if (busy) return;
    setBusy(true); setError(''); attempts.current += 1;
    try {
      if (outcome.mode === 'live') { setDone({ method: 'transfer', mode: 'live', reference: outcome.reference }); setStep(4); return; }
      await finish(records('test_transfer_review', { transfer: { reference: outcome.reference, receiptKind: outcome.receiptKind } }), { method: 'transfer', mode: 'test', reference: outcome.reference });
    } catch { setError(tr("No se pudo registrar el comprobante. Vuelve a intentarlo.")); }
    finally { setBusy(false); }
  }
  const setLine = (index: number, patch: Partial<Line>) => setLines(current => current.map((line, position) => position === index ? { ...line, ...patch } : line));
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return <Dialog title={single ? `Comprar · ${lines[0]?.experience.title ?? ''}` : t("Comprar todo mi viaje")} onClose={onClose} wide>
    <div className="buy-checkout">{!single && <p className="buy-route-summary">{t("Esta compra incluye {n} paradas con precio y {q} solicitudes de cotización.",{n:lines.length,q:quoteExperiences.length})}</p>}
      <p className="buy-test-ribbon" role="note"><FlaskConical size={18} aria-hidden="true" /><span><strong>{t("Modo prueba sin cobro.")}</strong>{' '}{t("No se cobra nada.")}</span></p>
      <div className="buy-progress" role="progressbar" aria-label={t("Avance de la compra")} aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={t("Paso {v} de {length}: {v2}", { v: step + 1, length: STEPS.length, v2: STEPS[step] })}><span style={{ width: `${progress}%` }} /></div>
      <ol className="buy-steps" aria-label={t("Pasos de la compra")}>{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-done={index < step || undefined}><span>{index < step ? <CheckCircle2 size={16} /> : index + 1}</span>{t(label)}</li>)}</ol>
      <p className="buy-step-count" aria-hidden="true">{t("Paso")}{' '}{step + 1} de {STEPS.length}</p>
      <h3 ref={heading} tabIndex={-1} className="buy-step-title">{t(STEPS[step])}</h3>

      {step < 3 && <form className="buy-form" onSubmit={next} noValidate>
        {step === 0 && <>
          <DateRangeField value={range} onChange={value => { setRange(value); setError(''); }} minStart={tomorrow()} durationDays={durationDays} />
          <PeopleStepper value={party} capacity={capacity} onChange={setParty} />
          {party.children > 0 && <p className="buy-hint">{t("Los niños pagan igual, salvo que el anfitrión diga otra cosa.")}</p>}
          {lines.map((line, index) => { const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0]; return <section key={line.experience.id} className="buy-line">
            {!single && <h4>{line.experience.title}</h4>}
            <p className="buy-price-type"><span className="buy-chip">{t(PRICE_TYPE[line.experience.price.type])}</span>{line.experience.price.originalLabel}</p>
            {line.choices.length > 1 && <label><span>{t("Opción de la fuente")}</span><select className="field" value={line.choiceId} onChange={event => { const picked = line.choices.find(item => item.id === event.target.value) ?? line.choices[0]; setLine(index, { choiceId: picked.id, valueCents: picked.minCents }); }}>{line.choices.map(item => <option key={item.id} value={item.id}>{item.label} · {choiceLabel(item)}</option>)}</select></label>}
            {isRange(choice) && <label className="buy-range"><span>{t("Tu valor dentro del rango (")}{choiceLabel(choice)})</span><input type="range" min={choice.minCents / 100} max={(choice.maxCents ?? choice.minCents) / 100} step={1} value={lineUnit(line) / 100} onChange={event => setLine(index, { valueCents: Math.round(Number(event.target.value) * 100) })} aria-valuetext={t("{v} por persona", { v: formatUsd(lineUnit(line)) })} /><output>{formatUsd(lineUnit(line))}{' '}{t("por persona")}</output></label>}
            {choice.fixedPeople && <p className="buy-hint">{t("Opción para un grupo de")}{' '}{choice.fixedPeople}{' '}{t("personas: el total usa ese número.")}</p>}
            {choice.maxCents === null && <p className="buy-hint">{t("Precio «desde»: el anfitrión confirma el definitivo.")}</p>}
            <p className="buy-line-total">{linePeople(line)} × {formatUsd(lineUnit(line))} = <strong>{formatUsd(lineTotalCents(lineUnit(line), linePeople(line)))}</strong></p>
          </section>; })}
          {quoteExperiences.length > 0 && <section className="buy-line buy-quote-list"><h4>{t("Quedan como solicitud (")}{quoteExperiences.length})</h4><ul>{quoteExperiences.map(item => <li key={item.id}>{item.title}</li>)}</ul><p className="buy-hint">{t("Sin precio comparable en USD: quedan como cotización, sin importe.")}</p></section>}
          <div className="buy-total-bar" aria-live="polite"><span>{summary ? summary.label : t("Fechas por elegir")} · {partyLabel(party)}</span><strong>{formatUsd(total)}</strong></div>
        </>}
        {step === 1 && <>
          <label><span>{t("Nombre y apellido")}</span><input className="field" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
          <label><span>{t("Correo")}</span><input className="field" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
          <CedulaField value={identity} onChange={setIdentity} />
          <p className="buy-hint"><ShieldCheck size={16} aria-hidden="true" />{' '}{t("Guardamos tu nombre, el correo enmascarado y solo 4 dígitos del documento.")}</p>
        </>}
        {step === 2 && <>
          <div className="buy-recap">
            <div><span>{t("Fechas")}</span><strong>{shortDay(range.start)} → {shortDay(range.end)}</strong><small>{summary?.label}</small></div>
            <div><span>{t("Personas")}</span><strong>{people}</strong><small>{partyLabel(party)}</small></div>
          </div>
          <dl className="buy-summary">
            {lines.map(line => <div key={line.experience.id}><dt>{line.experience.title}<small>{linePeople(line)} {linePeople(line) === 1 ? 'persona' : 'personas'}{' '}{t("· moneda original:")}{' '}{line.experience.price.currency}</small></dt><dd>{formatUsd(lineTotalCents(lineUnit(line), linePeople(line)))}</dd></div>)}
            <div className="buy-summary-total"><dt>{t("Total de la prueba")}</dt><dd>{formatUsd(total)}</dd></div>
          </dl>
          {lines.map(line => <details key={line.experience.id} className="buy-details">
            <summary>{t("Qué incluye")}{single ? '' : ` · ${line.experience.title}`}</summary>
            <div className="buy-includes"><div><h5>{t("Incluye")}</h5><ul>{(line.experience.price.includes.length ? line.experience.price.includes : ['Por confirmar con el anfitrión']).map(item => <li key={item}>{item}</li>)}</ul></div><div><h5>{t("No incluye")}</h5><ul>{(line.experience.price.excludes.length ? line.experience.price.excludes : ['Traslados y gastos personales']).map(item => <li key={item}>{item}</li>)}</ul></div></div>
            <h5>{t("Cancelación")}</h5><ul>{cancellation(line.experience).map(item => <li key={item}>{item}</li>)}</ul>
          </details>)}
          <details className="buy-details"><summary>{t("Papel de CHULLA VIDA")}</summary><p className="buy-role">{t("En una venta real, si actuamos como plataforma, agencia o intermediario está")}{' '}<em>{t("por definir jurídicamente")}</em>{t(". Los precios vienen de la fuente y el anfitrión los confirma.")}</p></details>
          <label className="buy-accept"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>{t("Entiendo que es una")}{' '}<strong>{t("compra de prueba sin cobro")}</strong>{t(": no reserva cupos ni es factura.")}</span></label>
        </>}
        <p className="buy-error" role="alert">{error}</p>
        <div className="buy-actions">
          {step > 0 ? <button type="button" className="button button-secondary" onClick={() => { setError(''); setStep(value => value - 1); }}><ArrowLeft size={16} />{t("Atrás")}</button> : <span />}
          <button type="submit" className="button button-primary">{step === 2 ? t("Elegir método de pago") : t("Continuar")}<ArrowRight size={16} /></button>
        </div>
      </form>}

      {step === 3 && <section className="buy-pay" aria-busy={busy}>
        <p className="buy-pay-total">{t("Total:")}{' '}<strong>{formatUsd(total)}</strong> <span>· {realAvailable && method === 'card' ? 'se cobra en la pasarela segura' : t("prueba, sin cobro")}</span></p>
        <fieldset className="buy-method">
          <legend>{t("¿Cómo quieres pagar?")}</legend>
          <div className="buy-method-options">
            <label className="buy-method-option"><input type="radio" name="buy-method" value="card" checked={method === 'card'} onChange={() => { setMethod('card'); setError(''); }} /><CreditCard size={20} aria-hidden="true" /><span>{t("Tarjeta de crédito o débito")}<small>{t("Visa, Mastercard, Amex, Diners, Discover")}</small></span></label>
            <label className="buy-method-option"><input type="radio" name="buy-method" value="transfer" checked={method === 'transfer'} onChange={() => { setMethod('transfer'); setRejected(null); setError(''); }} /><Landmark size={20} aria-hidden="true" /><span>{t("Transferencia bancaria")}<small>{t("Subes el comprobante")}</small></span></label>
            <label className="buy-method-option is-soon"><input type="radio" name="buy-method" value="deuna" disabled /><Smartphone size={20} aria-hidden="true" /><span>{t("DeUna")}<small>{t("Próximamente")}</small></span></label>
          </div>
          {method === 'card' && <div className="buy-method-brands" role="list" aria-label={t("Marcas aceptadas")}>{BRAND_ORDER.map(brand => <span key={brand} role="listitem"><CardBrandMark brand={brand} size="sm" /></span>)}</div>}
        </fieldset>
        {method === 'transfer' ? <TransferPayment amountCents={total} testReference={code} request={transferRequest} busy={busy} onSubmitted={outcome => void transferSent(outcome)} />
          : config === undefined ? <p className="buy-hint" role="status">{t("Consultando si la pasarela está activa…")}</p>
            : realAvailable ? <div className="buy-gateway"><p><Lock size={16} aria-hidden="true" /> <strong>{t("La pasarela PayPhone está activa")}</strong>{' '}{t("para esta oferta. Tu tarjeta se escribe solo en la página segura de PayPhone, nunca en CHULLA VIDA.")}</p><p>{t("El cobro se hace en «Reservas y pagos», cuando el anfitrión confirme tu fecha.")}</p><button type="button" className="button button-primary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:payments')); }}>{t("Ir a Reservas y pagos")}</button></div>
              : <>
                <p className="buy-hint">{config?.enabled ? t("Esta ficha todavía no tiene una oferta verificada por el servidor.") : t("Los cobros con tarjeta todavía no están activados.")}{' '}{t("Elige una tarjeta de prueba.")}</p>
                {rejected && <div className="buy-rejected" role="alert"><CircleX size={22} aria-hidden="true" /><div><strong>{t("Pago de prueba rechazado ·")}{' '}{cardLabel(rejected.card)}</strong><p>{rejected.reason}{' '}{t("No se cobró nada.")}</p></div></div>}
                <CardForm amountLabel={formatUsd(total)} defaultHolder={name} busy={busy} onPay={payment => void settle(payment)} />
              </>}
        <p className="buy-error" role="alert">{error}</p>
        <div className="buy-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setRejected(null); setStep(2); }}><ArrowLeft size={16} />{t("Atrás")}</button>
        </div>
      </section>}

      {step === 4 && done && <section className="buy-done">
        {done.method === 'card' ? <>
          <div className="buy-done-head"><span className="buy-burst" aria-hidden="true"><CheckCircle2 size={34} /></span><div><p className="buy-done-label">{TEST_RECEIPT_LABEL}</p><h4>{t("¡Listo! Quedó en tu billetera.")}</h4><p>{t("Código")}{' '}<strong>{code}</strong> · {formatUsd(total)}{' '}{t("· sin cobro.")}</p></div></div>
          <p className="buy-paid-with"><CardBrandMark brand={done.card.brand} />{cardLabel(done.card)}<small>{t("tarjeta de prueba · aprobada")}</small></p>
        </> : <>
          <div className="buy-done-head"><span className="buy-burst is-pending" aria-hidden="true"><Clock3 size={32} /></span><div>{done.mode === 'test' && <p className="buy-done-label">{TEST_RECEIPT_LABEL}</p>}<h4>{t("Comprobante enviado")}</h4><p>{t("Referencia")}{' '}<strong>{done.reference}</strong> · {formatUsd(total)}</p></div></div>
          <p className="buy-status-chip"><Landmark size={16} aria-hidden="true" />{TRANSFER_STATUS_TEXT.receipt_submitted}</p>
          <p className="buy-hint">{done.mode === 'live' ? t("El anfitrión revisa su banco y confirma. Sigue el estado en tu billetera.") : t("Prueba: nadie revisará este comprobante. Puedes simular la respuesta desde tu billetera.")}</p>
        </>}
        {qr && saved.length > 0 && <img className="buy-qr" src={qr} alt={`Código QR del comprobante de prueba ${code}`} width={148} height={148} />}
        {quoteExperiences.length > 0 && saved.length > 0 && <p className="buy-hint">{quoteExperiences.length} {quoteExperiences.length === 1 ? t("parada quedó") : 'paradas quedaron'}{' '}{t("como solicitud de cotización.")}</p>}
        {storageNotice && <p className="buy-hint" role="status">{storageNotice}</p>}
        <div className="buy-actions">
          {saved.length > 0 && <button type="button" className="button button-secondary" onClick={() => void downloadReceipt(code, saved)}><Download size={16} />{t("Descargar comprobante de prueba")}</button>}
          <button type="button" className="button button-primary" onClick={() => { onClose(); onViewWallet(); }}><Wallet size={16} />{t("Ver en mi billetera")}</button>
        </div>
        {saved.length > 0 && <p className="buy-hint"><ReceiptText size={16} aria-hidden="true" />{' '}{t("Cada página dice «")}{TEST_RECEIPT_LABEL}{t("»: no es factura ni reserva.")}</p>}
      </section>}
    </div>
  </Dialog>;
}
