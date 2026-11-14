// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { getExperienceById, type Experience } from '../../src/domain/catalog';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';
import { JOURNEY_KEY, newJourney } from '../../src/domain/itinerary';
import { formatUsd, WALLET_KEY, type WalletRecord } from '../../src/domain/payments/purchase';
import { AppProvider } from '../../src/context/AppContext';
import { PlannerDialog } from '../../src/features/planner/PlannerDialog';
import { resetWalletMemory, upsertRecords, WALLET_UPDATED } from '../../src/features/wallet/store';
import { WalletHost } from '../../src/features/wallet/WalletPanel';

const catalog = vi.hoisted(() => ({ records: [] as Experience[] }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: catalog.records, online: true }) }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null }));
vi.mock('../../src/features/payments/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/payments/api')>(), getPaymentConfiguration: vi.fn(async () => ({ enabled: false, provider: 'payphone', environment: 'live' })) }));

const CEDULA = (() => { const first = '010203040'; return `${first}${cedulaCheckDigit(first)}`; })();
const exp = (id: string) => getExperienceById(id) as Experience;
const saraguro = exp('gen-01-saraguro-ancestral');
const quilotoa = exp('gen-02-quilotoa-shalala');
const sierraNegra = exp('gal-07-volcan-sierra-negra-y-volcan-chico');
const wallet = (): WalletRecord[] => JSON.parse(localStorage.getItem(WALLET_KEY) ?? '{"records":[]}').records;

beforeEach(() => {
  localStorage.clear(); resetWalletMemory();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  catalog.records = [saraguro, quilotoa, sierraNegra];
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), people: 2, date: '2099-05-01', stops: [saraguro.id, quilotoa.id, sierraNegra.id] }));
});
afterEach(cleanup);

const dialogs = () => screen.getAllByRole('dialog');
const planner = () => within(dialogs()[0]);
const top = () => within(dialogs().at(-1) as HTMLElement);
const stop = (title: string) => within(planner().getByRole('heading', { name: title, level: 4 }).closest('li') as HTMLElement);
async function finishCheckout() {
  await screen.findByRole('heading', { name: 'Fecha y personas' }, { timeout: 5000 });
  fireEvent.click(top().getByRole('button', { name: /^Continuar/ }));
  fireEvent.change(top().getByLabelText('Nombre y apellido'), { target: { value: 'Luz Quishpe' } });
  fireEvent.change(top().getByLabelText('Correo'), { target: { value: 'luz@correo.ec' } });
  fireEvent.change(top().getByLabelText(/Número de cédula/), { target: { value: CEDULA } });
  fireEvent.click(top().getByRole('button', { name: /^Continuar/ }));
  fireEvent.click(top().getByRole('checkbox'));
  fireEvent.click(top().getByRole('button', { name: /Ir al pago de prueba/ }));
  fireEvent.click(await top().findByRole('button', { name: /Aprobar pago de prueba/ }));
  await screen.findByRole('heading', { name: 'Comprobante' });
}
const renderPlanner = () => render(<AppProvider><PlannerDialog onClose={vi.fn()} onSelect={vi.fn()} /></AppProvider>);

