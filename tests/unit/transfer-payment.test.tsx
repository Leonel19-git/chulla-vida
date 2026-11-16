// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { getExperienceById, type Experience } from '../../src/domain/catalog';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';
import { formatUsd, WALLET_KEY, type WalletRecord } from '../../src/domain/payments/purchase';
import { checkReceiptFile, RECEIPT_MAX_BYTES, sniffReceipt, TEST_BANK_LABEL, validateBankAccount, validateRejection } from '../../src/domain/payments/transfer';
import { clampParty, rangeSummary, suggestEnd, validateRange } from '../../src/domain/payments/travel';
import { AppProvider } from '../../src/context/AppContext';
import { Checkout } from '../../src/features/payments/Checkout';
import { prepareReceipt } from '../../src/features/payments/receiptFile';
import { TransferReviewList } from '../../src/features/payments/TransferReviewList';
import { WalletPanel } from '../../src/features/wallet/WalletPanel';
import { resetWalletMemory } from '../../src/features/wallet/store';
import type { TransferRecord, TransferRow } from '../../src/features/payments/transferApi';

const api = vi.hoisted(() => ({ start: vi.fn(), submit: vi.fn(), review: vi.fn(), toReview: vi.fn(), url: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null }));
vi.mock('../../src/features/payments/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/payments/api')>(), getPaymentConfiguration: vi.fn().mockResolvedValue({ enabled: false, provider: 'payphone', environment: 'live' }) }));
vi.mock('../../src/features/payments/transferApi', async importOriginal => {
  const real = await importOriginal<typeof import('../../src/features/payments/transferApi')>();
  return { ...real, startTransfer: api.start, submitReceipt: api.submit, reviewTransfer: api.review, loadTransfersToReview: api.toReview, receiptUrl: api.url, loadMyTransfers: vi.fn().mockResolvedValue([]) };
});

const CEDULA = (() => { const first = '171054351'; return `${first}${cedulaCheckDigit(first)}`; })();
const exp = (id: string) => getExperienceById(id) as Experience;
const wallet = (): WalletRecord[] => JSON.parse(localStorage.getItem(WALLET_KEY) ?? '{"records":[]}').records;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const PDF = new TextEncoder().encode('%PDF-1.4\n%fake but signed\n');
const file = (bytes: Uint8Array, name: string, type: string) => new File([bytes], name, { type });
const START = '2099-03-14';

beforeEach(async () => {
  localStorage.clear(); resetWalletMemory();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  const { TransferError } = await vi.importActual<typeof import('../../src/features/payments/transferApi')>('../../src/features/payments/transferApi');
  api.start.mockReset().mockRejectedValue(new TransferError('no_backend', 'Sin conexión con el servicio de pagos.'));
  api.submit.mockReset(); api.review.mockReset(); api.toReview.mockReset(); api.url.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const next = () => fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
function open(experience: Experience, onViewWallet = vi.fn()) {
  render(<AppProvider><Checkout experiences={[experience]} onClose={vi.fn()} onViewWallet={onViewWallet} /></AppProvider>);
}
async function toPayment(experience: Experience) {
  open(experience);
  fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: START } });
  next();
  fireEvent.change(screen.getByLabelText('Nombre y apellido'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana.perez@correo.ec' } });
  fireEvent.change(screen.getByLabelText(/Número de cédula/), { target: { value: CEDULA } });
  next();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));
  await screen.findByRole('heading', { name: 'Método de pago' });
  fireEvent.click(screen.getByRole('radio', { name: /Transferencia bancaria/ }));
}

