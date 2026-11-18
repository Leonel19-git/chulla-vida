import { Checkout } from '../../src/features/payments/Checkout';
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ALL_EXPERIENCES, getExperienceById, type Experience } from '../../src/domain/catalog';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';
import { purchasePlan, formatUsd, TEST_RECEIPT_LABEL, WALLET_KEY, type WalletRecord } from '../../src/domain/payments/purchase';
import { AppProvider } from '../../src/context/AppContext';
import { BuyButton } from '../../src/features/payments/BuyButton';
import { resetWalletMemory } from '../../src/features/wallet/store';

const mocks = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'traveler-test', email: 'ana.perez@correo.ec', email_confirmed_at: '2026-11-17T12:00:00Z' } }, error: null }) } }) }));
vi.mock('../../src/features/payments/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/payments/api')>(), getPaymentConfiguration: mocks.config }));

const CEDULA = (() => { const first = '171054351'; return `${first}${cedulaCheckDigit(first)}`; })();
const exp = (id: string) => getExperienceById(id) as Experience;
const wallet = (): WalletRecord[] => JSON.parse(localStorage.getItem(WALLET_KEY) ?? '{"records":[]}').records;
const blobs: Blob[] = [];
const futureDate = '2099-03-14';

beforeEach(() => {
  localStorage.clear(); resetWalletMemory(); blobs.length = 0;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  mocks.config.mockReset().mockResolvedValue({ enabled: false, provider: 'payphone', environment: 'live' });
  Object.assign(URL, { createObjectURL: vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:receipt'; }), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const ribbon = () => expect(screen.getByRole('note')).toHaveTextContent(/Modo prueba sin cobro/);
const next = () => fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));

async function openCheckout(experience: Experience, variant: 'card' | 'detail' = 'card') {
  render(<AppProvider><BuyButton experience={experience} variant={variant} /></AppProvider>);
  fireEvent.click(screen.getByRole('button', { name: variant === 'card' ? `Comprar: ${experience.title}` : /Comprar experiencia/ }));
  await screen.findByRole('heading', { name: 'Fechas y personas' }, { timeout: 5000 });
}
async function payWith(number: string) {
  const picker = await screen.findByLabelText('Usar una tarjeta de prueba');
  fireEvent.change(picker, { target: { value: number } });
  fireEvent.click(screen.getByRole('button', { name: /^Pagar .* prueba$/ }));
}
function fillBuyer(cedula = CEDULA) {
  fireEvent.change(screen.getByLabelText('Nombre y apellido'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana.perez@correo.ec' } });
  fireEvent.change(screen.getByLabelText(/Número de cédula/), { target: { value: cedula } });
}

describe('comprar en modo prueba sin cobro', () => {
  it('recorre todos los pasos, rechaza, reintenta y emite un comprobante rotulado', async () => {
    const experience = exp('gen-01-saraguro-ancestral');
    await openCheckout(experience);
    ribbon();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una fecha a partir de mañana.');
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: futureDate } });
    expect(screen.getByLabelText('Fin')).toHaveValue('2099-03-15');
    expect(screen.getByText('2 días / 1 noche')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir adultos' }));
    expect(screen.getByLabelText(/^Adultos/)).toHaveValue('2');
    expect(screen.getAllByText(formatUsd(9000)).length).toBeGreaterThan(0);
    next();

    expect(screen.getByRole('heading', { name: 'Tus datos' })).toBeInTheDocument(); ribbon();
    fillBuyer(`${CEDULA.slice(0, 9)}${(Number(CEDULA[9]) + 1) % 10}`);
    expect(screen.getByText(/no coincide con el verificador/)).toBeInTheDocument();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent(/formato todavía no es válido/);
    fireEvent.change(screen.getByLabelText(/Número de cédula/), { target: { value: CEDULA } });
    expect(screen.getByText('Formato válido')).toBeInTheDocument();
    expect(screen.getByText(/Provincia: Pichincha/)).toBeInTheDocument();
    expect(screen.getByText(/no consultamos el Registro Civil/)).toBeInTheDocument();
    next();

    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument(); ribbon();
    expect(screen.getByText(/por definir jurídicamente/)).toBeInTheDocument();
    expect(screen.getByText(/moneda original: USD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/acepta las condiciones/);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));

    expect(await screen.findByRole('heading', { name: 'Método de pago' })).toBeInTheDocument();
    expect(await screen.findByText(/cobros con tarjeta todavía no están activados/)).toBeInTheDocument(); ribbon();
    expect(screen.getByRole('radio', { name: /Tarjeta de crédito o débito/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Transferencia bancaria/ })).not.toBeDisabled();
    expect(screen.getByRole('radio', { name: /DeUna/ })).toBeDisabled();
    await payWith('4000000000000002');
    expect(await screen.findByText('Pago de prueba rechazado · Visa •••• 0002')).toBeInTheDocument();
    expect(wallet()).toMatchObject([{ status: 'test_rejected', attempts: 1, totalCents: 9000, card: { brand: 'visa', last4: '0002' } }]);
    expect(screen.getByLabelText('Número de la tarjeta')).toHaveValue('');
    await payWith('4242424242424242');

    expect(await screen.findByRole('heading', { name: 'Comprobante' })).toBeInTheDocument(); ribbon();
    expect(screen.getAllByText(TEST_RECEIPT_LABEL).length).toBeGreaterThan(0);
    const records = wallet();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'test_approved', attempts: 2, mode: 'test', people: 2, date: futureDate, endDate: '2099-03-15', method: 'card', card: { brand: 'visa', last4: '4242' }, buyer: { documentMasked: `******${CEDULA.slice(-4)}`, documentType: 'cedula' } });
    expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
    expect(localStorage.getItem(WALLET_KEY)).not.toContain('4242424242424242');
    expect(localStorage.getItem(WALLET_KEY)).not.toContain(CEDULA);
    expect(localStorage.getItem(WALLET_KEY)).not.toContain('ana.perez@correo.ec');
    await waitFor(() => expect(screen.getByAltText(/Código QR del comprobante de prueba/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Descargar comprobante de prueba/ }));
    await waitFor(() => expect(blobs).toHaveLength(1));
    const html = await blobs[0].text();
    expect(html.split(TEST_RECEIPT_LABEL).length - 1).toBeGreaterThanOrEqual(3);
    expect(html).toContain(records[0].code);
    expect(html).not.toContain(CEDULA);
    expect(html).toContain('NO SE COBRÓ NADA');
    expect(html).toContain('Método de pago: Visa •••• 4242 · tarjeta de prueba, sin cobro');
    expect(html).not.toContain('4242424242424242');
    expect(screen.getByText('Compra de prueba en tu billetera')).toBeInTheDocument();
  });

  it('nunca guarda la cédula completa en el navegador en ningún paso', async () => {
    await openCheckout(exp('gen-02-quilotoa-shalala'), 'detail');
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: futureDate } }); next();
    fillBuyer(); next();
    const all = () => Object.keys(localStorage).map(key => localStorage.getItem(key)).join('|') + Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join('|');
    expect(all()).not.toContain(CEDULA);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));
    await payWith('5555555555554444');
    await screen.findByRole('heading', { name: 'Comprobante' });
    expect(all()).not.toContain(CEDULA);
    expect(all()).toContain(CEDULA.slice(-4));
  });

  it('elige un valor dentro del rango de la fuente y una tarifa por tamaño de grupo', async () => {
    await openCheckout(exp('gal-01-bartolome-y-bahia-sullivan'));
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '300' } });
    expect(screen.getByText(`${formatUsd(30000)} por persona`)).toBeInTheDocument();
    cleanup();
    await openCheckout(exp('gal-09-isabela-en-4-dias-tierra-firme'));
    fireEvent.change(screen.getByLabelText('Opción de la fuente'), { target: { value: 'grupo-4' } });
    expect(screen.getByText(/grupo de 4 personas/)).toBeInTheDocument();
    expect(screen.getAllByText(formatUsd(91500 * 4)).length).toBeGreaterThan(0);
  });

  it('una ficha en EUR pide cotización y la guarda como solicitud, sin importe', async () => {
    const experience = exp('gal-07-volcan-sierra-negra-y-volcan-chico');
    render(<AppProvider><BuyButton experience={experience} /></AppProvider>);
    expect(screen.queryByRole('button', { name: `Comprar: ${experience.title}` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Solicitar cotización: ${experience.title}` }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 });
    expect(within(dialog).getByText(/EUR/, { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Nombre y apellido'), { target: { value: 'Tom Visitor' } });
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'tom@example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar solicitud' }));
    expect(await screen.findByText('Solicitud guardada en tu billetera.')).toBeInTheDocument();
    expect(wallet()).toMatchObject([{ kind: 'request', status: 'requested', currency: 'EUR', totalCents: null }]);
    expect(screen.getByText(/Solicitud en tu billetera/)).toBeInTheDocument();
  });

  it('con la pasarela activa, una ficha no habilitada por el servidor sigue en modo prueba', async () => {
    mocks.config.mockResolvedValue({ enabled: true, provider: 'payphone', environment: 'sandbox' });
    await openCheckout(exp('gen-01-saraguro-ancestral'));
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: futureDate } }); next();
    fillBuyer(); next();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Elegir método de pago/ }));
    expect(await screen.findByText(/todavía no tiene una oferta verificada por el servidor/)).toBeInTheDocument();
    expect(screen.getByLabelText('Número de la tarjeta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ir a Reservas y pagos/ })).not.toBeInTheDocument();
  });
});

it('la compra de una ruta guarda todas sus paradas y la suma completa en un mismo lote', async () => {
  const items=ALL_EXPERIENCES.filter(item=>{const plan=purchasePlan(item);return plan.kind==='buy' && plan.choices.every(choice=>choice.fixedPeople===null);}).slice(0,2);
  render(<AppProvider><Checkout experiences={items} defaults={{date:futureDate,endDate:'2099-03-15',people:1}} onClose={vi.fn()}/></AppProvider>);
  expect(screen.getByText(/Esta compra incluye 2 paradas/)).toBeInTheDocument();
  next();fillBuyer();next();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Elegir método de pago'}));
  await payWith('4242424242424242');await screen.findByRole('heading',{name:'Comprobante'});
  const records=wallet();expect(records).toHaveLength(2);
  expect(records.map(record=>record.experienceId).sort()).toEqual(items.map(item=>item.id).sort());
  expect(new Set(records.map(record=>record.batchId)).size).toBe(1);
  const total=records.reduce((sum,record)=>sum+(record.totalCents??0),0);
  expect(total).toBeGreaterThan(Math.max(...records.map(record=>record.totalCents??0)));
  expect(document.body).toHaveTextContent(formatUsd(total));
});
