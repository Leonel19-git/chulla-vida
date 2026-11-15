// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPanel } from '../../src/features/auth/AuthPanel';
import { WELCOME_KEY } from '../../src/features/onboarding/WelcomeFlow';
import { cardLabel, parsePreferences } from '../../src/features/traveler/profile';

type Row = Record<string, unknown>;
const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string; user_metadata?: Record<string, unknown> } },
  listener: null as null | ((event: string, session: unknown) => void),
  tables: {} as Record<string, Row[]>,
  missingColumns: false,
  updates: [] as { table: string; values: Row; filters: [string, unknown][] }[],
  rpc: vi.fn(),
  signUp: vi.fn(), verifyOtp: vi.fn(), signOut: vi.fn(),
}));

function builder(table: string) {
  const filters: [string, unknown][] = [];
  let columns = '';
  let update: Row | null = null;
  const result = () => {
    if (mocks.missingColumns && table === 'profiles' && (/home_country/.test(columns) || (update && 'home_country' in update))) {
      return { data: null, error: { code: '42703', message: 'column profiles.home_country does not exist' } };
    }
    if (update) { mocks.updates.push({ table, values: update, filters }); return { data: null, error: null }; }
    const rows = (mocks.tables[table] ?? []).filter(row => filters.every(([column, value]) => !(column in row) || row[column] === value));
    return { data: rows, error: null };
  };
  const chain = {
    select: (value: string) => { columns = value; return chain; },
    eq: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
    order: () => chain, limit: () => chain,
    update: (values: Row) => { update = values; return chain; },
    maybeSingle: async () => { const value = result(); return { data: Array.isArray(value.data) ? value.data[0] ?? null : value.data, error: value.error }; },
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
  };
  return chain;
}
const client = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
    onAuthStateChange: vi.fn((listener: (event: string, session: unknown) => void) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
    signUp: mocks.signUp, verifyOtp: mocks.verifyOtp, signOut: mocks.signOut,
    resend: vi.fn(), signInWithPassword: vi.fn(), signInWithOtp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
  },
  rpc: mocks.rpc,
  from: vi.fn((table: string) => builder(table)),
};
vi.mock('../../src/lib/supabase', () => ({
  supabaseConfiguration: () => ({ available: true, url: 'https://example.supabase.co', key: 'public' }),
  getSupabase: () => client,
}));

