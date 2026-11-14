// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../../src/context/AppContext';
import { CONSENT_KEY, LEGACY_CONSENT_KEY } from '../../src/domain/consent';
import { ConsentProvider, useConsent } from '../../src/features/privacy/ConsentContext';
import { ConsentMedia } from '../../src/features/privacy/ConsentMedia';
import { PrivacyControls } from '../../src/features/privacy/PrivacyControls';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => cleanup());

function OpenEditor() { const { open } = useConsent(); return <button onClick={open}>Privacidad y cookies</button>; }
function Page() {
  return <AppProvider><ConsentProvider><OpenEditor /><ConsentMedia><iframe title="Reproductor externo" src="https://open.spotify.com/embed/test" /></ConsentMedia><PrivacyControls /></ConsentProvider></AppProvider>;
}
const stored = () => JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
const banner = () => screen.getByRole('region', { name: 'Tus datos son tuyos' });

describe('banner de privacidad por niveles', () => {
  it('muestra tres niveles de igual peso, ninguno marcado y sin cargar contenido externo', () => {
    render(<Page />);
    const radios = within(banner()).getAllByRole('radio');
    expect(radios.map(radio => radio.closest('label')?.querySelector('strong')?.textContent)).toEqual(['Privado', 'Equilibrado', 'Personalizado']);
    expect(radios.every(radio => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
  });
  it('pide elegir antes de guardar', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(screen.getByText('Elige uno de los tres niveles para continuar.')).toBeInTheDocument();
    expect(stored()).toBeNull();
  });
  it('Privado guarda solo lo necesario y mantiene bloqueado Spotify', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(within(banner()).getByRole('radio', { name: /^Privado/ }));
    await user.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(stored()).toMatchObject({ version: 2, level: 'private', media: false, personalization: false, analytics: false, marketing: false, method: 'banner' });
    expect(screen.queryByRole('region', { name: 'Tus datos son tuyos' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
    expect(screen.getByText(/bloqueado porque el contenido externo no está permitido/)).toBeInTheDocument();
  });
  it('Equilibrado permite el contenido externo y nada más', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(within(banner()).getByRole('radio', { name: /^Equilibrado/ }));
    await user.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(stored()).toMatchObject({ level: 'balanced', media: true, personalization: false, analytics: false, marketing: false });
    expect(screen.getByTitle('Reproductor externo')).toBeInTheDocument();
  });
  it('Personalizado abre el editor sin opcionales premarcados y con analítica y marketing desconectadas', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(within(banner()).getByRole('radio', { name: /^Personalizado/ }));
    const dialog = screen.getByRole('dialog', { name: 'Privacidad y cookies' });
    const switches = within(dialog).getAllByRole('switch') as HTMLInputElement[];
    const byName = (name: string) => switches.find(item => item.closest('label')?.textContent?.startsWith(name))!;
    expect(byName('Necesarias')).toBeChecked(); expect(byName('Necesarias')).toBeDisabled();
    expect(byName('Contenido externo')).not.toBeChecked();
    expect(byName('Personalización')).not.toBeChecked();
    expect(byName('Analítica')).not.toBeChecked(); expect(byName('Analítica')).toBeDisabled();
    expect(byName('Marketing')).not.toBeChecked(); expect(byName('Marketing')).toBeDisabled();
    expect(within(dialog).getAllByText('No conectada')).toHaveLength(2);
    await user.click(byName('Personalización'));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar mi elección' }));
    expect(stored()).toMatchObject({ level: 'custom', personalization: true, media: false });
    expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
  });
  it('revocar desde «Privacidad y cookies» retira el contenido externo al instante', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(within(banner()).getByRole('radio', { name: /^Equilibrado/ }));
    await user.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(screen.getByTitle('Reproductor externo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Privacidad y cookies' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Privacidad y cookies' })).getByRole('button', { name: 'Retirar permisos opcionales' }));
    expect(stored()).toMatchObject({ level: 'private', media: false, method: 'revoke' });
    expect(screen.queryByTitle('Reproductor externo')).not.toBeInTheDocument();
  });
  it('migra la preferencia guardada por la versión 3.0 sin volver a mostrar el banner', () => {
    localStorage.setItem(LEGACY_CONSENT_KEY, JSON.stringify({ version: 1, essential: true, media: true, analytics: false, marketing: false, updatedAt: '2026-11-01T00:00:00.000Z' }));
    render(<Page />);
    expect(screen.queryByRole('region', { name: 'Tus datos son tuyos' })).not.toBeInTheDocument();
    expect(screen.getByTitle('Reproductor externo')).toBeInTheDocument();
    expect(stored()).toMatchObject({ level: 'balanced', method: 'migration' });
    expect(localStorage.getItem(LEGACY_CONSENT_KEY)).toBeNull();
  });
});
