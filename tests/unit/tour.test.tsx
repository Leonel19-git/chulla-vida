// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { GuidedTour, TOUR_EVENT, TOUR_KEY, TOUR_STEPS, TourGate, findTourTarget, type TourStep } from '../../src/features/onboarding/GuidedTour';
import { WelcomeFlow } from '../../src/features/onboarding/WelcomeFlow';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  Element.prototype.scrollIntoView ??= function () { /* jsdom no desplaza */ };
});
beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

/** Página falsa con los elementos reales marcados y medidas simuladas (jsdom no maqueta). */
function mountPage(withTargets: string[]) {
  const root = document.createElement('div');
  root.id = 'root';
  root.innerHTML = withTargets.map((id, index) => `<button data-tour="${id}" data-top="${100 + index * 60}">${id}</button>`).join('') + '<button id="opener">Abrir recorrido</button>';
  document.body.appendChild(root);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const top = Number((this as HTMLElement).dataset?.top ?? NaN);
    if (Number.isNaN(top)) return new DOMRect(0, 0, 0, 0);
    return new DOMRect(40, top, 200, 44);
  });
  return root;
}
const steps: TourStep[] = [
  { id: 'regions', title: 'Elige tu región', text: 'Regiones', targets: ['[data-tour="regions"]'] },
  { id: 'search', title: 'Busca y filtra', text: 'Buscar', targets: ['[data-tour="search"]'] },
  { id: 'account', title: 'Entrar o crear cuenta', text: 'Cuenta', targets: ['[data-tour="account"]', '.no-existe'] },
];

describe('recorrido guiado sobre la página real', () => {
  it('cubre todas las partes pedidas, en orden y con data-tour', () => {
    expect(TOUR_STEPS.map(step => step.id)).toEqual(['regions', 'search', 'card', 'buy', 'mijin', 'plan', 'wallet', 'offline', 'passport', 'account', 'host', 'privacy']);
    for (const step of TOUR_STEPS) expect(step.targets[0]).toMatch(/data-tour=/);
  });
  it('encuentra el primer objetivo visible y descarta los que no miden nada', () => {
    mountPage(['search']);
    expect(findTourTarget({ id: 'x', title: '', text: '', targets: ['[data-tour="regions"]', '[data-tour="search"]'] })?.textContent).toBe('search');
    expect(findTourTarget({ id: 'x', title: '', text: '', targets: ['#opener'] })).toBeNull();
  });
  it('resalta el elemento, avanza y retrocede con flechas, y Esc cierra devolviendo el foco', () => {
    const root = mountPage(['regions', 'search', 'account']);
    const opener = document.getElementById('opener')!;
    opener.focus();
    const onClose = vi.fn();
    render(<GuidedTour onClose={onClose} steps={steps} />);
    const dialog = screen.getByRole('dialog', { name: 'Elige tu región' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Elige tu región' })).toHaveFocus();
    expect(root.inert).toBe(true);
    const spot = document.querySelector<HTMLElement>('.cv-tour-spot')!;
    expect(spot.style.top).toBe('92px');
    expect(spot.style.width).toBe('216px');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(screen.getByRole('dialog', { name: 'Busca y filtra' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
    expect(screen.getByRole('dialog', { name: 'Elige tu región' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(TOUR_KEY)).toBe('skipped');
  });
  it('restaura la página y el foco al desmontar', () => {
    const root = mountPage(['regions']);
    const opener = document.getElementById('opener')!;
    opener.focus();
    const { unmount } = render(<GuidedTour onClose={() => {}} steps={steps.slice(0, 1)} />);
    unmount();
    expect(root.inert).toBe(false);
    expect(opener).toHaveFocus();
  });
  it('al terminar u omitir vuelve suave al principio y enfoca el título principal', () => {
    const root = mountPage(['regions']);
    const title = document.createElement('h1');
    title.id = 'hero-title';
    title.textContent = 'Un país.';
    root.prepend(title);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    const { rerender } = render(<GuidedTour onClose={() => {}} steps={steps.slice(0, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: /Listo, a explorar/ }));
    rerender(<></>);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(title).toHaveFocus();
    expect(root.inert).toBe(false);
    vi.unstubAllGlobals();
  });
  it('el paso de anfitriones solo aparece para invitados', async () => {
    const { stepsForRole } = await import('../../src/features/onboarding/GuidedTour');
    const { roleStore } = await import('../../src/features/roles');
    roleStore.reset();
    expect(stepsForRole().some(step => step.id === 'host')).toBe(true);
    roleStore.setWelcomePath('traveler');
    expect(stepsForRole().some(step => step.id === 'host')).toBe(false);
    roleStore.reset();
  });
  it('si la parte no está a la vista lo dice y centra el globo sin foco', () => {
    mountPage([]);
    render(<GuidedTour onClose={() => {}} steps={steps} />);
    expect(screen.getByText(/Está en el menú/)).toBeInTheDocument();
    expect(document.querySelector('.cv-tour-spot')).toBeNull();
    expect(document.querySelector('.cv-tour-dim')).not.toBeNull();
  });
  it('el último paso termina el recorrido y lo marca como hecho', () => {
    mountPage(['regions', 'search', 'account']);
    const onClose = vi.fn();
    render(<GuidedTour onClose={onClose} steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByRole('button', { name: /Atrás/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Listo, a explorar/ }));
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(TOUR_KEY)).toBe('done');
  });
  it('«Saltar recorrido» lo cierra en cualquier paso', () => {
    mountPage(['regions']);
    const onClose = vi.fn();
    render(<GuidedTour onClose={onClose} steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar recorrido' }));
    expect(onClose).toHaveBeenCalled();
  });
  it('se reabre con el evento cv3:tour', () => {
    mountPage(['regions']);
    render(<TourGate />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event(TOUR_EVENT)); });
    expect(screen.getByRole('dialog', { name: 'Elige tu región' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el recorrido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('la bienvenida de doble entrada va antes del recorrido', () => {
  it('el camino viajero termina lanzando el recorrido sobre la página', () => {
    vi.useFakeTimers();
    const onTour = vi.fn();
    window.addEventListener(TOUR_EVENT, onTour);
    const onClose = vi.fn();
    render(<AppProvider><WelcomeFlow onClose={onClose} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Soy viajero/ }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver el recorrido por la página' }));
    expect(onClose).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onTour).toHaveBeenCalledTimes(1);
    window.removeEventListener(TOUR_EVENT, onTour);
  });
  it('«Solo quiero explorar» no lanza el recorrido', () => {
    vi.useFakeTimers();
    const onTour = vi.fn();
    window.addEventListener(TOUR_EVENT, onTour);
    render(<AppProvider><WelcomeFlow onClose={() => {}} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Solo quiero explorar/ }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(onTour).not.toHaveBeenCalled();
    window.removeEventListener(TOUR_EVENT, onTour);
  });
});
