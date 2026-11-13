// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { PaymentsPanel } from '../../src/features/payments/PaymentsPanel';
import { paymentReference, PaymentRequestError, readPaymentAttempt, savePaymentAttempt, type ConnectedBooking, type PaymentResult } from '../../src/features/payments/api';
import { AppProvider } from '../../src/context/AppContext';
import { CatalogProvider } from '../../src/features/catalog/CatalogContext';
import { ConsentProvider } from '../../src/features/privacy/ConsentContext';
import { V3Toolbar, V3Workspace } from '../../src/features/workspace/V3Workspace';

const mocks = vi.hoisted(() => ({ configured: false, session: null as Session | null,
  listener: null as null | ((event: string, session: Session | null) => void), unsubscribe: vi.fn(),
  config: vi.fn(), status: vi.fn(), reconcile: vi.fn(), load: vi.fn(), prepare: vi.fn(), change: vi.fn(), request: vi.fn(),
}));
const client = { auth: {
  getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
  onAuthStateChange: vi.fn((listener: typeof mocks.listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; }),
} };
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => mocks.configured ? client : null }));
vi.mock('../../src/features/payments/CheckoutTerms', () => ({ CheckoutTerms: ({ onAccepted }: { onAccepted: (value: boolean) => void }) => <button onClick={() => onAccepted(true)}>Aceptar términos verificados</button> }));
vi.mock('../../src/features/payments/api', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/features/payments/api')>(),
  getPaymentConfiguration: mocks.config, getPaymentStatus: mocks.status, reconcilePaymentStatus: mocks.reconcile, loadBookingData: mocks.load,
  preparePayment: mocks.prepare, changeBooking: mocks.change, requestBooking: mocks.request,
}));
const reference = '10000000-0000-4000-8000-000000000001';
const bookingId = '20000000-0000-4000-8000-000000000002';
const session = (id: string): Session => ({ user: { id }, access_token: `token-${id}` }) as Session;
const booking = (patch: Partial<ConnectedBooking> = {}): ConnectedBooking => ({ id: bookingId, code: 'CV-123', traveler_id: 'traveler-a', experience_id: 'experience-a', participants: 2, status: 'awaiting_payment', total_amount: 42.5, currency: 'USD', payment_environment: 'sandbox', expires_at: '2099-01-01T00:00:00Z', cancellation_policy_snapshot: 'Cancelación hasta 48 horas antes, según anfitrión.', title: 'Ruta privada A', startsAt: '2098-12-01T12:00:00Z', ...patch });
const result = (patch: Partial<PaymentResult> = {}): PaymentResult => ({ reference, bookingId, provider: 'payphone', status: 'pending', amount: 42.5, currency: 'USD', environment: 'sandbox', requiresReview: false, ...patch });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function card(title: string) { return within(screen.getByRole('heading', { name: title }).closest('li')!); }
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.clearAllMocks(); mocks.configured = false; mocks.session = null; mocks.listener = null;
  mocks.config.mockReset().mockResolvedValue({ enabled: true, provider: 'payphone', environment: 'sandbox' });
  mocks.load.mockReset().mockResolvedValue({ bookings: [], slots: [] }); mocks.status.mockReset().mockResolvedValue(result());
  mocks.reconcile.mockReset().mockResolvedValue(result());
  mocks.prepare.mockReset().mockRejectedValue(new Error('Preparación pendiente, vuelve a consultar.'));
  mocks.change.mockReset().mockResolvedValue(undefined); mocks.request.mockReset().mockResolvedValue(undefined);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); });

it('distingue disponibilidad pendiente, error de servicio y desactivación confirmada', async () => {
  const pending = deferred<{ enabled: boolean; provider: 'payphone'; environment: 'sandbox' }>();
  mocks.config.mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error('sin servicio'));
  render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
  expect(screen.getByText('Comprobando disponibilidad de pagos…')).toBeInTheDocument();
  expect(screen.queryByText('Cobros con tarjeta pendientes de activación')).not.toBeInTheDocument();
  await act(async () => pending.resolve({ enabled: false, provider: 'payphone', environment: 'sandbox' }));
  expect(screen.getByText('Cobros con tarjeta pendientes de activación')).toBeInTheDocument();
});

