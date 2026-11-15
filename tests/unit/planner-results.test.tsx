// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { experiences, type Experience } from '../../src/domain/catalog';
import { JOURNEY_KEY, newJourney } from '../../src/domain/itinerary';
import { petCandidates, petInquiryTemplate, petLabel, suggestRelaxations } from '../../src/domain/planner';
import { PlannerDialog } from '../../src/features/planner/PlannerDialog';
import { AppProvider } from '../../src/context/AppContext';

const catalog = vi.hoisted(() => ({ records: [] as Experience[] }));
vi.mock('../../src/features/catalog/CatalogContext', () => ({ useCatalog: () => ({ records: catalog.records, online: true }) }));
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  catalog.records = [...experiences];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const input = { origin: 'Quito', budgetTotal: 20, people: 1, maxHours: 24 };
describe('planificador sin callejones sin salida (dominio)', () => {
  it('mascotas: etiqueta honesta, nunca un sello inventado', () => {
    const labels = new Set(experiences.map(item => petLabel(item).label));
    expect(labels.has('Política confirmada')).toBe(false);
    const galapagos = experiences.find(item => item.localizedRegion === 'galapagos')!;
    expect(petLabel(galapagos)).toMatchObject({ label: 'No admite en áreas protegidas', canAsk: false });
    const ask = experiences.find(item => item.petPolicy.status === 'ask_conditions')!;
    expect(petLabel(ask).label).toBe('Consultar condiciones');
    const list = petCandidates({ ...input, budgetTotal: 100, pet: { species: 'perro', count: 1 } }, experiences);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(item => ['Consultar condiciones', 'No verificado', 'No admite en áreas protegidas', 'No admite mascotas'].includes(item.label))).toBe(true);
    expect(petInquiryTemplate(ask, { people: 2, date: '2026-12-01', origin: 'Quito' })).toMatch(/¿Se admiten mascotas\?/);
  });
  it('Galápagos con USD 20: muestra lo más cercano y propone relajar región o presupuesto', () => {
    const { nearest, relaxations } = suggestRelaxations({ ...input, region: 'galapagos' }, experiences);
    expect(nearest).toHaveLength(3);
    expect(nearest[0].option.experience.localizedRegion).toBe('galapagos');
    expect(nearest[0].blockers.join(' ')).toMatch(/Te faltan USD/);
    expect(relaxations.map(item => item.kind)).toEqual(expect.arrayContaining(['budget', 'region']));
    expect(relaxations.find(item => item.kind === 'region' && item.value === '')).toBeTruthy();
  });
  it('presupuesto mínimo: sugiere el monto exacto que abre opciones, solo con precios USD', () => {
    const { relaxations } = suggestRelaxations({ ...input, budgetTotal: 1 }, experiences);
    const budget = relaxations.find(item => item.kind === 'budget')!;
    expect(budget.value).toBeGreaterThan(1);
    expect(budget.detail).toMatch(/sin traslados/);
  });
  it('pocos días: propone cuántos días hacen falta', () => {
    const multi = experiences.filter(item => (item.duration.days ?? 0) >= 2 && item.price.currency === 'USD' && item.localizedRegion !== 'galapagos');
    const { relaxations } = suggestRelaxations({ ...input, budgetTotal: 5000, maxHours: 1 }, multi);
    expect(relaxations.find(item => item.kind === 'days')?.value).toBeGreaterThanOrEqual(2);
  });
});

const renderPlanner = () => render(<AppProvider><PlannerDialog onClose={vi.fn()} onSelect={vi.fn()} /></AppProvider>);
const search = () => fireEvent.click(screen.getByRole('button', { name: /Buscar ideas que encajen/ }));
describe('planificador visual', () => {
  it('con mascota lista fichas con foto real, etiqueta y «Preguntar al anfitrión» con plantilla', async () => {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), budget: 100, days: 2 }));
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPlanner();
    fireEvent.click(screen.getByLabelText(/Viajo con mi perro/));
    search();
    expect(screen.queryByText(/No encontramos políticas de mascotas confirmadas/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Viajar con tu perro, con honestidad/ })).toBeInTheDocument();
    expect(screen.queryByText(/pet[- ]friendly/i)).not.toBeInTheDocument();
    const cards = document.querySelectorAll('.flex-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].querySelector('img')?.getAttribute('src')).toMatch(/^\/images\/places\/.+-640\.webp$/);
    expect(screen.getAllByText(/Consultar condiciones|No verificado/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /Preguntar al anfitrión/ })[0]);
    expect((screen.getByLabelText(/Tu consulta, lista para enviar/) as HTMLTextAreaElement).value).toMatch(/¿Se admiten mascotas\?/);
    fireEvent.click(screen.getByRole('button', { name: /Copiar consulta/ }));
    expect(await screen.findByText(/Consulta copiada/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalled();
    expect(screen.getByText(/Para que tu perro también la pase bien/)).toBeInTheDocument();
  });
  it('si nada encaja ofrece botones de un toque que relajan la restricción y vuelve a buscar', () => {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...newJourney(), budget: 1 }));
    renderPlanner();
    search();
    expect(screen.queryByText('Ajustemos el punto de partida')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pero hay salida/ })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Qué puedes ajustar' });
    const raise = within(group).getByRole('button', { name: /Subir a USD/ });
    const value = Number(/USD (\d+)/.exec(raise.textContent!)![1]);
    fireEvent.click(raise);
    expect(JSON.parse(localStorage.getItem(JOURNEY_KEY)!).budget).toBe(value);
    expect(screen.getByRole('heading', { name: 'Para empezar tu recorrido' })).toBeInTheDocument();
    expect(screen.getAllByText(/de experiencia para 1 persona/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Falta sumar: transporte ida y vuelta/).length).toBeGreaterThan(0);
  });
  it('Galápagos con USD 20 permite pasar a todo Ecuador con un toque', () => {
    renderPlanner();
    fireEvent.change(screen.getByLabelText('Región'), { target: { value: 'galapagos' } });
    search();
    fireEvent.click(screen.getByRole('button', { name: /Buscar en todo Ecuador/ }));
    expect(screen.getByLabelText('Región')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Para empezar tu recorrido' })).toBeInTheDocument();
  });
  it('ofrece «Descargar mi viaje (HTML)» además del borrador de texto', () => {
    renderPlanner();
    expect(screen.getByRole('button', { name: /Descargar mi viaje \(HTML\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar mi borrador' })).toBeInTheDocument();
  });
});
