import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_EXPERIENCES, AMAZONIA_INSPIRATIONS, EXPERIENCES } from '../../src/domain/catalog';
import { PLACE_PHOTOS, placeMedia } from '../../src/domain/catalog/data/place-photos';
import { experienceVisual } from '../../src/features/catalog/experienceArt';

interface RegistryEntry {
  id: string;
  file: string;
  pageUrl: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  alt: string;
  src: string;
  srcLarge: string | null;
  retrievedAt: string;
}

const root = resolve(__dirname, '..', '..');
const registry = JSON.parse(readFileSync(join(root, 'scripts', 'place-images.json'), 'utf8')) as RegistryEntry[];
const credits = readFileSync(join(root, 'public', 'images', 'CREDITS.md'), 'utf8');
const rights = readFileSync(join(root, 'docs', 'CONTENIDO_Y_DERECHOS.md'), 'utf8');
/** Solo dominio público, CC0, CC BY y CC BY-SA (cualquier versión o adaptación nacional). */
const ALLOWED_LICENSE = /^(public domain|cc0|cc by(-sa)? \d\.\d( [a-z]{2})?)$/i;
const publicFile = (src: string) => join(root, 'public', src.replace(/^\//, ''));
const isWebp = (path: string) => {
  const head = readFileSync(path).subarray(0, 12);
  return head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP';
};
/** Ancho y alto de un WebP con VP8 (con pérdida), que es lo que escribe Pillow con quality=78. */
const webpSize = (path: string) => {
  const data = readFileSync(path);
  const chunk = data.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8 ') return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8X') return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
  return null;
};

describe('fotos reales por ficha (Wikimedia Commons)', () => {
  it('el registro tiene una entrada por ficha, sin duplicados, y solo ids del catálogo', () => {
    const ids = registry.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const catalogIds = new Set(ALL_EXPERIENCES.map(experience => experience.id));
    for (const id of ids) expect(catalogIds.has(id), id).toBe(true);
    expect(registry.length).toBeGreaterThanOrEqual(25);
  });

  it('cada foto tiene licencia libre permitida, autor legible y página de Commons', () => {
    for (const entry of registry) {
      expect(entry.license, entry.id).toMatch(ALLOWED_LICENSE);
      expect(entry.license).not.toMatch(/\bnc\b|\bnd\b|fair use|all rights/i);
      expect(entry.author.trim(), entry.id).not.toBe('');
      expect(entry.author, entry.id).not.toMatch(/[<>]|autor desconocido/i);
      expect(entry.file, entry.id).toMatch(/^File:/);
      expect(entry.pageUrl, entry.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (!/public domain|cc0/i.test(entry.license)) expect(entry.licenseUrl, entry.id).toMatch(/^https?:\/\/creativecommons\.org\/licenses\//);
      expect(entry.alt.length, entry.id).toBeGreaterThan(15);
      expect(entry.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('cada foto existe en public/images/places como WebP 16:10 de 640 y 1280 px', () => {
    for (const entry of registry) {
      expect(entry.src).toBe(`/images/places/${entry.id}-640.webp`);
      const small = publicFile(entry.src);
      expect(existsSync(small), entry.src).toBe(true);
      expect(isWebp(small), entry.src).toBe(true);
      expect(webpSize(small), entry.src).toEqual({ width: 640, height: 400 });
      if (entry.srcLarge) {
        expect(entry.srcLarge).toBe(`/images/places/${entry.id}-1280.webp`);
        expect(isWebp(publicFile(entry.srcLarge)), entry.srcLarge).toBe(true);
        expect(webpSize(publicFile(entry.srcLarge)), entry.srcLarge).toEqual({ width: 1280, height: 800 });
      }
    }
  });

  it('no quedan archivos huérfanos en public/images/places', () => {
    const expected = new Set(registry.flatMap(entry => [entry.src, entry.srcLarge].filter(Boolean).map(src => String(src).split('/').pop())));
    for (const name of readdirSync(join(root, 'public', 'images', 'places'))) {
      expect(expected.has(name), name).toBe(true);
      // Presupuesto de peso para móvil: 640 px < 150 kB y 1280 px < 420 kB.
      expect(statSync(join(root, 'public', 'images', 'places', name)).size, name).toBeLessThan(name.endsWith('-640.webp') ? 150_000 : 420_000);
    }
  });

  it('la ficha muestra exactamente la foto registrada, con crédito y licencia', () => {
    const byId = new Map(registry.map(entry => [entry.id, entry]));
    for (const experience of ALL_EXPERIENCES) {
      const entry = byId.get(experience.id);
      const photos = experience.media.filter(media => media.depictsThisPlace);
      if (!entry) {
        expect(photos, experience.id).toEqual([]);
        continue;
      }
      expect(photos, experience.id).toHaveLength(1);
      expect(photos[0]).toMatchObject({
        src: entry.src,
        alt: entry.alt,
        license: entry.license,
        credit: `${entry.author} · Wikimedia Commons`,
      });
    }
  });

  it('las 33 fichas de TS y las 18 amazónicas de data.json usan el mismo registro', () => {
    expect(Object.keys(PLACE_PHOTOS).sort()).toEqual(registry.map(entry => entry.id).sort());
    const amazonPhotos = AMAZONIA_INSPIRATIONS.filter(experience => experience.media.some(media => media.depictsThisPlace));
    expect(amazonPhotos.length).toBe(registry.filter(entry => entry.id.startsWith('amz-')).length);
    expect(placeMedia('no-existe')).toEqual([]);
    expect(EXPERIENCES.length + AMAZONIA_INSPIRATIONS.length).toBe(51);
  });

  it('ninguna imagen de ficha apunta a una URL externa', () => {
    for (const media of ALL_EXPERIENCES.flatMap(experience => experience.media)) {
      expect(media.src).toMatch(/^\/images\//);
      const large = (media as { srcLarge?: string }).srcLarge;
      if (large) expect(large).toMatch(/^\/images\//);
    }
    const source = readFileSync(join(root, 'src', 'domain', 'catalog', 'data', 'place-photos.ts'), 'utf8');
    expect(source).not.toMatch(/src(Large)?: 'https?:/);
  });

  it('la tarjeta usa la foto real con su crédito y deja la ilustración cuando no hay foto', () => {
    const withPhoto = ALL_EXPERIENCES.find(experience => experience.id === registry[0].id);
    expect(withPhoto).toBeDefined();
    const visual = experienceVisual(withPhoto!);
    expect(visual).toMatchObject({ photo: true, src: registry[0].src, alt: registry[0].alt });
    expect(visual.credit).toContain(registry[0].author);
    const withoutPhoto = ALL_EXPERIENCES.find(experience => !registry.some(entry => entry.id === experience.id));
    if (withoutPhoto) expect(experienceVisual(withoutPhoto)).toMatchObject({ photo: false, credit: null });
  });

  it('los créditos completos están en CREDITS.md y en CONTENIDO_Y_DERECHOS.md', () => {
    for (const entry of registry) {
      for (const text of [credits, rights]) {
        expect(text, entry.id).toContain(entry.pageUrl);
        expect(text, entry.id).toContain(entry.author);
        expect(text, entry.id).toContain(entry.license);
      }
      expect(credits).toContain(`${entry.id}-640.webp`);
    }
  });
});
