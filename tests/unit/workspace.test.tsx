// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';
import { CatalogProvider } from '../../src/features/catalog/CatalogContext';
import { ConsentProvider } from '../../src/features/privacy/ConsentContext';
import { V3Toolbar, V3Workspace } from '../../src/features/workspace/V3Workspace';

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
  fireEvent.click(screen.getByRole('button', { name: 'Mis avisos' }));
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
