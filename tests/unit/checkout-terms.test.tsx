// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CheckoutTerms } from '../../src/features/payments/CheckoutTerms';
import { ecuadorToday, loadCheckoutTerms } from '../../src/features/payments/terms';

const mocks = vi.hoisted(() => ({ configured: true, load: vi.fn(), rpc: vi.fn() }));
const versionId = '20000000-0000-4000-8000-000000000002';
const acceptanceId = '30000000-0000-4000-8000-000000000003';
const published = { id: versionId, document_id: 'checkout-terms', version: '1.0', content: 'Términos completos aprobados.\nUna aceptación explícita es necesaria.\n<script>texto literal</script>', content_hash: 'a'.repeat(64), status: 'published', has_pending_placeholders: false, reviewed_by_counsel: 'Revisión legal registrada', approved_at: '2020-01-01T12:00:00Z', published_at: '2020-01-02T12:00:00Z', effective_from: '2020-01-02', legal_documents: { id: 'checkout-terms', title: 'Términos de CHULLA VIDA', kind: 'terms', audience: 'public' } };
const query = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn() };
const client = { from: vi.fn(() => query), rpc: mocks.rpc };
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => mocks.configured ? client : null }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  mocks.configured = true; mocks.load.mockReset().mockResolvedValue({ data: [published], error: null }); mocks.rpc.mockReset().mockResolvedValue({ data: acceptanceId, error: null });
  client.from.mockClear(); query.select.mockReset().mockReturnValue(query); query.eq.mockReset().mockReturnValue(query); query.or.mockReset().mockReturnValue(query); query.order.mockReset().mockReturnValue(query); query.limit.mockReset().mockImplementation(() => mocks.load());
});
afterEach(cleanup);

