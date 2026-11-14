import { useState, type FormEvent } from 'react';
import { CheckCircle2, MessageSquareQuote, Wallet } from 'lucide-react';
import { Dialog } from '../../components/chulla/Dialog';
import type { Experience } from '../../domain/catalog';
import { isEmail, maskEmail, testCode, type WalletRecord } from '../../domain/payments/purchase';
import { openWallet, upsertRecords } from '../wallet/store';
import './checkout.css';

/** Solicitud de cotización para fichas en EUR o sin precio comparable. Se guarda en la billetera; no se envía sola. */
export function QuoteRequest({ experience, reason, trip = 'Compras sueltas', onClose, onViewWallet = openWallet }: { experience: Experience; reason: string; trip?: string; onClose: () => void; onViewWallet?: () => void }) {
  const [date, setDate] = useState('');
  const [people, setPeople] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (name.trim().length < 3) return setError('Escribe tu nombre y apellido.');
    if (!isEmail(email)) return setError('Revisa tu correo: debe tener la forma nombre@dominio.ec');
    if (!Number.isInteger(people) || people < 1 || people > 50) return setError('Indica entre 1 y 50 personas.');
    const now = new Date().toISOString();
    const record: WalletRecord = { id: crypto.randomUUID(), code: testCode().replace('PRB', 'SOL'), kind: 'request', status: 'requested', mode: 'test', experienceId: experience.id, title: experience.title, province: experience.province, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '', people, currency: experience.price.currency, unitCents: null, totalCents: null, priceNote: `Precio de la fuente: ${experience.price.originalLabel}`.slice(0, 600), buyer: { name: name.trim().slice(0, 120), emailMasked: maskEmail(email), documentType: null, documentMasked: null }, trip, batchId: null, attempts: 0, createdAt: now, updatedAt: now };
    upsertRecords([record]); setDone(true);
  }
  return <Dialog title={`Solicitar cotización · ${experience.title}`} onClose={onClose}>
    <div className="buy-checkout">
      {done ? <section className="buy-done"><div className="buy-done-head"><span className="buy-burst" aria-hidden="true"><CheckCircle2 size={32} /></span><div><h4>Solicitud guardada en tu billetera.</h4><p>Todavía no hay anfitriones verificados conectados, así que no la enviamos a nadie. Cuando se activen, podrás mandarla desde tu billetera.</p></div></div><div className="buy-actions"><button className="button button-primary" onClick={() => { onClose(); onViewWallet(); }}><Wallet size={16} />Ver en mi billetera</button></div></section>
        : <form className="buy-form" onSubmit={submit} noValidate>
          <p className="buy-quote-reason"><MessageSquareQuote size={20} aria-hidden="true" /><span>{reason}</span></p>
          <p className="buy-price-type">Precio tal como lo da la fuente: <strong>{experience.price.originalLabel}</strong></p>
          <div className="buy-grid"><label><span>Fecha tentativa</span><input className="field" type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label><span>Personas</span><input className="field" type="number" min={1} max={50} value={people} onChange={event => setPeople(Math.round(Number(event.target.value)))} /></label></div>
          <label><span>Nombre y apellido</span><input className="field" autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
          <label><span>Correo</span><input className="field" type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
          <p className="buy-error" role="alert">{error}</p>
          <div className="buy-actions"><button type="button" className="button button-secondary" onClick={onClose}>Ahora no</button><button type="submit" className="button button-primary">Guardar solicitud</button></div>
        </form>}
    </div>
  </Dialog>;
}
