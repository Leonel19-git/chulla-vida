// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { getExperienceById } from '../../src/domain/catalog';
import { CatalogProvider, useCatalog } from '../../src/features/catalog/CatalogContext';
import { parsePath, pathForExperience, targetForState, titleForTarget, useUrlRouting } from '../../src/features/routing';

const quilotoa = getExperienceById('gen-02-quilotoa-shalala')!;

describe('rutas con URL', () => {
  it('interpreta fichas por ID o slug y todas las vistas públicas', () => {
    expect(parsePath('/experiencias/gen-02-quilotoa-shalala')).toEqual({ kind: 'experience', id: quilotoa.id, title: quilotoa.title });
    expect(parsePath('/experiencias/quilotoa-shalala/')).toMatchObject({ kind: 'experience', id: quilotoa.id });
    expect(parsePath('/experiencias/no-existe')).toMatchObject({ kind: 'unknown' });
    expect(parsePath('/experiencias/%E0%A4%A')).toMatchObject({ kind: 'unknown' });
    expect(parsePath('/experiencias/<script>')).toMatchObject({ kind: 'unknown' });
    const views = { '/cultura-viva': 'culture', '/pasaporte': 'passport', '/mi-viaje': 'plan', '/billetera': 'wallet', '/mijin': 'plan', '/proximos-viajes': 'upcoming', '/sin-senal': 'downloads', '/cuenta': 'account', '/anfitriones': 'host', '/privacidad': 'legal' };
    for (const [path, view] of Object.entries(views)) expect(parsePath(path)).toEqual({ kind: 'view', view });
    expect(parsePath('/legal/terminos')).toEqual({ kind: 'legal', slug: 'terminos' });
    expect(parsePath('/')).toEqual({ kind: 'home' });
  });
  it('pathForExperience usa el ID estable y el título cambia por vista', () => {
    expect(pathForExperience(quilotoa)).toBe('/experiencias/gen-02-quilotoa-shalala');
    expect(titleForTarget(parsePath('/mi-viaje'))).toBe('Mi viaje · CHULLA VIDA');
    expect(titleForTarget(parsePath(pathForExperience(quilotoa)))).toBe('Quilotoa Shalalá · CHULLA VIDA');
    expect(targetForState({ selected: quilotoa.id, panel: 'plan', external: '' })).toMatchObject({ kind: 'experience' });
    expect(targetForState({ selected: null, panel: 'editorial', external: 'passport' })).toEqual({ kind: 'view', view: 'passport' });
  });
});

let api: { select: (id: string | null) => void; setPanel: (value: string) => void } | undefined;
function Harness() {
  const [panel, setPanel] = useState('');
  const { selected, select } = useCatalog();
  useUrlRouting({ panel, closePanel: () => setPanel('') });
  // Igual que WorkspaceVivo: los eventos cv3:* abren paneles y cierran la ficha.
  useState(() => { for (const name of ['plan', 'downloads', 'account', 'legal']) window.addEventListener(`cv3:${name}`, () => { select(null); setPanel(name); }); return 0; });
  api = { select, setPanel };
  return <p data-testid="state">{selected ?? '-'}|{panel || '-'}</p>;
}
const state = () => screen.getByTestId('state').textContent;
const mount = () => render(<CatalogProvider><Harness /></CatalogProvider>);
const go = (path: string) => { window.history.pushState(null, '', path); };
const back = async (path: string) => { await act(async () => { window.history.replaceState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }); };

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); go('/'); document.title = 'CHULLA VIDA · Ecuador a tu ritmo'; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useUrlRouting', () => {
  it('al cargar /experiencias/gen-02-quilotoa-shalala abre la ficha y pone su título', async () => {
    go('/experiencias/gen-02-quilotoa-shalala');
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(state()).toBe(`${quilotoa.id}|-`);
    expect(document.title).toBe('Quilotoa Shalalá · CHULLA VIDA');
    expect(window.location.pathname).toBe('/experiencias/gen-02-quilotoa-shalala');
  });
  it('al cargar /mi-viaje dispara cv3:plan', async () => {
    go('/mi-viaje');
    const heard = vi.fn(); window.addEventListener('cv3:plan', heard);
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(state()).toBe('-|plan');
    expect(document.title).toBe('Mi viaje · CHULLA VIDA');
  });
  it('abrir ficha o panel actualiza la URL; cerrar vuelve al inicio sin dejar una entrada que reabra', async () => {
    mount();
    const length = window.history.length;
    act(() => api!.select(quilotoa.id));
    expect(window.location.pathname).toBe('/experiencias/gen-02-quilotoa-shalala');
    expect(window.history.length).toBe(length + 1);
    act(() => { window.dispatchEvent(new Event('cv3:downloads')); });
    expect(window.location.pathname).toBe('/sin-senal');
    expect(document.title).toBe('Sin señal · CHULLA VIDA');
    act(() => api!.setPanel(''));
    expect(window.location.pathname).toBe('/');
    expect(window.history.length).toBe(length + 2);
    expect(document.title).toBe('CHULLA VIDA · Ecuador a tu ritmo');
  });
  it('el botón atrás cierra el panel o la ficha y emite cv3:home', async () => {
    mount();
    act(() => { window.dispatchEvent(new Event('cv3:plan')); });
    expect(window.location.pathname).toBe('/mi-viaje');
    act(() => api!.select(quilotoa.id));
    act(() => api!.setPanel(''));
    expect(window.location.pathname).toBe('/experiencias/gen-02-quilotoa-shalala');
    await back('/mi-viaje');
    expect(state()).toBe('-|plan');
    const home = vi.fn(); window.addEventListener('cv3:home', home);
    await back('/');
    expect(state()).toBe('-|-');
    expect(home).toHaveBeenCalled();
  });
  it('conserva ?code y #hash de retorno de Supabase en Cuenta', async () => {
    mount();
    window.history.replaceState(null, '', '/?code=abc#cuenta');
    act(() => { window.dispatchEvent(new Event('cv3:account')); });
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/cuenta?code=abc#cuenta');
  });
  it('una ruta desconocida vuelve al inicio sin romper la app', async () => {
    go('/no-existe/para-nada');
    mount();
    expect(window.location.pathname).toBe('/');
    expect(state()).toBe('-|-');
  });
  it('sin argumentos (como lo monta WorkspaceVivo) sigue paneles por evento y por el cierre de su diálogo', async () => {
    function Panel({ onClose }: { onClose: () => void }) {
      useEffect(() => { const dialog = document.getElementById('panel') as HTMLDialogElement; dialog.setAttribute('open', ''); return () => dialog.removeAttribute('open'); }, []);
      return <dialog id="panel" onCancel={onClose}><button onClick={onClose}>Cerrar</button></dialog>;
    }
    function Bare() {
      const [open, setOpen] = useState(false);
      useUrlRouting();
      useEffect(() => { const show = () => setOpen(true); window.addEventListener('cv3:plan', show); return () => window.removeEventListener('cv3:plan', show); }, []);
      return open ? <Panel onClose={() => setOpen(false)} /> : null;
    }
    render(<CatalogProvider><Bare /></CatalogProvider>);
    await act(async () => { window.dispatchEvent(new Event('cv3:plan')); });
    expect(window.location.pathname).toBe('/mi-viaje');
    await act(async () => { screen.getByRole('button', { name: 'Cerrar', hidden: true }).click(); });
    expect(window.location.pathname).toBe('/');
    await act(async () => { window.dispatchEvent(new Event('cv3:plan')); });
    expect(window.location.pathname).toBe('/mi-viaje');
    await back('/');
    expect(document.querySelector('dialog[open]')).toBeNull();
  });
});
