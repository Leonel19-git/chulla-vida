// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MembershipPlans} from '../../src/components/chulla/MembershipPlans';
import {setV3Language} from '../../src/i18n/v3';
import {TEST_CARDS} from '../../src/domain/payments/card';
import {MEMBERSHIP_DEMO_PAYMENTS_KEY,readMembershipDemoPayments} from '../../src/domain/membership-payment-demo';
const state=vi.hoisted(()=>({demo:false,activate:vi.fn(),cancel:vi.fn(),transferRequest:undefined as unknown}));
vi.mock('../../src/context/AppContext',()=>({useApp:()=>({language:'es',t:(value:string)=>value})}));
vi.mock('../../src/context/MembershipContext',()=>({useMembership:()=>({demoAvailable:state.demo,subscription:null,isActive:false,plan:undefined,activateDemoPlan:state.activate,cancelRenewal:state.cancel,storageError:false})}));
vi.mock('../../src/features/payments/TransferPayment',()=>({TransferPayment:({request,onSubmitted}:{request:unknown;onSubmitted:(value:unknown)=>void})=>{state.transferRequest=request;return <button onClick={()=>onSubmitted({mode:'test',reference:'PRB-TEST22',receiptKind:'pdf'})}>Enviar comprobante de prueba</button>;}}));
beforeEach(()=>{localStorage.clear();state.demo=false;state.activate.mockReset().mockReturnValue(true);setV3Language('es');HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
const review=()=>fireEvent.click(screen.getByRole('button',{name:'Revisar este plan'}));
const consent=()=>fireEvent.click(screen.getByRole('checkbox',{name:'Entiendo que es una prueba local, sin cobro real.'}));
function card(outcome:'approved'|'declined'){
 fireEvent.change(screen.getByLabelText('Usar una tarjeta de prueba'),{target:{value:TEST_CARDS.find(card=>card.outcome===outcome)!.number}});
 fireEvent.click(screen.getByRole('button',{name:/^Pagar.*prueba/}));
}
it('simula tarjeta en producción sin llamar al proveedor ni activar una membresía pagada',()=>{
 const fetch=vi.spyOn(globalThis,'fetch');render(<MembershipPlans onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('radio',{name:/^Anual/}));
 const order=screen.getByRole('complementary',{name:'Resumen de tu plan'});
 expect(within(order).getByText('1 año')).toBeInTheDocument();
 review();expect(screen.queryByRole('form',{name:'Pago con tarjeta de prueba'})).not.toBeInTheDocument();
 consent();card('approved');
 expect(screen.getByRole('heading',{name:'Pago de prueba aprobado'})).toBeVisible();
 expect(screen.getByText('Esta prueba no activa una membresía pagada.')).toBeVisible();
 expect(state.activate).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 const [receipt]=readMembershipDemoPayments();expect(receipt).toMatchObject({mode:'test',planId:'annual',amountCents:4999,status:'approved',method:'card'});
 expect(localStorage.getItem(MEMBERSHIP_DEMO_PAYMENTS_KEY)).not.toContain(TEST_CARDS[0].number);
});
it('permite rechazo y reintento y conserva solo marca y últimos cuatro dígitos',()=>{
 render(<MembershipPlans onClose={()=>{}}/>);review();consent();card('declined');
 expect(screen.getByRole('heading',{name:'Pago de prueba rechazado'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Hacer otra prueba'}));consent();card('approved');
 const records=readMembershipDemoPayments();expect(records).toHaveLength(2);expect(records.map(item=>item.status)).toEqual(['approved','declined']);
 expect(Object.keys(records[0].card!)).toEqual(['brand','last4']);expect(state.activate).not.toHaveBeenCalled();
});
it('una transferencia queda pendiente y la revisión simulada actualiza el mismo comprobante',()=>{
 render(<MembershipPlans onClose={()=>{}}/>);review();fireEvent.click(screen.getByRole('button',{name:'Transferencia'}));consent();fireEvent.click(screen.getByRole('button',{name:'Enviar comprobante de prueba'}));
 expect(state.transferRequest).toBeNull();expect(screen.getByRole('heading',{name:'Transferencia de prueba pendiente'})).toBeVisible();
 const before=readMembershipDemoPayments()[0];fireEvent.click(screen.getByRole('button',{name:'Aprobar transferencia de prueba'}));
 expect(readMembershipDemoPayments()).toHaveLength(1);expect(readMembershipDemoPayments()[0]).toMatchObject({id:before.id,code:before.code,status:'approved',card:null});
 expect(state.activate).not.toHaveBeenCalled();
});
it('mantiene la activación antigua solo en desarrollo y el premium exclusivo del anual',()=>{
 state.demo=true;render(<MembershipPlans feature="premium-passport" onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('radio',{name:/^Mensual/}));review();consent();card('approved');expect(state.activate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Cambiar de plan'}));fireEvent.click(screen.getByRole('radio',{name:/^Anual/}));review();consent();card('approved');expect(state.activate).toHaveBeenCalledExactlyOnceWith('annual');
});
