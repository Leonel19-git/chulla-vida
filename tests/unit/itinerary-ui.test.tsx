// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { experiences, type Experience } from '../../src/domain/catalog';
import { JOURNEY_KEY, newJourney } from '../../src/domain/itinerary';
import { PlannerDialog } from '../../src/features/planner/PlannerDialog';
import { AppProvider } from '../../src/context/AppContext';

const catalog = vi.hoisted(() => ({ records: [] as Experience[] }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: catalog.records, online: false }) }));
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  catalog.records = experiences.slice(0, 2);
});
afterEach(cleanup);

it('reordena las paradas visibles sin perder las no descargadas y permite retirarlas', () => {
  const [first, second] = catalog.records;
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), stops: ['ficha-no-descargada', first.id, second.id] }));
  render(<AppProvider><PlannerDialog onClose={vi.fn()} onSelect={vi.fn()} /></AppProvider>);
  fireEvent.click(screen.getByRole('button', { name: `Subir ${second.title}` }));
  expect(JSON.parse(localStorage.getItem(JOURNEY_KEY)!).stops).toEqual(['ficha-no-descargada', second.id, first.id]);
  fireEvent.click(screen.getByRole('button', { name: 'Retirar paradas no disponibles' }));
  expect(JSON.parse(localStorage.getItem(JOURNEY_KEY)!).stops).toEqual([second.id, first.id]);
  expect(screen.queryByRole('button', { name: 'Retirar paradas no disponibles' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: `Subir ${second.title}` })).toBeDisabled();
});
