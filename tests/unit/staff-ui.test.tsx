// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({profile:null as unknown,login:vi.fn(),change:vi.fn(),signOut:vi.fn(),listener:null as null|(()=>void)}));
const client={auth:{onAuthStateChange:(fn:()=>void)=>{state.listener=fn;return{data:{subscription:{unsubscribe:vi.fn()}}};},signOut:state.signOut}};
vi.mock('../../src/features/admin/staff-client',()=>({getStaffClient:()=>client,readStaffProfile:async()=>state.profile,signInStaff:state.login,changeStaffPassword:state.change}));
vi.mock('../../src/features/admin/AdminPanel',()=>({AdminWorkspace:()=> <h2>Bandeja privada</h2>}));
import StaffApp from '../../src/features/admin/StaffApp';
import {normalizeStaffUsername,validStaffPassword} from '../../src/features/admin/staff-identity';
beforeEach(()=>{state.profile=null;state.login.mockReset();state.change.mockReset();state.signOut.mockReset();localStorage.clear();});
afterEach(cleanup);
it('ofrece usuario y contraseña sin registro de viajeros ni campos de correo',async()=>{
 render(<StaffApp/>);expect(await screen.findByLabelText('Usuario')).toBeInTheDocument();expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument();expect(screen.queryByText('Crear cuenta')).not.toBeInTheDocument();
});
it('exige cambiar la clave temporal antes de mostrar la bandeja y conserva la sesión de viajero',async()=>{
 localStorage.setItem('sb-traveler-auth-token','traveler-session');
 state.profile={user_id:'staff',username:'chulla.admin',staff_role:'admin',active:true,must_change_password:true};render(<StaffApp/>);
 await screen.findByRole('heading',{name:'Crea tu contraseña.'});expect(screen.queryByText('Bandeja privada')).not.toBeInTheDocument();
 state.change.mockResolvedValue({...state.profile as object,must_change_password:false});
 fireEvent.change(screen.getByLabelText('Nueva contraseña'),{target:{value:'Mi-Clave-Nueva-2099!'}});fireEvent.change(screen.getByLabelText('Repite la contraseña'),{target:{value:'Mi-Clave-Nueva-2099!'}});fireEvent.click(screen.getByRole('button',{name:'Guardar y abrir dashboard'}));
 await screen.findByText('Bandeja privada');expect(localStorage.getItem('sb-traveler-auth-token')).toBe('traveler-session');
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Cerrar sesión'})));expect(state.signOut).toHaveBeenCalledWith({scope:'local'});
});
it('valida identificadores y claves sin aceptar correos como nombre de usuario',()=>{
 expect(normalizeStaffUsername(' Chulla.Admin ')).toBe('chulla.admin');expect(normalizeStaffUsername('staff@example.test')).toBeNull();expect(normalizeStaffUsername('../admin')).toBeNull();expect(validStaffPassword('corta')).toBe(false);expect(validStaffPassword('Una-Clave-Nueva-2099!')).toBe(true);
});
