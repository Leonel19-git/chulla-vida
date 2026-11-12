import type { Reservation } from '../types';

export type DemoWithdrawal = {
  id: string; businessId: string; createdAt: string; amountCents: number;
  reservationIds: string[]; status: 'requested_demo';
};
export const WALLET_STORAGE_KEY = 'business-demo-withdrawals';
const iso = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
export function isDemoWithdrawalArray(value: unknown): value is DemoWithdrawal[] {
  if (!Array.isArray(value) || value.length > 10000) return false;
  const ids = new Set<string>();
  return value.every(row => {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^WD-DEMO-[\w-]{8,100}$/.test(row.id) || ids.has(row.id)
      || typeof row.businessId !== 'string' || !row.businessId || row.businessId.length > 200 || !iso(row.createdAt)
      || row.status !== 'requested_demo' || !Number.isSafeInteger(row.amountCents) || row.amountCents <= 0
      || !Array.isArray(row.reservationIds) || !row.reservationIds.length || row.reservationIds.length > 10000
      || row.reservationIds.some((id: unknown) => typeof id !== 'string' || !id || id.length > 200)
      || new Set(row.reservationIds).size !== row.reservationIds.length) return false;
    ids.add(row.id); return true;
  });
}

/** Compute each commission in integer cents; the host receives the exact remainder. */
export function splitCharge(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value > 10000000) return null;
  const gross = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(gross) || gross <= 0) return null;
  const commission = Math.round(gross / 10);
  return { gross, commission, net: gross - commission };
}
const ecuadorToday = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const validTourDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export function businessWallet(businessId: string, reservations: Reservation[], records: DemoWithdrawal[], now = new Date()) {
  const counts = new Map<string, number>();
  const references = new Map<string, number>();
  for (const row of reservations) {
    counts.set(row.id, (counts.get(row.id) || 0) + 1);
    if (row.pago_demo?.estado === 'aprobado') references.set(row.pago_demo.referencia, (references.get(row.pago_demo.referencia) || 0) + 1);
  }
  const today = ecuadorToday(now);
  const transactions = reservations.flatMap(row => {
    if (row.lugar_id !== businessId || counts.get(row.id) !== 1 || row.pago_demo?.estado !== 'aprobado'
      || references.get(row.pago_demo.referencia) !== 1 || !/^DEMO-[A-Z0-9-]{8,80}$/.test(row.pago_demo.referencia)
      || !iso(row.pago_demo.creado_en) || Date.parse(row.pago_demo.creado_en) > now.getTime() || !['confirmado', 'pagado', 'validado_en_sitio', 'completado'].includes(row.estado)) return [];
    const amount = splitCharge(row.precio_total);
    if (!amount) return [];
    const arrived = ['validado_en_sitio', 'completado'].includes(row.estado) && iso(row.validado_en)
      && Date.parse(row.validado_en) <= now.getTime() && Date.parse(row.validado_en) >= Date.parse(row.pago_demo.creado_en)
      && validTourDay(row.fecha_tour) && row.fecha_tour <= today;
    return [{ reservation: row, ...amount, arrived }];
  });
  const safeRecords = isDemoWithdrawalArray(records) ? records : [];
  const claimed = new Set<string>();
  const withdrawals: DemoWithdrawal[] = [];
  // Only valid allocations for this business enter the ledger; preserve historical claims
  // when a reservation is subsequently cancelled, instead of fabricating a reversal.
  for (const record of safeRecords.filter(row => row.businessId === businessId)) {
    if (Date.parse(record.createdAt) > now.getTime() || record.reservationIds.some(id => claimed.has(id))) continue;
    const sources = record.reservationIds.map(id => reservations.filter(row => row.id === id));
    if (sources.some(rows => rows.length !== 1 || rows[0].lugar_id !== businessId || rows[0].pago_demo?.estado !== 'aprobado'
      || references.get(rows[0].pago_demo.referencia) !== 1 || !iso(rows[0].pago_demo.creado_en)
      || !iso(rows[0].validado_en) || Date.parse(rows[0].validado_en) > Date.parse(record.createdAt)
      || Date.parse(rows[0].pago_demo.creado_en) > Date.parse(record.createdAt)
      || Date.parse(rows[0].validado_en!) < Date.parse(rows[0].pago_demo!.creado_en)
      || !validTourDay(rows[0].fecha_tour) || rows[0].fecha_tour > ecuadorToday(new Date(record.createdAt))
      || !splitCharge(rows[0].precio_total))) continue;
    const total = sources.reduce((sum, rows) => sum + (splitCharge(rows[0].precio_total)?.net ?? 0), 0);
    if (total !== record.amountCents) continue;
    withdrawals.push(record); record.reservationIds.forEach(id => claimed.add(id));
  }
  const eligible = transactions.filter(row => row.arrived && !claimed.has(row.reservation.id));
  const sum = (key: 'gross' | 'commission' | 'net') => transactions.reduce((total, row) => total + row[key], 0);
  return { transactions, withdrawals, eligible, gross: sum('gross'), commission: sum('commission'), net: sum('net'),
    retained: transactions.filter(row => !row.arrived && !claimed.has(row.reservation.id)).reduce((sum, row) => sum + row.net, 0),
    available: eligible.reduce((sum, row) => sum + row.net, 0),
    withdrawn: withdrawals.reduce((sum, row) => sum + row.amountCents, 0),
    needsReview: withdrawals.some(record => record.reservationIds.some(id => !transactions.some(row => row.reservation.id === id && row.arrived))),
  };
}

export function requestDemoWithdrawal(businessId: string, reservations: Reservation[], records: DemoWithdrawal[], id: string, now = new Date()) {
  const wallet = businessWallet(businessId, reservations, records, now);
  if (!businessId || !isDemoWithdrawalArray(records) || records.some(row => row.id === id) || !wallet.available || wallet.needsReview) return null;
  const record: DemoWithdrawal = { id, businessId, createdAt: now.toISOString(), amountCents: wallet.available,
    reservationIds: wallet.eligible.map(row => row.reservation.id), status: 'requested_demo' };
  return isDemoWithdrawalArray([...records, record]) ? [...records, record] : null;
}
