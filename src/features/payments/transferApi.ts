import { getSupabase } from '../../lib/supabase';
import { isTransferReference, isTransferStatus, RECEIPT_BUCKET, receiptPath, type BankAccount, type ReceiptType, type TransferStatus } from '../../domain/payments/transfer';

/* Transferencia bancaria contra Supabase. Sin sesión o sin cuenta del anfitrión, el checkout usa el modo prueba local. */

export interface TransferRecord {
  id: string;
  reference: string;
  organizationId: string;
  experienceId: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  amount: number;
  currency: 'USD';
  status: TransferStatus;
  rejectionReason: string | null;
  bank: BankAccount | null;
}
export interface TransferRow extends Omit<TransferRecord, 'bank'> { title: string; receiptPath: string | null; receiptMime: string | null; travelerId: string; submittedAt: string | null }

/** Por qué no se pudo abrir en línea: el checkout decide si pasa a modo prueba. */
export type StartFailure = 'no_backend' | 'signed_out' | 'unverified' | 'no_bank' | 'no_host' | 'own_experience' | 'error';
export class TransferError extends Error {
  constructor(public reason: StartFailure, message: string) { super(message); this.name = 'TransferError'; }
}

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
function bank(value: unknown): BankAccount | null {
  const b = object(value);
  if (typeof b.bankName !== 'string' || typeof b.accountNumber !== 'string') return null;
  return { bankName: b.bankName, accountType: b.accountType === 'corriente' ? 'corriente' : 'ahorros', accountNumber: b.accountNumber, holderName: String(b.holderName ?? ''), holderId: String(b.holderId ?? '') };
}
export function parseTransfer(value: unknown): TransferRecord {
  const t = object(value);
  if (typeof t.id !== 'string' || !isTransferReference(t.reference) || !isTransferStatus(t.status)) throw new TransferError('error', 'Respuesta de transferencia no válida.');
  return {
    id: t.id, reference: t.reference, organizationId: String(t.organizationId ?? ''), experienceId: String(t.experienceId ?? ''),
    startDate: String(t.startDate ?? ''), endDate: String(t.endDate ?? ''), adults: Number(t.adults ?? 1), children: Number(t.children ?? 0),
    amount: Number(t.amount ?? 0), currency: 'USD', status: t.status, rejectionReason: typeof t.rejectionReason === 'string' ? t.rejectionReason : null, bank: bank(t.bank),
  };
}
function failure(message: string): TransferError {
  if (/bank account missing/i.test(message)) return new TransferError('no_bank', 'Este negocio aún no registró su cuenta bancaria.');
  if (/Host unavailable/i.test(message)) return new TransferError('no_host', 'Esta experiencia aún no tiene un negocio que reciba pagos en línea.');
  if (/Verified account/i.test(message)) return new TransferError('unverified', 'Confirma tu correo para pagar por transferencia.');
  if (/own experience/i.test(message)) return new TransferError('own_experience', 'No puedes pagar tu propia experiencia.');
  if (/Sign in/i.test(message)) return new TransferError('signed_out', 'Entra en tu cuenta para pagar por transferencia.');
  return new TransferError('error', 'No se pudo preparar la transferencia.');
}

export async function currentUserId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  try { const { data } = await client.auth.getSession(); return data.session?.user.id ?? null; } catch { return null; }
}

export async function startTransfer(input: { experienceId: string; startDate: string; endDate: string; adults: number; children: number; amount: number; idempotencyKey: string }): Promise<TransferRecord> {
  const client = getSupabase();
  if (!client) throw new TransferError('no_backend', 'Sin conexión con el servicio de pagos.');
  if (!await currentUserId()) throw new TransferError('signed_out', 'Entra en tu cuenta para pagar por transferencia.');
  const { data, error } = await client.rpc('start_transfer_payment', { p_experience_id: input.experienceId, p_start: input.startDate, p_end: input.endDate, p_adults: input.adults, p_children: input.children, p_amount: Math.round(input.amount * 100) / 100, p_idempotency_key: input.idempotencyKey });
  if (error) throw failure(error.message);
  return parseTransfer(data);
}

/** Sube el comprobante al bucket privado y lo adjunta. Devuelve el estado nuevo («pendiente de verificación»). */
export async function submitReceipt(transfer: Pick<TransferRecord, 'id' | 'organizationId'>, file: Blob, type: ReceiptType): Promise<TransferRecord> {
  const client = getSupabase();
  const userId = await currentUserId();
  if (!client || !userId) throw new TransferError('signed_out', 'Entra en tu cuenta para enviar el comprobante.');
  const path = receiptPath(transfer.organizationId, userId, transfer.id, crypto.randomUUID(), type);
  const upload = await client.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: type, upsert: false, cacheControl: '0' });
  if (upload.error) throw new TransferError('error', 'No se pudo subir el comprobante. Revisa tu conexión e inténtalo otra vez.');
  const { data, error } = await client.rpc('submit_transfer_receipt', { p_transfer_id: transfer.id, p_path: path, p_mime: type, p_size: file.size });
  if (error) throw new TransferError('error', 'El comprobante se subió, pero no se pudo enviar a revisión. Inténtalo otra vez.');
  return parseTransfer(data);
}

