// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../src/context/AppContext';
import { CONSENT_KEY } from '../../src/domain/consent';
import { ConsentProvider } from '../../src/features/privacy/ConsentContext';
import { PrivacyControls } from '../../src/features/privacy/PrivacyControls';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const Page = () => <AppProvider><ConsentProvider><PrivacyControls /></ConsentProvider></AppProvider>;
const banner = () => screen.getByRole('region', { name: 'Tus datos son tuyos' });

describe('banner de privacidad compacto', () => {
  it('es una barra breve: tres segmentos de igual peso, guardar y detalles plegados', () => {
    render(<Page />);
    const group = within(banner()).getByRole('radiogroup', { name: 'Nivel de acceso a tus datos' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.map(radio => radio.closest('label')?.className)).toEqual(['consent-segment ', 'consent-segment ', 'consent-segment ']);
    expect(radios.every(radio => !(radio as HTMLInputElement).checked)).toBe(true);
    const details = banner().querySelector('details')!;
    expect(details.open).toBe(false);
    expect(within(details).getByText('¿Qué incluye cada nivel?')).toBeInTheDocument();
    // El texto visible es corto: los detalles de cada nivel no se leen hasta abrir el desplegable.
    const intro = banner().querySelector('.consent-bar-intro p')!.textContent ?? '';
    expect(intro.length).toBeLessThan(140);
  });
  it('al elegir un nivel muestra su resumen y lo guarda con «Guardar mi elección»', () => {
    render(<Page />);
    fireEvent.click(within(banner()).getByRole('radio', { name: /^Equilibrado/ }));
    expect(banner().querySelector('.consent-hint')).toHaveTextContent(/contenido externo que tú decidas abrir/);
    expect(within(banner()).getByRole('radio', { name: /^Equilibrado/ }).closest('label')).toHaveClass('is-selected');
    fireEvent.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null')).toMatchObject({ level: 'balanced', method: 'banner' });
    expect(screen.queryByRole('region', { name: 'Tus datos son tuyos' })).not.toBeInTheDocument();
  });
  it('publica su alto para que MIJIN se coloque encima y lo retira al guardar', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 600, 1000, 132));
    render(<Page />);
    expect(document.documentElement.style.getPropertyValue('--cv-consent-h')).toBe('132px');
    fireEvent.click(within(banner()).getByRole('radio', { name: /^Privado/ }));
    fireEvent.click(within(banner()).getByRole('button', { name: 'Guardar mi elección' }));
    expect(document.documentElement.style.getPropertyValue('--cv-consent-h')).toBe('');
  });
  it('la hoja de estilos sube a MIJIN en vez de ocultarlo y define la barra compacta', () => {
    const css = readFileSync('src/features/privacy/privacy.css', 'utf8');
    expect(css).toContain('body:has(.privacy-banner) .mijin-launcher{bottom:calc(var(--cv-consent-h,0px) + 28px)}');
    expect(css).not.toMatch(/\.mijin-launcher\{visibility:hidden\}/);
    expect(css).toMatch(/\.consent-segments\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
    expect(css).toMatch(/@keyframes cv-consent-rise\{from\{opacity:\.9/);
  });
});