describe('dominio: personas, fechas y comprobante', () => {
  it('personas: mínimo 1 adulto, niños opcionales y nunca más que la capacidad', () => {
    expect(clampParty({ adults: 0, children: 0 }, 6)).toEqual({ adults: 1, children: 0 });
    expect(clampParty({ adults: 5, children: 4 }, 6)).toEqual({ adults: 5, children: 1 });
    expect(clampParty({ adults: 99, children: 0 }, 6)).toEqual({ adults: 6, children: 0 });
  });
  it('fechas: inicio y fin, fin sugerido para N días y resumen días/noches', () => {
    expect(suggestEnd(START, 3)).toBe('2099-03-16');
    expect(rangeSummary(START, '2099-03-16')?.label).toBe('3 días / 2 noches');
    expect(rangeSummary(START, START)?.label).toBe('1 día / 0 noches');
    expect(validateRange(START, '2099-03-13', '2099-01-01')).toBe('end_before');
    expect(validateRange('2099-02-31', START, '2099-01-01')).toBe('start_missing');
    expect(validateRange(START, '2099-06-30', '2099-01-01')).toBe('too_long');
  });
  it('archivo: solo foto o PDF de hasta 5 MB y con firma real', async () => {
    expect(checkReceiptFile({ type: 'image/png', size: RECEIPT_MAX_BYTES + 1 })).toMatchObject({ ok: false, message: expect.stringMatching(/5 MB/) });
    expect(checkReceiptFile({ type: 'image/gif', size: 10 })).toMatchObject({ ok: false });
    expect(checkReceiptFile({ type: 'application/pdf', size: 0 })).toMatchObject({ ok: false });
    expect(sniffReceipt(PNG)).toBe('image/png');
    expect(sniffReceipt(PDF)).toBe('application/pdf');
    expect(await prepareReceipt(file(PDF, 'c.pdf', 'application/pdf'))).toMatchObject({ ok: true, kind: 'pdf' });
    expect(await prepareReceipt(file(PNG, 'c.png', 'image/png'))).toMatchObject({ ok: true, kind: 'image', type: 'image/png' });
    expect(await prepareReceipt(file(new TextEncoder().encode('<script>x</script>'), 'c.png', 'image/png'))).toMatchObject({ ok: false });
    expect(await prepareReceipt(file(PDF, 'c.png', 'image/png'))).toMatchObject({ ok: false });
  });
  it('cuenta del negocio y rechazo se validan', () => {
    expect(validateBankAccount({ bankName: 'Banco X', accountType: 'ahorros', accountNumber: '2200112233', holderName: 'Ana Pérez', holderId: CEDULA })).toEqual({});
    expect(Object.keys(validateBankAccount({ bankName: '', accountNumber: '12', holderId: '123' }))).toEqual(['bankName', 'accountType', 'accountNumber', 'holderName', 'holderId']);
    expect(validateRejection('  ')).not.toBe('');
    expect(validateRejection('El monto no coincide')).toBe('');
  });
});

describe('selector de personas y fechas en el checkout', () => {
  it('stepper táctil con tope de capacidad, escribible, actualiza el total y no se resetea al volver', () => {
    const base = exp('gen-01-saraguro-ancestral');
    open({ ...base, capacity: { ...base.capacity, max: 3 } });
    const adults = screen.getByLabelText(/^Adultos/);
    const add = screen.getByRole('button', { name: 'Añadir adultos' });
    fireEvent.click(add); fireEvent.click(add);
    expect(adults).toHaveValue('3');
    expect(add).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Añadir niños' })).toBeDisabled();
    expect(screen.getByText('3 de 3 máx.')).toBeInTheDocument();
    fireEvent.change(adults, { target: { value: '9' } });
    expect(adults).toHaveValue('3');
    fireEvent.change(adults, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir niños' }));
    expect(screen.getByText(/1 adulto · 1 niño/)).toBeInTheDocument();
    expect(screen.getAllByText(formatUsd(9000)).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: START } });
    expect(screen.getByLabelText('Fin')).toHaveValue('2099-03-15');
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2099-03-17' } });
    expect(screen.getByText('4 días / 3 noches')).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: /Atrás/ }));
    expect(screen.getByLabelText(/^Adultos/)).toHaveValue('1');
    expect(screen.getByLabelText(/^Niños/)).toHaveValue('1');
    expect(screen.getByLabelText('Fin')).toHaveValue('2099-03-17');
  });
  it('el fin no puede ser antes del inicio', () => {
    open(exp('gen-01-saraguro-ancestral'));
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: START } });
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2099-03-10' } });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('El fin no puede ser antes del inicio.');
  });
});