describe('términos aprobados del checkout real', () => {
  it('mantiene bloqueada la aceptación durante la carga y sin términos publicados', async () => {
    const pending = deferred<{ data: unknown[]; error: null }>(); mocks.load.mockReturnValue(pending.promise);
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    expect(screen.getByText('Consultando los términos publicados y vigentes…')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await act(async () => pending.resolve({ data: [], error: null }));
    expect(screen.getByText(/Todavía no hay términos públicos aprobados/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(accepted).not.toHaveBeenCalledWith(true); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('muestra el documento completo como texto y solo registra la versión tras marcar y guardar explícitamente', async () => {
    const pending = deferred<{ data: string; error: null }>(); mocks.rpc.mockReturnValue(pending.promise);
    const accepted = vi.fn(); const view = render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' })).toBeDisabled();
    fireEvent.click(screen.getByText('Leer los términos completos'));
    expect(screen.getByRole('article', { name: published.legal_documents.title }).textContent).toBe(published.content);
    expect(view.container.querySelector('script')).toBeNull();
    fireEvent.click(checkbox); expect(mocks.rpc).not.toHaveBeenCalled();
    const save = screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }); fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledWith('accept_legal_document', { p_document_version_id: versionId, p_method: 'checkout' });
    expect(accepted).not.toHaveBeenCalledWith(true);
    await act(async () => pending.resolve({ data: acceptanceId, error: null }));
    expect(accepted).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: 'Aceptación registrada' })).toBeDisabled();
    fireEvent.click(checkbox); expect(accepted).toHaveBeenLastCalledWith(false);
  });
  it('una carga fallida no ofrece aceptación y permite consultar de nuevo', async () => {
    mocks.load.mockRejectedValueOnce(new Error('La conexión no está disponible.')).mockResolvedValueOnce({ data: [published], error: null });
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('La conexión no está disponible.');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a consultar los términos' }));
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
    expect(accepted).not.toHaveBeenCalledWith(true);
  });
  it.each([
    { status: 'draft' }, { has_pending_placeholders: true }, { content: '[PENDIENTE] Responsable legal' },
    { effective_from: '2999-01-01' }, { effective_from: '2026-02-31' }, { content_hash: 'invalid' },
    { legal_documents: { ...published.legal_documents, audience: 'internal' } },
    { legal_documents: { ...published.legal_documents, kind: 'privacy' } },
  ])('no permite aceptar un documento no verificado como vigente: %j', async patch => {
    mocks.load.mockResolvedValue({ data: [{ ...published, ...patch }], error: null });
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo verificar/);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(accepted).not.toHaveBeenCalledWith(true);
  });
  it('impide aceptar cuando hay más de un documento de términos público vigente', async () => {
    mocks.load.mockResolvedValue({ data: [published, { ...published, id: acceptanceId, document_id: 'other-terms', legal_documents: { ...published.legal_documents, id: 'other-terms' } }], error: null });
    render(<CheckoutTerms onAccepted={vi.fn()} disabled={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Hay más de un documento');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('un fallo del servidor al registrar la aceptación mantiene bloqueado el pago', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/pago permanece bloqueado/);
    expect(accepted).not.toHaveBeenCalledWith(true); expect(accepted).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('comprueba de nuevo la versión antes de aceptar y rechaza cambios de documento', async () => {
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    fireEvent.click(await screen.findByRole('checkbox'));
    mocks.load.mockResolvedValue({ data: [{ ...published, id: acceptanceId, version: '2.0', content_hash: 'b'.repeat(64) }], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Los términos cambiaron');
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(accepted).not.toHaveBeenCalledWith(true);
  });
  it('desactiva la aceptación anterior al volver a consultar otra versión', async () => {
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }));
    await waitFor(() => expect(accepted).toHaveBeenLastCalledWith(true));
    mocks.load.mockResolvedValue({ data: [{ ...published, id: acceptanceId, version: '2.0' }], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a consultar los términos' }));
    expect(accepted).toHaveBeenLastCalledWith(false);
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
    expect(screen.getByText(/Versión 2.0/)).toBeInTheDocument();
  });
  it('no acepta mientras el checkout está deshabilitado', async () => {
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled />);
    expect(await screen.findByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }));
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(accepted).not.toHaveBeenCalledWith(true);
  });
  it('anula la aceptación al desmontar e ignora un éxito de servidor tardío', async () => {
    const pending = deferred<{ data: string; error: null }>(); mocks.rpc.mockReturnValue(pending.promise);
    const accepted = vi.fn(); const view = render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aceptación de esta versión' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    view.unmount(); expect(accepted).toHaveBeenLastCalledWith(false);
    await act(async () => pending.resolve({ data: acceptanceId, error: null }));
    expect(accepted).not.toHaveBeenCalledWith(true);
  });
  it('no conserva una versión cargada por un panel ya desmontado', async () => {
    const pending = deferred<{ data: unknown[]; error: null }>(); mocks.load.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ data: [], error: null });
    const oldAccepted = vi.fn(); const view = render(<CheckoutTerms onAccepted={oldAccepted} disabled={false} />);
    view.unmount(); render(<CheckoutTerms onAccepted={vi.fn()} disabled={false} />);
    await screen.findByText(/Todavía no hay términos públicos aprobados/);
    await act(async () => pending.resolve({ data: [published], error: null }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(oldAccepted).toHaveBeenLastCalledWith(false);
  });
  it('limita la consulta a términos públicos publicados, sin campos pendientes y vigentes en Ecuador', async () => {
    expect(ecuadorToday(new Date('2026-11-13T03:00:00Z'))).toBe('2026-11-12');
    expect((await loadCheckoutTerms(new Date('2026-11-13T03:00:00Z')))?.id).toBe(versionId);
    expect(client.from).toHaveBeenCalledWith('legal_document_versions');
    expect(query.eq.mock.calls).toEqual([['status', 'published'], ['has_pending_placeholders', false], ['legal_documents.kind', 'terms'], ['legal_documents.audience', 'public']]);
    expect(query.or).toHaveBeenCalledWith('effective_from.is.null,effective_from.lte.2026-11-12');
  });
  it('sin Supabase no utiliza borradores locales como términos aprobados', async () => {
    mocks.configured = false;
    const accepted = vi.fn(); render(<CheckoutTerms onAccepted={accepted} disabled={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Conecta tu cuenta');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(accepted).not.toHaveBeenCalledWith(true);
  });
});
