// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AdminPanel } from '../../src/features/admin/AdminPanel';
import { AppProvider } from '../../src/context/AppContext';
import { decideRequest, loadAdminRequests, requireAdministrator, type AdminRequest } from '../../src/features/admin/api';

const state = vi.hoisted(() => ({ user: { id: 'admin', email_confirmed_at: '2026-11-18' } as {id:string;email_confirmed_at:string} | null, allowed: true, from: vi.fn(), rpc: vi.fn(), listener: null as null | (()=>void) }));
const request: AdminRequest = { id:'req',organization_id:'org',applicant_id:'owner',status:'submitted',created_at:'2026-11-18',applicant_note:null,appeal_note:null,organization:{id:'org',name:'Comunidad de prueba',kind:'community',owner_id:'owner',verification_status:'in_review'} };
const query = (rows: unknown[]) => {
  const value = {data:rows,error:null,count:rows.length};
  const chain={select:()=>chain,in:()=>chain,eq:()=>chain,order:()=>chain,range:()=>chain,limit:()=>chain,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(value).then(resolve)};
  return chain;
};
const client = {auth:{getUser:async()=>({data:{user:state.user},error:null}),onAuthStateChange:(listener:()=>void)=>{state.listener=listener;return{data:{subscription:{unsubscribe:vi.fn()}}};}},from:state.from,rpc:state.rpc};
vi.mock('../../src/lib/supabase',()=>({getSupabase:()=>client}));
beforeEach(()=>{
  state.user={id:'admin',email_confirmed_at:'2026-11-18'};state.allowed=true;state.listener=null;
  state.rpc.mockReset();state.rpc.mockImplementation(async(name:string)=>({data:name==='is_admin'?state.allowed:null,error:null}));
  state.from.mockReset();state.from.mockImplementation((table:string)=>query(table==='merchant_verification_requests'?[request]:table==='verification_documents'?[{id:'doc',request_id:'req',object_path:'private/doc.pdf',created_at:'2026-11-18'}]:[]));
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(cleanup);

it('no lee solicitudes privadas si la cuenta no tiene permiso del servidor',async()=>{
  state.allowed=false;
  await expect(loadAdminRequests(client as never,'pending',0)).rejects.toMatchObject({reason:'denied'});
  expect(state.from).not.toHaveBeenCalled();
  render(<AppProvider><AdminPanel onClose={()=>{}}/></AppProvider>);
  expect(await screen.findByText('Tu cuenta no tiene permiso para revisar negocios.')).toBeInTheDocument();
  expect(screen.queryByText('Comunidad de prueba')).not.toBeInTheDocument();
});
it('exige correo confirmado y no acepta permisos indicados por metadata del usuario',async()=>{
  state.user={id:'admin',email_confirmed_at:''};
  await expect(requireAdministrator(client as never)).rejects.toMatchObject({reason:'signed_out'});
  expect(state.rpc).not.toHaveBeenCalled();
});
it('bloquea revisión propia, sesión cambiada y aprobación sin comprobaciones',async()=>{
  const values={decision:'approved' as const,note:'Revisado con documentos',checklist:{identity:true,representation:true,documents:true}};
  await expect(decideRequest(client as never,'admin',{...request,applicant_id:'admin'},values)).rejects.toMatchObject({reason:'denied'});
  await expect(decideRequest(client as never,'another',request,values)).rejects.toMatchObject({reason:'denied'});
  await expect(decideRequest(client as never,'admin',request,{...values,checklist:{}})).rejects.toThrow();
  expect(state.rpc.mock.calls.filter(call=>call[0]==='review_verification_request')).toEqual([]);
});
it('registra correcciones con motivo y confirmación; retira evidencia al cerrar sesión',async()=>{
  render(<AppProvider><AdminPanel onClose={()=>{}}/></AppProvider>);
  await screen.findByRole('heading',{name:'Comunidad de prueba'});
  await screen.findByText('Documento 1');
  const save=screen.getByRole('button',{name:'Guardar decisión'});expect(save).toBeEnabled();
  fireEvent.click(save);
  expect(screen.getByRole('alert')).toHaveTextContent('La decisión todavía no se ha guardado.');
  expect(screen.getByLabelText('Decisión')).toHaveFocus();
  expect(state.rpc.mock.calls.filter(call=>call[0]==='review_verification_request')).toEqual([]);
  fireEvent.change(screen.getByLabelText('Decisión'),{target:{value:'needs_changes'}});
  fireEvent.change(screen.getByLabelText('Motivo de la revisión (mínimo 5 caracteres)'),{target:{value:'Adjunta la autorización de representación.'}});
  fireEvent.click(screen.getByLabelText('Confirmo esta decisión. Quedará registrada con mi usuario.'));
  expect(save).toBeEnabled();fireEvent.click(save);
  await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('review_verification_request',expect.objectContaining({p_request_id:'req',p_decision:'needs_changes',p_note:'Adjunta la autorización de representación.'})));
  expect(await screen.findByText('Decisión registrada con tu usuario.')).toBeInTheDocument();
  state.user=null;await act(async()=>state.listener?.());
  expect(await screen.findByText('Entra con tu correo confirmado para abrir tu espacio.')).toBeInTheDocument();
  expect(screen.queryByText('Documento 1')).not.toBeInTheDocument();
});

it('guía la aprobación sin guardar hasta revisar evidencia, añadir motivo y confirmar',async()=>{
  render(<AppProvider><AdminPanel onClose={()=>{}}/></AppProvider>);
  await screen.findByText('Documento 1');
  fireEvent.change(screen.getByLabelText('Decisión'),{target:{value:'approved'}});
  const save=screen.getByRole('button',{name:'Guardar decisión'});
  fireEvent.click(save);
  expect(screen.getByLabelText('Identidad contrastada')).toHaveFocus();
  expect(screen.getByText('Marca las tres comprobaciones después de revisar la evidencia.')).toBeVisible();
  expect(state.rpc.mock.calls.filter(call=>call[0]==='review_verification_request')).toEqual([]);
  for(const label of ['Identidad contrastada','Representación del negocio comprobada','Documentos revisados'])fireEvent.click(screen.getByLabelText(label));
  fireEvent.change(screen.getByLabelText('Motivo de la revisión (mínimo 5 caracteres)'),{target:{value:'Documentos de prueba contrastados.'}});
  fireEvent.click(save);
  expect(screen.getByLabelText('Confirmo esta decisión. Quedará registrada con mi usuario.')).toHaveFocus();
  expect(state.rpc.mock.calls.filter(call=>call[0]==='review_verification_request')).toEqual([]);
  fireEvent.click(screen.getByLabelText('Confirmo esta decisión. Quedará registrada con mi usuario.'));
  expect(screen.getByText('Todo listo para guardar.')).toBeVisible();
  fireEvent.click(save);
  await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('review_verification_request',expect.objectContaining({p_decision:'approved',p_checklist:{identity:true,representation:true,documents:true,official_registry:false}})));
  expect(await screen.findByText('Decisión registrada con tu usuario.')).toBeVisible();
});

