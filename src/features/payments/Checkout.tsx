import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, CircleX, Download, FlaskConical, ReceiptText, RefreshCw, ShieldCheck, Users, Wallet } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import type { Experience } from '../../domain/catalog';
import { choiceLabel, clampChoice, formatUsd, isEmail, isRange, lineTotalCents, maskEmail, purchasePlan, testCode, TEST_RECEIPT_LABEL, type PriceChoice, type WalletRecord } from '../../domain/payments/purchase';
import { CedulaField, documentValidity, type DocumentValue } from './CedulaField';
import { getPaymentConfiguration, type PaymentConfiguration } from './api';
import { openWallet, upsertRecords } from '../wallet/store';
import { downloadReceipt, receiptQr } from '../wallet/receipt';
import './checkout.css';

/* Checkout en pasos. Hoy cierra en MODO PRUEBA SIN COBRO; el cobro real solo existe en el
   flujo PayPhone de «Reservas y pagos», cuando el servidor lo habilita para una oferta verificada. */

const STEPS = ['Fecha y personas', 'Tus datos', 'Resumen', 'Pago', 'Comprobante'] as const;
const PRICE_TYPE: Record<Experience['price']['type'], string> = { referential: 'Precio referencial de la fuente', proposed: 'Precio propuesto, por validar', verified_offer: 'Oferta verificada' };
const tomorrow = () => { const value = new Date(Date.now() + 86400000); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
const serverEnabled = (experience: Experience) => (experience as { bookingEnabled: boolean }).bookingEnabled === true;
function cancellation(experience: Experience): string[] {
  const lines = [...experience.conditions, ...experience.price.assumptions].filter(line => /cancel|reembols|devoluc/i.test(line));
  return lines.length ? lines.slice(0, 3) : ['El anfitrión fija su política de cancelación al confirmar la oferta. En esta prueba no hay nada que cancelar ni reembolsar.'];
}

interface Line { experience: Experience; choices: PriceChoice[]; choiceId: string; valueCents: number }
export interface CheckoutProps {
  experiences: Experience[];
  /** Paradas sin precio comparable que, en una compra de todo el viaje, quedan como solicitud. */
  quoteExperiences?: Experience[];
  defaults?: { date?: string; people?: number; trip?: string };
  onClose: () => void;
  /** Abre la billetera; por defecto emite `cv3:wallet`. */
  onViewWallet?: () => void;
}

export function Checkout({ experiences, quoteExperiences = [], defaults, onClose, onViewWallet = openWallet }: CheckoutProps) {
  const initialLines = useMemo(() => experiences.flatMap((experience): Line[] => {
    const plan = purchasePlan(experience);
    return plan.kind === 'buy' ? [{ experience, choices: plan.choices, choiceId: plan.choices[0].id, valueCents: plan.choices[0].minCents }] : [];
  }), [experiences]);
  const [lines, setLines] = useState(initialLines);
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(() => defaults?.date && defaults.date >= tomorrow() ? defaults.date : '');
  const [people, setPeople] = useState(() => Math.min(50, Math.max(1, defaults?.people ?? 1)));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identity, setIdentity] = useState<DocumentValue>({ type: 'cedula', number: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PaymentConfiguration | null>();
  const [rejected, setRejected] = useState(false);
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

  const capacity = Math.min(50, ...experiences.map(item => item.capacity.max ?? 50));
  const linePeople = (line: Line) => line.choices.find(choice => choice.id === line.choiceId)?.fixedPeople ?? people;
  const lineUnit = (line: Line) => { const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0]; return clampChoice(choice, line.valueCents); };
  const total = lines.reduce((sum, line) => sum + lineTotalCents(lineUnit(line), linePeople(line)), 0);
  const docState = documentValidity(identity);
  const single = lines.length === 1 && quoteExperiences.length === 0;
  const realAvailable = Boolean(config?.enabled) && lines.every(line => serverEnabled(line.experience));
  const trip = defaults?.trip ?? 'Compras sueltas';

  function next(event: FormEvent) {
    event.preventDefault(); setError('');
    if (step === 0) {
      if (!date || date < tomorrow()) return setError('Elige una fecha a partir de mañana.');
      if (!Number.isInteger(people) || people < 1 || people > capacity) return setError(`Indica entre 1 y ${capacity} personas.`);
    }
    if (step === 1) {
      if (name.trim().length < 3) return setError('Escribe tu nombre y apellido.');
      if (!isEmail(email)) return setError('Revisa tu correo: debe tener la forma nombre@dominio.ec');
      if (!docState.valid) return setError(identity.type === 'cedula' ? 'Revisa tu cédula: el formato todavía no es válido.' : 'Revisa el número de pasaporte.');
    }
    if (step === 2 && !accepted) return setError('Para seguir, acepta las condiciones de la compra de prueba.');
    setStep(value => Math.min(value + 1, 3));
  }
  function records(status: 'test_approved' | 'test_rejected'): WalletRecord[] {
    const now = new Date().toISOString();
    const buyer = { name: name.trim().slice(0, 120), emailMasked: maskEmail(email), documentType: identity.type, documentMasked: docState.masked || null };
    const purchases = lines.map((line, index): WalletRecord => {
      const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0];
      const unit = lineUnit(line); const count = linePeople(line);
      return { id: ids.current[index], code: code, kind: 'test_purchase', status, mode: 'test', experienceId: line.experience.id, title: line.experience.title, province: line.experience.province, date, people: count, currency: 'USD', unitCents: unit, totalCents: lineTotalCents(unit, count), priceNote: `${PRICE_TYPE[line.experience.price.type]} · ${choice.label}${isRange(choice) ? ` · elegiste ${formatUsd(unit)} dentro del rango` : ''}`.slice(0, 600), buyer, trip, batchId: batchId.current, attempts: attempts.current, createdAt: now, updatedAt: now };
    });
    const requests = status === 'test_approved' ? quoteExperiences.map((experience, index): WalletRecord => ({ id: quoteIds.current[index], code: code, kind: 'request', status: 'requested', mode: 'test', experienceId: experience.id, title: experience.title, province: experience.province, date, people, currency: experience.price.currency, unitCents: null, totalCents: null, priceNote: `Sin precio comparable: ${experience.price.originalLabel}`.slice(0, 600), buyer, trip, batchId: batchId.current, attempts: 0, createdAt: now, updatedAt: now })) : [];
    return [...purchases, ...requests];
  }
  async function settle(approve: boolean) {
    if (busy) return;
    setBusy(true); setError(''); attempts.current += 1;
    try {
      const values = records(approve ? 'test_approved' : 'test_rejected');
      const persisted = upsertRecords(values);
      if (!persisted) setStorageNotice('Tu navegador no permitió guardar la billetera: la verás solo mientras esta página siga abierta.');
      if (approve) {
        setSaved(values); setRejected(false); setStep(4);
        try { setQr(await receiptQr(code)); } catch { setQr(''); }
      } else setRejected(true);
    } catch { setError('No se pudo registrar la prueba. Vuelve a intentarlo.'); }
    finally { setBusy(false); }
  }
  const setLine = (index: number, patch: Partial<Line>) => setLines(current => current.map((line, position) => position === index ? { ...line, ...patch } : line));

  return <Dialog title={single ? `Comprar · ${lines[0]?.experience.title ?? ''}` : 'Comprar todo mi viaje'} onClose={onClose} wide>
    <div className="buy-checkout">
      <p className="buy-test-ribbon" role="note"><FlaskConical size={18} aria-hidden="true" /><span><strong>Modo prueba sin cobro.</strong> Puedes recorrer toda la compra; no se pide tarjeta y no se cobra nada.</span></p>
      <ol className="buy-steps" aria-label="Pasos de la compra">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-done={index < step || undefined}><span>{index < step ? <CheckCircle2 size={16} /> : index + 1}</span>{label}</li>)}</ol>
      <h3 ref={heading} tabIndex={-1} className="buy-step-title">{STEPS[step]}</h3>

      {step < 3 && <form className="buy-form" onSubmit={next} noValidate>
        {step === 0 && <>
          <div className="buy-grid">
            <label><span><CalendarDays size={16} aria-hidden="true" />Fecha {single ? '' : 'de inicio '}</span><input className="field" type="date" required min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} /></label>
            <label><span><Users size={16} aria-hidden="true" />Personas</span><input className="field" type="number" min={1} max={capacity} required value={people} onChange={event => setPeople(Math.round(Number(event.target.value)))} /></label>
          </div>
          {lines.map((line, index) => { const choice = line.choices.find(item => item.id === line.choiceId) ?? line.choices[0]; return <section key={line.experience.id} className="buy-line">
            {!single && <h4>{line.experience.title}</h4>}
            <p className="buy-price-type">{PRICE_TYPE[line.experience.price.type]} · {line.experience.price.originalLabel}</p>
            {line.choices.length > 1 && <label><span>Opción de la fuente</span><select className="field" value={line.choiceId} onChange={event => { const picked = line.choices.find(item => item.id === event.target.value) ?? line.choices[0]; setLine(index, { choiceId: picked.id, valueCents: picked.minCents }); }}>{line.choices.map(item => <option key={item.id} value={item.id}>{item.label} · {choiceLabel(item)}</option>)}</select></label>}
            {isRange(choice) && <label className="buy-range"><span>Tu valor dentro del rango ({choiceLabel(choice)})</span><input type="range" min={choice.minCents / 100} max={(choice.maxCents ?? choice.minCents) / 100} step={1} value={lineUnit(line) / 100} onChange={event => setLine(index, { valueCents: Math.round(Number(event.target.value) * 100) })} aria-valuetext={`${formatUsd(lineUnit(line))} por persona`} /><output>{formatUsd(lineUnit(line))} por persona</output></label>}
            {choice.fixedPeople && <p className="buy-hint">Esta opción es para un grupo de {choice.fixedPeople} personas: el total usa ese número.</p>}
            {choice.maxCents === null && <p className="buy-hint">La fuente indica «desde»: usamos el valor mínimo y el anfitrión confirmará el definitivo.</p>}
            <p className="buy-line-total">{linePeople(line)} × {formatUsd(lineUnit(line))} = <strong>{formatUsd(lineTotalCents(lineUnit(line), linePeople(line)))}</strong></p>
          </section>; })}
          {quoteExperiences.length > 0 && <section className="buy-line buy-quote-list"><h4>Quedan como solicitud ({quoteExperiences.length})</h4><ul>{quoteExperiences.map(item => <li key={item.id}>{item.title} · {item.price.originalLabel}</li>)}</ul><p className="buy-hint">No tienen precio comparable en USD: las guardamos en tu billetera como solicitud de cotización, sin importe.</p></section>}
        </>}
        {step === 1 && <>
          <label><span>Nombre y apellido</span><input className="field" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
          <label><span>Correo</span><input className="field" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
          <CedulaField value={identity} onChange={setIdentity} />
          <p className="buy-hint"><ShieldCheck size={16} aria-hidden="true" /> En tu billetera guardamos tu nombre, el correo enmascarado y solo los últimos 4 caracteres del documento.</p>
        </>}
        {step === 2 && <>
          <dl className="buy-summary">
            {lines.map(line => <div key={line.experience.id}><dt>{line.experience.title}<small>{date} · {linePeople(line)} {linePeople(line) === 1 ? 'persona' : 'personas'} · moneda original: {line.experience.price.currency}</small></dt><dd>{formatUsd(lineTotalCents(lineUnit(line), linePeople(line)))}</dd></div>)}
            <div className="buy-summary-total"><dt>Total de la prueba</dt><dd>{formatUsd(total)}</dd></div>
          </dl>
          {lines.map(line => <details key={line.experience.id} className="buy-details" open={single}>
            <summary>Qué incluye y qué no{single ? '' : ` · ${line.experience.title}`}</summary>
            <div className="buy-includes"><div><h5>Incluye según la fuente</h5><ul>{(line.experience.price.includes.length ? line.experience.price.includes : ['Por confirmar con el anfitrión']).map(item => <li key={item}>{item}</li>)}</ul></div><div><h5>No incluye</h5><ul>{(line.experience.price.excludes.length ? line.experience.price.excludes : ['Traslados y gastos personales, salvo que el anfitrión diga otra cosa']).map(item => <li key={item}>{item}</li>)}</ul></div></div>
            <h5>Cancelación</h5><ul>{cancellation(line.experience).map(item => <li key={item}>{item}</li>)}</ul>
          </details>)}
          <p className="buy-role"><strong>Papel de CHULLA VIDA:</strong> en una venta real, si actuamos como plataforma, agencia o intermediario está <em>por definir jurídicamente</em>. Hoy organizamos la información de la fuente; los precios son referenciales o propuestos y el anfitrión debe confirmarlos.</p>
          <label className="buy-accept"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Entiendo que es una <strong>compra de prueba sin cobro</strong>: no reserva cupos, no es una factura y el comprobante no tiene valor.</span></label>
        </>}
        <p className="buy-error" role="alert">{error}</p>
        <div className="buy-actions">
          {step > 0 ? <button type="button" className="button button-secondary" onClick={() => { setError(''); setStep(value => value - 1); }}><ArrowLeft size={16} />Atrás</button> : <span />}
          <button type="submit" className="button button-primary">{step === 2 ? 'Ir al pago de prueba' : 'Continuar'}<ArrowRight size={16} /></button>
        </div>
      </form>}

      {step === 3 && <section className="buy-pay" aria-busy={busy}>
        <p className="buy-pay-total">Total: <strong>{formatUsd(total)}</strong> <span>· prueba, sin cobro</span></p>
        {config === undefined ? <p className="buy-hint" role="status">Consultando si la pasarela está activa…</p>
          : realAvailable ? <div className="buy-real"><p>La pasarela PayPhone está activa y esta oferta está habilitada por el servidor. El cobro real se hace en «Reservas y pagos», después de que el anfitrión confirme tu fecha.</p><button className="button button-secondary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:payments')); }}>Ir a Reservas y pagos</button></div>
            : <p className="buy-hint">{config?.enabled ? 'La pasarela está lista, pero esta ficha todavía no tiene una oferta verificada por el servidor.' : 'Los cobros con tarjeta todavía no están activados.'} Por eso esta compra se completa como prueba: elige qué resultado quieres ver.</p>}
        {rejected && <div className="buy-rejected" role="alert"><CircleX size={22} aria-hidden="true" /><div><strong>Pago de prueba rechazado.</strong><p>No se cobró nada. Así se vería un rechazo del banco: puedes reintentar cuando quieras.</p></div></div>}
        <p className="buy-error" role="alert">{error}</p>
        <div className="buy-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setRejected(false); setStep(2); }}><ArrowLeft size={16} />Atrás</button>
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => void settle(false)}>{rejected ? <><RefreshCw size={16} />Rechazar otra vez</> : <><CircleX size={16} />Rechazar pago de prueba</>}</button>
          <button type="button" className="button button-primary" disabled={busy} onClick={() => void settle(true)}>{rejected ? <><RefreshCw size={16} />Reintentar y aprobar</> : <><BadgeCheck size={16} />Aprobar pago de prueba</>}</button>
        </div>
      </section>}

      {step === 4 && <section className="buy-done">
        <div className="buy-done-head"><span className="buy-burst" aria-hidden="true"><CheckCircle2 size={34} /></span><div><p className="buy-done-label">{TEST_RECEIPT_LABEL}</p><h4>¡Listo! Tu compra de prueba quedó en tu billetera.</h4><p>Código <strong>{code}</strong> · {formatUsd(total)} · no se cobró nada.</p></div></div>
        {qr && <img className="buy-qr" src={qr} alt={`Código QR del comprobante de prueba ${code}`} width={148} height={148} />}
        {quoteExperiences.length > 0 && <p className="buy-hint">{quoteExperiences.length} {quoteExperiences.length === 1 ? 'parada quedó' : 'paradas quedaron'} como solicitud de cotización.</p>}
        {storageNotice && <p className="buy-hint" role="status">{storageNotice}</p>}
        <div className="buy-actions">
          <button type="button" className="button button-secondary" onClick={() => void downloadReceipt(code, saved)}><Download size={16} />Descargar comprobante de prueba</button>
          <button type="button" className="button button-primary" onClick={() => { onClose(); onViewWallet(); }}><Wallet size={16} />Ver en mi billetera</button>
        </div>
        <p className="buy-hint"><ReceiptText size={16} aria-hidden="true" /> El comprobante dice «{TEST_RECEIPT_LABEL}» en cada página: no es una factura ni una reserva.</p>
      </section>}
    </div>
  </Dialog>;
}
