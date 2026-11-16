// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';
import { WelcomeFlow, readTravelPreferences } from '../../src/features/onboarding/WelcomeFlow';
import { roleStore } from '../../src/features/roles/role';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => { localStorage.clear(); roleStore.reset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('la cuenta va primero en la bienvenida', () => {
  it('el primer paso ofrece «Crear cuenta» y «Entrar» antes de los caminos', () => {
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    const create = screen.getByRole('button', { name: 'Crear cuenta' });
    const enter = screen.getByRole('button', { name: 'Entrar' });
    const traveler = screen.getByRole('button', { name: /Soy viajero/ });
    expect(create.compareDocumentPosition(traveler) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(enter).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solo quiero explorar/ })).toBeInTheDocument();
  });

  it('«Crear cuenta» cierra la bienvenida y abre la cuenta en la pestaña de registro', () => {
    vi.useFakeTimers();
    const onClose = vi.fn(); const opened = vi.fn();
    const listen = (event: Event) => opened((event as CustomEvent).detail);
    window.addEventListener('cv3:account', listen);
    render(<AppProvider><WelcomeFlow onClose={onClose} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    act(() => { vi.runAllTimers(); });
    window.removeEventListener('cv3:account', listen);
    expect(onClose).toHaveBeenCalled();
    expect(opened).toHaveBeenCalledWith({ tab: 'signup' });
    expect(readTravelPreferences()?.completed).toBe(true);
  });

  it('«Entrar» abre la cuenta en la pestaña de acceso', () => {
    vi.useFakeTimers();
    const opened = vi.fn();
    const listen = (event: Event) => opened((event as CustomEvent).detail);
    window.addEventListener('cv3:account', listen);
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    act(() => { vi.runAllTimers(); });
    window.removeEventListener('cv3:account', listen);
    expect(opened).toHaveBeenCalledWith({ tab: 'login' });
  });

  it('con sesión de viajero no ofrece crear cuenta ni nada de negocios', () => {
    roleStore.setServer({ userId: 'u', hostOrganizations: 0, admin: false });
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    expect(screen.queryByRole('button', { name: 'Crear cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tengo un negocio/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/negocio|anfitri/i);
    expect(screen.getByRole('button', { name: /Soy viajero/ })).toBeInTheDocument();
  });

  it('elegir «Soy viajero» deja el rol en viajero; el camino de anfitrión lo deja en negocio', () => {
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Soy viajero/ }));
    fireEvent.click(screen.getByRole('button', { name: /Omitir/ }));
    expect(roleStore.get().role).toBe('traveler');
    cleanup();
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Tengo un negocio/ }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /Ir al espacio de anfitriones/ }));
    expect(roleStore.get().role).toBe('host');
  });
});