/** URL firmada de 60 s. Solo funciona para el viajero dueño y los miembros del negocio (RLS del bucket). */
export async function receiptUrl(path: string): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('Sin conexión');
  const { data, error } = await client.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error('No se pudo abrir el comprobante.');
  return data.signedUrl;
}

const SELECT = 'id,reference,organization_id,experience_id,traveler_id,start_date,end_date,adults,children,amount,currency,status,rejection_reason,receipt_path,receipt_mime,receipt_submitted_at,experiences(title)';
function row(value: Record<string, unknown>): TransferRow | null {
  if (typeof value.id !== 'string' || !isTransferReference(value.reference) || !isTransferStatus(value.status)) return null;
  return {
    id: value.id, reference: value.reference, organizationId: String(value.organization_id), experienceId: String(value.experience_id), travelerId: String(value.traveler_id),
    startDate: String(value.start_date ?? ''), endDate: String(value.end_date ?? ''), adults: Number(value.adults ?? 1), children: Number(value.children ?? 0),
    amount: Number(value.amount ?? 0), currency: 'USD', status: value.status, rejectionReason: typeof value.rejection_reason === 'string' ? value.rejection_reason : null,
    receiptPath: typeof value.receipt_path === 'string' ? value.receipt_path : null, receiptMime: typeof value.receipt_mime === 'string' ? value.receipt_mime : null,
    submittedAt: typeof value.receipt_submitted_at === 'string' ? value.receipt_submitted_at : null,
    title: String(object(Array.isArray(value.experiences) ? value.experiences[0] : value.experiences).title ?? value.experience_id),
  };
}
/** Transferencias propias del viajero (billetera). */
export async function loadMyTransfers(): Promise<TransferRow[]> {
  const client = getSupabase(); const userId = await currentUserId();
  if (!client || !userId) return [];
  const { data, error } = await client.from('transfer_payments').select(SELECT).eq('traveler_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error('No se pudieron cargar tus transferencias.');
  return (data ?? []).map(item => row(item as Record<string, unknown>)).filter((item): item is TransferRow => Boolean(item));
}
/** Comprobantes por revisar del negocio (la RLS solo devuelve los de organizaciones donde eres miembro). */
export async function loadTransfersToReview(organizationId?: string): Promise<TransferRow[]> {
  const client = getSupabase(); const userId = await currentUserId();
  if (!client || !userId) return [];
  let query = client.from('transfer_payments').select(SELECT).neq('traveler_id', userId).in('status', ['receipt_submitted', 'rejected', 'paid']).order('receipt_submitted_at', { ascending: false }).limit(100);
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  if (error) throw new Error('No se pudieron cargar los comprobantes.');
  return (data ?? []).map(item => row(item as Record<string, unknown>)).filter((item): item is TransferRow => Boolean(item));
}
export async function reviewTransfer(id: string, decision: 'paid' | 'rejected', reason?: string): Promise<TransferRecord> {
  const client = getSupabase();
  if (!client) throw new Error('Sin conexión');
  const { data, error } = await client.rpc('review_transfer_payment', { p_transfer_id: id, p_decision: decision, p_reason: reason ?? null });
  if (error) throw new Error(/Not allowed/i.test(error.message) ? 'Solo un responsable del negocio puede decidir.' : /not waiting/i.test(error.message) ? 'Este comprobante ya fue revisado.' : 'No se pudo guardar la decisión.');
  return parseTransfer(data);
}

/* ───────────── Cuenta bancaria del negocio ───────────── */
export async function loadBankAccount(organizationId: string): Promise<BankAccount | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.from('organization_bank_accounts').select('bank_name,account_type,account_number,holder_name,holder_id').eq('organization_id', organizationId).maybeSingle();
  if (error) throw new Error('No se pudo leer la cuenta bancaria.');
  return data ? { bankName: data.bank_name, accountType: data.account_type, accountNumber: data.account_number, holderName: data.holder_name, holderId: data.holder_id } : null;
}
export async function saveBankAccount(organizationId: string, account: BankAccount): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Sin conexión');
  const { error } = await client.from('organization_bank_accounts').upsert({ organization_id: organizationId, bank_name: account.bankName.trim(), account_type: account.accountType, account_number: account.accountNumber.replace(/\s/g, ''), holder_name: account.holderName.trim(), holder_id: account.holderId.replace(/\s/g, '') }, { onConflict: 'organization_id' });
  if (error) throw new Error('No se pudo guardar. Solo los responsables del negocio pueden registrar la cuenta.');
}
