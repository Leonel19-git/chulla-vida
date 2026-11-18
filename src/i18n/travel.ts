import { rangeSummary as baseRange, isIsoDate, type Party } from '../domain/payments/travel';
import { getV3Language, tr } from './v3';
const locale=()=>({es:'es-EC',en:'en-US',fr:'fr-FR',pt:'pt-BR',zh:'zh-CN',ki:'es-EC','ki-amz':'es-EC'}[getV3Language()]);
export function partyLabel(party:Party):string {
  return `${party.adults} ${tr(party.adults===1?'adulto':'adultos')}${party.children?`${getV3Language()==='es'?' · ':' + '}${party.children} ${tr(party.children===1?'niño':'niños')}`:''}`;
}
export function rangeSummary(start:string,end:string){
  const range=baseRange(start,end);
  return range?{...range,label:`${range.days} ${tr(range.days===1?'día':'días')} / ${range.nights} ${tr(range.nights===1?'noche':'noches')}`}:null;
}
export function shortDay(value:string){
  return isIsoDate(value)?new Intl.DateTimeFormat(locale(),{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)):value;
}