describe('Mi viaje unido a la billetera', () => {
  it('cada parada muestra su estado y «Comprar esta parada» actualiza Mi viaje y la billetera', async () => {
    renderPlanner();
    expect(stop(saraguro.title).getByText('Sin comprar')).toBeInTheDocument();
    expect(stop(sierraNegra.title).getByRole('button', { name: /Pedir cotización/ })).toBeInTheDocument();
    expect(screen.getByText('Sin precio comparable').nextElementSibling).toHaveTextContent('1 parada');
    expect(screen.getByText('Por comprar').nextElementSibling).toHaveTextContent(formatUsd((4500 + 3800) * 2));

    fireEvent.click(stop(saraguro.title).getByRole('button', { name: /Comprar esta parada/ }));
    await finishCheckout();
    expect(wallet()).toMatchObject([{ experienceId: saraguro.id, status: 'test_approved', trip: 'Mi viaje desde Quito', date: '2099-05-01', people: 2, totalCents: 9000 }]);
    fireEvent.click(top().getByRole('button', { name: /Ver en mi billetera/ }));
    expect(await screen.findByRole('heading', { name: 'Todo tu viaje, en un solo lugar.' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mi viaje desde Quito' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar ventana' }).at(-1) as HTMLElement);

    expect(stop(saraguro.title).getByText('Compra de prueba')).toBeInTheDocument();
    expect(stop(saraguro.title).queryByRole('button', { name: /Comprar esta parada/ })).not.toBeInTheDocument();
    expect(screen.getByText('Ya comprado').nextElementSibling).toHaveTextContent(formatUsd(9000));
    expect(screen.getByText('Por comprar').nextElementSibling).toHaveTextContent(formatUsd(7600));
  });

  it('«Comprar todo mi viaje» compra lo comprable y deja el resto como solicitud', async () => {
    renderPlanner();
    fireEvent.click(screen.getByRole('button', { name: /Comprar todo mi viaje/ }));
    await screen.findByRole('heading', { name: 'Fecha y personas' }, { timeout: 5000 });
    expect(top().getByRole('heading', { name: saraguro.title, level: 4 })).toBeInTheDocument();
    expect(top().getByText(/Quedan como solicitud \(1\)/)).toBeInTheDocument();
    await finishCheckout();
    const records = wallet();
    expect(records.map(item => [item.experienceId, item.kind, item.status]).sort()).toEqual([
      [sierraNegra.id, 'request', 'requested'], [saraguro.id, 'test_purchase', 'test_approved'], [quilotoa.id, 'test_purchase', 'test_approved'],
    ].sort());
    expect(new Set(records.map(item => item.batchId)).size).toBe(1);
    expect(records.every(item => !JSON.stringify(item).includes(CEDULA))).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar ventana' }).at(-1) as HTMLElement);
    expect(stop(sierraNegra.title).getByText('Solicitud')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comprar todo mi viaje/ })).toBeDisabled();
    expect(screen.getByText('Ya comprado').nextElementSibling).toHaveTextContent(formatUsd(16600));
  });

  it('una compra hecha en otra parte (evento cv3:wallet-updated) se refleja en Mi viaje y en la billetera abierta', async () => {
    renderPlanner();
    render(<AppProvider><WalletHost /></AppProvider>);
    act(() => { window.dispatchEvent(new Event('cv3:wallet')); });
    await screen.findByText('Tu billetera está lista para el primer viaje.', {}, { timeout: 5000 });
    act(() => { upsertRecords([{ id: crypto.randomUUID(), code: 'PRB-XYZ234', kind: 'test_purchase', status: 'test_approved', mode: 'test', experienceId: quilotoa.id, title: quilotoa.title, province: quilotoa.province, date: '2099-05-01', people: 1, currency: 'USD', unitCents: 3800, totalCents: 3800, priceNote: 'Precio referencial', buyer: { name: 'Luz', emailMasked: 'lu**@correo.ec', documentType: 'cedula', documentMasked: '******0400' }, trip: 'Compras sueltas', batchId: null, attempts: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]); });
    expect(stop(quilotoa.title).getByText('Compra de prueba')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compras sueltas' })).toBeInTheDocument();
    expect(screen.getAllByText('Prueba · sin valor').length).toBe(1);
    expect(WALLET_UPDATED).toBe('cv3:wallet-updated');
  });

  it('la billetera no acepta guardar una cédula completa', () => {
    expect(() => upsertRecords([{ id: 'x', code: 'PRB-AAAAAA', kind: 'test_purchase', status: 'test_approved', mode: 'test', experienceId: 'a', title: 'a', province: 'a', date: '', people: 1, currency: 'USD', unitCents: 1, totalCents: 1, priceNote: '', buyer: { name: 'Ana', emailMasked: '', documentType: 'cedula', documentMasked: CEDULA }, trip: 'x', batchId: null, attempts: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])).toThrow();
    expect(localStorage.getItem(WALLET_KEY)).toBeNull();
  });
});
