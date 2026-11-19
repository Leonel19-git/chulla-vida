import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleX, Clock3, CreditCard, Download, FlaskConical, Landmark, RotateCcw } from 'lucide-react';
import { CardForm, type CardPayment } from './CardForm';
import { TransferPayment } from './TransferPayment';
import { cardLabel } from '../../domain/payments/card';
import { testCode } from '../../domain/payments/purchase';
import { createMembershipDemoPayment, membershipDemoReceiptText, readMembershipDemoPayments, resolveMembershipDemoTransfer, saveMembershipDemoPayment, type MembershipDemoPayment } from '../../domain/membership-payment-demo';
import type { PlanId } from '../../lib/membership';
import { saveFile } from '../../components/common/download';
import { msg, useT } from '../../i18n/v3';

const STATUS = { approved: msg('Pago de prueba aprobado'), declined: msg('Pago de prueba rechazado'), pending: msg('Transferencia de prueba pendiente') };
export function MembershipPaymentDemo({ planId, amountCents, amountLabel, onApproved, onContinue }: { planId: PlanId; amountCents: number; amountLabel: string; onApproved: () => void; onContinue:()=>void }) {
  const t = useT();
  const [method,setMethod] = useState<'card'|'transfer'>('card');
  const [confirmed,setConfirmed] = useState(false), [receipt,setReceipt] = useState<MembershipDemoPayment|null>(null);
  const [history,setHistory] = useState(readMembershipDemoPayments), [notice,setNotice] = useState('');
  const [reference,setReference] = useState(testCode);
  const resultHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{resultHeading.current?.focus();},[receipt?.id,receipt?.status]);
  const finish = (record: MembershipDemoPayment) => {
    const saved = saveMembershipDemoPayment(record);
    setReceipt(record); setHistory(saved ? readMembershipDemoPayments() : [record,...history.filter(item=>item.id!==record.id)].slice(0,20));
    setNotice(saved ? '' : t('El comprobante durará esta sesión: el navegador no permitió guardarlo.'));
    if(record.status==='approved') onApproved();
  };
  const payCard = (payment: CardPayment) => {
    if (!confirmed) return;
    finish(createMembershipDemoPayment(planId,'card',payment.outcome==='approved'?'approved':'declined',payment.summary));
  };
  const download = (record: MembershipDemoPayment) => {
    if (!saveFile(membershipDemoReceiptText(record),`plan-${record.code}.txt`,'text/plain;charset=utf-8')) setNotice(t('No se pudo descargar. Vuelve a intentarlo.'));
  };
  return <section className="membership-payment-demo" aria-label={t('Simulación del pago del plan')}>
    <p className="plan-test-banner"><FlaskConical size={18}/>{t('Modo prueba · sin cobro real')}</p>
    {receipt ? <div className={`plan-test-result is-${receipt.status}`} role="status">
      {receipt.status==='approved'?<CheckCircle2 size={34}/>:receipt.status==='declined'?<CircleX size={34}/>:<Clock3 size={34}/>}
      <h4 ref={resultHeading} tabIndex={-1}>{t(STATUS[receipt.status])}</h4><strong>{amountLabel}</strong><code>{receipt.code}</code>
      {receipt.card && <p>{cardLabel(receipt.card)}</p>}
      <p>{t('Esta prueba no activa una membresía pagada.')}</p>
      {receipt.status==='pending' && <div className="plan-test-review"><p>{t('Simula la revisión del comprobante:')}</p><button className="plan-primary" onClick={()=>finish(resolveMembershipDemoTransfer(receipt,'approved'))}>{t('Aprobar transferencia de prueba')}</button><button className="plans-back" onClick={()=>finish(resolveMembershipDemoTransfer(receipt,'declined'))}>{t('Rechazar transferencia de prueba')}</button></div>}
      <button className="plans-back" onClick={()=>download(receipt)}><Download size={17}/>{t('Descargar comprobante de prueba')}</button>
      <button className="plans-back" onClick={()=>{setReceipt(null);setConfirmed(false);setReference(testCode());setNotice('');}}><RotateCcw size={17}/>{t('Hacer otra prueba')}</button>
      {receipt.status==='approved' && <button className="plan-primary" onClick={onContinue}>{t('Seguir explorando')}</button>}
    </div> : <>
      <div className="plans-demo-methods" role="group" aria-label={t('Método de pago de prueba')}><button aria-pressed={method==='card'} onClick={()=>setMethod('card')}><CreditCard size={20}/>{t('Tarjeta')}</button><button aria-pressed={method==='transfer'} onClick={()=>setMethod('transfer')}><Landmark size={20}/>{t('Transferencia')}</button></div>
      <label className="plan-demo-consent"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>{t('Entiendo que es una prueba local, sin cobro real.')}</label>
      {confirmed ? method==='card' ? <CardForm amountLabel={amountLabel} onPay={payCard}/> : <TransferPayment amountCents={amountCents} testReference={reference} request={null} testReason={t('Transferencia de membresía de prueba: sin movimiento de dinero.')} onSubmitted={outcome=>{if(outcome.mode==='test')finish({...createMembershipDemoPayment(planId,'transfer','pending'),code:reference});}}/> : <p className="plan-demo-hint">{t('Confirma el modo prueba para abrir el formulario.')}</p>}
    </>}
    {notice && <p role="alert" className="plan-demo-hint">{notice}</p>}
    {history.length>0 && <details className="plan-test-history"><summary>{t('Mis comprobantes de planes de prueba')}</summary><ul>{history.map(item=><li key={item.id}><span><strong>{item.code}</strong><small>{t(STATUS[item.status])} · {(item.amountCents/100).toFixed(2)} USD</small></span><button className="plans-back" aria-label={t('Descargar {code}',{code:item.code})} onClick={()=>download(item)}><Download size={17}/></button></li>)}</ul></details>}
  </section>;
}
