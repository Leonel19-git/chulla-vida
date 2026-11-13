import type { CulturalEvent, EventEdition } from '../catalog/types.js';

/** Fecha en que se revisó el contenido semilla contra la sección 5 de la especificación. */
export const CULTURE_CHECKED_AT = '2026-11-12';

export const CULTURE_SOURCE = {
  title: 'Calendario editorial semilla de Cultura Viva',
  originalDocument: 'CHULLA_VIDA_3_PAQUETE/SUPERPROMPT_CHULLA_VIDA_3_0_CLAUDE_CODE.md, sección 5',
  checkedAt: CULTURE_CHECKED_AT,
  notice:
    'Referencia editorial. Las fechas anuales son orientativas hasta la confirmación oficial de cada edición; no acreditan programación, acceso público ni precios.',
} as const;

/** Única URL que aporta la especificación. Ninguna otra ficha tiene enlace: no se inventan. */
export const LOJA_FESTIVAL_AGENDA_URL = 'https://cultura.ec/festival/artes-vivas-loja?vista=agenda';

const SEED_YEAR = 2026;

/** Edición sin fecha confirmada: solo se conoce el mes habitual. */
const orientative = (): EventEdition => ({
  year: SEED_YEAR,
  startDate: null,
  endDate: null,
  confirmation: 'orientative',
  sourceUrl: null,
  checkedAt: CULTURE_CHECKED_AT,
});

/** La fecha la decide la comunidad; CHULLA VIDA no la fija ni la anuncia. */
const communityDefined = (): EventEdition => ({
  year: SEED_YEAR,
  startDate: null,
  endDate: null,
  confirmation: 'community_defined',
  sourceUrl: null,
  checkedAt: CULTURE_CHECKED_AT,
});

type EventInput = Omit<CulturalEvent, 'slug' | 'lastCheckedAt' | 'officialUrl' | 'localName' | 'community' | 'sensitive' | 'relatedExperienceIds'> &
  Partial<Pick<CulturalEvent, 'officialUrl' | 'localName' | 'community' | 'sensitive' | 'relatedExperienceIds'>>;

const event = (input: EventInput): CulturalEvent => ({
  localName: null,
  community: null,
  sensitive: false,
  officialUrl: null,
  relatedExperienceIds: [],
  ...input,
  slug: input.id,
  lastCheckedAt: CULTURE_CHECKED_AT,
});

