// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MembershipPlans} from '../../src/components/chulla/MembershipPlans';
import {setV3Language} from '../../src/i18n/v3';
const state=vi.hoisted(()=>({demo:false,activate:vi.fn(),cancel:vi.fn()}));
vi.mock('../../src/context/AppContext',()=>({useApp:()=>({language:'es',t:(value:string)=>value})}));
vi.mock('../../src/context/MembershipContext',()=>({useMembership:()=>({demoAvailable:state.demo,subscription:null,isActive:false,plan:undefined,activateDemoPlan:state.activate,cancelRenewal:state.cancel,storageError:false})}));
beforeEach(()=>{state.demo=false;state.activate.mockReset().mockReturnValue(true);setV3Language('es');HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(cleanup);
it('permite elegir y revisar importes en producción sin activar un plan ni pedir datos bancarios',()=>{
 render(<MembershipPlans onClose={()=>{}}/>);
 const order=screen.getByRole('complementary',{name:'Resumen de tu plan'});
 expect(within(order).getByText('1 mes')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:/^Anual/}));
 expect(within(order).getByText('1 año')).toBeInTheDocument();
 expect(within(order).getByText('Pasaporte premium')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Revisar este plan'}));
 const pay=screen.getByRole('button',{name:/Pagar.*49/});
 expect(pay).toBeDisabled();
 expect(screen.getByRole('heading',{name:'Revisa tu plan.'})).toHaveFocus();
 expect(screen.getByText('El pago de membresías aún no está conectado. Puedes revisar los planes sin realizar un cobro.')).toBeVisible();
 expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 fireEvent.click(pay);expect(state.activate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Cambiar de plan'}));
 expect(screen.getByRole('radio',{name:/^Anual/})).toBeChecked();
});
it('exige confirmación explícita para la simulación local y conserva el plan elegido',()=>{
 state.demo=true;render(<MembershipPlans onClose={()=>{}}/>);
 fireEvent.click(screen.getByRole('radio',{name:/^Semanal/}));
 fireEvent.click(screen.getByRole('button',{name:'Revisar este plan'}));
 const activate=screen.getByRole('button',{name:'Activar plan de prueba'});expect(activate).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox',{name:'Entiendo que es una prueba local, sin cobro real.'}));
 fireEvent.click(activate);expect(state.activate).toHaveBeenCalledExactlyOnceWith('weekly');
});
it('el pasaporte premium solo se activa con el anual y una prueba fallida no anuncia éxito',()=>{
 state.demo=true;state.activate.mockReturnValue(false);render(<MembershipPlans feature="premium-passport" onClose={()=>{}}/>);
 expect(screen.getByRole('radio',{name:/^Anual/})).toBeChecked();
 fireEvent.click(screen.getByRole('radio',{name:/^Mensual/}));fireEvent.click(screen.getByRole('button',{name:'Revisar este plan'}));
 fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Activar plan de prueba'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Cambiar de plan'}));fireEvent.click(screen.getByRole('radio',{name:/^Anual/}));fireEvent.click(screen.getByRole('button',{name:'Revisar este plan'}));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Activar plan de prueba'}));
 expect(screen.getByRole('status')).toHaveTextContent('No se pudo activar la prueba. Vuelve a intentarlo.');
 expect(screen.queryByText('Plan activado en este navegador.')).not.toBeInTheDocument();
});
