// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { getExperienceById, type Experience } from '../../src/domain/catalog';
import { cedulaCheckDigit } from '../../src/domain/identity/cedula';
import { formatUsd, TEST_RECEIPT_LABEL, WALLET_KEY, type WalletRecord } from '../../src/domain/payments/purchase';
import { AppProvider } from '../../src/context/AppContext';
import { BuyButton } from '../../src/features/payments/BuyButton';
import { resetWalletMemory } from '../../src/features/wallet/store';

const mocks = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null }));
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
  await screen.findByRole('heading', { name: 'Fecha y personas' }, { timeout: 5000 });
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
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: futureDate } });
    fireEvent.change(screen.getByLabelText('Personas'), { target: { value: '2' } });
    expect(screen.getByText(formatUsd(9000))).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /Ir al pago de prueba/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/acepta las condiciones/);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Ir al pago de prueba/ }));

    expect(await screen.findByText(/cobros con tarjeta todavía no están activados/)).toBeInTheDocument(); ribbon();
    fireEvent.click(screen.getByRole('button', { name: /Rechazar pago de prueba/ }));
    expect(await screen.findByText('Pago de prueba rechazado.')).toBeInTheDocument();
    expect(wallet()).toMatchObject([{ status: 'test_rejected', attempts: 1, totalCents: 9000 }]);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar y aprobar/ }));

    expect(await screen.findByRole('heading', { name: 'Comprobante' })).toBeInTheDocument(); ribbon();
    expect(screen.getAllByText(TEST_RECEIPT_LABEL).length).toBeGreaterThan(0);
    const records = wallet();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'test_approved', attempts: 2, mode: 'test', people: 2, date: futureDate, buyer: { documentMasked: `******${CEDULA.slice(-4)}`, documentType: 'cedula' } });
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
    expect(screen.getByText('Compra de prueba en tu billetera')).toBeInTheDocument();
  });

  it('nunca guarda la cédula completa en el navegador en ningún paso', async () => {
    await openCheckout(exp('gen-02-quilotoa-shalala'), 'detail');
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: futureDate } }); next();
    fillBuyer(); next();
    const all = () => Object.keys(localStorage).map(key => localStorage.getItem(key)).join('|') + Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)).join('|');
    expect(all()).not.toContain(CEDULA);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Ir al pago de prueba/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar pago de prueba/ }));
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
    expect(screen.getByText(formatUsd(91500 * 4))).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: futureDate } }); next();
    fillBuyer(); next();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Ir al pago de prueba/ }));
    expect(await screen.findByText(/todavía no tiene una oferta verificada por el servidor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ir a Reservas y pagos/ })).not.toBeInTheDocument();
  });
});
