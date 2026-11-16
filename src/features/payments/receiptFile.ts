import { checkReceiptFile, fitWithin, RECEIPT_MAX_BYTES, sniffReceipt, type ReceiptType } from '../../domain/payments/transfer';

export type PreparedReceipt = { ok: true; blob: Blob; type: ReceiptType; kind: 'image' | 'pdf'; name: string; size: number; originalSize: number; compressed: boolean } | { ok: false; message: string };

async function head(file: Blob, bytes = 16): Promise<Uint8Array> {
  const part = file.slice(0, bytes);
  if (typeof part.arrayBuffer === 'function') return new Uint8Array(await part.arrayBuffer());
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer)); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(part); });
}

/** Reduce la foto a 1600 px y JPEG 0,82. Si el navegador no puede, o no gana espacio, deja el original. */
async function compress(file: Blob): Promise<Blob | null> {
  try {
    if (typeof createImageBitmap !== 'function') return null;
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close?.(); return null; }
    context.fillStyle = '#fff'; context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return blob && blob.size > 0 && blob.size < file.size ? blob : null;
  } catch { return null; }
}

/** Valida tipo, tamaño y firma real; comprime fotos. El archivo nunca se guarda en el navegador. */
export async function prepareReceipt(file: File): Promise<PreparedReceipt> {
  const check = checkReceiptFile(file);
  if (!check.ok) return check;
  let real: ReceiptType | null = null;
  try { real = sniffReceipt(await head(file)); } catch { real = null; }
  if (!real || (real === 'application/pdf') !== (check.type === 'application/pdf')) return { ok: false, message: 'El archivo no parece una foto o un PDF válido.' };
  if (real === 'application/pdf') return { ok: true, blob: file, type: real, kind: 'pdf', name: file.name, size: file.size, originalSize: file.size, compressed: false };
  const smaller = await compress(file);
  const blob = smaller ?? file;
  if (blob.size > RECEIPT_MAX_BYTES) return { ok: false, message: 'Máximo 5 MB.' };
  return { ok: true, blob, type: smaller ? 'image/jpeg' : real, kind: 'image', name: file.name, size: blob.size, originalSize: file.size, compressed: Boolean(smaller) };
}
