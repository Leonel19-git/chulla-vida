// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CULTURAL_EVENTS,
  CULTURAL_EVENT_MORE,
  CULTURAL_EVENT_SEED,
  CULTURE_CARDS,
  CULTURE_PHOTOS,
  getCultureCard,
  getCultureCards,
  getThisMonthCards,
} from '../../src/domain/culture';
import { CultureCarousel } from '../../src/features/culture/CultureCarousel';
import { CultureViva } from '../../src/features/culture/CultureViva';

const root = resolve(__dirname, '..', '..');
const ALLOWED_LICENSE = /^(public domain|cc0|cc by(-sa)? \d\.\d( [a-z]{2})?)$/i;
interface Entry { id: string; file: string; pageUrl: string; author: string; license: string; alt: string; src: string; srcLarge: string; depicts: string }
const registry = JSON.parse(readFileSync(join(root, 'scripts', 'culture-images.json'), 'utf8')) as Entry[];
const credits = readFileSync(join(root, 'public', 'images', 'CREDITS.md'), 'utf8');
/** Mediodía de Ecuador continental. */
const noon = (day: string) => new Date(`${day}T17:00:00Z`);

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Cultura Viva: más fiestas, cada una con fuente', () => {
  it('suma al menos 20 fiestas reales a las 10 de la especificación, en las cuatro regiones', () => {
    expect(CULTURAL_EVENT_SEED).toHaveLength(10);
    expect(CULTURAL_EVENT_MORE.length).toBeGreaterThanOrEqual(20);
    expect(CULTURAL_EVENTS).toHaveLength(CULTURAL_EVENT_SEED.length + CULTURAL_EVENT_MORE.length);
    expect(new Set(CULTURAL_EVENTS.map(event => event.id)).size).toBe(CULTURAL_EVENTS.length);
    for (const region of ['sierra', 'costa', 'amazonia', 'galapagos'] as const) {
      expect(CULTURAL_EVENT_MORE.some(event => event.region === region), region).toBe(true);
    }
  });

  it('cada fiesta tiene carta con fuente consultada, fecha de revisión y textos cortos', () => {
    for (const event of CULTURAL_EVENTS) {
      const info = CULTURE_CARDS[event.id];
      expect(info, event.id).toBeDefined();
      expect(info.source.url).toMatch(/^https:\/\/[^\s]+$/);
      expect(info.source.publisher.length).toBeGreaterThan(2);
      expect(info.source.checkedAt).toMatch(/^2026-11-1\d$/);
      expect(info.what.length, event.id).toBeLessThanOrEqual(90);
      expect(new Set(info.respect).size).toBe(3);
    }
    expect(Object.keys(CULTURE_CARDS).sort()).toEqual(CULTURAL_EVENTS.map(event => event.id).sort());
    expect(CULTURE_CARDS['marimba-esmeraldas'].source.url).toMatch(/^https:\/\/ich\.unesco\.org\//);
  });

  it('las fiestas nuevas no inventan fechas ni enlaces oficiales', () => {
    for (const event of CULTURAL_EVENT_MORE) {
      expect(event.officialUrl).toBeNull();
      for (const edition of event.editions) {
        expect(edition.startDate).toBeNull();
        expect(edition.sourceUrl).toBeNull();
        expect(edition.confirmation).not.toBe('confirmed_official');
      }
      expect(event.description.length).toBeLessThanOrEqual(200);
      for (const protocol of event.protocols) expect(protocol.length).toBeLessThanOrEqual(110);
    }
  });

  it('distingue los cuatro raymis y deja la fecha de las ceremonias a la comunidad', () => {
    expect(CULTURAL_EVENTS.filter(event => event.category === 'raymi').map(event => [event.id, event.usualMonths])).toEqual([
      ['inti-raymi', [6]],
      ['pawkar-raymi', [3]],
      ['kulla-raymi', [9]],
      ['kapak-raymi', [12]],
    ]);
    for (const id of ['kulla-raymi', 'kapak-raymi', 'nino-jista']) {
      expect(CULTURAL_EVENTS.find(event => event.id === id)!.editions[0].confirmation).toBe('community_defined');
    }
  });
});

