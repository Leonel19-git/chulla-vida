import type { CostComponent, DatedNotice, Experience, ExperiencePrice } from '../types';
import { GALAPAGOS_DOCUMENT, GALAPAGOS_FIXED_COSTS, GALAPAGOS_NOTES, GALAPAGOS_STATUS_SNAPSHOT } from '../sources';
import { days, defineExperience, hours, petProhibitedGalapagos, wx, type ExperienceInput } from './shared';

const PUERTO_AYORA = wx('Puerto Ayora', -0.74, -90.31);
const PUERTO_BAQUERIZO = wx('Puerto Baquerizo Moreno', -0.9, -89.61);
const PUERTO_VILLAMIL = wx('Puerto Villamil', -0.96, -90.97);

const BY_OPERATOR = { max: null, label: 'Según operador (por confirmar)' };

/** Reglas que valen para las doce fichas; no sustituyen las disposiciones vigentes del Parque. */
const PARK_RULES = [
  'Los sitios de visita y los itinerarios dependen de las disposiciones del Parque Nacional Galápagos; donde el Parque lo exige, la visita se hace con guía autorizado.',
  'El estado de apertura que trae el catálogo es una fotografía fechada, no un aviso en tiempo real: antes de planificar hay que consultar al Parque Nacional Galápagos, a los operadores y a los organismos competentes.',
  'No se garantiza el avistamiento de especies.',
];

const FIXED_COSTS_NOTE =
  'Tasa de ingreso, Tarjeta de Control de Tránsito, vuelos, lanchas entre islas y hospedaje son conceptos aparte, listados por separado; sus valores y requisitos dependen de nacionalidad, residencia y edad y deben revalidarse antes de cotizar.';

type PriceInput = Pick<ExperiencePrice, 'currency' | 'min' | 'max' | 'originalLabel'> &
  Partial<Pick<ExperiencePrice, 'includes' | 'excludes' | 'assumptions' | 'groupBreakdown' | 'options' | 'costBreakdown' | 'separateCosts'>>;

const referential = (input: PriceInput): ExperiencePrice => ({
  type: 'referential',
  unit: 'per_person',
  includes: [],
  excludes: [],
  ...input,
  assumptions: [...(input.assumptions ?? []), GALAPAGOS_NOTES.prices, FIXED_COSTS_NOTE],
  separateCosts: [...(input.separateCosts ?? []), ...GALAPAGOS_FIXED_COSTS],
});

const usd = (min: number, max: number | null, originalLabel: string, extra: Partial<PriceInput> = {}): ExperiencePrice =>
  referential({ currency: 'USD', min, max, originalLabel, ...extra });

/** La fuente lo publica en euros: se conserva tal cual, sin convertir. */
const eur = (min: number, originalLabel: string): ExperiencePrice =>
  referential({
    currency: 'EUR',
    min,
    max: null,
    originalLabel,
    assumptions: [
      'La fuente publica este precio en euros y lo deja «por confirmar en dólares»: no se convierte ni se presenta como tarifa en USD.',
    ],
  });

const notice = (text: string, asOf: string | null, kind: DatedNotice['kind']): DatedNotice => ({ text, asOf, kind, historical: true });

const component = (concept: string, amount: number, detail: string): CostComponent => ({ concept, amount, currency: 'USD', detail });

type GalapagosInput = Omit<
  ExperienceInput,
  'contentSourceId' | 'originalDocument' | 'localizedRegion' | 'province' | 'conditions' | 'petPolicy' | 'warnings' | 'activityConstraints'
> & { ownWarnings?: DatedNotice[]; ownConstraints?: string[] };

const galapagos = ({ ownWarnings = [], ownConstraints = [], ...input }: GalapagosInput): Experience =>
  defineExperience({
    ...input,
    contentSourceId: 'catalogo-galapagos-12',
    originalDocument: GALAPAGOS_DOCUMENT,
    localizedRegion: 'galapagos',
    province: 'Galápagos',
    conditions: [GALAPAGOS_NOTES.estimates, GALAPAGOS_NOTES.beforeBooking],
    // Primero los avisos propios de la ficha; después, la fotografía general del archipiélago.
    warnings: [...ownWarnings, ...GALAPAGOS_STATUS_SNAPSHOT],
    activityConstraints: [...ownConstraints, ...PARK_RULES],
    petPolicy: petProhibitedGalapagos(),
  });

