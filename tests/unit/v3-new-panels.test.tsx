// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AppProvider } from '../../src/context/AppContext';
import { EXPERIENCES } from '../../src/domain/catalog';
import { WelcomeFlow, readTravelPreferences, WELCOME_KEY } from '../../src/features/onboarding/WelcomeFlow';
import { HostHub, DOCS_BY_FIGURE } from '../../src/features/host/HostHub';
import { MoneyFlow } from '../../src/features/transparency/MoneyFlow';
import { experienceArt, experienceVisual } from '../../src/features/catalog/experienceArt';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllEnvs());
const withoutSupabase = () => { vi.stubEnv('VITE_SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', ''); vi.stubEnv('VITE_SUPABASE_ANON_KEY', ''); };
const wrap = (node: ReactNode) => render(<AppProvider>{node}</AppProvider>);

describe('Bienvenida de doble entrada', () => {
  it('«Solo quiero explorar» cierra y persiste sin pedir datos', () => {
    let closed = false;
    wrap(<WelcomeFlow onClose={() => { closed = true; }} />);
    fireEvent.click(screen.getByRole('button', { name: /Solo quiero explorar/ }));
    expect(closed).toBe(true);
    expect(readTravelPreferences()).toMatchObject({ completed: true, path: 'explore', budgetTotalUsd: null });
  });
  it('camino viajero guarda intereses, presupuesto total y mascota', () => {
    wrap(<WelcomeFlow onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Soy viajero/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Naturaleza' }));
    expect(screen.getByRole('button', { name: 'Naturaleza' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.change(screen.getByLabelText(/Presupuesto total/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Desde dónde sales/), { target: { value: 'Quito' } });
    fireEvent.click(screen.getByLabelText(/Viajo con mascota/));
    expect(screen.getByText(/Galápagos y otras áreas protegidas no se admiten mascotas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Omitir/ }));
    expect(readTravelPreferences()).toMatchObject({ path: 'traveler', interests: ['naturaleza'], budgetTotalUsd: 100, origin: 'Quito', pet: true });
  });
  it('camino anfitrión explica la revisión humana y no promete aval del Gobierno', () => {
    wrap(<WelcomeFlow onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Tengo un negocio/ }));
    expect(screen.getByText(/no es un aval del Gobierno/)).toBeInTheDocument();
  });
  it('ignora preferencias corruptas', () => {
    localStorage.setItem(WELCOME_KEY, '{"completed":"sí"}');
    expect(readTravelPreferences()).toBeNull();
  });
});

describe('Espacio de anfitriones', () => {
  it('pide documentos distintos según la figura', () => {
    expect(DOCS_BY_FIGURE.asociacion.documents).not.toEqual(DOCS_BY_FIGURE.guia.documents);
    wrap(<HostHub onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Tu figura'), { target: { value: 'guia' } });
    expect(screen.getByText(/Credencial o licencia de guía/)).toBeInTheDocument();
  });
  it('la solicitud de demostración queda en revisión y nunca se aprueba sola', () => {
    withoutSupabase();
    wrap(<HostHub onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Nombre del emprendimiento/), { target: { value: 'Turismo Comunitario Prueba' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar solicitud de demostración/ }));
    const queue = screen.getByRole('list', { name: /Solicitudes de demostración/ });
    expect(within(queue).getByText(/En revisión · demostración/)).toBeInTheDocument();
    expect(screen.queryByText(/aprobad/i)).toBeNull();
    expect(localStorage.getItem('chullavida:v3:host-demo-requests')).toContain('"en_revision"');
  });
});

describe('¿Cómo se distribuye tu dinero?', () => {
  it('sin convenio muestra el texto pendiente y ningún porcentaje fuera del ejemplo', () => {
    const { container } = wrap(<MoneyFlow experience={EXPERIENCES[0]} />);
    expect(screen.getByText(/Distribución pendiente de validar con la comunidad; no disponible para compra/)).toBeInTheDocument();
    const outsideExample = [...container.querySelectorAll('section > *:not(details)')].map(node => node.textContent).join(' ');
    expect(outsideExample).not.toMatch(/%/);
  });
  it('el ejemplo ilustrativo cuadra al centavo', () => {
    const { container } = wrap(<MoneyFlow experience={EXPERIENCES[0]} />);
    fireEvent.change(screen.getByLabelText(/Monto cobrado/), { target: { value: '33.33' } });
    const total = container.querySelector('details tfoot td:last-child')?.textContent;
    expect(total).toBe('$33.33');
    expect(screen.getByText(/no es un convenio real/)).toBeInTheDocument();
  });
});

describe('Ilustraciones por ficha', () => {
  it('cada ficha sin foto propia tiene una ilustración distinta y rotulada', () => {
    const drawn = EXPERIENCES.filter(item => !item.media.some(media => media.depictsThisPlace));
    const sources = new Set(drawn.map(item => experienceArt(item)));
    expect(sources.size).toBe(drawn.length);
    for (const item of drawn) expect(experienceVisual(item)).toMatchObject({ photo: false, alt: expect.stringMatching(/no es una fotografía/) });
  });
  it('la fotografía solo se usa cuando muestra el lugar', () => {
    const withPhoto = EXPERIENCES.filter(item => item.media.some(media => media.depictsThisPlace));
    expect(withPhoto.length).toBeGreaterThan(0);
    for (const item of withPhoto) expect(experienceVisual(item).photo).toBe(true);
  });
});
describe('fotos reales con srcset', () => {
  it('deduce la versión de 1280 px solo para fotos por ficha y conserva el crédito', async () => {
    const { largePhotoFor } = await import('../../src/features/catalog/experienceArt');
    expect(largePhotoFor({ src: '/images/places/gen-08-cuenca-640.webp' })).toBe('/images/places/gen-08-cuenca-1280.webp');
    expect(largePhotoFor({ src: '/images/andes-640.webp' })).toBeUndefined();
    expect(largePhotoFor({ src: '/images/coast.jpg', srcLarge: '/images/coast-1280.webp' })).toBe('/images/coast-1280.webp');
    const base = EXPERIENCES[0]!;
    const visual = experienceVisual({ ...base, media: [{ src: '/images/places/x-640.webp', alt: 'Plaza', credit: 'Autora', license: 'CC BY 4.0', depictsThisPlace: true }] });
    expect(visual).toMatchObject({ photo: true, srcSet: '/images/places/x-640.webp 640w, /images/places/x-1280.webp 1280w', credit: 'Autora · CC BY 4.0' });
  });
});