it('un fallo de disponibilidad permite consultar de nuevo sin afirmar que la pasarela está desactivada', async () => {
  mocks.config.mockRejectedValueOnce(new Error('sin servicio')).mockResolvedValueOnce({ enabled: false, provider: 'payphone', environment: 'sandbox' });
  render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
  expect(await screen.findByText('No se pudo consultar la disponibilidad de pagos')).toBeInTheDocument();
  expect(screen.queryByText('Cobros con tarjeta pendientes de activación')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Volver a comprobar pagos' }));
  expect(await screen.findByText('Cobros con tarjeta pendientes de activación')).toBeInTheDocument();
});

it('el error de reservas no se presenta como una lista vacía y el reintento recupera los datos', async () => {
  mocks.configured = true; mocks.session = session('traveler-a');
  mocks.load.mockRejectedValueOnce(new Error('La conexión falló.')).mockResolvedValueOnce({ bookings: [booking()], slots: [] });
  render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar tus reservas');
  expect(screen.queryByText('Tu viaje empieza con una fecha.')).not.toBeInTheDocument();
  expect(screen.queryByText(/Aún no hay salidas autorizadas/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta de reservas' }));
  expect(await screen.findByRole('heading', { name: 'Ruta privada A' })).toBeInTheDocument();
});

it('el cobro real espera la aceptación de términos verificada por servidor', async () => {
  mocks.configured = true; mocks.session = session('traveler-a');
  mocks.config.mockResolvedValue({ enabled: true, provider: 'payphone', environment: 'live' });
  mocks.load.mockResolvedValue({ bookings: [booking({ payment_environment: 'live' })], slots: [] });
  render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
  await screen.findByRole('heading', { name: 'Ruta privada A' });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar y pagar con tarjeta' }));
  const pay = screen.getByRole('button', { name: /Pagar .* en PayPhone/ });
  expect(pay).toBeDisabled();
  expect(mocks.prepare).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Aceptar términos verificados' }));
  expect(pay).toBeEnabled();
  expect(mocks.prepare).not.toHaveBeenCalled();
});

describe('reservas y pagos conectados', () => {
  it('sin conexión configurada permite entrar o probar demo sin pedir tarjetas ni datos bancarios', async () => {
    mocks.config.mockResolvedValue({ enabled: false, provider: 'payphone', environment: 'sandbox' });
    const onAccount = vi.fn(), onDemo = vi.fn(); const user = userEvent.setup();
    render(<PaymentsPanel onAccount={onAccount} onDemo={onDemo} />);
    expect(await screen.findByText('Cobros con tarjeta pendientes de activación')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entrar en mi cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Probar pago sin cobro' }));
    expect(onAccount).toHaveBeenCalledTimes(1); expect(onDemo).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('input')).toHaveLength(0);
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.load).not.toHaveBeenCalled();
  });
  it('un regreso manipulado nunca muestra aprobación mientras el servidor no la confirme', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    window.history.replaceState({}, '', `/?payment=${reference}&transactionStatus=Approved&paid=true&amount=0`);
    render(<PaymentsPanel reference={paymentReference(window.location.search)} onAccount={vi.fn()} onDemo={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Resultado pendiente de verificar' })).toBeInTheDocument();
    expect(mocks.status).toHaveBeenCalledWith(reference, 'token-traveler-a');
    expect(screen.queryByText('Pago confirmado por la pasarela')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar resumen/ })).not.toBeInTheDocument();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('revisa el total del servidor, conserva EUR y no ofrece volver a pagar una reserva pagada', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    mocks.load.mockResolvedValue({ bookings: [booking(), booking({ id: 'eur', title: 'Ruta en euros', currency: 'EUR' }), booking({ id: 'paid', title: 'Ruta pagada', status: 'paid' }), booking({ id: 'other', title: 'Reserva de otro viajero', traveler_id: 'traveler-b' })], slots: [] });
    const user = userEvent.setup(); render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Ruta privada A' })).toBeInTheDocument();
    expect(card('Ruta pagada').queryByRole('button', { name: 'Revisar y pagar con tarjeta' })).not.toBeInTheDocument();
    expect(card('Ruta en euros').getByRole('button', { name: 'Revisar y pagar con tarjeta' })).toBeDisabled();
    expect(card('Ruta en euros').getByText(/no se convierte automáticamente/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reserva de otro viajero' })).not.toBeInTheDocument();
    await user.click(card('Ruta privada A').getByRole('button', { name: 'Revisar y pagar con tarjeta' }));
    expect(screen.getByRole('heading', { name: 'Revisa antes de pagar' })).toBeInTheDocument();
    expect(screen.getByText('Total de la reserva').nextElementSibling).toHaveTextContent('42,50');
    expect(screen.getByText('Cancelación hasta 48 horas antes, según anfitrión.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar a PayPhone · prueba' }));
    await screen.findByText('Preparación pendiente, vuelve a consultar.');
    expect(mocks.prepare).toHaveBeenCalledWith(bookingId, expect.stringMatching(/^[0-9a-f-]{36}$/i), 'token-traveler-a');
    await user.click(screen.getByRole('button', { name: 'Continuar a PayPhone · prueba' }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
    expect(mocks.prepare.mock.calls[1][1]).toBe(mocks.prepare.mock.calls[0][1]);
  });
  it('la configuración deshabilitada del servidor impide preparar un cobro', async () => {
    mocks.configured = true; mocks.session = session('traveler-a'); mocks.load.mockResolvedValue({ bookings: [booking()], slots: [] });
    mocks.config.mockResolvedValue({ enabled: false, provider: 'payphone', environment: 'live' });
    render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    const button = await screen.findByRole('button', { name: 'Revisar y pagar con tarjeta' });
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(screen.queryByRole('heading', { name: 'Revisa antes de pagar' })).not.toBeInTheDocument();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('solo muestra acciones de anfitrión en reservas accesibles cuyo viajero es otra cuenta', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    const other = booking({ id: 'other', title: 'Reserva del negocio', traveler_id: 'traveler-b', status: 'requested' });
    mocks.load.mockResolvedValue({ bookings: [booking(), other], slots: [] });
    const user = userEvent.setup(); render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Ruta privada A' });
    expect(screen.queryByRole('button', { name: 'Confirmar disponibilidad' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reservas de mi negocio' }));
    expect(screen.queryByRole('heading', { name: 'Ruta privada A' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar y pagar con tarjeta' })).not.toBeInTheDocument();
    await user.click(card('Reserva del negocio').getByRole('button', { name: 'Confirmar disponibilidad' }));
    expect(mocks.change).toHaveBeenCalledWith(other, 'confirmed');
  });
  it.each([
    { status: 'pending' as const, title: 'Resultado pendiente de verificar' },
    { status: 'failed' as const, title: 'Pago sin completar' },
    { status: 'cancelled' as const, title: 'Pago cancelado' },
    { status: 'captured' as const, requiresReview: true, title: 'Pago en revisión' },
  ])('no emite un resumen aprobado cuando el servidor devuelve $title', async ({ title, ...patch }) => {
    mocks.configured = true; mocks.session = session('traveler-a'); mocks.status.mockResolvedValue(result(patch));
    render(<PaymentsPanel reference={reference} onAccount={vi.fn()} onDemo={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar resumen/ })).not.toBeInTheDocument();
  });
  it('ofrece un resumen marcado de prueba únicamente tras confirmación del servidor', async () => {
    mocks.configured = true; mocks.session = session('traveler-a'); mocks.status.mockResolvedValue(result({ status: 'captured' }));
    render(<PaymentsPanel reference={reference} onAccount={vi.fn()} onDemo={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Pago confirmado por la pasarela' })).toBeInTheDocument();
    expect(screen.getByText('Entorno de pruebas · no es un cobro real.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar resumen de prueba' })).toBeInTheDocument();
  });
  it('descarta cargas privadas tardías después de cerrar sesión', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    const lateBookings = deferred<{ bookings: ConnectedBooking[]; slots: [] }>(), lateStatus = deferred<PaymentResult>();
    mocks.load.mockReturnValue(lateBookings.promise); mocks.status.mockReturnValue(lateStatus.promise);
    render(<PaymentsPanel reference={reference} onAccount={vi.fn()} onDemo={vi.fn()} />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
    await act(async () => mocks.listener?.('SIGNED_OUT', null));
    expect(screen.getByRole('button', { name: 'Entrar en mi cuenta' })).toBeInTheDocument();
    await act(async () => { lateBookings.resolve({ bookings: [booking()], slots: [] }); lateStatus.resolve(result({ status: 'captured' })); });
    expect(screen.queryByRole('heading', { name: 'Ruta privada A' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pago confirmado por la pasarela' })).not.toBeInTheDocument();
  });
  it('retira los datos de A inmediatamente al entrar B e ignora el resultado tardío de A', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    const lateStatus = deferred<PaymentResult>(), bookingsB = deferred<{ bookings: ConnectedBooking[]; slots: [] }>();
    mocks.load.mockResolvedValueOnce({ bookings: [booking()], slots: [] }).mockReturnValueOnce(bookingsB.promise);
    mocks.status.mockReturnValueOnce(lateStatus.promise).mockRejectedValue(new Error('No encontramos ese pago en tu cuenta.'));
    render(<PaymentsPanel reference={reference} onAccount={vi.fn()} onDemo={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Ruta privada A' })).toBeInTheDocument();
    await act(async () => mocks.listener?.('SIGNED_IN', session('traveler-b')));
    expect(screen.queryByRole('heading', { name: 'Ruta privada A' })).not.toBeInTheDocument();
    await act(async () => { lateStatus.resolve(result({ status: 'captured' })); bookingsB.resolve({ bookings: [booking({ title: 'Ruta privada B', traveler_id: 'traveler-b' })], slots: [] }); });
    expect(await screen.findByRole('heading', { name: 'Ruta privada B' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pago confirmado por la pasarela' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar resumen/ })).not.toBeInTheDocument();
  });
  it('conserva referencia e idempotencia al cerrar, reabrir y consultar un intento incierto', async () => {
    mocks.configured = true; mocks.session = session('traveler-a'); mocks.load.mockResolvedValue({ bookings: [booking()], slots: [] });
    mocks.prepare.mockRejectedValue(new PaymentRequestError('El intento necesita revisión.', reference));
    const user = userEvent.setup();
    const view = render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Revisar y pagar con tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Continuar a PayPhone · prueba' }));
    expect(await screen.findByRole('button', { name: 'Consultar intento anterior' })).toBeInTheDocument();
    const firstKey = mocks.prepare.mock.calls[0][1];
    expect(readPaymentAttempt('traveler-a', bookingId)).toEqual({ key: firstKey, reference });
    view.unmount();
    render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Consultar intento anterior' }));
    expect(await screen.findByRole('heading', { name: 'Resultado pendiente de verificar' })).toBeInTheDocument();
    expect(mocks.status).toHaveBeenLastCalledWith(reference, 'token-traveler-a');
    mocks.prepare.mockRejectedValue(new Error('No hay conexión.'));
    await user.click(await screen.findByRole('button', { name: 'Revisar y pagar con tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Continuar a PayPhone · prueba' }));
    await screen.findByText('No hay conexión.');
    expect(mocks.prepare.mock.calls[1][1]).toBe(firstKey);
    expect(readPaymentAttempt('traveler-a', bookingId)).toEqual({ key: firstKey, reference });
    expect(readPaymentAttempt('traveler-b', bookingId)).toBeUndefined();
  });
  it('un intento guardado por otra cuenta no aparece al consultar la misma reserva', async () => {
    mocks.configured = true; mocks.session = session('traveler-a'); mocks.load.mockResolvedValue({ bookings: [booking()], slots: [] });
    savePaymentAttempt('traveler-b', bookingId, { key: '30000000-0000-4000-8000-000000000003', reference });
    render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Ruta privada A' });
    expect(screen.queryByRole('button', { name: 'Consultar intento anterior' })).not.toBeInTheDocument();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it('impide pagar reservas vencidas o de otro entorno y bloquea el cobro sin internet', async () => {
    mocks.configured = true; mocks.session = session('traveler-a');
    mocks.load.mockResolvedValue({ bookings: [booking({ expires_at: '2020-01-01T00:00:00Z' }), booking({ id: 'live', title: 'Reserva de producción', payment_environment: 'live' })], slots: [] });
    render(<PaymentsPanel onAccount={vi.fn()} onDemo={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Ruta privada A' });
    expect(card('Ruta privada A').getByRole('button', { name: 'Revisar y pagar con tarjeta' })).toBeDisabled();
    expect(card('Reserva de producción').getByRole('button', { name: 'Revisar y pagar con tarjeta' })).toBeDisabled();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent(window, new Event('offline'));
    expect(screen.getByText(/Estás sin conexión/)).toBeInTheDocument();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('abre el panel de pagos integrado desde la navegación principal', async () => {
    render(<AppProvider><ConsentProvider><CatalogProvider><V3Toolbar /><V3Workspace /></CatalogProvider></ConsentProvider></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Reservas y pagos' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reservas y pagos' });
    expect(await within(dialog).findByRole('button', { name: 'Probar pago sin cobro' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Entrar en mi cuenta' })).toBeInTheDocument();
  });
});