const PLAN_DISCLAIMER =
  'Es un plan de presupuesto orientativo armado con datos de la fuente, no un paquete ni una reserva: no puede venderse sin convenio ni confirmación de vuelos, accesos y operadores.';

export const GALAPAGOS_EXPERIENCES: readonly Experience[] = [
  galapagos({
    id: 'gal-01-bartolome-bahia-sullivan',
    sourceOrder: 1,
    title: 'Bartolomé y Bahía Sullivan',
    subregion: 'Galápagos central',
    locality: 'Puerto Ayora, Santa Cruz, Galápagos',
    weatherReference: PUERTO_AYORA,
    duration: hours('1 día (aprox. 7:00 a 18:00)', 11, 11, 1),
    difficulty: 'moderada',
    difficultyLabel: 'Moderada',
    capacity: BY_OPERATOR,
    summary: 'Excursión en barco a una de las postales más famosas del archipiélago.',
    description:
      'Excursión en barco a una de las postales más famosas del archipiélago. Se asciende a pie hasta el mirador de Pinnacle Rock y se complementa con snorkel en aguas con peces tropicales y, con suerte, pingüinos.',
    attractions: ['Pinnacle Rock', 'Bahía Sullivan', 'Playas de arena oscura', 'Vistas volcánicas'],
    activities: ['Caminata hasta el mirador', 'Snorkel', 'Fotografía', 'Observación de fauna'],
    ownWarnings: [
      notice(
        'Los sitios de visita y los itinerarios dependen de las disposiciones del Parque Nacional Galápagos, que tras las inundaciones de octubre de 2026 mantiene cierres preventivos en algunos puntos de Santa Cruz.',
        '2026-11-12',
        'closure',
      ),
    ],
    price: usd(270, 315, '$270 a $315 por persona'),
    tags: ['area-protegida', 'navegacion', 'snorkel', 'caminata', 'miradores', 'fauna', 'fotografia'],
  }),
  galapagos({
    id: 'gal-02-seymour-norte-las-bachas',
    sourceOrder: 2,
    title: 'Isla Seymour Norte y Las Bachas',
    subregion: 'Galápagos central',
    locality: 'Puerto Ayora, Santa Cruz, Galápagos',
    weatherReference: PUERTO_AYORA,
    duration: days('1 día', 1),
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    capacity: BY_OPERATOR,
    summary: 'Día de barco para quienes priorizan la vida silvestre, en especial las aves marinas.',
    description:
      'Día de barco para quienes priorizan la vida silvestre, en especial las aves marinas. Los senderos cortos pasan cerca de lobos marinos, iguanas terrestres y gaviotas de cola bifurcada, y la jornada suele cerrar con snorkel y playa.',
    attractions: ['Senderos de Seymour Norte', 'Playa Las Bachas', 'Colonias de aves'],
    activities: ['Senderismo guiado', 'Snorkel', 'Playa', 'Observación de fauna'],
    price: usd(300, 315, '$300 a $315 por persona'),
    tags: ['area-protegida', 'navegacion', 'aves', 'fauna', 'senderismo', 'snorkel', 'playa'],
  }),
  galapagos({
    id: 'gal-03-plaza-sur-punta-carrion',
    sourceOrder: 3,
    title: 'Plaza Sur y Punta Carrión',
    subregion: 'Galápagos central',
    locality: 'Puerto Ayora, Santa Cruz, Galápagos',
    weatherReference: PUERTO_AYORA,
    duration: days('1 día', 1),
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    capacity: BY_OPERATOR,
    summary: 'Isla pequeña con una animada colonia de lobos marinos, iguanas terrestres, cactus gigantes y flora endémica.',
    description:
      'Isla pequeña con una animada colonia de lobos marinos, iguanas terrestres, cactus gigantes y flora endémica. Se complementa con snorkel en Punta Carrión.',
    attractions: ['Colonia de lobos marinos', 'Iguanas terrestres', 'Cactus opuntia', 'Punta Carrión'],
    activities: ['Caminata guiada', 'Snorkel', 'Fotografía'],
    price: usd(270, null, 'Desde $270 por persona (por confirmar)', {
      assumptions: ['La fuente solo da un precio «desde» y lo marca «por confirmar»: no hay tope conocido.'],
    }),
    tags: ['area-protegida', 'navegacion', 'fauna', 'flora-endemica', 'caminata', 'snorkel', 'fotografia'],
  }),
  galapagos({
    id: 'gal-04-kicker-rock-tour-360',
    sourceOrder: 4,
    title: 'Kicker Rock (León Dormido) y Tour 360°',
    subregion: 'Galápagos oriental',
    locality: 'Puerto Baquerizo Moreno, San Cristóbal, Galápagos',
    weatherReference: PUERTO_BAQUERIZO,
    duration: hours('1 día (aprox. 7 horas)', 7, 7, 1),
    difficulty: 'moderada',
    difficultyLabel: 'Moderada',
    capacity: BY_OPERATOR,
    summary: 'El snorkel más reconocido de San Cristóbal.',
    description:
      'El snorkel más reconocido de San Cristóbal. Dos monolitos de unos 150 metros separados por un canal de aguas profundas donde se ven tortugas marinas, rayas, tiburones de arrecife y, en ocasiones, tiburones martillo. El tour 360° rodea la isla con paradas en bahías y playas. Incluye traje de neopreno; el agua es fría y puede haber corrientes.',
    attractions: ['León Dormido', 'Cerro Brujo', 'Punta Pitt', 'Rosa Blanca', 'Bahía Sardina'],
    activities: ['Snorkel (buceo con certificación en algunas salidas)', 'Navegación', 'Playa', 'Fotografía'],
    ownConstraints: [
      'El agua es fría y puede haber corrientes.',
      'El buceo solo se ofrece en algunas salidas y exige certificación.',
    ],
    price: usd(216, 220, '$216 a $220 por persona', { includes: ['Traje de neopreno'] }),
    tags: ['area-protegida', 'snorkel', 'buceo', 'navegacion', 'fauna-marina', 'playa', 'fotografia'],
  }),
  galapagos({
    id: 'gal-05-san-cristobal-terrestre',
    sourceOrder: 5,
    title: 'San Cristóbal terrestre: El Junco, Galapaguera y Puerto Chino',
    subregion: 'Galápagos oriental',
    locality: 'San Cristóbal, Galápagos',
    weatherReference: PUERTO_BAQUERIZO,
    duration: hours('Medio día (aprox. 4 horas)', 4, 4),
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    capacity: BY_OPERATOR,
    summary: 'Recorrido por las tierras altas de la isla: laguna de agua dulce, centro de crianza de tortugas gigantes y una playa de arena clara.',
    description:
      'Recorrido por las tierras altas de la isla: laguna de agua dulce, centro de crianza de tortugas gigantes y una playa de arena clara. Es la opción más económica del catálogo.',
    attractions: ['Laguna El Junco', 'La Galapaguera', 'Puerto Chino'],
    activities: ['Visitas guiadas', 'Fotografía', 'Observación de tortugas'],
    ownWarnings: [
      notice('Al 7 de noviembre de 2026, Puerto Chino seguía cerrado de forma preventiva por las lluvias.', '2026-11-07', 'closure'),
    ],
    ownConstraints: [
      'El catálogo describe Puerto Chino cerrado al 7 de noviembre de 2026: no se da por abierto mientras el Parque Nacional no lo confirme.',
    ],
    accessStatus: 'partially_closed_reported',
    accessCheckedAt: '2026-11-07',
    price: usd(50, 60, '$50 a $60 por persona (dato antiguo, por confirmar)', {
      assumptions: [
        'La fuente lo marca como dato antiguo, por confirmar.',
        'El precio del tour terrestre de San Cristóbal proviene de blogs de viajes.',
      ],
    }),
    tags: ['area-protegida', 'tierras-altas', 'tortugas', 'laguna', 'playa', 'visita-guiada', 'fotografia'],
  }),
  galapagos({
    id: 'gal-06-los-tuneles-cabo-rosa',
    sourceOrder: 6,
    title: 'Los Túneles (Cabo Rosa)',
    subregion: 'Galápagos occidental',
    locality: 'Puerto Villamil, Isabela, Galápagos',
    weatherReference: PUERTO_VILLAMIL,
    duration: days('1 día', 1),
    difficulty: 'moderada',
    difficultyLabel: 'Moderada',
    capacity: BY_OPERATOR,
    summary: 'Formaciones de lava convertidas en arcos y túneles, tanto sobre el agua como bajo ella.',
    description:
      'Formaciones de lava convertidas en arcos y túneles, tanto sobre el agua como bajo ella. Se llega tras 30 a 40 minutos de navegación y se explora una zona de unos 800 metros con tortugas, rayas, tiburones y peces de colores. El agua ronda los 20 °C.',
    attractions: ['Arcos y puentes de lava', 'Cabo Rosa', 'Fauna marina'],
    activities: ['Snorkel guiado', 'Navegación', 'Fotografía'],
    ownConstraints: ['El agua ronda los 20 °C.'],
    price: usd(150, 190, '$150 a $190 por persona'),
    tags: ['area-protegida', 'snorkel', 'navegacion', 'lava', 'fauna-marina', 'fotografia'],
  }),
  galapagos({
    id: 'gal-07-sierra-negra-volcan-chico',
    sourceOrder: 7,
    title: 'Volcán Sierra Negra y Volcán Chico',
    subregion: 'Galápagos occidental',
    locality: 'Puerto Villamil, Isabela, Galápagos',
    weatherReference: PUERTO_VILLAMIL,
    duration: hours('1 día (aprox. 8 horas)', 8, 8, 1),
    difficulty: 'alta',
    difficultyLabel: 'Alta (unos 16 km de caminata)',
    capacity: BY_OPERATOR,
    summary: 'Caminata por uno de los cráteres volcánicos más grandes del mundo y por paisajes de lava negra.',
    description:
      'Caminata por uno de los cráteres volcánicos más grandes del mundo y por paisajes de lava negra con vistas hacia el norte de Isabela y Fernandina.',
    attractions: ['Cráter de Sierra Negra', 'Volcán Chico', 'Mirador de lava'],
    activities: ['Senderismo de larga distancia', 'Fotografía', 'Observación del paisaje'],
    ownConstraints: ['Caminata exigente de unos 16 km.'],
    price: eur(46.4, 'Desde €46,40 por persona (por confirmar en dólares)'),
    tags: ['area-protegida', 'volcan', 'senderismo', 'caminata-larga', 'lava', 'fotografia'],
  }),
  galapagos({
    id: 'gal-08-tintoreras-concha-perla',
    sourceOrder: 8,
    title: 'Tintoreras y Concha Perla',
    subregion: 'Galápagos occidental',
    locality: 'Puerto Villamil, Isabela, Galápagos',
    weatherReference: PUERTO_VILLAMIL,
    duration: { label: 'Medio día', minHours: null, maxHours: null, days: null, nights: null },
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    capacity: BY_OPERATOR,
    summary: 'Dos paseos cercanos al muelle.',
    description:
      'Dos paseos cercanos al muelle. En Las Tintoreras se navega por canales de lava para ver tiburones de aleta blanca y aves como el piquero de patas azules, y con suerte pingüinos. En la laguna Concha Perla se hace snorkel con lobos marinos, peces y tortugas.',
    attractions: ['Islote Las Tintoreras', 'Canal del Amor', 'Playa de los Perros', 'Laguna Concha Perla'],
    activities: ['Navegación', 'Caminata corta', 'Snorkel', 'Fotografía'],
    price: eur(56, 'Desde €56 por persona (por confirmar en dólares)'),
    tags: ['area-protegida', 'navegacion', 'snorkel', 'fauna-marina', 'aves', 'caminata', 'fotografia'],
  }),
  galapagos({
    id: 'gal-09-isabela-4-dias',
    sourceOrder: 9,
    title: 'Isabela en 4 días (tierra firme)',
    kind: 'multi_day_program',
    subregion: 'Galápagos occidental',
    locality: 'Puerto Villamil, Isabela, Galápagos',
    weatherReference: PUERTO_VILLAMIL,
    duration: days('4 días', 4),
    difficulty: 'moderada',
    difficultyLabel: 'Moderada',
    capacity: { max: null, label: 'Según operador (el precio baja con grupos más grandes)' },
    summary: 'Programa que combina Tintoreras, Los Túneles con snorkel, Centro de Crianza de Tortugas, Muro de las Lágrimas y la caminata al volcán Sierra Negra.',
    description:
      'Programa que combina Tintoreras, Los Túneles con snorkel, Centro de Crianza de Tortugas, Muro de las Lágrimas y la caminata al volcán Sierra Negra.',
    attractions: ['Tintoreras', 'Los Túneles', 'Muro de las Lágrimas', 'Sierra Negra', 'Humedales'],
    activities: ['Snorkel', 'Caminata', 'Ciclismo', 'Visitas guiadas'],
    ownConstraints: [
      'El programa menciona los humedales; el catálogo describe Los Humedales cerrados al 7 de noviembre de 2026: no se dan por abiertos sin confirmación del Parque Nacional.',
    ],
    price: usd(
      855,
      1135,
      'De $855 a $1.135 por persona, según tamaño del grupo (2 personas: $1.135; 3: $1.010; 4: $915; 5: $880; 6: $855)',
      {
        assumptions: ['El precio por persona depende del tamaño del grupo: baja con grupos más grandes. La fuente no detalla qué incluye.'],
        groupBreakdown: [
          { groupSize: 2, amountPerPerson: 1135 },
          { groupSize: 3, amountPerPerson: 1010 },
          { groupSize: 4, amountPerPerson: 915 },
          { groupSize: 5, amountPerPerson: 880 },
          { groupSize: 6, amountPerPerson: 855 },
        ],
      },
    ),
    tags: ['area-protegida', 'varios-dias', 'snorkel', 'caminata', 'ciclismo', 'volcan', 'tortugas'],
  }),
  galapagos({
    id: 'gal-10-galapagos-origins-5-dias',
    sourceOrder: 10,
    title: 'Galápagos Origins: Santa Cruz y San Cristóbal (5 días)',
    kind: 'multi_day_program',
    subregion: 'Galápagos central y oriental',
    locality: 'Santa Cruz y San Cristóbal, Galápagos',
    // Recorre dos islas: sin una sola localidad de referencia.
    weatherReference: null,
    duration: days('5 días', 5),
    difficulty: 'facil_moderada',
    difficultyLabel: 'Fácil a moderada',
    capacity: { max: null, label: 'Semiprivado, salidas flexibles' },
    summary: 'Ruta de isla en isla desde tierra firme.',
    description:
      'Ruta de isla en isla desde tierra firme. Incluye excursiones guiadas, un día de barco a Bartolomé o Seymour Norte, el tour a Kicker Rock y los traslados en lancha entre islas. Los vuelos y la tasa de ingreso se calculan aparte.',
    attractions: ['Tortuga Bay', 'Bartolomé o Seymour Norte', 'El Junco', 'Puerto Chino', 'Kicker Rock'],
    activities: ['Snorkel', 'Caminatas guiadas', 'Playa', 'Observación de fauna'],
    ownConstraints: [
      'La ruta incluye Puerto Chino, que el catálogo describe cerrado al 7 de noviembre de 2026, y Tortuga Bay, cuyo estado tras las inundaciones no se verificó.',
    ],
    price: usd(1200, 1600, '$1.200 (gama media) a $1.600 (primera clase) por persona', {
      includes: [
        'Excursiones guiadas',
        'Un día de barco a Bartolomé o Seymour Norte',
        'Tour a Kicker Rock',
        'Traslados en lancha entre islas',
      ],
      excludes: ['Vuelos (se calculan aparte)', 'Tasa de ingreso al Parque Nacional Galápagos (se calcula aparte)'],
      options: [
        { id: 'gama-media', label: 'Gama media', min: 1200, max: 1200, currency: 'USD', unit: 'per_person', durationLabel: '5 días', notes: 'Referencial; por confirmar con el operador.' },
        { id: 'primera-clase', label: 'Primera clase', min: 1600, max: 1600, currency: 'USD', unit: 'per_person', durationLabel: '5 días', notes: 'Referencial; por confirmar con el operador.' },
      ],
    }),
    tags: ['area-protegida', 'varios-dias', 'isla-en-isla', 'snorkel', 'caminata', 'playa', 'fauna'],
  }),
  galapagos({
    id: 'gal-11-plan-economico-5-dias',
    sourceOrder: 11,
    title: 'Plan económico: 5 días / 4 noches',
    kind: 'trip_plan',
    subregion: 'Galápagos central y occidental',
    locality: 'Puerto Ayora (Santa Cruz) y Puerto Villamil (Isabela), Galápagos',
    // La fuente fija la base del plan en Santa Cruz.
    weatherReference: PUERTO_AYORA,
    duration: days('5 días y 4 noches', 5, 4),
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    capacity: { max: null, label: 'Individual o en grupo (hospedaje calculado por persona)' },
    summary: 'Plan de bajo costo con base en Santa Cruz y una escapada a Isabela.',
    description:
      'Plan de bajo costo con base en Santa Cruz y una escapada a Isabela. Combina sitios gratuitos con dos tours de bajo precio. Desglose por persona: hospedaje $180 (aprox. $45 por noche), comida $100, lancha Santa Cruz–Isabela ida y vuelta $60, tours $155, transporte local $15.',
    attractions: [
      'Estación Científica Charles Darwin (entrada gratuita)',
      'Tortuga Bay (caminata de unos 45 minutos)',
      'Laguna Concha Perla',
      'Día de barco a Santa Fe',
    ],
    activities: [
      'Caminatas',
      'Snorkel',
      'Observación de fauna',
      'Visitas a la Estación Charles Darwin',
      'Recorridos por Puerto Ayora',
    ],
    recommendations: ['Para ahorrar, desde Baltra se puede ir en bus y lancha corta hasta Puerto Ayora en lugar de taxi.'],
    ownWarnings: [
      notice('El tour a Santa Fe (aprox. $90) proviene de un blog de viajes y debe confirmarse.', '2026-11-12', 'pricing'),
      notice('No se verificó el estado actual de Tortuga Bay tras las inundaciones.', '2026-11-12', 'closure'),
    ],
    ownConstraints: [PLAN_DISCLAIMER],
    price: usd(
      510,
      510,
      'Aprox. $510 por persona en las islas. Total estimado con vuelo Quito–Galápagos ($223) y tasas: $953 extranjero / $783 ecuatoriano',
      {
        assumptions: [
          'Desglose por persona: hospedaje $180 (aprox. $45 por noche), comida $100, lancha Santa Cruz–Isabela ida y vuelta $60, tours $155, transporte local $15.',
          'Los totales con vuelo y tasas son orientativos: dependen del vuelo que se consiga y de la nacionalidad, residencia y edad de cada persona.',
          'El plan asume el vuelo Quito–Galápagos al mínimo reportado ($223), que puede subir hasta $755.',
          GALAPAGOS_NOTES.lessReliable,
        ],
        costBreakdown: [
          component('Hospedaje', 180, 'hospedaje $180 (aprox. $45 por noche)'),
          component('Comida', 100, 'comida $100'),
          component('Lancha Santa Cruz–Isabela ida y vuelta', 60, 'lancha Santa Cruz–Isabela ida y vuelta $60'),
          component('Tours', 155, 'tours $155'),
          component('Transporte local', 15, 'transporte local $15'),
        ],
        options: [
          { id: 'total-extranjero', label: 'Total estimado con vuelo y tasas · persona extranjera', min: 953, max: 953, currency: 'USD', unit: 'per_person', durationLabel: '5 días y 4 noches', notes: 'Orientativo: $510 en islas + vuelo $223 + tasas. No es una cotización ni una reserva.' },
          { id: 'total-ecuatoriano', label: 'Total estimado con vuelo y tasas · persona ecuatoriana', min: 783, max: 783, currency: 'USD', unit: 'per_person', durationLabel: '5 días y 4 noches', notes: 'Orientativo: $510 en islas + vuelo $223 + tasas. No es una cotización ni una reserva.' },
        ],
        separateCosts: [
          {
            concept: 'Vuelo Quito–Galápagos asumido en este plan',
            detail: 'Total estimado con vuelo Quito–Galápagos ($223) y tasas: $953 extranjero / $783 ecuatoriano',
            currency: 'USD',
            min: 223,
            max: 223,
            requiresRevalidation: true,
          },
        ],
      },
    ),
    tags: ['plan-orientativo', 'presupuesto', 'bajo-costo', 'varios-dias', 'snorkel', 'caminata', 'fauna'],
  }),
  galapagos({
    id: 'gal-12-plan-normal-5-dias',
    sourceOrder: 12,
    title: 'Plan normal: 5 días / 4 noches',
    kind: 'trip_plan',
    subregion: 'Galápagos central y occidental',
    locality: 'Puerto Ayora (Santa Cruz) y Puerto Villamil (Isabela), Galápagos',
    // Reparte los días entre dos islas: sin una sola localidad de referencia.
    weatherReference: null,
    duration: days('5 días y 4 noches', 5, 4),
    difficulty: 'moderada',
    difficultyLabel: 'Moderada',
    capacity: { max: null, label: 'Individual o en grupo (hospedaje calculado por persona)' },
    summary: 'Plan de gama media con hotel de 3 estrellas y los tours más reconocidos del archipiélago.',
    description:
      'Plan de gama media con hotel de 3 estrellas y los tours más reconocidos del archipiélago. Desglose por persona: hospedaje $380 (aprox. $95 por noche), comida $200, lancha Santa Cruz–Isabela ida y vuelta $60, tours $523, transporte local $30.',
    attractions: ['Bartolomé y Bahía Sullivan', 'Los Túneles', 'Volcán Sierra Negra', 'Estación Científica Charles Darwin'],
    activities: ['Día de barco con caminata y snorkel', 'Snorkel en lava', 'Senderismo volcánico', 'Observación de fauna'],
    ownWarnings: [
      notice('El vuelo del nivel normal, la comida y el transporte local son estimaciones y deben confirmarse.', '2026-11-12', 'pricing'),
      notice('Los tours en euros se convirtieron con un tipo de cambio supuesto de 1,15.', '2026-11-12', 'pricing'),
    ],
    ownConstraints: [PLAN_DISCLAIMER],
    price: usd(
      1193,
      1193,
      'Aprox. $1.193 por persona en las islas. Total estimado con vuelo Quito–Galápagos (aprox. $300) y tasas: $1.713 extranjero / $1.543 ecuatoriano',
      {
        assumptions: [
          'Desglose por persona: hospedaje $380 (aprox. $95 por noche), comida $200, lancha Santa Cruz–Isabela ida y vuelta $60, tours $523, transporte local $30.',
          'La partida de tours ($523) incluye tours publicados en euros que la propia fuente convirtió con un tipo de cambio supuesto de 1,15: es una estimación de la fuente, no una conversión de CHULLA VIDA ni una tarifa en dólares confirmada.',
          'Los totales con vuelo y tasas son orientativos: dependen del vuelo que se consiga y de la nacionalidad, residencia y edad de cada persona.',
          'El vuelo de este plan (aprox. $300) es una estimación propia de la fuente.',
          GALAPAGOS_NOTES.lessReliable,
        ],
        costBreakdown: [
          component('Hospedaje', 380, 'hospedaje $380 (aprox. $95 por noche)'),
          component('Comida', 200, 'comida $200'),
          component('Lancha Santa Cruz–Isabela ida y vuelta', 60, 'lancha Santa Cruz–Isabela ida y vuelta $60'),
          component('Tours', 523, 'tours $523'),
          component('Transporte local', 30, 'transporte local $30'),
        ],
        options: [
          { id: 'total-extranjero', label: 'Total estimado con vuelo y tasas · persona extranjera', min: 1713, max: 1713, currency: 'USD', unit: 'per_person', durationLabel: '5 días y 4 noches', notes: 'Orientativo: $1.193 en islas + vuelo aprox. $300 + tasas. No es una cotización ni una reserva.' },
          { id: 'total-ecuatoriano', label: 'Total estimado con vuelo y tasas · persona ecuatoriana', min: 1543, max: 1543, currency: 'USD', unit: 'per_person', durationLabel: '5 días y 4 noches', notes: 'Orientativo: $1.193 en islas + vuelo aprox. $300 + tasas. No es una cotización ni una reserva.' },
        ],
        separateCosts: [
          {
            concept: 'Vuelo Quito–Galápagos asumido en este plan (estimación)',
            detail: 'Total estimado con vuelo Quito–Galápagos (aprox. $300) y tasas: $1.713 extranjero / $1.543 ecuatoriano',
            currency: 'USD',
            min: 300,
            max: 300,
            requiresRevalidation: true,
          },
        ],
      },
    ),
    tags: ['plan-orientativo', 'presupuesto', 'gama-media', 'varios-dias', 'snorkel', 'senderismo', 'volcan'],
  }),
];
