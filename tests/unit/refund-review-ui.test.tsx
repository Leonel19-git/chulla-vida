// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RefundReview } from '../../src/features/payments/RefundReview';
import type { ConnectedBooking, RefundReviewRequest } from '../../src/features/payments/api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), submit: vi.fn() }));
vi.mock('../../src/features/payments/api', () => ({ getRefundReview: mocks.get, submitRefundReview: mocks.submit }));
const bookingId = '20000000-0000-4000-8000-000000000002';
const booking: ConnectedBooking = { id: bookingId, code: 'CV-123', traveler_id: 'traveler-a', experience_id: 'exp-a', participants: 2, status: 'paid', total_amount: 42.5, currency: 'USD', payment_environment: 'sandbox', expires_at: null, cancellation_policy_snapshot: null, title: 'Mi reserva', startsAt: null };
const request: RefundReviewRequest = { id: '30000000-0000-4000-8000-000000000003', bookingId, status: 'requested', amount: 42.5, currency: 'USD', reason: 'No pude realizar la visita.', createdAt: '2026-11-13T12:00:00Z', environment: 'sandbox' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function show(online = true) { return render(<RefundReview booking={booking} token="token-a" online={online} />); }
beforeEach(() => { mocks.get.mockReset().mockResolvedValue(null); mocks.submit.mockReset().mockResolvedValue(request); });
afterEach(cleanup);

it('espera una consulta inicial válida y exige al menos tres caracteres útiles', async () => {
  const initial = deferred<RefundReviewRequest | null>(); mocks.get.mockReturnValue(initial.promise);
  show();
  expect(screen.queryByLabelText('Motivo de la revisión')).not.toBeInTheDocument();
  expect(screen.getByText('Consultando solicitudes anteriores…')).toBeInTheDocument();
  await act(async () => initial.resolve(null));
  const reason = screen.getByLabelText('Motivo de la revisión');
  const submit = screen.getByRole('button', { name: 'Solicitar revisión · sin devolución automática' });
  expect(submit).toBeDisabled();
  fireEvent.change(reason, { target: { value: ' a ' } }); expect(submit).toBeDisabled();
  fireEvent.change(reason, { target: { value: 'Motivo' } }); expect(submit).toBeEnabled();
  expect(mocks.get).toHaveBeenCalledWith(bookingId, 'token-a');
});

it('un fallo inicial impide enviar y permite volver a consultar', async () => {
  mocks.get.mockRejectedValueOnce(new Error('No se pudo consultar.')).mockResolvedValueOnce(null);
  show();
  expect(await screen.findByText('No se pudo consultar.')).toBeInTheDocument();
  expect(screen.queryByText('Consultando solicitudes anteriores…')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Motivo de la revisión')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar revisión' }));
  expect(await screen.findByLabelText('Motivo de la revisión')).toBeInTheDocument();
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('bloquea envíos repetidos y distingue solicitud registrada de devolución realizada', async () => {
  const pending = deferred<RefundReviewRequest>(); mocks.submit.mockReturnValue(pending.promise);
  show();
  const reason = await screen.findByLabelText('Motivo de la revisión');
  fireEvent.change(reason, { target: { value: request.reason } });
  const form = reason.closest('form')!;
  fireEvent.submit(form); fireEvent.submit(form);
  expect(mocks.submit).toHaveBeenCalledTimes(1);
  expect(mocks.submit).toHaveBeenCalledWith(bookingId, request.reason, expect.stringMatching(/^[0-9a-f-]{36}$/i), 'token-a');
  expect(screen.getByRole('button', { name: 'Guardando solicitud…' })).toBeDisabled();
  await act(async () => pending.resolve(request));
  expect(screen.getByText('Solicitud recibida · revisión pendiente')).toBeInTheDocument();
  expect(screen.getByText('Solicitud guardada para revisión. No se ha realizado una devolución.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Motivo de la revisión')).not.toBeInTheDocument();
});

it('conserva el motivo y la misma clave si un envío falla y se reintenta', async () => {
  mocks.submit.mockRejectedValueOnce(new Error('Error temporal. Conserva el motivo.')).mockResolvedValueOnce(request);
  show();
  const reason = await screen.findByLabelText('Motivo de la revisión');
  fireEvent.change(reason, { target: { value: request.reason } });
  fireEvent.submit(reason.closest('form')!);
  expect(await screen.findByText('Error temporal. Conserva el motivo.')).toBeInTheDocument();
  expect(reason).toHaveValue(request.reason);
  fireEvent.submit(reason.closest('form')!);
  await screen.findByText('Solicitud recibida · revisión pendiente');
  expect(mocks.submit.mock.calls[1][2]).toBe(mocks.submit.mock.calls[0][2]);
});

it('muestra una solicitud anterior sin ofrecer un formulario duplicado', async () => {
  mocks.get.mockResolvedValue(request);
  show();
  expect(await screen.findByText('Solicitud recibida · revisión pendiente')).toBeInTheDocument();
  expect(screen.getByText(request.reason)).toBeInTheDocument();
  expect(screen.queryByLabelText('Motivo de la revisión')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Solicitar revisión · sin devolución automática' })).not.toBeInTheDocument();
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('sin internet bloquea actualizar y enviar incluso si se fuerza el submit del formulario', async () => {
  show(false);
  const reason = await screen.findByLabelText('Motivo de la revisión');
  fireEvent.change(reason, { target: { value: request.reason } });
  expect(screen.getByRole('button', { name: 'Solicitar revisión · sin devolución automática' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Actualizar revisión' })).toBeDisabled();
  fireEvent.submit(reason.closest('form')!);
  expect(mocks.submit).not.toHaveBeenCalled();
});

it('ignora una consulta tardía después de desmontar la cuenta anterior', async () => {
  const old = deferred<RefundReviewRequest | null>(); mocks.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(null);
  const view = show();
  expect(mocks.get).toHaveBeenCalledTimes(1);
  view.unmount();
  render(<RefundReview booking={{ ...booking, id: '40000000-0000-4000-8000-000000000004', code: 'CV-B' }} token="token-b" online />);
  await screen.findByLabelText('Motivo de la revisión');
  await act(async () => old.resolve(request));
  expect(screen.queryByText(request.reason)).not.toBeInTheDocument();
  expect(screen.queryByText('Solicitud recibida · revisión pendiente')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Motivo de la revisión')).toHaveValue('');
});

it('ignora el resultado de un envío pendiente al desmontarse el panel de la cuenta', async () => {
  const pending = deferred<RefundReviewRequest>(); mocks.submit.mockReturnValue(pending.promise);
  const view = show();
  const reason = await screen.findByLabelText('Motivo de la revisión');
  fireEvent.change(reason, { target: { value: request.reason } }); fireEvent.submit(reason.closest('form')!);
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  view.unmount();
  render(<RefundReview booking={{ ...booking, code: 'CV-B' }} token="token-b" online />);
  await screen.findByLabelText('Motivo de la revisión');
  await act(async () => pending.resolve(request));
  expect(screen.queryByText('Solicitud guardada para revisión. No se ha realizado una devolución.')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Motivo de la revisión')).toHaveValue('');
});
