// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';
import { BuyButton } from '../../src/features/payments/BuyButton';
import { getExperienceById } from '../../src/domain/catalog';
import { JOURNEY_KEY, newJourney } from '../../src/domain/itinerary';
import { PlannerDialog } from '../../src/features/planner/PlannerDialog';
const mock = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => ({ auth: { getUser: mock.getUser, onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } }) }));
vi.mock('../../src/features/catalog/CatalogContext', async () => {
  const { EXPERIENCES } = await import('../../src/domain/catalog');
  return { useCatalog: () => ({ records: EXPERIENCES, online: true }) };
});
vi.mock('../../src/features/payments/Checkout', () => ({ Checkout: () => <div role="dialog">Compra abierta con cuenta confirmada</div> }));
beforeEach(() => {
  localStorage.clear(); mock.getUser.mockReset();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
function setup() { render(<AppProvider><BuyButton experience={getExperienceById('gen-01-saraguro-ancestral')!} /></AppProvider>); }
describe('Acceso a la compra desde el álbum', () => {
  it('pide cuenta y no abre checkout a un visitante', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const account = vi.fn(); window.addEventListener('cv3:account', account);
    try { setup(); fireEvent.click(screen.getByRole('button', { name: /Comprar:/ })); await waitFor(() => expect(account).toHaveBeenCalledTimes(1)); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); }
    finally { window.removeEventListener('cv3:account', account); }
  });
  it('no deja pasar una cuenta sin confirmar el correo', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'user', email_confirmed_at: null } }, error: null });
    setup(); fireEvent.click(screen.getByRole('button', { name: /Comprar:/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Confirma tu correo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('abre el checkout una vez que el servidor reconoce la cuenta confirmada', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'user', email_confirmed_at: '2026-11-17T00:00:00Z' } }, error: null });
    setup(); fireEvent.click(screen.getByRole('button', { name: /Comprar:/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Compra abierta con cuenta confirmada');
  });
  it('un fallo al comprobar la sesión no habilita la compra', async () => {
    mock.getUser.mockRejectedValue(new Error('offline'));
    setup(); fireEvent.click(screen.getByRole('button', { name: /Comprar:/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reintenta con conexión');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Acceso a la compra desde Mi viaje', () => {
  function plan() {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), budget: 200, days: 3, stops: ['gen-01-saraguro-ancestral'] }));
    render(<AppProvider><PlannerDialog onClose={() => {}} onSelect={() => {}} /></AppProvider>);
  }
  it('no permite eludir el registro comprando todo el viaje', async () => {
    mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
    plan(); fireEvent.click(screen.getByRole('button', { name: /Comprar ruta completa/ }));
    expect(await screen.findByRole('heading', { name: 'Tus historias van contigo' })).toBeInTheDocument();
    expect(screen.queryByText('Compra abierta con cuenta confirmada')).not.toBeInTheDocument();
  });
  it('permite comprar una parada con correo confirmado', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'user', email_confirmed_at: '2026-11-17T00:00:00Z' } }, error: null });
    plan(); fireEvent.click(screen.getByRole('button', { name: 'Comprar esta parada' }));
    expect(await screen.findByText('Compra abierta con cuenta confirmada')).toBeInTheDocument();
  });
});
