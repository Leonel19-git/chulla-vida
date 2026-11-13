// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { experiences } from '../../src/domain/catalog';
import { editableFields, makeEditorialDraft } from '../../src/domain/editorial';
import { EditorialPanel } from '../../src/features/cms/EditorialPanel';
import { readLocalEditorialDrafts, saveLocalEditorialDraft } from '../../src/features/cms/api';

vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => null, supabaseConfiguration: () => ({ available: false }) }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('permite escribir nuevas líneas y guarda listas limpias sin publicar', async () => {
  const user = userEvent.setup();
  render(<EditorialPanel />);
  const activities = screen.getByLabelText('Actividades · una por línea');
  await user.clear(activities);
  await user.type(activities, 'Caminata{Enter}Visita cultural{Enter}');
  expect(activities).toHaveValue('Caminata\nVisita cultural\n');
  await user.click(screen.getByRole('button', { name: 'Precios' }));
  const includes = screen.getByLabelText('Incluye · una línea por servicio');
  const excludes = screen.getByLabelText('No incluye · una línea por concepto');
  await user.clear(includes); await user.type(includes, 'Guía{Enter}Equipo{Enter}');
  await user.clear(excludes); await user.type(excludes, 'Transporte{Enter}Comidas{Enter}');
  expect(includes).toHaveValue('Guía\nEquipo\n');
  expect(excludes).toHaveValue('Transporte\nComidas\n');
  await user.click(screen.getByRole('button', { name: 'Guardar borrador local' }));
  expect(readLocalEditorialDrafts()[0].fields).toMatchObject({ activities: ['Caminata', 'Visita cultural'], price: { includes: ['Guía', 'Equipo'], excludes: ['Transporte', 'Comidas'] } });
  expect(screen.getByRole('status')).toHaveTextContent('No se publicó');
});

it('recupera el primer borrador y su fuente al volver a abrir el estudio', () => {
  const first = experiences[0];
  const fields = { ...editableFields(first), title: 'Mi revisión guardada', activities: ['Actividad conservada'] };
  const note = 'Fuente y motivo de revisión guardados en el navegador.';
  saveLocalEditorialDraft(makeEditorialDraft(first, fields, note));
  render(<EditorialPanel />);
  expect(screen.getByLabelText('Título')).toHaveValue('Mi revisión guardada');
  expect(screen.getByLabelText('Actividades · una por línea')).toHaveValue('Actividad conservada');
  expect(screen.getByLabelText('Fuente y motivo de la revisión · no incluyas datos privados')).toHaveValue(note);
});
