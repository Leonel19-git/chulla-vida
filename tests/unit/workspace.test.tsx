// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';
import { CatalogProvider } from '../../src/features/catalog/CatalogContext';
import { ConsentProvider } from '../../src/features/privacy/ConsentContext';
import { V3Footer, V3Toolbar, V3Workspace } from '../../src/features/workspace/V3Workspace';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Workspace() { return <AppProvider><ConsentProvider><CatalogProvider><V3Toolbar /><V3Workspace /></CatalogProvider></ConsentProvider></AppProvider>; }
it('carga el panel de avisos real sin pedir permiso al abrirlo', async () => {
  const requestPermission = vi.fn();
  vi.stubGlobal('Notification', Object.assign(function () {}, { permission: 'default', requestPermission }));
  render(<Workspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Más herramientas' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Mis avisos/ }));
  expect(await screen.findByRole('heading', { name: 'Que te llegue lo que te importa.' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Permitir avisos del navegador' })).toBeInTheDocument();
  expect(requestPermission).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  vi.unstubAllGlobals();
});
it('abre el planificador integrado y permite exportar el borrador', async () => {
  render(<Workspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Mi viaje' }));
  expect(await screen.findByRole('dialog', { name: 'Chulla Flex · Arma tu viaje' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Exportar mi borrador' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('agrupa herramientas en «Más»: abre, cierra con Escape y devuelve el foco', async () => {
  render(<Workspace />);
  const more = screen.getByRole('button', { name: 'Más herramientas' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
    expect.stringMatching(/^Sin señal/), expect.stringMatching(/^Mis avisos/), expect.stringMatching(/^Anfitriones/), expect.stringMatching(/^Cuenta y negocio/),
  ]);
  expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(more).toHaveFocus();
});
it('«Mi billetera» abre la billetera desde la barra de herramientas', async () => {
  render(<Workspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Mi billetera' }));
  expect(await screen.findByRole('dialog', { name: /billetera/i })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('el pie ofrece los PDF de protección de datos y abre el ejercicio de derechos', async () => {
  render(<AppProvider><ConsentProvider><CatalogProvider><V3Workspace /><V3Footer /></CatalogProvider></ConsentProvider></AppProvider>);
  expect(screen.getByRole('link', { name: /Aviso de protección de datos/ })).toHaveAttribute('href', '/legal/aviso-proteccion-datos-chulla-vida.pdf');
  expect(screen.getByRole('link', { name: /Formulario de derechos/ })).toHaveAttribute('href', '/legal/formulario-derechos-datos-chulla-vida.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Ejercer mis derechos de datos' }));
  expect(await screen.findByRole('dialog', { name: /derechos/i })).toBeInTheDocument();
});
