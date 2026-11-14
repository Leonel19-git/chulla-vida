// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const supabase = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('../../src/lib/supabase', () => ({ getSupabase: () => supabase.client }));

import { AppProvider } from '../../src/context/AppContext';
import { DataProtectionSection } from '../../src/features/privacy-rights/DataProtectionSection';
import { RightsRequestForm } from '../../src/features/privacy-rights/RightsRequestForm';
import { buildRows, emptyRequest, isValidCedulaFormat, validateRequest } from '../../src/features/privacy-rights/rights';

// 1710034065: cédula de ejemplo con dígito verificador correcto (formato, no identidad).
const VALID_CEDULA = '1710034065';
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); supabase.client = null;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const storageText = () => [localStorage, sessionStorage].map(store => Object.keys(store).map(key => `${key}=${store.getItem(key)}`).join('\n')).join('\n');

describe('validación de cédula y solicitud', () => {
  it('valida el dígito verificador y la provincia', () => {
    expect(isValidCedulaFormat(VALID_CEDULA)).toBe(true);
    expect(isValidCedulaFormat('1710034066')).toBe(false);
    expect(isValidCedulaFormat('9910034065')).toBe(false);
    expect(isValidCedulaFormat('171003406')).toBe(false);
  });
  it('exige datos mínimos y declaración', () => {
    const errors = validateRequest(emptyRequest());
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['fullName', 'documentNumber', 'email', 'rights', 'description', 'declaration']));
  });
  it('arma una fila por derecho con solo columnas permitidas y kind válido', () => {
    const draft = { ...emptyRequest(), fullName: 'Ana Quishpe', documentNumber: VALID_CEDULA, email: 'ana@example.com', rights: ['access', 'automated_decisions'] as const, description: 'Quiero saber qué datos tienen.', declaration: true };
    const rows = buildRows({ ...draft, rights: [...draft.rights] }, 'user-1');
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.kind)).toEqual(['access', 'objection']);
    expect(Object.keys(rows[0]).sort()).toEqual(['detail', 'kind', 'subject_id']);
    expect(rows[1].detail).toContain('decisiones automatizadas');
    expect(rows.every(row => row.detail.length <= 4000)).toBe(true);
  });
});

async function fill(user: ReturnType<typeof userEvent.setup>, cedula = VALID_CEDULA) {
  const dialog = screen.getByRole('dialog', { name: 'Ejercer mis derechos sobre mis datos' });
  await user.type(within(dialog).getByLabelText('Nombres y apellidos completos'), 'Ana Quishpe');
  await user.type(within(dialog).getByLabelText('Número de cédula'), cedula);
  await user.type(within(dialog).getByLabelText('Correo para responderte'), 'ana@example.com');
  await user.click(within(dialog).getByRole('checkbox', { name: /^Acceso/ }));
  await user.type(within(dialog).getByLabelText('Descripción de tu solicitud'), 'Quiero saber qué datos míos tienen.');
  await user.click(within(dialog).getByRole('checkbox', { name: /Declaro que la información/ }));
  return dialog;
}

describe('formulario de derechos en línea', () => {
  it('marca la cédula inválida y no envía', async () => {
    const user = userEvent.setup();
    render(<AppProvider><RightsRequestForm onClose={() => {}} /></AppProvider>);
    const dialog = await fill(user, '1710034066');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar solicitud' }));
    expect(within(dialog).getByText(/no coincide con el verificador/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Número de cédula')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).queryByText('Aún no podemos recibirla en línea.')).not.toBeInTheDocument();
  });
  it('con cédula válida dice «formato válido», no identidad verificada', async () => {
    const user = userEvent.setup();
    render(<AppProvider><RightsRequestForm onClose={() => {}} /></AppProvider>);
    await user.type(screen.getByLabelText('Número de cédula'), VALID_CEDULA);
    expect(screen.getByText(/Formato válido .*no confirma tu identidad/)).toBeInTheDocument();
  });
  it('sin Supabase ofrece el resumen y el PDF, y nunca guarda la cédula en el navegador', async () => {
    const user = userEvent.setup();
    render(<AppProvider><RightsRequestForm onClose={() => {}} /></AppProvider>);
    const dialog = await fill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar solicitud' }));
    expect(within(dialog).getByText('Aún no podemos recibirla en línea.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Descargar mi resumen/ })).toBeInTheDocument();
    expect(storageText()).not.toContain(VALID_CEDULA);
  });
  it('con Supabase y sesión inserta en privacy_requests', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    supabase.client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from };
    const user = userEvent.setup();
    render(<AppProvider><RightsRequestForm onClose={() => {}} /></AppProvider>);
    const dialog = await fill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar solicitud' }));
    expect(await within(dialog).findByText('Recibimos tu solicitud.')).toBeInTheDocument();
    expect(from).toHaveBeenCalledWith('privacy_requests');
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ subject_id: 'user-1', kind: 'access' })]);
    expect(storageText()).not.toContain(VALID_CEDULA);
  });
  it('con Supabase sin sesión pide iniciar sesión', async () => {
    supabase.client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() };
    const user = userEvent.setup();
    render(<AppProvider><RightsRequestForm onClose={() => {}} /></AppProvider>);
    const dialog = await fill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar solicitud' }));
    expect(await within(dialog).findByText('Inicia sesión para enviarla en línea.')).toBeInTheDocument();
  });
});

describe('sección «Protección de tus datos personales»', () => {
  it('ofrece las dos descargas en PDF y abre el formulario en línea', async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    window.addEventListener('cv3:privacy-rights', opened);
    render(<DataProtectionSection />);
    expect(screen.getByRole('heading', { name: 'Protección de tus datos personales' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar Aviso de Protección de Datos/ })).toHaveAttribute('href', '/legal/aviso-proteccion-datos-chulla-vida.pdf');
    expect(screen.getByRole('link', { name: /Descargar Formulario de Derechos/ })).toHaveAttribute('download', 'formulario-derechos-datos-chulla-vida.pdf');
    await user.click(screen.getByRole('button', { name: /Llenar el formulario en línea/ }));
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener('cv3:privacy-rights', opened);
  });
});