export const CULTURAL_EVENT_SEED: readonly CulturalEvent[] = [
  /* ── Sierra ── */
  event({
    id: 'inti-raymi',
    name: 'Inti Raymi',
    localName: 'Inti Raymi',
    category: 'raymi',
    region: 'sierra',
    provinces: ['Imbabura', 'Cañar'],
    localities: ['Otavalo', 'Cotacachi', 'Ingapirca'],
    usualMonths: [6],
    dateLabel: 'Junio; cada comunidad define sus días',
    description:
      'Celebración andina de junio que se vive en Otavalo, Cotacachi e Ingapirca, entre otros lugares. No es una sola fiesta: cada pueblo y comunidad la celebra con sus propias formas, tiempos y significados, y esas diferencias locales merecen conocerse y respetarse.',
    protocols: [
      'Cada comunidad celebra a su manera: pregunta a la organización local qué momentos son abiertos al público y cuáles son ceremoniales o familiares.',
      'Pide permiso antes de fotografiar o grabar a danzantes, músicos y ceremonias.',
      'No entres a los círculos de baile ni a los espacios rituales sin invitación.',
      'En sitios naturales o sagrados, sigue las indicaciones de la comunidad y llévate tus residuos.',
    ],
    editions: [orientative()],
    relatedExperienceIds: ['gen-10-otavalo'],
  }),
  event({
    id: 'mama-negra',
    name: 'Mama Negra',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Cotopaxi'],
    localities: ['Latacunga'],
    usualMonths: [9, 11],
    dateLabel: 'Celebraciones de septiembre y de noviembre en Latacunga',
    description:
      'Fiesta de Latacunga que tiene dos celebraciones en el año, una en septiembre y otra en noviembre, cada una con su organización, recorrido y sentido propios. Antes de ir conviene confirmar cuál se va a presenciar y su programación.',
    protocols: [
      'Son dos celebraciones distintas: confirma con la organización cuál vas a presenciar, su fecha y su recorrido.',
      'Deja libre el paso de las comparsas y sigue las indicaciones de quienes organizan.',
      'Pide permiso antes de fotografiar de cerca a los personajes y participantes.',
      'No uses disfraces ni maquillajes que caricaturicen a los personajes o a cualquier pueblo.',
      'Llévate tus residuos: las calles del recorrido son el barrio de alguien.',
    ],
    editions: [orientative()],
    relatedExperienceIds: ['gen-02-quilotoa-shalala', 'gen-09-parque-nacional-cotopaxi'],
  }),
  event({
    id: 'fruta-flores',
    name: 'Fiesta de la Fruta y de las Flores',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Tungurahua'],
    localities: ['Ambato'],
    usualMonths: [2, 3],
    dateLabel: 'Febrero o marzo; fecha móvil',
    description:
      'Fiesta de Ambato cuyas fechas se mueven cada año entre febrero y marzo. El mes es solo una orientación: la programación de cada edición debe confirmarse con sus organizadores.',
    protocols: [
      'La fecha cambia cada año: confirma la programación de la edición antes de organizar tu viaje.',
      'Respeta los recorridos, las vallas y las indicaciones del personal de la organización.',
      'No toques ni retires frutas, flores o adornos de los arreglos y carros alegóricos.',
      'Pide permiso antes de fotografiar de cerca a participantes y llévate tus residuos.',
    ],
    editions: [orientative()],
    relatedExperienceIds: ['gen-04-salasaca-viva', 'gen-07-banos-de-agua-santa'],
  }),
  event({
    id: 'diablada-pillaro',
    name: 'Diablada de Píllaro',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Tungurahua'],
    localities: ['Píllaro'],
    usualMonths: [1],
    dateLabel: '1–6 de enero',
    description:
      'Tradición de Píllaro que se celebra del 1 al 6 de enero, con partidas de danzantes que recorren el pueblo. La programación de cada año debe confirmarse con la organización local.',
    protocols: [
      'Las partidas bailan por turnos y recorridos acordados: no cruces ni interrumpas a los danzantes.',
      'Pide permiso antes de tocar una máscara o de fotografiar de cerca a quien la lleva.',
      'Consulta con la organización local dónde puede ubicarse el público.',
      'Llévate tus residuos y cuida el espacio que comparte todo el pueblo.',
    ],
    editions: [orientative()],
    relatedExperienceIds: ['gen-04-salasaca-viva', 'gen-07-banos-de-agua-santa'],
  }),
  event({
    id: 'artes-vivas-loja',
    name: 'Festival Internacional de Artes Vivas de Loja',
    category: 'festival_artes',
    region: 'sierra',
    provinces: ['Loja'],
    localities: ['Loja'],
    usualMonths: [11],
    dateLabel: 'Noviembre; edición 2026 programada del 12 al 22 de noviembre',
    description:
      'Encuentro de artes vivas que se realiza en la ciudad de Loja, en la Sierra sur. La edición 2026 está programada del 12 al 22 de noviembre; funciones, salas y condiciones de ingreso se consultan en su agenda oficial.',
    protocols: [
      'Consulta la agenda oficial: cada función tiene su sala, horario y condiciones de ingreso.',
      'Respeta las indicaciones de cada sala o espacio sobre fotografía y grabación.',
      'En las presentaciones de calle, deja libre el paso de artistas y de personas con movilidad reducida.',
      'Llévate tus residuos de plazas y parques.',
    ],
    editions: [
      {
        year: 2026,
        startDate: '2026-11-12',
        endDate: '2026-11-22',
        confirmation: 'confirmed_official',
        sourceUrl: LOJA_FESTIVAL_AGENDA_URL,
        checkedAt: CULTURE_CHECKED_AT,
        provenanceNote:
          'Fechas y enlace tomados de la especificación del proyecto (sección 5). CHULLA VIDA no ha vuelto a comprobar la agenda oficial: debe revalidarse antes de publicarla como confirmada.',
      },
    ],
    officialUrl: LOJA_FESTIVAL_AGENDA_URL,
    relatedExperienceIds: ['gen-12-loja', 'gen-01-saraguro-ancestral'],
  }),

  /* ── Costa ── */
  event({
    id: 'rodeo-montuvio',
    name: 'Rodeo Montuvio',
    category: 'fiesta_popular',
    region: 'costa',
    provinces: [],
    localities: [],
    usualMonths: [10],
    dateLabel: 'Alrededor del 12 de octubre; depende de la localidad',
    description:
      'Celebraciones del pueblo montuvio que se organizan alrededor del 12 de octubre en distintas localidades de la Costa. Cada una tiene su fecha, su recinto y sus organizadores: esta ficha no corresponde a una convocatoria concreta.',
    protocols: [
      'Cada localidad organiza su propio rodeo: confirma lugar, fecha y condiciones con quienes lo organizan.',
      'Sigue las indicaciones de seguridad del recinto y quédate en las zonas destinadas al público.',
      'Pide permiso antes de fotografiar de cerca a jinetes, amazonas y familias.',
      'Llévate tus residuos del recinto.',
    ],
    editions: [orientative()],
  }),
  event({
    id: 'san-pedro-san-pablo',
    name: 'San Pedro y San Pablo',
    category: 'fiesta_popular',
    region: 'costa',
    provinces: ['Manabí'],
    localities: [],
    usualMonths: [6],
    dateLabel: 'Junio; fechas según cada localidad',
    description:
      'Fiestas de junio en localidades de Manabí, con formas de celebrar que cambian de un lugar a otro. Fechas y actos deben confirmarse con quienes las organizan en cada localidad.',
    protocols: [
      'Las fiestas cambian de una localidad a otra: pregunta a quienes las organizan qué actos están abiertos a visitantes.',
      'Respeta las procesiones y los actos religiosos; pregunta antes de sumarte.',
      'Pide permiso antes de fotografiar a participantes y familias.',
      'En playas y muelles, llévate tus residuos.',
    ],
    editions: [orientative()],
    relatedExperienceIds: [
      'costa-01-raices-de-manabi',
      'costa-04-sabores-de-manta',
      'costa-05-aventura-marina',
      'costa-06-expedicion-natural',
    ],
  }),
  event({
    id: 'kasama',
    name: 'Kasama',
    localName: 'Kasama',
    category: 'ceremonia_comunitaria',
    // Santo Domingo de los Tsáchilas pertenece a la región Costa.
    region: 'costa',
    provinces: ['Santo Domingo de los Tsáchilas'],
    localities: [],
    community: 'Pueblo Tsáchila',
    usualMonths: [],
    dateLabel: 'Fecha determinada por el calendario ceremonial del pueblo Tsáchila',
    description:
      'Celebración del pueblo Tsáchila, en Santo Domingo de los Tsáchilas, región Costa. Su fecha la determina el calendario ceremonial del propio pueblo, por eso aquí no se publica una fecha fija. Es una celebración de la comunidad antes que un evento para visitantes.',
    protocols: [
      'La fecha la fija el calendario ceremonial del pueblo Tsáchila: no la des por cierta sin confirmación de sus representantes.',
      'Asiste solo con invitación o autorización de la comuna o de sus representantes.',
      'No fotografíes ni grabes ceremonias, personas o espacios sin consentimiento expreso.',
      'No uses pintura corporal, vestimenta ni símbolos tsáchilas como disfraz.',
      'Respeta el bosque, los ríos y los espacios ceremoniales: no dejes residuos ni te lleves nada.',
    ],
    sensitive: true,
    editions: [communityDefined()],
  }),

  /* ── Amazonía ── */
  event({
    id: 'fiesta-chonta',
    name: 'Fiesta de la Chonta / Uwi',
    localName: 'Uwi',
    category: 'ceremonia_comunitaria',
    region: 'amazonia',
    provinces: [],
    localities: [],
    community: 'Pueblos Shuar y Achuar, según la organización de cada comunidad',
    usualMonths: [4, 5],
    dateLabel: 'Momento definido por cada comunidad; referencia estacional: abril o mayo',
    description:
      'Celebración de los pueblos Shuar y Achuar vinculada con la chonta, que se realiza en las localidades y los momentos que define cada comunidad. No es un espectáculo ni una convocatoria turística: abril y mayo son solo una referencia estacional.',
    protocols: [
      'El lugar y el momento los define cada comunidad: no hay una fecha pública que reservar.',
      'Asiste solo si la comunidad te invita o te autoriza, y acepta un «no» sin insistir.',
      'No fotografíes ni grabes cantos, danzas o personas sin consentimiento expreso.',
      'No la trates como un espectáculo: escucha, pregunta con respeto y sigue las indicaciones de tus anfitriones.',
      'En territorio comunitario y en el bosque, no dejes residuos ni recojas plantas o frutos.',
    ],
    sensitive: true,
    editions: [communityDefined()],
  }),

  /* ── Región Insular ── */
  event({
    id: 'provincializacion-galapagos',
    name: 'Provincialización de Galápagos',
    category: 'civica',
    region: 'galapagos',
    provinces: ['Galápagos'],
    localities: [],
    usualMonths: [2],
    dateLabel: 'Febrero; programa por confirmar en cada isla y municipio',
    description:
      'Conmemoración cívica de febrero en la provincia de Galápagos. Los actos cambian según la isla y el municipio: la programación oficial debe confirmarse antes de planificar.',
    protocols: [
      'Confirma la programación oficial de la isla y el municipio que vas a visitar.',
      'En los actos cívicos, respeta desfiles, espacios reservados e indicaciones de la organización.',
      'Aunque sea una celebración urbana, rigen las reglas del Parque Nacional Galápagos: mantén distancia de la fauna, no la alimentes y no dejes residuos.',
    ],
    editions: [orientative()],
  }),
];
