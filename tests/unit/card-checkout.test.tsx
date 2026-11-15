// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getExperienceById, type Experience } from '../../src/domain/catalog';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';
import { luhn, REAL_CARD_MESSAGE } from '../../src/domain/payments/card';
import { WALLET_KEY, type WalletRecord } from '../../src/domain/payments/purchase';
import { AppProvider } from '../../src/context/AppContext';
import { Checkout } from '../../src/features/payments/Checkout';
import { WalletPanel } from '../../src/features/wallet/WalletPanel';
import { resetWalletMemory } from '../../src/features/wallet/store';

const mocks = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null }));
vi.mock('../../src/features/payments/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/payments/api')>(), getPaymentConfiguration: mocks.config }));

const CEDULA = (() => { const first = '171054351'; return `${first}${cedulaCheckDigit(first)}`; })();
const PAN = '378282246310005';
const CVV = '9876';
const exp = (id: string) => getExperienceById(id) as Experience;
const wallet = (): WalletRecord[] => JSON.parse(localStorage.getItem(WALLET_KEY) ?? '{"records":[]}').records;
function withLuhn(prefix: string) { for (let digit = 0; digit < 10; digit++) if (luhn(`${prefix}${digit}`)) return `${prefix}${digit}`; throw new Error('sin dígito'); }

