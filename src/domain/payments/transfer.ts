/**
 * Pago por transferencia bancaria con comprobante. Puro y sin efectos.
 *
 * Honestidad:
 * - Los datos bancarios reales los registra cada negocio en Supabase. Nunca se inventan.
 * - Sin datos del anfitrión mostramos DATOS BANCARIOS DE PRUEBA, con rótulo, y no se sube nada.
 * - «Pagado» solo lo marca el anfitrión autorizado desde el servidor; el viajero solo envía su comprobante.
 */

export const RECEIPT_BUCKET = 'payment-receipts';
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type ReceiptType = typeof RECEIPT_TYPES[number];
/** Lo que acepta el selector de archivos. En iPhone, una foto HEIC se entrega como JPEG. */
export const RECEIPT_ACCEPT = RECEIPT_TYPES.join(',');

export type AccountType = 'ahorros' | 'corriente';
export interface BankAccount {
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  holderName: string;
  /** Cédula (10) o RUC (13) del titular. */
  holderId: string;
}
export const ACCOUNT_TYPE_TEXT: Readonly<Record<AccountType, string>> = { ahorros: 'Ahorros', corriente: 'Corriente' };

/** Datos de PRUEBA: ningún banco ni cuenta real. Siempre se muestran con el rótulo «Datos bancarios de prueba». */
export const TEST_BANK_ACCOUNT: Readonly<BankAccount> = Object.freeze({
  bankName: 'Banco de prueba',
  accountType: 'ahorros',
  accountNumber: '0000000000',
  holderName: 'Anfitrión de prueba',
  holderId: '0000000000001',
});
export const TEST_BANK_LABEL = 'Datos bancarios de prueba';

export function validateBankAccount(value: Partial<BankAccount>): Partial<Record<keyof BankAccount, string>> {
  const errors: Partial<Record<keyof BankAccount, string>> = {};
  const bank = (value.bankName ?? '').trim();
  const holder = (value.holderName ?? '').trim();
  const number = (value.accountNumber ?? '').replace(/\s/g, '');
  const id = (value.holderId ?? '').replace(/\s/g, '');
  if (bank.length < 2 || bank.length > 80) errors.bankName = 'Escribe el nombre del banco o cooperativa.';
  if (value.accountType !== 'ahorros' && value.accountType !== 'corriente') errors.accountType = 'Elige ahorros o corriente.';
  if (!/^\d{6,20}$/.test(number)) errors.accountNumber = 'El número de cuenta tiene de 6 a 20 dígitos.';
  if (holder.length < 3 || holder.length > 120) errors.holderName = 'Escribe el nombre del titular.';
  if (!/^(\d{10}|\d{13})$/.test(id)) errors.holderId = 'Cédula (10 dígitos) o RUC (13 dígitos).';
  return errors;
}
/** Número enmascarado para listas: «•••• 6789». */
export const maskAccount = (number: string) => `•••• ${number.replace(/\s/g, '').slice(-4)}`;

/* ───────────── Archivo del comprobante ───────────── */

export type ReceiptCheck = { ok: true; type: ReceiptType; kind: 'image' | 'pdf' } | { ok: false; message: string };

/** Revisa tipo y tamaño declarados. `sniffReceipt` confirma después la firma real del archivo. */
export function checkReceiptFile(file: { type: string; size: number; name?: string }): ReceiptCheck {
  if (!file.size) return { ok: false, message: 'El archivo está vacío.' };
  if (file.size > RECEIPT_MAX_BYTES) return { ok: false, message: 'Máximo 5 MB. Toma la foto de nuevo o usa un PDF más liviano.' };
  const type = (file.type || '').toLowerCase();
  if (!(RECEIPT_TYPES as readonly string[]).includes(type)) return { ok: false, message: 'Sube una foto (JPG, PNG o WebP) o un PDF.' };
  return { ok: true, type: type as ReceiptType, kind: type === 'application/pdf' ? 'pdf' : 'image' };
}

/** Firma binaria de los primeros bytes: evita que un archivo cualquiera se haga pasar por foto o PDF. */
export function sniffReceipt(bytes: Uint8Array): ReceiptType | null {
  const at = (index: number) => bytes[index] ?? -1;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'image/png';
  if (at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46) return 'application/pdf';
  if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return 'image/webp';
  return null;
}
export const RECEIPT_EXTENSION: Readonly<Record<ReceiptType, string>> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

/** Ruta privada del comprobante: `<organización>/<viajero>/<transferencia>/<archivo>`. */
export function receiptPath(organizationId: string, userId: string, transferId: string, fileId: string, type: ReceiptType): string {
  return `${organizationId}/${userId}/${transferId}/${fileId}.${RECEIPT_EXTENSION[type]}`;
}

/** Tamaño legible: «820 KB», «1,4 MB». */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Medidas de una foto reducida: lado mayor ≤ `max`, sin agrandar. */
export function fitWithin(width: number, height: number, max = 1600): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/* ───────────── Estados ───────────── */

export type TransferStatus = 'awaiting_receipt' | 'receipt_submitted' | 'paid' | 'rejected' | 'cancelled';
export const TRANSFER_STATUS_TEXT: Readonly<Record<TransferStatus, string>> = {
  awaiting_receipt: 'Esperando tu comprobante',
  receipt_submitted: 'Comprobante enviado · pendiente de verificación',
  paid: 'Pago recibido · verificado por el anfitrión',
  rejected: 'Comprobante rechazado · sube otro',
  cancelled: 'Cancelada',
};
export const isTransferStatus = (value: unknown): value is TransferStatus => typeof value === 'string' && value in TRANSFER_STATUS_TEXT;

/** Referencia que el viajero escribe en el concepto de la transferencia. */
export const isTransferReference = (value: unknown): value is string => typeof value === 'string' && /^(CV-T|PRB)-[A-Z0-9]{6}$/.test(value);

export function validateRejection(reason: string): string {
  const text = reason.trim();
  if (text.length < 3) return 'Cuéntale al viajero qué falta (mínimo 3 letras).';
  if (text.length > 500) return 'Máximo 500 caracteres.';
  return '';
}