it('impide aprobar sin documentos y permite solicitarlos con una nota editable',async()=>{
  state.from.mockImplementation((table:string)=>query(table==='merchant_verification_requests'?[request]:[]));
  render(<AppProvider><AdminPanel onClose={()=>{}}/></AppProvider>);
  await screen.findByText('Todavía no hay documentos. Pide que los adjunten antes de aprobar.');
  fireEvent.change(screen.getByLabelText('Decisión'),{target:{value:'approved'}});
  for(const label of ['Identidad contrastada','Representación del negocio comprobada','Documentos revisados'])fireEvent.click(screen.getByLabelText(label));
  fireEvent.change(screen.getByLabelText('Motivo de la revisión (mínimo 5 caracteres)'),{target:{value:'Mi nota para solicitar evidencia.'}});
  fireEvent.click(screen.getByLabelText('Confirmo esta decisión. Quedará registrada con mi usuario.'));
  fireEvent.click(screen.getByRole('button',{name:'Guardar decisión'}));
  expect(screen.getByText('Faltan documentos. Solicítalos antes de aprobar.')).toBeVisible();
  expect(state.rpc.mock.calls.filter(call=>call[0]==='review_verification_request')).toEqual([]);
  fireEvent.click(screen.getByRole('button',{name:'Solicitar documentos'}));
  expect(screen.getByLabelText('Decisión')).toHaveValue('needs_changes');
  expect(screen.getByLabelText('Motivo de la revisión (mínimo 5 caracteres)')).toHaveValue('Mi nota para solicitar evidencia.');
  expect(screen.getByLabelText('Confirmo esta decisión. Quedará registrada con mi usuario.')).not.toBeChecked();
});