let fetchSpy: ReturnType<typeof vi.spyOn>;
const consoleCalls: unknown[][] = [];
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); resetWalletMemory(); consoleCalls.length = 0;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  mocks.config.mockReset().mockResolvedValue({ enabled: false, provider: 'payphone', environment: 'live' });
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red en pruebas'));
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, level).mockImplementation((...args: unknown[]) => { consoleCalls.push(args); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function toPayment(experience = exp('gen-01-saraguro-ancestral')) {
  render(<AppProvider><Checkout experiences={[experience]} onClose={() => undefined} onViewWallet={() => undefined} /></AppProvider>);
  fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2099-05-02' } });
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  fireEvent.change(screen.getByLabelText('Nombre y apellido'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana.perez@correo.ec' } });
  fireEvent.change(screen.getByLabelText(/Número de cédula/), { target: { value: CEDULA } });
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));
  await screen.findByRole('heading', { name: 'Método de pago' });
}
function type(number: string, expiry = '12/29', cvv = '123') {
  fireEvent.change(screen.getByLabelText('Número de la tarjeta'), { target: { value: number } });
  fireEvent.change(screen.getByLabelText('Vence (MM/AA)'), { target: { value: expiry } });
  fireEvent.change(screen.getByLabelText('CVV'), { target: { value: cvv } });
}
const pay = () => fireEvent.click(screen.getByRole('button', { name: /^Pagar .* prueba$/ }));

async function everythingStored(): Promise<string> {
  const parts = [...Object.keys(localStorage).map(key => `${key}=${localStorage.getItem(key)}`), ...Object.keys(sessionStorage).map(key => `${key}=${sessionStorage.getItem(key)}`)];
  for (const info of await indexedDB.databases()) {
    if (!info.name) continue;
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(info.name as string); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    for (const store of Array.from(db.objectStoreNames)) {
      const values = await new Promise<unknown[]>((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      parts.push(JSON.stringify(values));
    }
    db.close();
  }
  return parts.join('|');
}

describe('pago con tarjeta en modo prueba', () => {
  it('detecta la marca en vivo, formatea con espacios y gira la tarjeta al escribir el CVV', async () => {
    await toPayment();
    const number = screen.getByLabelText('Número de la tarjeta');
    fireEvent.change(number, { target: { value: '3782' } });
    expect(screen.getByText('American Express detectada')).toBeInTheDocument();
    fireEvent.change(number, { target: { value: PAN } });
    expect(number).toHaveValue('3782 822463 10005');
    expect(screen.getByText(/American Express de prueba · se aprobará sin cobro/)).toBeInTheDocument();
    fireEvent.change(number, { target: { value: '4242424242424242' } });
    const scene = document.querySelector('.card-scene') as HTMLElement;
    fireEvent.focus(screen.getByLabelText('CVV'));
    expect(scene).toHaveClass('is-flipped');
    fireEvent.blur(screen.getByLabelText('CVV'));
    expect(scene).not.toHaveClass('is-flipped');
  });

  it('no procesa una tarjeta que no es de prueba y la borra del formulario', async () => {
    await toPayment();
    const real = withLuhn('453201511283036');
    type(real);
    expect(screen.getByText(REAL_CARD_MESSAGE)).toBeInTheDocument();
    pay();
    expect(screen.getAllByText(REAL_CARD_MESSAGE).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Número de la tarjeta')).toHaveValue('');
    expect(screen.getByLabelText('CVV')).toHaveValue('');
    expect(wallet()).toEqual([]);
    expect(await everythingStored()).not.toContain(real);
  });

  it('valida vencimiento y CVV antes de pagar', async () => {
    await toPayment();
    type('4242424242424242', '01/20', '123'); pay();
    expect(screen.getByText(/Esa tarjeta ya venció/)).toBeInTheDocument();
    type('4242424242424242', '12/29', '1'); pay();
    expect(screen.getByText(/El código de seguridad tiene 3 dígitos/)).toBeInTheDocument();
    expect(wallet()).toEqual([]);
  });

  it('tras la compra, número, vencimiento y CVV no están en localStorage, sessionStorage, IndexedDB, red ni consola', async () => {
    await toPayment();
    // Los datos semilla de la app ya traen números (teléfonos, etc.): comparamos con lo que había antes.
    const count = (text: string, secret: string) => text.split(secret).length - 1;
    const before = await everythingStored();
    type(PAN, '12/29', CVV); pay();
    await screen.findByRole('heading', { name: 'Comprobante' });
    expect(screen.getByText('American Express •••• 0005')).toBeInTheDocument();
    const stored = await everythingStored();
    expect(stored).toContain('"last4":"0005"');
    for (const secret of [PAN, '3782 822463 10005', '822463', CVV, '12/29']) expect(count(stored, secret)).toBe(count(before, secret));
    expect(stored).not.toContain(PAN);
    const traffic = JSON.stringify(fetchSpy.mock.calls) + JSON.stringify(consoleCalls);
    for (const secret of [PAN, '822463', CVV]) expect(traffic).not.toContain(secret);
    expect(wallet()[0].card).toEqual({ brand: 'amex', last4: '0005' });
    expect(Object.keys(wallet()[0].card ?? {})).toEqual(['brand', 'last4']);
    expect(screen.queryByLabelText('Número de la tarjeta')).not.toBeInTheDocument();
  });

  it('la billetera muestra marca y últimos 4', async () => {
    await toPayment();
    fireEvent.change(screen.getByLabelText('Usar una tarjeta de prueba'), { target: { value: '6011111111111117' } });
    pay();
    await screen.findByRole('heading', { name: 'Comprobante' });
    cleanup();
    render(<AppProvider><WalletPanel onClose={() => undefined} /></AppProvider>);
    expect(screen.getByText('Discover •••• 1117')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Discover' })).toBeInTheDocument();
  });

  it('con PayPhone activo y oferta habilitada no pinta campos de tarjeta propios', async () => {
    mocks.config.mockResolvedValue({ enabled: true, provider: 'payphone', environment: 'sandbox' });
    await toPayment({ ...exp('gen-01-saraguro-ancestral'), bookingEnabled: true } as Experience);
    await waitFor(() => expect(screen.getByText(/Tu tarjeta se escribe solo en la página segura de PayPhone/)).toBeInTheDocument());
    expect(screen.queryByLabelText('Número de la tarjeta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CVV')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a Reservas y pagos' })).toBeInTheDocument();
  });
});
