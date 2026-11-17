// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedTour, HOST_TOUR_STEPS, TOUR_EVENT, TOUR_KEY, TOUR_PROGRESS_KEY, TOUR_STEPS, TourGate, stepsForRole } from '../../src/features/onboarding/GuidedTour';
import { roleStore } from '../../src/features/roles';

function page(names: string[]) {
  const root = document.createElement('main'); root.id = 'root';
  root.innerHTML = '<h1 id="hero-title">Álbum</h1>' + names.map((name, i) => `<button data-tour="${name}" data-top="${80 + i * 60}">${name}</button>`).join('');
  document.body.append(root); return root;
}
const launch = (detail?: { path?: 'traveler' | 'host'; restart?: boolean }) => act(() => { window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail })); });
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); roleStore.reset();
  vi.stubGlobal('scrollTo', vi.fn());
  Element.prototype.scrollIntoView ??= vi.fn();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.hasAttribute('data-tour') ? new DOMRect(16, Number(this.getAttribute('data-top') ?? 80), 120, 48) : new DOMRect();
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
});
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); roleStore.reset(); });

describe('recorrido del Álbum', () => {
  it('solo cuenta objetivos presentes; omite ocultos incluso con medidas', () => {
    page(['album', 'search', 'filters', 'account']);
    document.querySelector('[data-tour="filters"]')!.setAttribute('hidden', '');
    render(<TourGate />); launch();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('dialog', { name: 'Busca un lugar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('dialog', { name: 'Yo · Tu cuenta' })).toBeInTheDocument();
    expect(screen.queryByText('Está en el menú.')).not.toBeInTheDocument();
  });
  it('Saltar guarda el paso y reabrir reanuda; reinicio explícito vuelve al primero', () => {
    page(['album', 'search', 'account']); render(<TourGate />); launch();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar recorrido' }));
    expect(localStorage.getItem(TOUR_KEY)).toBe('skipped');
    expect(JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY)!)).toMatchObject({ traveler: 'search' });
    launch(); expect(screen.getByRole('dialog', { name: 'Busca un lugar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el recorrido' }));
    launch({ restart: true }); expect(screen.getByRole('dialog', { name: 'Explorar Ecuador' })).toBeInTheDocument();
  });
  it('completar limpia el avance, vuelve arriba y enfoca el título', () => {
    const root = page(['account']); render(<TourGate />); launch();
    expect(root.inert).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Listo, a explorar/ }));
    expect(root.inert).toBe(false); expect(document.getElementById('hero-title')).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(localStorage.getItem(TOUR_KEY)).toBe('done');
    expect(JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY)!)).toMatchObject({ traveler: null });
  });
  it('con teclado retiene foco, avanza con flechas y Esc permite continuar luego', () => {
    page(['album', 'account']); render(<TourGate />); launch();
    const close = screen.getByRole('button', { name: 'Cerrar el recorrido' });
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Explorar Ecuador' }), { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Yo · Tu cuenta' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    launch(); expect(screen.getByRole('dialog', { name: 'Yo · Tu cuenta' })).toBeInTheDocument();
  });
  it('si desaparece el objetivo actual, sigue con el siguiente disponible', async () => {
    page(['album', 'search', 'account']); render(<TourGate />); launch();
    act(() => { document.querySelector('[data-tour="album"]')!.remove(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(40); });
    expect(screen.getByRole('dialog', { name: 'Busca un lugar' })).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument();
  });
  it('sin objetivos se cierra una vez y no inventa una explicación', () => {
    const onClose = vi.fn(); render(<GuidedTour onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('se mantiene dentro del viewport móvil y responde al teclado virtual', async () => {
    const viewport = Object.assign(new EventTarget(), { width: 360, height: 520, offsetLeft: 0, offsetTop: 0 });
    vi.stubGlobal('visualViewport', viewport);
    page(['account']); render(<TourGate />); launch();
    viewport.height = 320; viewport.offsetTop = 24;
    act(() => { viewport.dispatchEvent(new Event('resize')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    const dialog = screen.getByRole('dialog');
    expect(Number.parseFloat(dialog.style.top)).toBeGreaterThanOrEqual(36);
    expect(Number.parseFloat(dialog.style.top) + 240).toBeLessThanOrEqual(332);
    expect(Number.parseFloat(dialog.style.left)).toBeGreaterThanOrEqual(12);
  });
  it('almacenamiento bloqueado no impide completar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    page(['album']); render(<TourGate />); launch();
    fireEvent.click(screen.getByRole('button', { name: /Listo, a explorar/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('anfitrión tiene ruta y avance separados, también en cuentas con ambos modos', () => {
    page(['album', 'host', 'host-experiences', 'account']);
    roleStore.setWelcomePath('traveler'); roleStore.requestHost();
    expect(stepsForRole()).toBe(HOST_TOUR_STEPS);
    render(<TourGate />); launch();
    expect(screen.getByRole('dialog', { name: 'Tu espacio de anfitrión' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar recorrido' }));
    roleStore.setMode('traveler'); launch();
    expect(screen.getByRole('dialog', { name: 'Explorar Ecuador' })).toBeInTheDocument();
    expect(TOUR_STEPS.some(step => step.id.startsWith('host'))).toBe(false);
    expect(JSON.parse(localStorage.getItem(TOUR_PROGRESS_KEY)!)).toMatchObject({ host: 'host-experiences', traveler: 'album' });
  });
});
