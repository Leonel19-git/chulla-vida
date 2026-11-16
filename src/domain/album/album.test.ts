import { describe, expect, it } from 'vitest';
import { ALL_EXPERIENCES } from '../catalog';
import { ALBUM_EXPERIENCES, ALBUM_REGION_ORDER, ALBUM_TOTAL, albumLabel, albumNumber, albumPage, experienceByAlbumNumber, formatAlbumNumber, mejorEstado } from './index';

describe('Numeración del álbum', () => {
  it('numera todas las fichas una sola vez, de 1 al total', () => {
    expect(ALBUM_TOTAL).toBe(ALL_EXPERIENCES.length);
    const numbers = ALL_EXPERIENCES.map(experience => albumNumber(experience.id));
    expect(new Set(numbers).size).toBe(ALBUM_TOTAL);
    expect(Math.min(...(numbers as number[]))).toBe(1);
    expect(Math.max(...(numbers as number[]))).toBe(ALBUM_TOTAL);
  });
  it('agrupa por región en orden de álbum y con rangos contiguos', () => {
    let expectedFirst = 1;
    for (const region of ALBUM_REGION_ORDER) {
      const page = albumPage(region);
      expect(page.first).toBe(expectedFirst);
      expect(page.last - page.first + 1).toBe(page.experiences.length);
      expectedFirst = page.last + 1;
    }
    expect(expectedFirst - 1).toBe(ALBUM_TOTAL);
  });
  it('usa dos dígitos y resuelve en ambos sentidos', () => {
    const first = ALBUM_EXPERIENCES[0]!;
    expect(albumLabel(first.id)).toBe('01');
    expect(experienceByAlbumNumber(1)?.id).toBe(first.id);
    expect(formatAlbumNumber(null)).toBe('—');
    expect(albumNumber('no-existe')).toBeNull();
  });
  it('el estado más avanzado gana y solo «pegado» es el máximo', () => {
    expect(mejorEstado('en_sobre', 'visto')).toBe('en_sobre');
    expect(mejorEstado('comprado', 'pegado_demo')).toBe('pegado_demo');
    expect(mejorEstado('pegado', 'comprado')).toBe('pegado');
    expect(mejorEstado()).toBe('album');
  });
});