const traveler = { user: { id: 'viajera-1', email: 'amaru@example.com', user_metadata: { display_name: 'Amaru' } } };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  mocks.session = null; mocks.listener = null; mocks.missingColumns = false; mocks.updates = [];
  mocks.tables = { profiles: [{ id: 'viajera-1', display_name: 'Amaru', home_country: '', home_city: '', travel_preferences: {}, marketing_consent_at: null }] };
  mocks.rpc.mockReset(); mocks.signUp.mockReset(); mocks.verifyOtp.mockReset(); mocks.signOut.mockReset();
  mocks.rpc.mockImplementation(async (name: string, args: Record<string, string>) => name === 'set_buyer_document'
    ? { data: { documentType: args.p_type, last4: args.p_value.slice(-4), formatValid: true, identityVerified: false }, error: null } : { data: 'ok', error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('cuenta de viajero conectada', () => {
  it('con sesión muestra el perfil viajero, sus secciones y deja el negocio plegado', async () => {
    mocks.session = traveler;
    render(<AuthPanel />);
    expect(await screen.findByRole('heading', { name: 'Tu cuenta viajera' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre visible')).toHaveValue('Amaru');
    expect(screen.getByText('Cuenta de viajero')).toBeInTheDocument();
    expect(screen.getByLabelText('País de origen')).toBeInTheDocument();
    expect(screen.getByLabelText('Ciudad de origen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mis compras y reservas' })).toBeInTheDocument();
    expect(await screen.findByText('Todavía no tienes compras ni reservas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorar experiencias/ })).toBeInTheDocument();
    const business = screen.getByText('Representar un negocio o comunidad').closest('details')!;
    expect(business).not.toHaveAttribute('open');
    const passport = vi.fn(); const wallet = vi.fn();
    window.addEventListener('cv3:passport', passport); window.addEventListener('cv3:wallet', wallet);
    fireEvent.click(screen.getByRole('button', { name: /Mi pasaporte/ }));
    fireEvent.click(screen.getByRole('button', { name: /Mi billetera/ }));
    expect(passport).toHaveBeenCalledTimes(1); expect(wallet).toHaveBeenCalledTimes(1);
    window.removeEventListener('cv3:passport', passport); window.removeEventListener('cv3:wallet', wallet);
  });

  it('precarga las preferencias de la bienvenida y guarda el perfil en profiles con su id', async () => {
    localStorage.setItem(WELCOME_KEY, JSON.stringify({ completed: true, path: 'traveler', interests: ['cultura', 'aventura'], budgetTotalUsd: 300, origin: 'Riobamba', travelers: 3, pet: true, updatedAt: '2026-11-14' }));
    mocks.session = traveler;
    const user = userEvent.setup();
    render(<AuthPanel />);
    expect(await screen.findByLabelText('Ciudad de origen')).toHaveValue('Riobamba');
    expect(screen.getByRole('checkbox', { name: 'Cultura y comunidad' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Naturaleza' })).not.toBeChecked();
    expect(screen.getByLabelText('¿Cuántas personas suelen viajar?')).toHaveValue(3);
    await user.type(screen.getByLabelText('País de origen'), 'Ecuador');
    await user.click(screen.getByRole('button', { name: 'Guardar mi perfil' }));
    expect(await screen.findByText('¡Listo! Tu perfil quedó guardado en tu cuenta.')).toBeInTheDocument();
    expect(mocks.updates).toEqual([{ table: 'profiles', filters: [['id', 'viajera-1']], values: {
      display_name: 'Amaru', home_country: 'Ecuador', home_city: 'Riobamba', travel_preferences: { interests: ['cultura', 'aventura'], budgetTotalUsd: 300, travelers: 3, pet: true } } }]);
  });

  it('si el servidor aún no tiene las columnas nuevas, guarda el nombre y lo explica', async () => {
    mocks.missingColumns = true; mocks.session = traveler;
    const user = userEvent.setup();
    render(<AuthPanel />);
    await user.click(await screen.findByRole('button', { name: 'Guardar mi perfil' }));
    expect(await screen.findByText(/Guardamos tu nombre/)).toBeInTheDocument();
    expect(mocks.updates).toEqual([{ table: 'profiles', filters: [['id', 'viajera-1']], values: { display_name: 'Amaru' } }]);
  });

  it('la cédula se envía una vez al servidor, se muestra enmascarada y no queda en el navegador', async () => {
    mocks.session = traveler;
    const user = userEvent.setup();
    render(<AuthPanel />);
    const input = await screen.findByLabelText(/Número de cédula/);
    await user.type(input, '1710034065');
    await user.click(screen.getByRole('button', { name: 'Guardar documento' }));
    expect(mocks.rpc).toHaveBeenCalledWith('set_buyer_document', { p_type: 'cedula', p_value: '1710034065' });
    expect(await screen.findByText('•••• 4065')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Número de cédula/)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('1710034065');
    const stored = [...Object.keys(localStorage).map(key => localStorage.getItem(key)), ...Object.keys(sessionStorage).map(key => sessionStorage.getItem(key))].join('|');
    expect(stored).not.toContain('1710034065');
  });

  it('muestra un documento ya guardado solo con los últimos 4 y el marketing se registra como consentimiento', async () => {
    mocks.session = traveler;
    mocks.tables.buyer_identity_documents = [{ user_id: 'viajera-1', document_type: 'passport', last4: 'X9Z1' }];
    const user = userEvent.setup();
    render(<AuthPanel />);
    expect(await screen.findByText('•••• X9Z1')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /novedades, fiestas y ofertas/ }));
    expect(mocks.rpc).toHaveBeenCalledWith('record_consent', expect.objectContaining({ p_category: 'email_marketing', p_granted: true, p_method: 'settings' }));
    expect(await screen.findByText(/Te escribiremos con novedades/)).toBeInTheDocument();
  });

  it('lista reservas propias con estado y la tarjeta usada (marca y últimos 4)', async () => {
    mocks.session = traveler;
    mocks.tables.bookings = [{ id: 'b1', code: 'CV-1234567890', experience_id: 'quilotoa', status: 'paid', participants: 2, total_amount: '48.50', currency: 'USD', created_at: '2026-11-14' }];
    mocks.tables.payments = [{ id: 'p1', booking_id: 'b1', amount: '48.50', currency: 'USD', status: 'captured', card_brand: 'VISA', card_last4: '4242', environment: 'sandbox', created_at: '2026-11-14' }];
    render(<AuthPanel />);
    const section = (await screen.findByRole('heading', { name: 'Mis compras y reservas' })).closest('section')!;
    await waitFor(() => expect(within(section).getByText('Pagada')).toBeInTheDocument());
    expect(section).toHaveTextContent('Reserva CV-1234567890 · 2 personas');
    expect(section).toHaveTextContent('Visa •••• 4242');
    expect(section).toHaveTextContent('entorno de pruebas');
    expect(screen.queryByText('Todavía no tienes compras ni reservas.')).not.toBeInTheDocument();
  });
});

describe('registro que termina en el perfil', () => {
  it('después del código correcto abre el perfil con un mensaje de bienvenida', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: 'viajera-1' }, session: null }, error: null });
    mocks.verifyOtp.mockImplementation(async () => { mocks.listener?.('SIGNED_IN', traveler); return { data: { session: traveler }, error: null }; });
    const user = userEvent.setup();
    render(<AuthPanel initialTab="signup" />);
    expect(screen.getByRole('heading', { name: 'Entrar / Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByLabelText('Cómo te llamas'), 'Amaru');
    await user.type(screen.getByLabelText('Correo electrónico'), 'amaru@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'montaña-verde-2026');
    expect(screen.getByText('Una letra mayúscula (A-Z)')).toHaveTextContent(/pendiente/);
    expect(screen.getByRole('button', { name: 'Crear cuenta y recibir código' })).toBeDisabled();
    await user.clear(screen.getByLabelText('Contraseña'));
    await user.type(screen.getByLabelText('Contraseña'), 'Montaña-Verde-2026');
    await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
    await screen.findByRole('heading', { name: 'Te enviamos un código a tu correo' });
    fireEvent.paste(screen.getAllByLabelText(/Dígito \d de 6/)[0], { clipboardData: { getData: () => '123456' } });
    expect(await screen.findByText('¡Qué bacán tenerte aquí, Amaru!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu cuenta viajera' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre visible')).toHaveValue('Amaru');
  });

  it('traduce weak_password, límite de correos, correo inválido y usuario existente en el registro', async () => {
    const user = userEvent.setup();
    render(<AuthPanel initialTab="signup" />);
    await user.type(screen.getByLabelText('Cómo te llamas'), 'Amaru');
    await user.type(screen.getByLabelText('Correo electrónico'), 'amaru@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Montaña-Verde-2026');
    await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    const cases: [Row, RegExp][] = [
      [{ code: 'weak_password', status: 422, reasons: ['pwned'], name: 'AuthWeakPasswordError', message: 'raw' }, /filtraciones/],
      [{ code: 'over_email_send_rate_limit', status: 429, message: 'raw' }, /varios correos seguidos/],
      [{ code: 'email_address_invalid', status: 400, message: 'raw' }, /No podemos enviar el código a ese correo/],
      [{ code: 'user_already_exists', status: 422, message: 'raw' }, /ya tiene una cuenta/],
    ];
    for (const [error, text] of cases) {
      mocks.signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error });
      await user.click(screen.getByRole('button', { name: 'Crear cuenta y recibir código' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(screen.getByRole('alert')).not.toHaveTextContent('raw');
    }
  });
});

describe('utilidades del perfil', () => {
  it('rotula la tarjeta sin exponer más que marca y últimos 4, y valida preferencias del servidor', () => {
    expect(cardLabel('mastercard', '5100')).toBe('Mastercard •••• 5100');
    expect(cardLabel(null, '1234')).toBe('Tarjeta •••• 1234');
    expect(cardLabel('visa', '4111111111111111')).toBeNull();
    expect(parsePreferences({ interests: ['cultura', 'hackeo'], travelers: 99, budgetTotalUsd: -1 })).toEqual({ interests: ['cultura'], budgetTotalUsd: null, travelers: 1, pet: false });
    expect(parsePreferences([])).toBeNull();
  });
});
