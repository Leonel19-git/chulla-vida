import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, Check, CheckCircle2, CircleAlert, CreditCard, Download, Leaf, LoaderCircle, LockKeyhole, Minus, Plus, QrCode, ReceiptText, RotateCcw, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import type { Reservation } from '../../types';
import { Dialog } from './Dialog';
import { placeImage, shortTitle } from './content';
import { languageMetadata } from '../../i18n/ui';
import './checkout.css';
type Method = 'tarjeta' | 'transferencia' | 'deuna';
type DemoOutcome = 'aprobado' | 'rechazado';
const methods = [
    { id: 'tarjeta' as Method, title: 'Tarjeta', description: 'Prueba una aprobación o un rechazo.', icon: CreditCard },
    { id: 'transferencia' as Method, title: 'Transferencia', description: 'Simula una referencia por revisar.', icon: Banknote },
    { id: 'deuna' as Method, title: 'Deuna · demo', description: 'Explora un QR sin cobro.', icon: QrCode },
];
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const tomorrow = () => { const day = new Date(`${today()}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + 1); return day.toISOString().slice(0, 10); };
export function BookingDialog() {
    const { bookingPlace: p, setBookingPlace, onboarding, createReservationAndPay, setActiveTab, t, language } = useApp();
    const locale = languageMetadata[language].tag;
    const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    const readableDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    const [step, setStep] = useState(0);
    const [date, setDate] = useState(tomorrow);
    const [pax, setPax] = useState(onboarding.cantidad_personas);
    const [method, setMethod] = useState<Method>('tarjeta');
    const [outcome, setOutcome] = useState<DemoOutcome>('aprobado');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [phase, setPhase] = useState(0);
    const [success, setSuccess] = useState<Reservation | null>(null);
    const [qr, setQr] = useState('');
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const busy = useRef(false);
    const generation = useRef(0);
    const heading = useRef<HTMLHeadingElement>(null);
    const stopTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; generation.current += 1; busy.current = false; };
    useEffect(() => {
        stopTimers();
        setStep(0);
        setDate(tomorrow());
        setPax(Math.max(1, Math.min(onboarding.cantidad_personas, p?.cupos_disponibles_dia || 1, 100)));
        setMethod('tarjeta');
        setOutcome('aprobado');
        setError('');
        setSending(false);
        setPhase(0);
        setSuccess(null);
        return stopTimers;
    }, [p?.id, onboarding.cantidad_personas]);
    useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, success]);
    useEffect(() => {
        let live = true;
        QRCode.toDataURL('CHULLA-VIDA:DEMO', { width: 156, margin: 2, color: { dark: '#344936', light: '#fffdf8' } }).then(value => { if (live)
            setQr(value); }).catch(() => { if (live)
            setQr(''); });
        return () => { live = false; };
    }, []);
    if (!p)
        return null;
    const maxPax = Math.min(100, p.cupos_disponibles_dia);
    const total = p.precio_base_pp * pax;
    const selectedMethod = methods.find(item => item.id === method)!;
    const close = () => { stopTimers(); setBookingPlace(null); };
    const validate = () => {
        if (!date || date < today()) {
            setError('Elige una fecha de hoy en adelante para continuar.');
            return false;
        }
        if (!Number.isInteger(pax) || pax < 1 || pax > maxPax) {
            setError(maxPax ? t('Esta experiencia admite de 1 a {max} personas. Ajusta tu grupo.', { max: maxPax }) : 'Esta experiencia no tiene cupos. Prueba con otra escapada.');
            return false;
        }
        setError('');
        return true;
    };
    const advance = () => { if (validate())
        setStep(value => Math.min(value + 1, 2)); };
    const back = () => { stopTimers(); setSending(false); setPhase(0); setError(''); setStep(value => Math.max(0, value - 1)); };
    const simulate = () => {
        if (busy.current || !validate())
            return;
        busy.current = true;
        setSending(true);
        setPhase(0);
        const run = ++generation.current;
        timers.current = [setTimeout(() => setPhase(1), 420), setTimeout(() => setPhase(2), 900), setTimeout(async () => {
                if (generation.current !== run)
                    return;
                if (method === 'tarjeta' && outcome === 'rechazado') {
                    busy.current = false;
                    setSending(false);
                    setError('Rechazo de prueba. No se guardó ninguna solicitud ni se realizó un cobro. Puedes probar la aprobación.');
                    return;
                }
                try {
                    const reservation = await createReservationAndPay(p, date, pax, [], method, method === 'transferencia' ? 'pendiente' : 'aprobado');
                    if (generation.current === run) {
                        setSuccess(reservation);
                        setError('');
                    }
                }
                catch (err) {
                    if (generation.current === run)
                        setError(err instanceof Error ? err.message : 'No se pudo guardar la simulación. Revisa tu fecha y vuelve a intentarlo.');
                }
                finally {
                    if (generation.current === run) {
                        busy.current = false;
                        setSending(false);
                        timers.current = [];
                    }
                }
            }, 1450)];
    };
    const download = () => {
        if (!success)
            return;
        const text = [
            `CHULLA VIDA · ${t('DEMOSTRACIÓN')}`, t('COMPROBANTE DE SIMULACIÓN · SIN VALOR DE PAGO'), '', shortTitle(p),
            `${t('Fecha')}: ${readableDate(success.fecha_tour)}`,
            `${t('Tu grupo')}: ${success.cantidad_personas} ${t('personas')}`,
            `${t('Método de prueba')}: ${t(selectedMethod.title)}`,
            `${t('Total simulado')}: ${money(success.precio_total)}`,
            `${t('Estado del pago de prueba')}: ${t(success.pago_demo?.estado === 'pendiente' ? 'Pendiente de revisión' : 'Aprobado')}`,
            `${t('Referencia')}: ${success.pago_demo?.referencia || success.codigo_voucher}`,
            `${t('Tu solicitud')}: ${success.codigo_voucher}`, '',
            t('No se realizó ningún cobro. La solicitud sigue pendiente de confirmación del negocio y solo se guarda en este navegador. Este documento no acredita una reserva real ni un pago real.'),
        ].join('\n');
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `DEMO-${success.codigo_voucher}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    };
    return <Dialog title={t(success ? 'Tu simulación, lista' : 'Prepara tu próxima escapada')} onClose={close} wide>
    <div className="checkout-demo-banner"><LockKeyhole size={14}/><span>{t("Modo demostración · sin cobros ni datos bancarios reales")}</span></div>
    {!success && <ol className="checkout-steps" aria-label={t("Progreso de tu solicitud")}>{['Tu escapada', 'Forma de pago', 'Revisar y simular'].map((label, index) => <li className={step === index ? 'is-current' : step > index ? 'is-complete' : ''} aria-current={step === index ? 'step' : undefined} key={label}><span>{step > index ? <Check size={14}/> : index + 1}</span><strong>{t(label)}</strong></li>)}</ol>}
    {success ? <div className="checkout-success">
      <div className={`checkout-success-mark ${method === 'transferencia' ? 'is-pending' : ''}`} aria-hidden="true">{method === 'transferencia' ? <ReceiptText size={34}/> : <svg viewBox="0 0 48 48"><path d="m12 24 8 8 17-18"/></svg>}</div>
      <h3 ref={heading} tabIndex={-1}>{t(method === 'transferencia' ? 'Transferencia de prueba pendiente' : 'Simulación aprobada')}</h3>
      <p>{t(method === 'transferencia' ? 'La referencia ficticia quedó guardada para probar su revisión.' : 'El recorrido de pago se completó. No se realizó ningún cobro.')}</p>
      <div className="checkout-receipt"><strong>{shortTitle(p)}</strong><span>{readableDate(success.fecha_tour)} · {success.cantidad_personas} {t(success.cantidad_personas === 1 ? 'persona' : 'personas')}</span><dl><div><dt>{t("Total simulado")}</dt><dd>{money(success.precio_total)}</dd></div><div><dt>{t("Método")}</dt><dd>{t(selectedMethod.title)}</dd></div><div><dt>{t("Documento")}</dt><dd>{t("Demostración · sin valor de pago")}</dd></div><div><dt>{t("Referencia")}</dt><dd className="checkout-reference">{success.pago_demo?.referencia || success.codigo_voucher}</dd></div><div><dt>{t("Tu solicitud")}</dt><dd>{t("Pendiente de confirmación")}</dd></div></dl><small>{t("El negocio confirma la disponibilidad por separado. Esta prueba se guarda en tu navegador.")}</small></div>
      <div className="checkout-success-actions"><button className="button button-primary" onClick={() => { close(); setActiveTab('vouchers'); }}>{t("Ver mis viajes y pagos")}<ArrowRight size={16}/></button><button className="button button-secondary" onClick={download}><Download size={16}/>{t("Descargar comprobante demo")}</button></div>
    </div> : <div className="checkout-layout">
      <div className="checkout-main">
        <div className="checkout-step-content" key={step}>
          <h3 ref={heading} tabIndex={-1}>{t(['Un plan a tu medida', 'Elige cómo probar el pago', 'Todo listo para la prueba'][step])}</h3>
          <p className="checkout-step-description">{t(['Una fecha, tu grupo y las ganas de salir.', 'Explora el proceso con opciones simuladas.', 'Revisa los detalles antes de simular.'][step])}</p>
          {step === 0 && <div className="checkout-date-group"><label className="field-label" htmlFor="checkout-date"><span><CalendarDays size={17}/>{t("¿Cuándo quieres ir?")}</span><input id="checkout-date" className="field" type="date" value={date} min={today()} required onChange={event => { setDate(event.target.value); setError(''); }}/><small>{t("Fecha de salida · horario de Ecuador")}</small></label><div className="checkout-group"><div><span><Users size={17}/>{t("¿Cuántos van?")}</span><small>{t("Hasta") + " "}{maxPax}{" " + t("personas por salida")}</small></div><div className="checkout-counter"><button aria-label={t("Quitar una persona")} disabled={pax <= 1} onClick={() => { setPax(value => value - 1); setError(''); }}><Minus size={18}/></button><output aria-label={t("Personas en el grupo")} aria-live="polite">{pax}</output><button aria-label={t("Agregar una persona")} disabled={pax >= maxPax} onClick={() => { setPax(value => value + 1); setError(''); }}><Plus size={18}/></button></div></div><p className="checkout-price-note"><Leaf size={18}/><span>{t("La tarifa corresponde a la experiencia completa. Los traslados y extras solo se incluyen cuando lo indica la ficha.")}</span></p></div>}
          {step === 1 && <><fieldset className="checkout-methods"><legend className="sr-only">{t("Método de pago simulado")}</legend>{methods.map(item => <label className={`checkout-method ${method === item.id ? 'is-selected' : ''}`} key={item.id}><input type="radio" name="checkout-method" value={item.id} checked={method === item.id} onChange={() => { setMethod(item.id); setError(''); }}/><item.icon size={21}/><span><strong>{t(item.title)}</strong><small>{t(item.description)}</small></span><span className="checkout-radio" aria-hidden="true">{method === item.id && <Check size={12}/>}</span></label>)}</fieldset>
            <div className="checkout-method-detail" key={method}>{method === 'tarjeta' ? <><div className="checkout-demo-card"><div><CreditCard size={21}/><span>{t("Tarjeta de prueba")}</span><b>{t("DEMO")}</b></div><strong>•••• · •••• · •••• · 4242</strong><span>{t("CHULLA VIDA · Sin datos reales")}</span></div><fieldset className="checkout-outcome"><legend>{t("¿Qué resultado quieres probar?")}</legend><label><input type="radio" name="demo-outcome" checked={outcome === 'aprobado'} onChange={() => setOutcome('aprobado')}/><CheckCircle2 size={16}/>{t("Probar aprobación")}</label><label><input type="radio" name="demo-outcome" checked={outcome === 'rechazado'} onChange={() => setOutcome('rechazado')}/><CircleAlert size={16}/>{t("Probar rechazo")}</label></fieldset></> : method === 'transferencia' ? <div className="checkout-transfer"><Banknote size={24}/><div><strong>{t("Referencia ficticia de transferencia")}</strong><code>DEMO–CHULLA–VIDA</code><p>{t("Sin cuenta bancaria ni depósito real. Al confirmar, quedará pendiente de revisión en esta demostración.")}</p></div></div> : <div className="checkout-qr">{qr ? <img src={qr} alt={t("QR de demostración que contiene únicamente el texto CHULLA-VIDA:DEMO")} width={132} height={132}/> : <QrCode size={80}/>}<div><strong>{t("QR de demostración · sin cobro")}</strong><p>{t("Contiene solo «CHULLA-VIDA:DEMO». Puedes probar la aprobación en el siguiente paso.")}</p><small>{t("Deuna no está conectado a esta demostración.")}</small></div></div>}</div></>}
          {step === 2 && <><dl className="checkout-review"><div><dt><CalendarDays size={17}/>{t("Fecha de salida")}</dt><dd>{readableDate(date)}</dd></div><div><dt><Users size={17}/>{t("Tu grupo")}</dt><dd>{pax} {t(pax === 1 ? 'persona' : 'personas')}</dd></div><div><dt><selectedMethod.icon size={17}/>{t("Método de prueba")}</dt><dd>{t(selectedMethod.title)}</dd></div><div><dt>{t("Resultado a simular")}</dt><dd>{t(method === 'transferencia' ? 'Pendiente de revisión' : outcome === 'rechazado' && method === 'tarjeta' ? 'Rechazo de prueba' : 'Aprobación de prueba')}</dd></div></dl><div className="checkout-confirm-note"><LockKeyhole size={18}/><p>{t("Esta acción guarda una prueba local. No descuenta dinero, no envía datos a proveedores y no confirma una reserva real.")}</p></div></>}
        </div>
        {error && <div className="checkout-error" role="alert"><CircleAlert size={18}/><div><p>{t(error)}</p>{method === 'tarjeta' && outcome === 'rechazado' && step === 2 && <button className="text-button" onClick={() => { setOutcome('aprobado'); setError(''); }}><RotateCcw size={14}/>{t("Cambiar a aprobación de prueba")}</button>}</div></div>}
        {sending && <div className="checkout-processing" role="status" aria-live="polite"><LoaderCircle size={20} className="checkout-spinner"/><span>{t(['Preparando la prueba…', 'Simulando la respuesta…', 'Guardando el resultado…'][phase])}</span><span className="checkout-processing-track"><i style={{ transform: `scaleX(${(phase + 1) / 3})` }}/></span></div>}
        <div className="checkout-actions">{step > 0 ? <button className="text-button" onClick={back}><ArrowLeft size={16}/>{t(sending ? 'Detener y volver' : 'Volver')}</button> : <button className="text-button" onClick={close}>{t("Ahora no")}</button>}{step < 2 ? <button className="button button-primary" disabled={maxPax < 1} onClick={advance}>{t(step === 0 ? 'Elegir forma de pago' : 'Revisar mi escapada')}<ArrowRight size={16}/></button> : <button className="button button-primary" disabled={sending} onClick={simulate}>{sending ? t('Simulación en curso…') : method === 'transferencia' ? t('Simular transferencia') : method === 'deuna' ? t('Probar aprobación') : t('Simular pago de {total}', { total: money(total) })}{!sending && <ArrowRight size={16}/>}</button>}</div>
      </div>
      <aside className="checkout-summary"><img src={placeImage(p)} alt={`${t('Paisaje de referencia')} · ${t(p.region)}`}/><div><h4>{shortTitle(p)}</h4><p>{p.provincia} · {p.duracion_dias} {t(p.duracion_dias === 1 ? 'día' : 'días')}</p><dl><div><dt>{money(p.precio_base_pp)} × {pax} {t(pax === 1 ? 'persona' : 'personas')}</dt><dd>{money(total)}</dd></div><div><dt>{t("Comisión incluida · 10%")}</dt><dd>{money(Math.round(total * 10) / 100)}</dd></div><div><dt>{t("Para el anfitrión · 90%")}</dt><dd>{money(total - Math.round(total * 10) / 100)}</dd></div></dl><div className="checkout-grand-total" aria-live="polite"><span>{t("Total simulado")}<small>{t("USD · experiencia completa")}</small></span><strong>{money(total)}</strong></div><p className="checkout-summary-note">{t("Sin cargos reales. El negocio aún debe confirmar tu fecha.")}</p></div></aside>
    </div>}
  </Dialog>;
}