describe('Cultura Viva: fotos con licencia libre', () => {
  it('el registro solo trae licencias permitidas, autor, página de Commons y archivos WebP presentes', () => {
    expect(registry.length).toBeGreaterThanOrEqual(15);
    for (const entry of registry) {
      expect(entry.license, entry.id).toMatch(ALLOWED_LICENSE);
      expect(entry.author.trim().length).toBeGreaterThan(1);
      expect(entry.pageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(['fiesta', 'lugar']).toContain(entry.depicts);
      expect(entry.alt.length).toBeGreaterThan(10);
      for (const src of [entry.src, entry.srcLarge]) {
        expect(src).toMatch(new RegExp(`^/images/culture/${entry.id}-(640|1280)\\.webp$`));
        const path = join(root, 'public', src.slice(1));
        expect(existsSync(path), src).toBe(true);
        expect(readFileSync(path).subarray(8, 12).toString('ascii')).toBe('WEBP');
      }
      expect(credits).toContain(entry.pageUrl);
      expect(CULTURE_PHOTOS[entry.id]).toMatchObject({ src: entry.src, license: entry.license, author: entry.author });
    }
    expect(Object.keys(CULTURE_PHOTOS).sort()).toEqual(registry.map(entry => entry.id).sort());
  });

  it('las ceremonias comunitarias nunca llevan foto', () => {
    for (const event of CULTURAL_EVENTS.filter(item => item.sensitive)) {
      expect(CULTURE_PHOTOS[event.id]).toBeUndefined();
      expect(getCultureCard(event).photo).toBeNull();
    }
    expect(CULTURAL_EVENTS.filter(item => item.sensitive).map(item => item.id)).toEqual(['kasama', 'fiesta-chonta', 'nino-jista']);
  });
});

describe('Cultura Viva: filtros', () => {
  it('filtra por mes y región y ordena por calendario', () => {
    expect(getCultureCards({ month: 1 }).map(card => card.event.id)).toEqual(['diablada-pillaro']);
    expect(getCultureCards({ region: 'galapagos' }).map(card => card.event.id)).toEqual(['provincializacion-galapagos', 'cantonizacion-isabela']);
    expect(getCultureCards({ month: 10, region: 'costa' }).map(card => card.event.id)).toEqual(['rodeo-montuvio', 'independencia-guayaquil']);
    const months = getCultureCards().map(card => Math.min(...(card.event.usualMonths.length ? card.event.usualMonths : [13])));
    expect(months).toEqual([...months].sort((a, b) => a - b));
    expect(getCultureCards()).toHaveLength(CULTURAL_EVENTS.length);
  });

  it('«Este mes» usa el mes de Ecuador', () => {
    const november = getThisMonthCards(noon('2026-11-15'));
    expect(november.month).toBe(11);
    expect(november.cards.map(card => card.event.id)).toEqual(expect.arrayContaining(['dia-difuntos', 'virgen-quinche', 'fiestas-cuenca', 'artes-vivas-loja']));
    // 31 de diciembre a las 20:00 en Ecuador ya es 1 de enero en UTC.
    expect(getThisMonthCards(new Date('2027-01-01T01:00:00Z')).month).toBe(12);
  });
});

describe('Cultura Viva: cartas que giran', () => {
  it('la carta es un botón con aria-pressed; al tocarla se gira y el reverso queda disponible', async () => {
    const user = userEvent.setup();
    const cards = getCultureCards({ month: 1 });
    render(<CultureCarousel cards={cards} label="Prueba" now={noon('2026-11-15')} />);
    const front = screen.getByRole('button', { name: /Diablada de Píllaro.*Toca para ver detalles/ });
    expect(front).toHaveAttribute('aria-pressed', 'false');
    const back = screen.getByRole('group', { hidden: true, name: 'Detalles de Diablada de Píllaro' });
    expect(back).toHaveAttribute('inert');

    await user.click(front);
    expect(front).toHaveAttribute('aria-pressed', 'true');
    expect(front).toHaveAttribute('inert');
    expect(back).not.toHaveAttribute('inert');
    expect(within(back).getByText('1–6 de enero')).toBeInTheDocument();
    expect(within(back).getByText('Pide permiso para fotos')).toBeInTheDocument();
    expect(within(back).getByRole('link', { name: /El Universo/ })).toHaveAttribute('href', CULTURE_CARDS['diablada-pillaro'].source.url);
    expect(within(back).getByRole('button', { name: 'Ver experiencias cercanas' })).toBeInTheDocument();
    expect(screen.getByText('Detalles de Diablada de Píllaro')).toHaveAttribute('aria-live', 'polite');

    await user.click(within(back).getByRole('button', { name: /Volver a la foto/ }));
    expect(front).toHaveAttribute('aria-pressed', 'false');
    expect(back).toHaveAttribute('inert');
  });

  it('una ficha sin foto muestra la ilustración rotulada y lo dice en el crédito', async () => {
    const user = userEvent.setup();
    const kasama = getCultureCards({ region: 'costa' }).filter(card => card.event.id === 'kasama');
    render(<CultureCarousel cards={kasama} label="Prueba" now={noon('2026-11-15')} />);
    expect(screen.getByText('Ilustración · sin fotos por respeto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Kasama.*Toca para ver detalles/ }));
    expect(screen.getByText(/Imagen: ilustración propia/)).toBeInTheDocument();
    expect(screen.getByText('Solo con invitación')).toBeInTheDocument();
  });

  it('«Ver experiencias cercanas» abre la experiencia relacionada', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const yamor = getCultureCards({ month: 9 }).filter(card => card.event.id === 'yamor');
    render(<CultureCarousel cards={yamor} label="Prueba" now={noon('2026-11-15')} onOpenExperience={onOpen} />);
    await user.click(screen.getByRole('button', { name: /Fiesta del Yamor.*Toca para ver detalles/ }));
    await user.click(screen.getByRole('button', { name: 'Ver experiencias cercanas' }));
    expect(onOpen).toHaveBeenCalledWith('gen-10-otavalo');
  });

  it('la vista muestra «Este mes» y filtra con chips', async () => {
    const user = userEvent.setup();
    render(<CultureViva now={noon('2026-11-15')} />);
    expect(screen.getByRole('heading', { name: /Este mes · noviembre/ })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Fiestas de noviembre' })).toBeInTheDocument();
    expect(screen.getByText(`${CULTURAL_EVENTS.length} fiestas`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enero' }));
    expect(screen.getByRole('button', { name: 'Enero' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 fiesta')).toBeInTheDocument();
    const all = screen.getByRole('list', { name: 'Todas las fiestas' });
    expect(all.querySelectorAll(':scope > li')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Galápagos' }));
    expect(screen.getByText(/Nada con esos filtros/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Todo el año' }));
    expect(screen.getByRole('list', { name: 'Todas las fiestas' }).querySelectorAll(':scope > li')).toHaveLength(2);
  });

  it('el giro respeta «reducir movimiento» y la hoja de estilos usa objetivos de 44 px', () => {
    const css = readFileSync(join(root, 'src', 'features', 'culture', 'culture-carousel.css'), 'utf8');
    expect(css).toMatch(/rotateY\(180deg\)/);
    expect(css).toMatch(/backface-visibility:hidden/);
    // Safari/iOS: la cara oculta también se esconde con visibility (si no, el reverso se ve en espejo).
    expect(css).toMatch(/\.cvc-card:not\(\[data-flipped\]\) \.cvc-back,\.cvc-card\[data-flipped\] \.cvc-front\{visibility:hidden\}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.cvc-inner\{transition:none;transform:none!important\}/);
    expect(css).toMatch(/scroll-snap-type:x mandatory/);
    expect(css).toMatch(/min-height:44px/);
  });
});