describe('transferencia bancaria en modo prueba local', () => {
  it('muestra datos de prueba rotulados, valida el archivo, envía y queda en revisión en la billetera', async () => {
    await toPayment(exp('gen-01-saraguro-ancestral'));
    expect(await screen.findByText(TEST_BANK_LABEL)).toBeInTheDocument();
    expect(screen.getByText(/No transfieras a estos datos/)).toBeInTheDocument();
    expect(screen.getByText(/el archivo no sale de tu teléfono/)).toBeInTheDocument();
    const reference = screen.getByText(/^PRB-[A-Z0-9]{6}$/).textContent ?? '';
    expect(within(screen.getByRole('region', { name: 'Pago por transferencia' })).getByText(formatUsd(4500))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enviar comprobante de prueba/ }));
    expect(screen.getAllByRole('alert').some(node => /Adjunta la foto o el PDF/.test(node.textContent ?? ''))).toBe(true);

    fireEvent.change(screen.getByLabelText(/Sube tu comprobante/), { target: { files: [file(new Uint8Array([1, 2, 3, 4]), 'virus.exe', 'application/x-msdownload')] } });
    await waitFor(() => expect(screen.getAllByRole('alert').some(node => /foto \(JPG, PNG o WebP\) o un PDF/.test(node.textContent ?? ''))).toBe(true));

    fireEvent.change(screen.getByLabelText(/Sube tu comprobante/), { target: { files: [file(PNG, 'comprobante.png', 'image/png')] } });
    expect(await screen.findByText('Foto lista')).toBeInTheDocument();
    expect(screen.getByAltText('Vista previa del comprobante')).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(screen.getByRole('button', { name: /Enviar comprobante de prueba/ }));

    expect(await screen.findByRole('heading', { name: 'Comprobante enviado' })).toBeInTheDocument();
    expect(screen.getByText('Comprobante enviado · pendiente de verificación')).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
    const [record] = wallet();
    expect(record).toMatchObject({ status: 'test_transfer_review', method: 'transfer', date: START, endDate: '2099-03-15', transfer: { reference, receiptKind: 'image' } });
    expect(localStorage.getItem(WALLET_KEY)).not.toMatch(/data:|blob:|comprobante\.png/);

    cleanup();
    render(<AppProvider><WalletPanel onClose={vi.fn()} /></AppProvider>);
    expect(screen.getByText(/Transferencia · comprobante en revisión/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Rechazado/ }));
    expect(screen.getByText(/Transferencia · rechazada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Enviar otro \(prueba\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /Recibido/ }));
    expect(screen.getByText(/Transferencia · verificada \(prueba\)/)).toBeInTheDocument();
  });

  it('con un negocio con cuenta registrada muestra sus datos y sube el comprobante en línea', async () => {
    const transfer: TransferRecord = { id: 't-1', reference: 'CV-T-AB12CD', organizationId: 'org-1', experienceId: 'gen-01-saraguro-ancestral', startDate: START, endDate: '2099-03-15', adults: 1, children: 0, amount: 45, currency: 'USD', status: 'awaiting_receipt', rejectionReason: null, bank: { bankName: 'Cooperativa Real', accountType: 'corriente', accountNumber: '2200112233', holderName: 'Turismo Saraguro', holderId: '1790012345001' } };
    api.start.mockResolvedValue(transfer);
    api.submit.mockResolvedValue({ ...transfer, status: 'receipt_submitted', bank: null });
    await toPayment(exp('gen-01-saraguro-ancestral'));
    expect(await screen.findByText('Cuenta del anfitrión')).toBeInTheDocument();
    expect(screen.queryByText(TEST_BANK_LABEL)).not.toBeInTheDocument();
    expect(screen.getByText('CV-T-AB12CD')).toBeInTheDocument();
    expect(screen.getByText('RUC')).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledWith(expect.objectContaining({ experienceId: 'gen-01-saraguro-ancestral', startDate: START, endDate: '2099-03-15', adults: 1, children: 0, amount: 45 }));
    fireEvent.change(screen.getByLabelText(/Sube tu comprobante/), { target: { files: [file(PDF, 'c.pdf', 'application/pdf')] } });
    expect(await screen.findByText('PDF listo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Enviar comprobante$/ }));
    expect(await screen.findByRole('heading', { name: 'Comprobante enviado' })).toBeInTheDocument();
    expect(api.submit).toHaveBeenCalledWith(transfer, expect.any(Blob), 'application/pdf');
    expect(wallet()).toEqual([]);
  });
});

describe('TransferReviewList para el panel del negocio', () => {
  const row: TransferRow = { id: 't-1', reference: 'CV-T-AB12CD', organizationId: 'org-1', experienceId: 'x', travelerId: 'u-1', startDate: START, endDate: '2099-03-15', adults: 2, children: 1, amount: 135, currency: 'USD', status: 'receipt_submitted', rejectionReason: null, title: 'Saraguro ancestral', receiptPath: 'org-1/u-1/t-1/f.jpg', receiptMime: 'image/jpeg', submittedAt: null };
  it('ve el comprobante con URL firmada y marca «Pago recibido»', async () => {
    api.toReview.mockResolvedValue([row]);
    api.url.mockResolvedValue('https://signed.example/f.jpg?token=1');
    api.review.mockResolvedValue({ ...row, status: 'paid', bank: null });
    render(<TransferReviewList organizationId="org-1" />);
    expect(await screen.findByText('Saraguro ancestral')).toBeInTheDocument();
    expect(screen.getByText('1 por revisar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver comprobante/ }));
    expect(await screen.findByAltText('Comprobante CV-T-AB12CD')).toHaveAttribute('src', 'https://signed.example/f.jpg?token=1');
    fireEvent.click(screen.getByRole('button', { name: /Pago recibido/ }));
    await waitFor(() => expect(api.review).toHaveBeenCalledWith('t-1', 'paid', undefined));
    expect(await screen.findByText('Nada por revisar.')).toBeInTheDocument();
  });
  it('rechazar exige motivo', async () => {
    api.toReview.mockResolvedValue([row]);
    api.review.mockResolvedValue({ ...row, status: 'rejected', rejectionReason: 'El monto no coincide', bank: null });
    render(<TransferReviewList />);
    fireEvent.click(await screen.findByRole('button', { name: /^Rechazar$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rechazar · pedir otro/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/qué falta/);
    expect(api.review).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Motivo para el viajero'), { target: { value: 'El monto no coincide' } });
    fireEvent.click(screen.getByRole('button', { name: /Rechazar · pedir otro/ }));
    await waitFor(() => expect(api.review).toHaveBeenCalledWith('t-1', 'rejected', 'El monto no coincide'));
  });
});
