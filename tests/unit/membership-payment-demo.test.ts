// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {createMembershipDemoPayment,isMembershipDemoPayment,membershipDemoReceiptText,readMembershipDemoPayments,resolveMembershipDemoTransfer,saveMembershipDemoPayment,MEMBERSHIP_DEMO_PAYMENTS_KEY} from '../../src/domain/membership-payment-demo';
afterEach(()=>localStorage.clear());
it('fija los tres importes y guarda un recibo explícito sin datos de tarjeta sensibles',()=>{
 for(const [planId,cents]of [['weekly',299],['monthly',499],['annual',4999]]as const){
  const record=createMembershipDemoPayment(planId,'card','approved',{brand:'visa',last4:'4242'});
  expect(record.amountCents).toBe(cents);expect(saveMembershipDemoPayment(record)).toBe(true);
  const text=membershipDemoReceiptText(record);expect(text).toContain('SIN VALOR COMERCIAL');expect(text).toContain('No es factura ni confirma una membresía pagada.');expect(text).toContain('4242');
  expect(isMembershipDemoPayment({...record,amountCents:cents+1})).toBe(false);expect(isMembershipDemoPayment({...record,mode:'live'})).toBe(false);expect(isMembershipDemoPayment({...record,cvv:'123'})).toBe(false);
 }
 expect(readMembershipDemoPayments()).toHaveLength(3);
});
it('no aprueba automáticamente transferencias y rechaza volver a resolverlas',()=>{
 const pending=createMembershipDemoPayment('monthly','transfer','pending');
 const declined=resolveMembershipDemoTransfer(pending,'declined');expect(declined.status).toBe('declined');
 expect(()=>resolveMembershipDemoTransfer(declined,'approved')).toThrow();
 expect(()=>createMembershipDemoPayment('annual','card','pending',{brand:'visa',last4:'4242'})).toThrow();
});
it('descarta solo recibos inválidos y limita el historial sin conferir acceso pagado',()=>{
 const valid=createMembershipDemoPayment('weekly','transfer','pending');
 localStorage.setItem(MEMBERSHIP_DEMO_PAYMENTS_KEY,JSON.stringify({version:1,records:[valid,{...valid,mode:'live'}]}));expect(readMembershipDemoPayments()).toEqual([valid]);
 for(let i=0;i<25;i++)saveMembershipDemoPayment(createMembershipDemoPayment('monthly','transfer','pending'));
 expect(readMembershipDemoPayments()).toHaveLength(20);
 expect(localStorage.getItem('chullavida:membership:v1')).toBeNull();
});
