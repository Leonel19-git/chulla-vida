import { isCardSummary, cardLabel, type CardSummary } from './payments/card';
import { testCode } from './payments/purchase';
import { MEMBERSHIP_PLANS, type PlanId } from '../lib/membership';

export const MEMBERSHIP_DEMO_PAYMENTS_KEY = 'chullavida:membership-payments:test:v1';
export interface MembershipDemoPayment {
  id: string; code: string; mode: 'test'; planId: PlanId; amountCents: number; currency: 'USD';
  method: 'card' | 'transfer'; status: 'approved' | 'declined' | 'pending'; card: CardSummary | null;
  createdAt: string; updatedAt: string;
}
export function isMembershipDemoPayment(value: unknown): value is MembershipDemoPayment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as MembershipDemoPayment;
  const plan = MEMBERSHIP_PLANS.find(plan => plan.id === r.planId);
  return Object.keys(r).every(key => ['id','code','mode','planId','amountCents','currency','method','status','card','createdAt','updatedAt'].includes(key))
    && typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 80 && typeof r.code === 'string' && /^PRB-[A-Z0-9]{6}$/.test(r.code)
    && r.mode === 'test' && Boolean(plan) && r.amountCents === Math.round((plan?.price ?? 0) * 100) && r.currency === 'USD'
    && ['approved','declined','pending'].includes(r.status)
    && (r.method === 'card' ? isCardSummary(r.card) && r.status !== 'pending' : r.method === 'transfer' && r.card === null)
    && [r.createdAt,r.updatedAt].every(date => typeof date === 'string' && Number.isFinite(Date.parse(date)));
}
/** Local test records only: never read by membership access checks or sent to a payment provider. */
export function createMembershipDemoPayment(planId: PlanId, method: MembershipDemoPayment['method'], status: MembershipDemoPayment['status'], card: CardSummary | null = null): MembershipDemoPayment {
  const plan = MEMBERSHIP_PLANS.find(plan => plan.id === planId);
  const now = new Date().toISOString();
  const result: MembershipDemoPayment = { id: crypto.randomUUID(), code: testCode(), mode: 'test', planId, amountCents: Math.round((plan?.price ?? 0) * 100), currency: 'USD', method, status, card: card ? { brand: card.brand, last4: card.last4 } : null, createdAt: now, updatedAt: now };
  if (!isMembershipDemoPayment(result)) throw new Error('Invalid test membership payment');
  return result;
}
export function readMembershipDemoPayments(): MembershipDemoPayment[] {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_DEMO_PAYMENTS_KEY);
    if (!raw || raw.length > 100000) return [];
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return [];
    const state = value as { version?: unknown; records?: unknown };
    return state.version === 1 && Array.isArray(state.records) ? state.records.filter(isMembershipDemoPayment).slice(0,20) : [];
  } catch { return []; }
}
export function saveMembershipDemoPayment(record: MembershipDemoPayment): boolean {
  if (!isMembershipDemoPayment(record)) return false;
  try {
    const records = [record, ...readMembershipDemoPayments().filter(item => item.id !== record.id)].slice(0,20);
    localStorage.setItem(MEMBERSHIP_DEMO_PAYMENTS_KEY, JSON.stringify({ version: 1, records })); return true;
  } catch { return false; }
}
export function resolveMembershipDemoTransfer(record: MembershipDemoPayment, status: 'approved' | 'declined'): MembershipDemoPayment {
  if (!isMembershipDemoPayment(record) || record.method !== 'transfer' || record.status !== 'pending') throw new Error('Only a pending test transfer can be resolved');
  return { ...record, status, updatedAt: new Date().toISOString() };
}
export function membershipDemoReceiptText(record: MembershipDemoPayment): string {
  if (!isMembershipDemoPayment(record)) throw new Error('Invalid test receipt');
  const plan = MEMBERSHIP_PLANS.find(plan => plan.id === record.planId)!;
  const state = {approved:'APROBADO DE PRUEBA',declined:'RECHAZADO DE PRUEBA',pending:'PENDIENTE DE REVISIÓN DE PRUEBA'}[record.status];
  return ['CHULLA VIDA','COMPROBANTE DE PRUEBA · SIN VALOR COMERCIAL',record.code,`Plan: ${plan.label} · ${plan.period}`,`Importe simulado: ${(record.amountCents / 100).toFixed(2)} USD`,state,record.method === 'card' && record.card ? `Tarjeta de prueba: ${cardLabel(record.card)}` : 'Transferencia de prueba',`Fecha: ${record.updatedAt}`,'Sin movimiento de dinero. No es factura ni confirma una membresía pagada.'].join('\n');
}
