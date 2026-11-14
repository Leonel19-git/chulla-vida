import QRCode from 'qrcode';
import { TEST_RECEIPT_LABEL, testReceiptText, type ReceiptLine, type WalletRecord } from '../../domain/payments/purchase';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

/** QR del comprobante de prueba como SVG (no necesita canvas). Codifica el rótulo y el código, nada personal. */
export async function receiptQr(code: string): Promise<string> {
  const svg = await QRCode.toString(`${TEST_RECEIPT_LABEL}\nCHULLA VIDA · ${code}\nSin cobro · no válido como reserva`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#103452', light: '#fffdf6' } });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function receiptLines(records: readonly WalletRecord[]): ReceiptLine[] {
  return records.map(record => ({ title: record.title, date: record.date, people: record.people, unitCents: record.unitCents, totalCents: record.totalCents, currency: record.currency, note: record.kind === 'request' ? 'Solicitud de cotización: sin precio comparable, no incluida en el total.' : record.priceNote }));
}

/** Comprobante descargable (HTML autocontenido). Lleva el rótulo de prueba arriba, en marca de agua y al final. */
export function receiptHtml(input: { code: string; records: readonly WalletRecord[]; qr: string }): string {
  const first = input.records[0];
  const body = testReceiptText({ code: input.code, buyerName: first?.buyer.name ?? '', emailMasked: first?.buyer.emailMasked ?? '', documentMasked: first?.buyer.documentMasked ?? null, createdAt: first?.updatedAt ?? new Date().toISOString(), lines: receiptLines(input.records) });
  const qr = input.qr.startsWith('data:image/svg+xml') ? input.qr : '';
  return `<!doctype html><html lang="es-EC"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(TEST_RECEIPT_LABEL)} · ${escape(input.code)}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;padding:24px;background:#fffdf6;color:#103452}main{max-width:640px;margin:auto;position:relative}
.label{background:#ffd76a;color:#3d2a00;font-weight:800;padding:12px 16px;border-radius:10px;letter-spacing:.04em;text-align:center}
.mark{position:fixed;inset:0;display:grid;place-items:center;font-size:56px;font-weight:900;color:rgba(16,52,82,.07);transform:rotate(-24deg);pointer-events:none}
pre{white-space:pre-wrap;font:inherit}img{width:160px;height:160px}</style></head>
<body><div class="mark" aria-hidden="true">PRUEBA · SIN VALOR</div><main><p class="label">${escape(TEST_RECEIPT_LABEL)}</p>${qr ? `<img src="${escape(qr)}" alt="Código QR del comprobante de prueba ${escape(input.code)}">` : ''}<pre>${escape(body)}</pre><p class="label">${escape(TEST_RECEIPT_LABEL)}</p></main></body></html>`;
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.rel = 'noopener';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadReceipt(code: string, records: readonly WalletRecord[]) {
  let qr = '';
  try { qr = await receiptQr(code); } catch { /* El comprobante sigue siendo válido como texto. */ }
  downloadFile(`chulla-vida-compra-de-prueba-${code}.html`, receiptHtml({ code, records, qr }), 'text/html;charset=utf-8');
}
