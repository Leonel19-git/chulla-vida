// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ALL_EXPERIENCES, type Experience } from '../../src/domain/catalog';
import { suggestStops } from '../../src/features/planner/suggestStops';
import { DeleteAccount } from '../../src/features/auth/DeleteAccount';
import { loadV3Dictionary, setV3Language } from '../../src/i18n/v3';
import { partyLabel, rangeSummary, shortDay } from '../../src/i18n/travel';

beforeEach(()=>setV3Language('es'));
afterEach(()=>{cleanup();setV3Language('es');});
const stop=(id:string,province='Pichincha'):Experience=>({...ALL_EXPERIENCES[0],id,province,localizedRegion:'sierra',accessStatus:'open_reported',duration:{...ALL_EXPERIENCES[0].duration,maxHours:4,days:1},price:{...ALL_EXPERIENCES[0].price,currency:'USD',min:20,max:20,options:[],groupBreakdown:[]}} as Experience);
describe('paradas sugeridas',()=>{
  it('añade varias paradas cercanas de la misma provincia sin repetir ni exceder presupuesto',()=>{
    const records=[stop('a'),stop('b'),stop('c'),stop('d','Loja')];
    const constraints={origin:'Quito',budgetTotal:100,people:1,maxHours:24};
    expect(suggestStops(constraints,records)).toEqual(['a','b','c']);
    expect(suggestStops({...constraints,budgetTotal:40},records,['a'])).toEqual(['b']);
    expect(suggestStops({...constraints,budgetTotal:10},records)).toEqual([]);
  });
  it('respeta tiempo, región, límite de paradas y mascotas no autorizadas',()=>{
    const records=[stop('a'),stop('b')];const base={origin:'Quito',budgetTotal:100,people:1,maxHours:3};
    expect(suggestStops(base,records)).toEqual([]);
    expect(suggestStops({...base,maxHours:48,region:'costa'},records)).toEqual([]);
    expect(suggestStops({...base,maxHours:48,pet:{species:'perro',count:1}},records)).toEqual([]);
  });
});
describe('eliminación solicitada por la persona titular',()=>{
  it('solo registra una solicitud privada tras confirmación y nunca anuncia borrado inmediato',async()=>{
    const insert=vi.fn(()=>({select:()=>({single:async()=>({data:{id:'req-own'},error:null})})}));
    const client={auth:{getUser:async()=>({data:{user:{id:'own'}},error:null})},from:vi.fn(()=>({insert}))};
    render(<DeleteAccount client={client as never} session={{user:{id:'own'}} as never}/>);
    expect(insert).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Eliminar mi cuenta'}));
    expect(screen.getByRole('button',{name:'Confirmar solicitud de eliminación'})).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'),{target:{value:'ELIMINAR'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar solicitud de eliminación'}));
    expect(await screen.findByText(/Solicitud registrada/)).toBeInTheDocument();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({subject_id:'own',kind:'erasure'}));
    expect(screen.getByText(/Tu cuenta seguirá activa/)).toBeInTheDocument();
  });
  it('rechaza una sesión que cambió de usuario antes de enviar',async()=>{
    const insert=vi.fn();const client={auth:{getUser:async()=>({data:{user:{id:'other'}},error:null})},from:()=>({insert})};
    render(<DeleteAccount client={client as never} session={{user:{id:'own'}} as never}/>);
    fireEvent.click(screen.getByRole('button',{name:'Eliminar mi cuenta'}));
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'),{target:{value:'ELIMINAR'}});
    fireEvent.click(screen.getByRole('button',{name:'Confirmar solicitud de eliminación'}));
    expect(await screen.findByText(/No se pudo registrar/)).toBeInTheDocument();expect(insert).not.toHaveBeenCalled();
  });
});
it('traduce personas, noches y meses de las fechas del viaje',async()=>{
  await loadV3Dictionary('en');setV3Language('en');
  expect(partyLabel({adults:2,children:1})).toBe('2 adults + 1 child');
  expect(rangeSummary('2099-03-14','2099-03-15')?.label).toBe('2 days / 1 night');
  expect(shortDay('2099-03-14')).toContain('Mar');
});
