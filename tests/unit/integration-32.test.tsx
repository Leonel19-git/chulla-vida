// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';
import { Dialog } from '../../src/components/chulla/Dialog';
import { PlannerDialog } from '../../src/features/planner/PlannerDialog';
import { WELCOME_KEY } from '../../src/features/onboarding/WelcomeFlow';

vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: [], online: true, select: () => {} }) }));
vi.mock('../../src/features/payments/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/features/payments/api')>(), getPaymentConfiguration: vi.fn(async () => ({ enabled: false, provider: 'payphone', environment: 'live' })) }));

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);

describe('CHULLA VIDA 3.2 · integración', () => {
  it('un diálogo abierto dentro de otro contenedor se monta en <body> y no hereda sus estilos', () => {
    render(<AppProvider><div className="vivo-detail-cta" data-testid="cta"><Dialog title="Comprar · prueba" onClose={vi.fn()}><span>Visa •••• 4242</span></Dialog></div></AppProvider>);
    const dialog = screen.getByRole('dialog', { name: 'Comprar · prueba' });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByTestId('cta').contains(dialog)).toBe(false);
  });

  it('Mi viaje parte de lo que contaste en la bienvenida: origen, presupuesto, personas y mascota', () => {
    localStorage.setItem(WELCOME_KEY, JSON.stringify({ completed: true, path: 'traveler', interests: [], budgetTotalUsd: 120, origin: 'Cuenca', travelers: 3, pet: true, updatedAt: '' }));
    render(<AppProvider><PlannerDialog onClose={vi.fn()} onSelect={vi.fn()} /></AppProvider>);
    expect(screen.getByLabelText('Salgo desde')).toHaveValue('Cuenca');
    expect(screen.getByLabelText(/Presupuesto de todo el grupo/)).toHaveValue(120);
    expect(screen.getByLabelText('Personas')).toHaveValue(3);
    expect(screen.getByLabelText(/Viajo con mi perro/)).toBeChecked();
  });

  it('sin bienvenida, Mi viaje usa los valores por defecto', () => {
    render(<AppProvider><PlannerDialog onClose={vi.fn()} onSelect={vi.fn()} /></AppProvider>);
    expect(screen.getByLabelText('Salgo desde')).toHaveValue('Quito');
    expect(screen.getByLabelText(/Presupuesto de todo el grupo/)).toHaveValue(20);
    expect(screen.getByLabelText(/Viajo con mi perro/)).not.toBeChecked();
  });
});
