import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALL_EXPERIENCES,
  AMAZONIA_INSPIRATIONS,
  CATALOG_SOURCES,
  COSTA_EXPERIENCES,
  EXPERIENCES,
  GALAPAGOS_COST_CAVEATS,
  GALAPAGOS_EXPERIENCES,
  GALAPAGOS_FIXED_COSTS,
  GALAPAGOS_STATUS_SNAPSHOT,
  GENERAL_EXPERIENCES,
  LEGACY_ID_ALIASES,
  formatPrice,
  getExperienceById,
  getExperienceBySlug,
  priceDisclaimer,
  searchExperiences,
  type Experience,
} from './index';

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();
const loose = (text: string) => collapse(text).toLowerCase();
const byId = (id: string): Experience => {
  const found = getExperienceById(id);
  if (!found) throw new Error(`No existe ${id}`);
  return found;
};
const ids = (records: readonly Experience[]) => records.map(record => record.id);

describe('las 33 fichas: conteo, identidad y procedencia', () => {
  it('importa 14 + 7 + 12 = 33 fichas, en el orden de sus documentos', () => {
    expect(GENERAL_EXPERIENCES).toHaveLength(14);
    expect(COSTA_EXPERIENCES).toHaveLength(7);
    expect(GALAPAGOS_EXPERIENCES).toHaveLength(12);
    expect(EXPERIENCES).toHaveLength(33);
    for (const source of CATALOG_SOURCES) {
      const records = EXPERIENCES.filter(record => record.contentSourceId === source.id);
      expect(records).toHaveLength(source.expectedCount);
      expect(records.map(record => record.sourceOrder)).toEqual(records.map((_, index) => index + 1));
      expect(source.checkedAt).toBe('2026-11-12');
      records.forEach(record => expect(record.originalDocument).toBe(source.originalDocument));
    }
    expect(CATALOG_SOURCES.map(source => source.expectedCount)).toEqual([14, 7, 12]);
  });

  it('usa ids estables y slugs únicos en kebab-case sin tildes', () => {
    expect(new Set(ids(EXPERIENCES)).size).toBe(33);
    expect(new Set(EXPERIENCES.map(record => record.slug)).size).toBe(33);
    expect(new Set(ALL_EXPERIENCES.map(record => record.id)).size).toBe(ALL_EXPERIENCES.length);
    expect(new Set(ALL_EXPERIENCES.map(record => record.slug)).size).toBe(ALL_EXPERIENCES.length);
    for (const record of EXPERIENCES) {
      expect(record.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(record.id).toMatch(/^(gen|costa|gal)-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(record.id.endsWith(record.slug)).toBe(true);
    }
    expect(ids(GENERAL_EXPERIENCES)[0]).toBe('gen-01-saraguro-ancestral');
    expect(ids(GENERAL_EXPERIENCES)[13]).toBe('gen-14-mindo');
    expect(ids(COSTA_EXPERIENCES)[0]).toBe('costa-01-raices-de-manabi');
    expect(ids(GALAPAGOS_EXPERIENCES)[0]).toBe('gal-01-bartolome-bahia-sullivan');
  });

  it('cada bloque original está copiado tal cual de su documento fuente', () => {
    for (const source of CATALOG_SOURCES) {
      const original = readFileSync(resolve(source.originalDocument), 'utf8');
      for (const record of EXPERIENCES.filter(item => item.contentSourceId === source.id)) {
        expect(record.sourceText.length).toBeGreaterThan(300);
        expect(original).toContain(record.sourceText);
      }
      // Las notas generales también son textuales.
      source.notes.forEach(note => expect(collapse(original)).toContain(note));
    }
  });

  it('no inventa contenido: descripción, precio, atractivos y actividades salen del bloque de la ficha', () => {
    for (const record of EXPERIENCES) {
      const block = collapse(record.sourceText);
      expect(block).toContain(record.description);
      expect(record.description.startsWith(record.summary.replace(/\.$/, ''))).toBe(true);
      expect(block).toContain(record.price.originalLabel);
      expect(block).toContain(record.locality);
      expect(block).toContain(record.duration.label);
      expect(block).toContain(record.difficultyLabel);
      if (record.contentSourceId !== 'catalogo-costa-7') {
        expect(block).toContain(record.capacity.label);
        [...record.attractions, ...record.activities].forEach(item => expect(loose(block)).toContain(loose(item)));
      }
    }
  });

  it('resuelve por id y por slug, y mantiene los identificadores de la primera importación', () => {
    expect(getExperienceById('gen-12-loja')?.title).toBe('Loja');
    expect(getExperienceBySlug('raices-de-manabi')?.id).toBe('costa-01-raices-de-manabi');
    expect(getExperienceById('no-existe')).toBeUndefined();
    expect(getExperienceBySlug('no-existe')).toBeUndefined();
    expect(getExperienceById('cos-04-manta')?.id).toBe('costa-04-sabores-de-manta');
    expect(getExperienceBySlug('isla-de-la-plata')?.id).toBe('costa-06-expedicion-natural');
    for (const [oldId, newId] of Object.entries(LEGACY_ID_ALIASES)) {
      expect(getExperienceById(oldId)?.id).toBe(newId);
    }
  });

  it('las fichas no se pueden alterar en tiempo de ejecución', () => {
    const record = EXPERIENCES[0] as { bookingEnabled: boolean; price: { min: number | null } };
    expect(() => {
      record.bookingEnabled = true;
    }).toThrow();
    expect(() => {
      record.price.min = 1;
    }).toThrow();
    expect(EXPERIENCES[0].bookingEnabled).toBe(false);
  });
});

describe('nada es reservable ni está verificado', () => {
  it('todas las fichas quedan sin reserva, sin operador verificado y en estado referencial', () => {
    for (const record of ALL_EXPERIENCES) {
      expect(record.bookingEnabled).toBe(false);
      expect(record.operatorVerificationStatus).toBe('unverified');
      expect(record.editorialStatus).toBe('referential');
      expect(record.verifiedBy).toBeNull();
      expect(record.geospatialCoordinatesVerified).toBe(false);
      expect(record.accessStatus).not.toBe('open_reported');
      expect(record.price.type).not.toBe('verified_offer');
    }
  });

  it('nadie ha confirmado conectividad, y el clima solo usa un punto aproximado de la localidad', () => {
    for (const record of EXPERIENCES) {
      expect(record.connectivity).toEqual([]);
      const reference = record.weatherReference;
      if (!reference) continue;
      expect(reference.precision).toBe('locality_approx');
      expect(Math.abs(Number((reference.lat * 100).toFixed(6)) % 1)).toBe(0);
      expect(Math.abs(Number((reference.lon * 100).toFixed(6)) % 1)).toBe(0);
      // Dentro de Ecuador continental o del archipiélago.
      expect(reference.lat).toBeGreaterThan(-5.1);
      expect(reference.lat).toBeLessThan(1.5);
      expect(reference.lon).toBeGreaterThan(record.localizedRegion === 'galapagos' ? -92 : -81.1);
      expect(reference.lon).toBeLessThan(record.localizedRegion === 'galapagos' ? -89 : -75);
    }
    // Sin localidad cierta no hay punto de clima.
    expect(byId('gen-09-parque-nacional-cotopaxi').weatherReference).toBeNull();
    expect(byId('gal-10-galapagos-origins-5-dias').weatherReference).toBeNull();
  });

  it('solo usa imágenes locales con crédito documentado y que retratan el lugar', () => {
    const credits = readFileSync(resolve('public/images/CREDITS.md'), 'utf8');
    const withMedia = EXPERIENCES.filter(record => record.media.length > 0);
    // Fotos reales por ficha (tests/unit/place-images.test.ts revisa licencias y archivos en detalle).
    expect(withMedia.length).toBeGreaterThanOrEqual(25);
    for (const media of withMedia.flatMap(record => record.media)) {
      expect(media.src).toMatch(/^\/images\/places\/[a-z0-9-]+-640\.webp$/);
      expect(credits).toContain(media.src.replace('/images/places/', ''));
      expect(() => readFileSync(resolve(`public${media.src}`))).not.toThrow();
      expect(media.credit).not.toBe('');
      expect(media.license).not.toBe('');
      expect(media.depictsThisPlace).toBe(true);
    }
    // La foto de bosque no corresponde a un lugar ecuatoriano verificado: no se usa.
    expect(EXPERIENCES.some(record => record.media.some(media => media.src.includes('forest')))).toBe(false);
  });
});

describe('catálogo general: 14 destinos referenciales', () => {
  it('conserva los 14 precios referenciales en USD por persona', () => {
    expect(GENERAL_EXPERIENCES.map(record => record.price.min)).toEqual([45, 38, 32, 30, 35, 34, 35, 24, 40, 22, 8, 7, 10, 28]);
    for (const record of GENERAL_EXPERIENCES) {
      expect(record.price.type).toBe('referential');
      expect(record.price.currency).toBe('USD');
      expect(record.price.max).toBe(record.price.min);
      expect(record.price.includes).toEqual([]);
      expect(record.kind).toBe('experience');
    }
    expect(GENERAL_EXPERIENCES.map(record => record.capacity.max)).toEqual([8, 12, 15, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(GENERAL_EXPERIENCES.map(record => record.duration.days)).toEqual([2, 2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('Saraguro Ancestral coincide campo a campo con la fuente', () => {
    const record = byId('gen-01-saraguro-ancestral');
    expect(record).toMatchObject({
      slug: 'saraguro-ancestral',
      contentSourceId: 'catalogo-general-14',
      originalDocument: 'CHULLA_VIDA_3_PAQUETE/catalogos/01_catalogo_14_destinos.txt',
      sourceOrder: 1,
      sourceCheckedAt: '2026-11-12',
      title: 'Saraguro Ancestral',
      experienceName: null,
      kind: 'experience',
      localizedRegion: 'sierra',
      subregion: null,
      province: 'Loja',
      locality: 'Saraguro, Loja',
      meetingPoint: null,
      duration: { label: '2 días', minHours: null, maxHours: null, days: 2, nights: null },
      difficulty: 'facil',
      difficultyLabel: 'Fácil',
      capacity: { max: 8, label: 'Hasta 8 personas' },
      context: null,
      itinerary: [],
      warnings: [],
      accessStatus: 'unknown',
      accessCheckedAt: null,
    });
    expect(record.description).toBe(
      'Vive una experiencia de turismo cultural en Saraguro, territorio del pueblo indígena Saraguro, reconocido por sus tradiciones ancestrales, vestimenta, artesanías y gastronomía. Conoce sus comunidades, descubre sus expresiones culturales y disfruta de los paisajes andinos que rodean este destino.',
    );
    expect(record.attractions).toEqual(['Comunidades indígenas de Saraguro', 'Cerro de Arcos', 'Baños del Inca', 'Cascadas de Oñacapac']);
    expect(record.activities).toEqual(['Turismo comunitario', 'Fotografía', 'Gastronomía tradicional', 'Artesanías', 'Recorridos culturales']);
    expect(record.price).toMatchObject({
      type: 'referential',
      currency: 'USD',
      min: 45,
      max: 45,
      unit: 'per_person',
      originalLabel: '$45 por persona',
      includes: [],
      excludes: [],
    });
    expect(record.price.assumptions[0]).toMatch(/valores referenciales del catálogo y no representan tarifas oficiales/);
    expect(record.conditions.join(' ')).toMatch(/Antes de ofrecer una reserva, se deben confirmar disponibilidad/);
    expect(record.petPolicy.status).toBe('unverified');
    expect(record.weatherReference).toEqual({ placeName: 'Saraguro', lat: -3.62, lon: -79.24, precision: 'locality_approx' });
  });

  it('asigna regiones y subregiones como pide la especificación', () => {
    for (const id of ['gen-03-yunguilla', 'gen-14-mindo']) {
      expect(byId(id)).toMatchObject({ localizedRegion: 'sierra', subregion: 'Chocó Andino', province: 'Pichincha' });
    }
    expect(byId('gen-05-oyacachi')).toMatchObject({ localizedRegion: 'amazonia', subregion: 'Transición andino-amazónica', province: 'Napo' });
    expect(byId('gen-06-valle-de-intag')).toMatchObject({ localizedRegion: 'sierra', subregion: 'Sierra occidental y bosque húmedo', province: 'Imbabura' });
    expect(byId('gen-12-loja')).toMatchObject({ localizedRegion: 'sierra', province: 'Loja' });
    expect(GENERAL_EXPERIENCES.filter(record => record.localizedRegion !== 'sierra').map(record => record.id)).toEqual(['gen-05-oyacachi']);
  });

  it('añade las aclaraciones de Baños, Cotopaxi y Loja', () => {
    expect(byId('gen-07-banos-de-agua-santa').activityConstraints.join(' ')).toMatch(/proveedores autorizados.*condiciones de seguridad/);
    const cotopaxi = byId('gen-09-parque-nacional-cotopaxi');
    expect(cotopaxi.activityConstraints.join(' ')).toMatch(/clima.*actividad volcánica.*restricciones oficiales/);
    expect(cotopaxi.warnings).toEqual([
      {
        text: 'Las actividades y accesos dependen de las condiciones climáticas, volcánicas y disposiciones de las autoridades.',
        asOf: null,
        kind: 'safety',
        historical: true,
      },
    ]);
    const loja = byId('gen-12-loja');
    expect(loja.attractions).toContain('Parque Nacional Podocarpus (fuera del centro urbano)');
    expect(loja.activityConstraints.join(' ')).toMatch(/Podocarpus está fuera del centro urbano/);
  });
});

describe('Costa: 7 experiencias con tarifa propuesta', () => {
  it('conserva tarifa propuesta, punto de encuentro, contexto, itinerario e inclusiones en las siete', () => {
    expect(COSTA_EXPERIENCES.map(record => record.price.min)).toEqual([25, 39, 49, 39, 49, 69, 59]);
    expect(COSTA_EXPERIENCES.map(record => record.experienceName)).toEqual([
      'Raíces de Manabí', 'Guayaquil Vivo', 'Pacífico Activo', 'Sabores de Manta', 'Aventura Marina', 'Expedición Natural', 'Ola y Manglar',
    ]);
    expect(COSTA_EXPERIENCES.map(record => record.province)).toEqual(['Manabí', 'Guayas', 'Santa Elena', 'Manabí', 'Manabí', 'Manabí', 'Esmeraldas']);
    expect(COSTA_EXPERIENCES.map(record => [record.duration.minHours, record.duration.maxHours])).toEqual([[4, 5], [5, 6], [5, 6], [4, 5], [3, 4], [7, 9], [5, 6]]);
    expect(COSTA_EXPERIENCES.map(record => record.price.includes.length)).toEqual([5, 6, 6, 6, 6, 6, 6]);
    expect(COSTA_EXPERIENCES.map(record => record.itinerary.length)).toEqual([5, 6, 6, 6, 5, 6, 6]);
    for (const record of COSTA_EXPERIENCES) {
      const block = collapse(record.sourceText);
      expect(record.localizedRegion).toBe('costa');
      expect(record.price).toMatchObject({ type: 'proposed', currency: 'USD', unit: 'per_person' });
      expect(record.price.max).toBe(record.price.min);
      expect(record.price.originalLabel).toMatch(/^TARIFA PROPUESTA · \$\d+ por persona · propuesta, pendiente de convenio$/);
      expect(record.meetingPoint).toBeTruthy();
      expect(block).toContain(`Punto de encuentro: ${record.meetingPoint}`);
      expect(record.context).toBeTruthy();
      expect(block).toContain(record.context as string);
      record.price.includes.forEach(item => expect(block).toContain(item));
      record.price.excludes.forEach(item => expect(loose(block)).toContain(loose(item)));
      expect(record.price.excludes.length).toBeGreaterThanOrEqual(3);
      expect(record.price.excludes[0]).toMatch(/^(Transporte|Desplazamiento|Traslado)/);
      record.itinerary.forEach(stepItem => {
        expect(stepItem.time).toMatch(/^\d{2}:\d{2}(–\d{2}:\d{2})?$/);
        expect(block).toContain(`${stepItem.time} ${stepItem.text}`);
      });
      expect(record.recommendations.length).toBeGreaterThan(0);
      record.recommendations.forEach(item => expect(block).toContain(item));
      expect(record.conditions).toContain('Precio y prestaciones sujetos a confirmación final por proveedor y fecha. Servicios no descritos se consideran excluidos.');
      expect(record.conditions.join(' ')).toMatch(/No son cotizaciones ni reservas activas/);
      expect(record.capacity.max).toBeNull();
    }
  });

  it('Raíces de Manabí (Agua Blanca) coincide campo a campo con la fuente', () => {
    const record = byId('costa-01-raices-de-manabi');
    expect(record).toMatchObject({
      slug: 'raices-de-manabi',
      contentSourceId: 'catalogo-costa-7',
      sourceOrder: 1,
      title: 'Agua Blanca',
      experienceName: 'Raíces de Manabí',
      kind: 'experience',
      localizedRegion: 'costa',
      province: 'Manabí',
      locality: 'Comunidad Agua Blanca, Puerto López, Manabí',
      meetingPoint: 'Ingreso / recepción de la Comunidad Agua Blanca',
      duration: { label: '4–5 horas', minHours: 4, maxHours: 5, days: null, nights: null },
      difficulty: 'facil_moderada',
      difficultyLabel: 'Fácil a moderada',
      description: 'Vivencia de patrimonio manteño, naturaleza y turismo comunitario dentro del entorno del Parque Nacional Machalilla.',
      context:
        'La comunidad conserva patrimonio arqueológico asociado a los antiguos pueblos del litoral, especialmente a la cultura manteña, y desarrolla turismo gestionado localmente.',
      warnings: [],
    });
    expect(record.price).toMatchObject({
      type: 'proposed',
      currency: 'USD',
      min: 25,
      max: 25,
      originalLabel: 'TARIFA PROPUESTA · $25 por persona · propuesta, pendiente de convenio',
      includes: [
        'Entrada comunitaria y guianza local durante el recorrido contratado.',
        'Recorrido interpretativo por museo, sendero y sitio arqueológico, conforme a las áreas habilitadas.',
        'Visita a la laguna sulfurosa, conforme a las condiciones de acceso.',
        'Almuerzo típico comunitario con menú previamente acordado.',
        'Coordinación, asistencia de reserva y confirmación digital.',
      ],
      excludes: ['Transporte hasta la comunidad', 'Bebidas adicionales', 'Alquileres opcionales', 'Compras personales'],
    });
    expect(record.price.assumptions).toContain('Tarifas de venta estimadas, sujetas a confirmación con los operadores. No son cotizaciones ni reservas activas.');
    expect(record.price.assumptions).toContain('Tarifas propuestas · USD por persona | Noviembre de 2026');
    expect(record.itinerary).toEqual([
      { time: '09:00', text: 'Recepción y validación de reserva.' },
      { time: '09:15', text: 'Museo y explicación patrimonial.' },
      { time: '10:15', text: 'Sendero y visita a la laguna.' },
      { time: '12:00', text: 'Almuerzo comunitario.' },
      { time: '13:00', text: 'Cierre de experiencia.' },
    ]);
    expect(record.recommendations).toEqual([
      'Confirmar menú y régimen de alimentación; verificar apertura de laguna, accesibilidad y punto exacto de encuentro.',
    ]);
    expect(record.petPolicy.status).toBe('ask_conditions');
    expect(record.media[0]).toMatchObject({ src: '/images/places/costa-01-raices-de-manabi-640.webp', license: 'CC BY-SA 2.0 fr', depictsThisPlace: true });
  });

  it('no promete lo que la fuente condiciona a un convenio', () => {
    expect(byId('costa-07-ola-y-manglar').activityConstraints.join(' ')).toMatch(/manglar no está incluido ni prometido mientras no exista convenio/);
    expect(byId('costa-07-ola-y-manglar').price.includes.join(' ')).not.toMatch(/manglar/i);
    expect(byId('costa-02-guayaquil-vivo').activityConstraints.join(' ')).toMatch(/actividad fluvial.*solo.*convenio/);
    expect(byId('costa-05-aventura-marina').activityConstraints.join(' ')).toMatch(/solo se realizan con condiciones seguras/);
    expect(byId('costa-06-expedicion-natural').activityConstraints.join(' ')).toMatch(/No se garantizan avistamientos/);
    expect(byId('costa-06-expedicion-natural').itinerary.at(-1)).toEqual({ time: '16:30–17:00', text: 'Regreso estimado.' });
  });
});

describe('Galápagos: 12 fichas con rangos, moneda original y costos aparte', () => {
  it('conserva rangos y moneda de cada ficha', () => {
    expect(GALAPAGOS_EXPERIENCES.map(record => [record.price.currency, record.price.min, record.price.max])).toEqual([
      ['USD', 270, 315],
      ['USD', 300, 315],
      ['USD', 270, null],
      ['USD', 216, 220],
      ['USD', 50, 60],
      ['USD', 150, 190],
      ['EUR', 46.4, null],
      ['EUR', 56, null],
      ['USD', 855, 1135],
      ['USD', 1200, 1600],
      ['USD', 510, 510],
      ['USD', 1193, 1193],
    ]);
    expect(GALAPAGOS_EXPERIENCES.map(record => record.kind)).toEqual([
      'experience', 'experience', 'experience', 'experience', 'experience', 'experience', 'experience', 'experience',
      'multi_day_program', 'multi_day_program', 'trip_plan', 'trip_plan',
    ]);
    GALAPAGOS_EXPERIENCES.forEach(record => {
      expect(record.price.type).toBe('referential');
      expect(record.localizedRegion).toBe('galapagos');
      expect(record.province).toBe('Galápagos');
    });
  });

  it('las dos fichas en euros siguen en euros, sin conversión a dólares', () => {
    const euro = EXPERIENCES.filter(record => record.price.currency === 'EUR');
    expect(ids(euro)).toEqual(['gal-07-sierra-negra-volcan-chico', 'gal-08-tintoreras-concha-perla']);
    expect(euro.map(record => record.price.originalLabel)).toEqual([
      'Desde €46,40 por persona (por confirmar en dólares)',
      'Desde €56 por persona (por confirmar en dólares)',
    ]);
    for (const record of euro) {
      expect(record.price.max).toBeNull();
      expect(record.price.options).toBeUndefined();
      expect(record.price.groupBreakdown).toBeUndefined();
      expect(record.price.assumptions.join(' ')).toMatch(/no se convierte/);
      expect(formatPrice(record.price)).toMatch(/^Desde EUR /);
      expect(formatPrice(record.price)).not.toMatch(/USD|\$/);
      expect(priceDisclaimer(record)).toMatch(/euros; no lo convertimos a dólares/);
    }
    // 46,40 € × 1,15 (el tipo de cambio supuesto por la fuente) no aparece en ningún campo numérico.
    expect(JSON.stringify(euro.map(record => [record.price.min, record.price.max]))).not.toMatch(/53\.36|64\.4/);
  });

  it('Kicker Rock coincide campo a campo con la fuente, con sus advertencias', () => {
    const record = byId('gal-04-kicker-rock-tour-360');
    expect(record).toMatchObject({
      slug: 'kicker-rock-tour-360',
      contentSourceId: 'catalogo-galapagos-12',
      originalDocument: 'CHULLA_VIDA_3_PAQUETE/catalogos/02_galapagos_12_experiencias.txt',
      sourceOrder: 4,
      title: 'Kicker Rock (León Dormido) y Tour 360°',
      kind: 'experience',
      subregion: 'Galápagos oriental',
      locality: 'Puerto Baquerizo Moreno, San Cristóbal, Galápagos',
      duration: { label: '1 día (aprox. 7 horas)', minHours: 7, maxHours: 7, days: 1, nights: null },
      difficulty: 'moderada',
      difficultyLabel: 'Moderada',
      capacity: { max: null, label: 'Según operador (por confirmar)' },
      accessStatus: 'unknown',
    });
    expect(record.description).toBe(
      'El snorkel más reconocido de San Cristóbal. Dos monolitos de unos 150 metros separados por un canal de aguas profundas donde se ven tortugas marinas, rayas, tiburones de arrecife y, en ocasiones, tiburones martillo. El tour 360° rodea la isla con paradas en bahías y playas. Incluye traje de neopreno; el agua es fría y puede haber corrientes.',
    );
    expect(record.attractions).toEqual(['León Dormido', 'Cerro Brujo', 'Punta Pitt', 'Rosa Blanca', 'Bahía Sardina']);
    expect(record.activities).toEqual(['Snorkel (buceo con certificación en algunas salidas)', 'Navegación', 'Playa', 'Fotografía']);
    expect(record.price).toMatchObject({
      type: 'referential',
      currency: 'USD',
      min: 216,
      max: 220,
      originalLabel: '$216 a $220 por persona',
      includes: ['Traje de neopreno'],
      excludes: [],
    });
    expect(record.activityConstraints).toEqual(
      expect.arrayContaining(['El agua es fría y puede haber corrientes.', 'El buceo solo se ofrece en algunas salidas y exige certificación.']),
    );
    expect(record.warnings).toEqual([...GALAPAGOS_STATUS_SNAPSHOT]);
    expect(record.price.separateCosts).toEqual([...GALAPAGOS_FIXED_COSTS]);
    expect(record.petPolicy.status).toBe('prohibited_protected_area');
  });

  it('Isabela en 4 días muestra el desglose por tamaño de grupo', () => {
    const record = byId('gal-09-isabela-4-dias');
    expect(record.kind).toBe('multi_day_program');
    expect(record.duration).toMatchObject({ days: 4, nights: null });
    expect(record.price.groupBreakdown).toEqual([
      { groupSize: 2, amountPerPerson: 1135 },
      { groupSize: 3, amountPerPerson: 1010 },
      { groupSize: 4, amountPerPerson: 915 },
      { groupSize: 5, amountPerPerson: 880 },
      { groupSize: 6, amountPerPerson: 855 },
    ]);
    const amounts = record.price.groupBreakdown!.map(item => item.amountPerPerson);
    expect(Math.min(...amounts)).toBe(record.price.min);
    expect(Math.max(...amounts)).toBe(record.price.max);
    record.price.groupBreakdown!.forEach(item =>
      expect(record.price.originalLabel).toContain(`$${item.amountPerPerson.toLocaleString('de-DE')}`),
    );
  });

  it('Galápagos Origins deja vuelos y tasa de ingreso fuera del precio', () => {
    const record = byId('gal-10-galapagos-origins-5-dias');
    expect(record.kind).toBe('multi_day_program');
    expect(record.price.excludes.join(' ')).toMatch(/Vuelos.*Tasa de ingreso/);
    expect(record.price.options?.map(option => [option.id, option.min])).toEqual([['gama-media', 1200], ['primera-clase', 1600]]);
  });

  it('los planes 11 y 12 son presupuestos orientativos con su desglose, no productos', () => {
    const economic = byId('gal-11-plan-economico-5-dias');
    const normal = byId('gal-12-plan-normal-5-dias');
    for (const plan of [economic, normal]) {
      expect(plan.kind).toBe('trip_plan');
      expect(plan.duration).toMatchObject({ days: 5, nights: 4 });
      expect(plan.activityConstraints.join(' ')).toMatch(/no un paquete ni una reserva/);
      expect(priceDisclaimer(plan)).toMatch(/plan de presupuesto orientativo, no un paquete en venta/);
      // El desglose de la fuente suma exactamente el precio en islas.
      expect(plan.price.costBreakdown!.reduce((sum, item) => sum + item.amount, 0)).toBe(plan.price.min);
      plan.price.costBreakdown!.forEach(item => expect(plan.description).toContain(item.detail));
      expect(plan.price.assumptions[0]).toMatch(/^Desglose por persona: hospedaje/);
      expect(plan.description).toContain(plan.price.assumptions[0]);
    }
    expect(economic.price.costBreakdown!.map(item => item.amount)).toEqual([180, 100, 60, 155, 15]);
    expect(normal.price.costBreakdown!.map(item => item.amount)).toEqual([380, 200, 60, 523, 30]);
    expect(economic.price.options?.map(option => [option.id, option.min])).toEqual([['total-extranjero', 953], ['total-ecuatoriano', 783]]);
    expect(normal.price.options?.map(option => [option.id, option.min])).toEqual([['total-extranjero', 1713], ['total-ecuatoriano', 1543]]);
    expect(economic.price.separateCosts![0]).toMatchObject({ min: 223, max: 223, requiresRevalidation: true });
    expect(normal.price.separateCosts![0]).toMatchObject({ min: 300, max: 300, requiresRevalidation: true });
    // El tipo de cambio 1,15 es un supuesto de la fuente, declarado como tal.
    expect(normal.price.assumptions.join(' ')).toMatch(/tipo de cambio supuesto de 1,15/);
    expect(normal.warnings[1]).toEqual({
      text: 'Los tours en euros se convirtieron con un tipo de cambio supuesto de 1,15.',
      asOf: '2026-11-12',
      kind: 'pricing',
      historical: true,
    });
    expect(economic.warnings.slice(0, 2).map(warning => [warning.kind, warning.asOf])).toEqual([['pricing', '2026-11-12'], ['closure', '2026-11-12']]);
    expect(economic.recommendations).toEqual(['Para ahorrar, desde Baltra se puede ir en bus y lancha corta hasta Puerto Ayora en lugar de taxi.']);
  });

  it('las notas «Importante» son avisos históricos con fecha y tipo', () => {
    expect(byId('gal-01-bartolome-bahia-sullivan').warnings[0]).toEqual({
      text: 'Los sitios de visita y los itinerarios dependen de las disposiciones del Parque Nacional Galápagos, que tras las inundaciones de octubre de 2026 mantiene cierres preventivos en algunos puntos de Santa Cruz.',
      asOf: '2026-11-12',
      kind: 'closure',
      historical: true,
    });
    const terrestre = byId('gal-05-san-cristobal-terrestre');
    expect(terrestre.warnings[0]).toEqual({
      text: 'Al 7 de noviembre de 2026, Puerto Chino seguía cerrado de forma preventiva por las lluvias.',
      asOf: '2026-11-07',
      kind: 'closure',
      historical: true,
    });
    // No se da por abierta una ruta que el catálogo describe cerrada.
    expect(terrestre.accessStatus).toBe('partially_closed_reported');
    expect(terrestre.accessCheckedAt).toBe('2026-11-07');
    expect(terrestre.price.originalLabel).toBe('$50 a $60 por persona (dato antiguo, por confirmar)');
    for (const record of GALAPAGOS_EXPERIENCES) {
      const block = collapse(record.sourceText);
      const own = record.warnings.filter(warning => !GALAPAGOS_STATUS_SNAPSHOT.includes(warning));
      own.forEach(warning => expect(block).toContain(warning.text));
      expect(record.warnings.every(warning => warning.historical === true)).toBe(true);
      expect(record.warnings.slice(-3)).toEqual([...GALAPAGOS_STATUS_SNAPSHOT]);
      expect(record.activityConstraints.join(' ')).toMatch(/fotografía fechada, no un aviso en tiempo real/);
    }
  });

  it('expone tasas, tarjeta de tránsito, vuelo, lanchas y hospedaje como costos separados y revalidables', () => {
    const source = collapse(readFileSync(resolve(CATALOG_SOURCES[2].originalDocument), 'utf8'));
    const byConcept = (pattern: RegExp) => GALAPAGOS_FIXED_COSTS.filter(cost => pattern.test(cost.concept)).map(cost => [cost.min, cost.max]);
    expect(byConcept(/Tasa de ingreso/)).toEqual([[200, 200], [100, 100], [30, 30], [0, 0]]);
    expect(byConcept(/TCT/)).toEqual([[20, 20]]);
    expect(byConcept(/Vuelo/)).toEqual([[223, 755]]);
    expect(byConcept(/Lancha/)).toEqual([[30, 30], [40, 40]]);
    expect(byConcept(/Impuesto de ingreso a Isabela/)).toEqual([[null, null]]);
    expect(byConcept(/Bote-taxi/)).toEqual([[0.5, 0.5], [1, 1]]);
    expect(byConcept(/Hospedaje/)).toEqual([[33, 53], [94, 94]]);
    for (const cost of GALAPAGOS_FIXED_COSTS) {
      expect(cost.requiresRevalidation).toBe(true);
      expect(cost.currency).toBe('USD');
      expect(source).toContain(cost.detail);
    }
    expect(GALAPAGOS_COST_CAVEATS.join(' ')).toMatch(/nacionalidad, residencia y edad/);
    for (const record of GALAPAGOS_EXPERIENCES) {
      GALAPAGOS_FIXED_COSTS.forEach(cost => expect(record.price.separateCosts).toContainEqual(cost));
    }
  });

  it('la fotografía de inundaciones y cierres conserva sus fechas', () => {
    const source = collapse(readFileSync(resolve(CATALOG_SOURCES[2].originalDocument), 'utf8'));
    expect(GALAPAGOS_STATUS_SNAPSHOT.map(noticeItem => [noticeItem.asOf, noticeItem.kind])).toEqual([
      ['2026-10-31', 'weather'],
      ['2026-11-07', 'closure'],
      ['2026-11-12', 'weather'],
    ]);
    GALAPAGOS_STATUS_SNAPSHOT.forEach(noticeItem => {
      expect(noticeItem.historical).toBe(true);
      expect(source).toContain(noticeItem.text);
    });
    expect(GALAPAGOS_STATUS_SNAPSHOT[1].text).toMatch(/Las Grietas, Los Humedales, Puerto Chino y Playa Baquerizo/);
    expect(GALAPAGOS_STATUS_SNAPSHOT[2].text).toMatch(/Inamhi/);
  });
});

describe('Chulla Pet: sin permisos inventados', () => {
  it('Galápagos nunca admite mascotas y ninguna ficha las da por confirmadas', () => {
    for (const record of GALAPAGOS_EXPERIENCES) {
      expect(record.petPolicy.status).toBe('prohibited_protected_area');
      expect(record.petPolicy.note).toMatch(/Parque Nacional Galápagos no admite mascotas/);
    }
    for (const record of ALL_EXPERIENCES) {
      expect(record.petPolicy.status).not.toBe('confirmed_allowed');
      expect(record.petPolicy.confirmedBy).toBeNull();
      expect(record.petPolicy.confirmedAt).toBeNull();
      expect(record.petPolicy.species).toEqual([]);
      expect(record.petPolicy.fee).toBeNull();
    }
  });

  it('en áreas protegidas del continente remite a la autoridad sin afirmar permiso', () => {
    const ask = EXPERIENCES.filter(record => record.petPolicy.status === 'ask_conditions');
    expect(ids(ask)).toEqual(['gen-09-parque-nacional-cotopaxi', 'costa-01-raices-de-manabi', 'costa-06-expedicion-natural']);
    ask.forEach(record => expect(record.petPolicy.note).toMatch(/consultarse antes con la autoridad del área.*no se afirma que esté permitido/));
    const rest = EXPERIENCES.filter(record => record.localizedRegion !== 'galapagos' && record.petPolicy.status !== 'ask_conditions');
    expect(rest).toHaveLength(18);
    rest.forEach(record => expect(record.petPolicy.status).toBe('unverified'));
  });

  it('el filtro de mascotas no devuelve nada mientras nadie confirme', () => {
    expect(searchExperiences({ petFriendlyOnly: true })).toEqual({ matches: [], notComparable: [] });
    const confirmed = {
      ...EXPERIENCES[0],
      petPolicy: { ...EXPERIENCES[0].petPolicy, status: 'confirmed_allowed' as const, confirmedBy: 'Anfitrión de prueba', confirmedAt: '2026-11-13' },
    };
    expect(searchExperiences({ petFriendlyOnly: true }, [confirmed, EXPERIENCES[1]]).matches).toEqual([confirmed]);
  });
});

describe('searchExperiences', () => {
  it('sin filtros devuelve todo el catálogo y no marca nada como no comparable', () => {
    const result = searchExperiences();
    expect(result.matches).toHaveLength(ALL_EXPERIENCES.length);
    expect(result.notComparable).toEqual([]);
    expect(searchExperiences({}, EXPERIENCES).matches).toHaveLength(33);
  });

  it('busca sin tildes ni mayúsculas y exige todas las palabras', () => {
    expect(ids(searchExperiences({ query: 'SARAGURO' }).matches)).toEqual(['gen-01-saraguro-ancestral']);
    expect(ids(searchExperiences({ query: 'raices manabi' }).matches)).toEqual(['costa-01-raices-de-manabi']);
    expect(ids(searchExperiences({ query: 'leon dormido' }, EXPERIENCES).matches)).toEqual(['gal-04-kicker-rock-tour-360']);
    expect(searchExperiences({ query: 'saraguro surf' }).matches).toEqual([]);
    expect(searchExperiences({ query: '   ' }, EXPERIENCES).matches).toHaveLength(33);
  });

  it('filtra por región, provincia, fuente, tipo y dificultad', () => {
    expect(searchExperiences({ region: 'galapagos' }).matches).toHaveLength(12);
    expect(searchExperiences({ region: 'costa' }).matches).toHaveLength(7);
    expect(searchExperiences({ region: 'sierra' }).matches).toHaveLength(13);
    expect(ids(searchExperiences({ region: 'amazonia' }, EXPERIENCES).matches)).toEqual(['gen-05-oyacachi']);
    expect(ids(searchExperiences({ province: 'manabi' }).matches)).toEqual([
      'costa-01-raices-de-manabi', 'costa-04-sabores-de-manta', 'costa-05-aventura-marina', 'costa-06-expedicion-natural',
    ]);
    expect(searchExperiences({ sourceId: 'catalogo-general-14' }).matches).toHaveLength(14);
    expect(searchExperiences({ sourceId: 'catalogo-amazonia-usuario' }).matches).toHaveLength(AMAZONIA_INSPIRATIONS.length);
    expect(ids(searchExperiences({ kind: 'trip_plan' }).matches)).toEqual(['gal-11-plan-economico-5-dias', 'gal-12-plan-normal-5-dias']);
    expect(ids(searchExperiences({ difficulty: 'alta' }, EXPERIENCES).matches)).toEqual(['gal-07-sierra-negra-volcan-chico']);
    expect(ids(searchExperiences({ region: 'sierra', query: 'choco andino' }).matches)).toEqual(['gen-03-yunguilla', 'gen-14-mindo']);
  });

  it('compara el tope de precio solo en USD y devuelve aparte lo publicado en euros', () => {
    const result = searchExperiences({ region: 'galapagos', maxPricePerPerson: 60 });
    expect(ids(result.matches)).toEqual(['gal-05-san-cristobal-terrestre']);
    expect(ids(result.notComparable)).toEqual(['gal-07-sierra-negra-volcan-chico', 'gal-08-tintoreras-concha-perla']);
    // Aunque 46,40 y 56 sean «menores que 60», no se comparan: son euros.
    expect(result.matches.every(record => record.price.currency === 'USD')).toBe(true);
    // Con un tope altísimo siguen sin mezclarse.
    expect(ids(searchExperiences({ region: 'galapagos', maxPricePerPerson: 100000 }).notComparable)).toHaveLength(2);
    // El tope se compara contra el mínimo del rango.
    expect(ids(searchExperiences({ region: 'galapagos', maxPricePerPerson: 270 }).matches)).toEqual([
      'gal-01-bartolome-bahia-sullivan', 'gal-03-plaza-sur-punta-carrion', 'gal-04-kicker-rock-tour-360', 'gal-05-san-cristobal-terrestre', 'gal-06-los-tuneles-cabo-rosa',
    ]);
    expect(ids(searchExperiences({ maxPricePerPerson: 8 }, EXPERIENCES).matches)).toEqual(['gen-11-quito', 'gen-12-loja']);
    expect(searchExperiences({ maxPricePerPerson: 0 }, EXPERIENCES).matches).toEqual([]);
  });

  it('los demás filtros se aplican antes de separar lo no comparable', () => {
    const result = searchExperiences({ maxPricePerPerson: 500, difficulty: 'alta' }, EXPERIENCES);
    expect(result.matches).toEqual([]);
    expect(ids(result.notComparable)).toEqual(['gal-07-sierra-negra-volcan-chico']);
    expect(searchExperiences({ maxPricePerPerson: 500, region: 'costa' }).notComparable).toEqual([]);
  });

  it('una ficha sin monto tampoco es comparable, y un tope inválido no devuelve nada', () => {
    const unpriced = AMAZONIA_INSPIRATIONS.filter(record => record.price.min === null);
    expect(unpriced.length).toBeGreaterThan(0);
    const result = searchExperiences({ maxPricePerPerson: 1000, sourceId: 'catalogo-amazonia-usuario' });
    expect(ids(result.notComparable)).toEqual(ids(unpriced));
    expect(searchExperiences({ maxPricePerPerson: Number.NaN })).toEqual({ matches: [], notComparable: [] });
    expect(searchExperiences({ maxPricePerPerson: -1 })).toEqual({ matches: [], notComparable: [] });
  });

  it('filtra por duración máxima en horas y deja fuera lo que no declara duración', () => {
    expect(ids(searchExperiences({ maxDurationHours: 4 }, EXPERIENCES).matches)).toEqual(['costa-05-aventura-marina', 'gal-05-san-cristobal-terrestre']);
    expect(ids(searchExperiences({ maxDurationHours: 5, region: 'costa' }).matches)).toEqual([
      'costa-01-raices-de-manabi', 'costa-04-sabores-de-manta', 'costa-05-aventura-marina',
    ]);
    const oneDay = searchExperiences({ maxDurationHours: 24 }, EXPERIENCES).matches;
    expect(oneDay.some(record => (record.duration.days ?? 0) > 1)).toBe(false);
    // «Medio día» sin horas en la fuente: no se le inventa una duración.
    expect(ids(oneDay)).not.toContain('gal-08-tintoreras-concha-perla');
    expect(ids(searchExperiences({ maxDurationHours: 96, region: 'galapagos', kind: 'multi_day_program' }).matches)).toEqual(['gal-09-isabela-4-dias']);
    expect(searchExperiences({ maxDurationHours: 0 }).matches).toEqual([]);
  });

  it('filtra por etiquetas: deben estar todas', () => {
    expect(ids(searchExperiences({ tags: ['termas'] }, EXPERIENCES).matches)).toEqual(['gen-05-oyacachi', 'gen-06-valle-de-intag', 'gen-07-banos-de-agua-santa']);
    expect(ids(searchExperiences({ tags: ['termas', 'Aventura'] }, EXPERIENCES).matches)).toEqual(['gen-07-banos-de-agua-santa']);
    expect(searchExperiences({ tags: ['surf', 'volcan'] }, EXPERIENCES).matches).toEqual([]);
    expect(searchExperiences({ tags: ['area-protegida'], region: 'galapagos' }).matches).toHaveLength(10);
    for (const record of EXPERIENCES) {
      expect(record.tags.length).toBeGreaterThanOrEqual(5);
      record.tags.forEach(tag => expect(tag).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
    }
  });
});

describe('formatPrice y priceDisclaimer', () => {
  it('muestra moneda original y rango con formato de Ecuador', () => {
    expect(formatPrice(byId('gen-01-saraguro-ancestral').price)).toBe('USD 45 por persona');
    expect(formatPrice(byId('gal-01-bartolome-bahia-sullivan').price)).toBe('USD 270–315 por persona');
    expect(formatPrice(byId('gal-03-plaza-sur-punta-carrion').price)).toBe('Desde USD 270 por persona');
    expect(formatPrice(byId('gal-07-sierra-negra-volcan-chico').price)).toBe('Desde EUR 46,40 por persona');
    expect(formatPrice(byId('gal-08-tintoreras-concha-perla').price)).toBe('Desde EUR 56 por persona');
    expect(formatPrice(byId('gal-09-isabela-4-dias').price)).toBe('USD 855–1.135 por persona');
    expect(formatPrice(byId('gal-10-galapagos-origins-5-dias').price)).toBe('USD 1.200–1.600 por persona');
    expect(formatPrice(byId('gal-12-plan-normal-5-dias').price)).toBe('USD 1.193 por persona');
  });

  it('no inventa un monto cuando la ficha no lo tiene', () => {
    const unpriced = AMAZONIA_INSPIRATIONS.find(record => record.price.min === null)!;
    expect(formatPrice(unpriced.price)).toBe('Precio por confirmar');
    expect(formatPrice({ ...byId('gen-11-quito').price, min: 0.5, max: 1234567.5 })).toBe('USD 0,50–1.234.567,50 por persona');
  });

  it('el aviso distingue precio referencial de tarifa propuesta y nunca ofrece reservar', () => {
    const referential = priceDisclaimer(byId('gen-08-cuenca'));
    expect(referential).toMatch(/^Precio referencial/);
    expect(referential).toMatch(/No es una tarifa oficial ni una oferta verificada/);
    const proposed = priceDisclaimer(byId('costa-03-pacifico-activo'));
    expect(proposed).toMatch(/^Tarifa propuesta, pendiente de convenio/);
    expect(proposed).toMatch(/No es una cotización aceptada/);
    expect(proposed).not.toMatch(/euros/);
    expect(priceDisclaimer(byId('gal-03-plaza-sur-punta-carrion'))).toMatch(/solo indica un precio «desde»/);
    expect(priceDisclaimer(byId('gal-02-seymour-norte-las-bachas'))).toMatch(/se pagan aparte y dependen de nacionalidad, residencia y edad/);
    for (const record of ALL_EXPERIENCES) {
      expect(priceDisclaimer(record)).toMatch(/no se puede reservar ni pagar en CHULLA VIDA/);
    }
  });
});
