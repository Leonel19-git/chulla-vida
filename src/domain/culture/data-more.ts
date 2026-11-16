import type { CulturalEvent, EventEdition } from '../catalog/types.js';

/**
 * Fiestas añadidas tras la investigación del 15 de noviembre de 2026 (ver `sources.ts`).
 * Todas con fecha ORIENTATIVA: ninguna edición futura se da por confirmada.
 */
export const CULTURE_MORE_CHECKED_AT = '2026-11-15';

const YEAR = 2027;

const orientative = (): EventEdition => ({
  year: YEAR,
  startDate: null,
  endDate: null,
  confirmation: 'orientative',
  sourceUrl: null,
  checkedAt: CULTURE_MORE_CHECKED_AT,
});

const communityDefined = (): EventEdition => ({
  year: YEAR,
  startDate: null,
  endDate: null,
  confirmation: 'community_defined',
  sourceUrl: null,
  checkedAt: CULTURE_MORE_CHECKED_AT,
});

type Input = Omit<CulturalEvent, 'slug' | 'lastCheckedAt' | 'officialUrl' | 'localName' | 'community' | 'sensitive' | 'relatedExperienceIds' | 'editions'> &
  Partial<Pick<CulturalEvent, 'localName' | 'community' | 'sensitive' | 'relatedExperienceIds' | 'editions'>>;

const event = (input: Input): CulturalEvent => ({
  localName: null,
  community: null,
  sensitive: false,
  relatedExperienceIds: [],
  editions: [orientative()],
  ...input,
  officialUrl: null,
  slug: input.id,
  lastCheckedAt: CULTURE_MORE_CHECKED_AT,
});

export const CULTURAL_EVENT_MORE: readonly CulturalEvent[] = [
  /* ── Sierra ── */
  event({
    id: 'carnaval-guaranda',
    name: 'Carnaval de Guaranda',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Bolívar'],
    localities: ['Guaranda'],
    usualMonths: [2, 3],
    dateLabel: 'Febrero o marzo; sigue la fecha del Carnaval',
    description:
      'El carnaval más cantado del país: coplas, comparsas, el Taita Carnaval y desfiles por Guaranda. Es patrimonio cultural inmaterial del Ecuador.',
    protocols: [
      'La fecha cambia cada año con el Carnaval: confirma la agenda municipal antes de viajar.',
      'Juega con agua solo con quien quiere jugar; nada de huevos ni químicos.',
      'Pide permiso antes de fotografiar de cerca a las comparsas.',
      'Llévate tus residuos de las calles y plazas.',
    ],
  }),
  event({
    id: 'corpus-christi-pujili',
    name: 'Corpus Christi de Pujilí',
    localName: 'Octavas del Danzante',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Cotopaxi'],
    localities: ['Pujilí'],
    usualMonths: [5, 6],
    dateLabel: 'Mayo o junio; sigue la fecha del Corpus Christi',
    description:
      'Fiesta del Danzante de Pujilí: trajes con espejos, cintas y un tocado alto. Un día desfilan comparsas y otro, los danzantes de las comunidades.',
    protocols: [
      'El tocado del danzante pesa y es sagrado para quien lo lleva: no lo toques.',
      'Pide permiso antes de fotografiar a danzantes y priostes.',
      'Deja libre el paso del desfile y sigue a la organización.',
      'Llévate tus residuos.',
    ],
    relatedExperienceIds: ['gen-02-quilotoa-shalala'],
  }),
  event({
    id: 'yamor',
    name: 'Fiesta del Yamor',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Imbabura'],
    localities: ['Otavalo'],
    usualMonths: [9],
    dateLabel: 'Septiembre; a veces arranca a fines de agosto',
    description:
      'Otavalo agradece la cosecha del maíz con la chicha del yamor, hecha con siete variedades de maíz, desfiles, música y la elección de la Reina del Maíz.',
    protocols: [
      'Confirma la agenda del Municipio de Otavalo: las fechas cambian cada año.',
      'Pide permiso antes de fotografiar a familias y danzantes.',
      'La chicha se comparte: acepta o rechaza con cortesía, sin desperdiciar.',
      'Llévate tus residuos.',
    ],
    relatedExperienceIds: ['gen-10-otavalo'],
  }),
  event({
    id: 'pase-nino-viajero',
    name: 'Pase del Niño Viajero',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Azuay'],
    localities: ['Cuenca'],
    usualMonths: [12],
    dateLabel: '24 de diciembre',
    description:
      'Gran desfile navideño de Cuenca: niños y adultos vestidos de personajes bíblicos y de pueblos del país acompañan al Niño. Es patrimonio cultural inmaterial del Ecuador.',
    protocols: [
      'Es un acto de fe: guarda silencio y respeto al paso de la imagen.',
      'Pide permiso antes de fotografiar a niñas y niños.',
      'No cruces entre los carros y caballos del desfile.',
      'Llévate tus residuos.',
    ],
    relatedExperienceIds: ['gen-08-cuenca'],
  }),
  event({
    id: 'fiestas-quito',
    name: 'Fiestas de Quito',
    category: 'civica',
    region: 'sierra',
    provinces: ['Pichincha'],
    localities: ['Quito'],
    usualMonths: [11, 12],
    dateLabel: 'Fines de noviembre hasta el 6 de diciembre',
    description:
      'Quito celebra su fundación con desfiles, chivas, canelazo, conciertos y la sesión solemne del 6 de diciembre.',
    protocols: [
      'Revisa la agenda del Municipio: desfiles y conciertos cambian de fecha y lugar.',
      'En chiva, solo con operadores autorizados y sentado.',
      'Toma con medida y nunca manejes después.',
      'Llévate tus residuos de calles y parques.',
    ],
    relatedExperienceIds: ['gen-11-quito'],
  }),
  event({
    id: 'virgen-del-cisne',
    name: 'Romería de la Virgen de El Cisne',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Loja'],
    localities: ['El Cisne', 'Catamayo', 'Loja'],
    usualMonths: [8, 9],
    dateLabel: 'Caminata del 17 al 20 de agosto; feria en Loja hasta septiembre',
    description:
      'Una de las romerías más grandes del país: miles caminan más de 70 km con la imagen desde El Cisne hasta Loja, donde se hace la feria.',
    protocols: [
      'Es una peregrinación de fe: camina sin empujar y respeta las promesas de cada persona.',
      'Lleva agua, protector solar y calzado cómodo; sigue los puntos de atención.',
      'Pide permiso antes de fotografiar a peregrinos.',
      'Llévate tus residuos del camino.',
    ],
    relatedExperienceIds: ['gen-12-loja'],
  }),
  event({
    id: 'jesus-gran-poder',
    name: 'Procesión de Jesús del Gran Poder',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Pichincha'],
    localities: ['Quito'],
    usualMonths: [3, 4],
    dateLabel: 'Viernes Santo (marzo o abril)',
    description:
      'Cada Viernes Santo, cucuruchos de morado y verónicas recorren el Centro Histórico de Quito desde la plaza de San Francisco.',
    protocols: [
      'Es un acto penitencial: silencio y respeto, nada de bromas ni disfraces.',
      'Pide permiso antes de fotografiar de cerca a cucuruchos y verónicas.',
      'No cruces la procesión; sigue las indicaciones de seguridad.',
      'Llévate tus residuos.',
    ],
    relatedExperienceIds: ['gen-11-quito'],
  }),
  event({
    id: 'pawkar-raymi',
    name: 'Pawkar Raymi',
    localName: 'Pawkar Raymi',
    category: 'raymi',
    region: 'sierra',
    provinces: ['Imbabura'],
    localities: ['Peguche', 'Otavalo'],
    usualMonths: [3],
    dateLabel: 'Alrededor del 21 de marzo (equinoccio)',
    description:
      'Fiesta del florecimiento y Año Nuevo Andino: flores, primeros frutos y música. Abre el ciclo de los cuatro raymis.',
    protocols: [
      'Pregunta a la organización comunitaria qué actos son abiertos al público.',
      'Pide permiso antes de fotografiar ofrendas, danzas y personas.',
      'No pises ni toques las ofrendas de flores y frutos.',
      'Llévate tus residuos del lugar.',
    ],
    relatedExperienceIds: ['gen-10-otavalo'],
  }),
  event({
    id: 'kulla-raymi',
    name: 'Kulla Raymi',
    localName: 'Kulla Raymi',
    category: 'raymi',
    region: 'sierra',
    provinces: [],
    localities: [],
    usualMonths: [9],
    dateLabel: 'Alrededor del 21 de septiembre (equinoccio); cada comunidad define sus días',
    description:
      'Fiesta de la fertilidad de la tierra y de lo femenino: se prepara el suelo para la siembra. La viven las comunidades andinas a su manera.',
    protocols: [
      'Asiste solo si la comunidad lo abre al público o te invita.',
      'No fotografíes ni grabes ceremonias sin permiso expreso.',
      'No uses vestimenta ni símbolos rituales como disfraz.',
      'Respeta los lugares sagrados y no dejes residuos.',
    ],
    editions: [communityDefined()],
  }),
  event({
    id: 'kapak-raymi',
    name: 'Kapak Raymi',
    localName: 'Kapak Raymi',
    category: 'raymi',
    region: 'sierra',
    provinces: [],
    localities: [],
    usualMonths: [12],
    dateLabel: 'Alrededor del 21 de diciembre (solsticio); cada comunidad define sus días',
    description:
      'Fiesta de la germinación y de las nuevas generaciones: se honra a niños, jóvenes y nuevos líderes. Cada comunidad la vive a su manera.',
    protocols: [
      'Asiste solo con invitación o si la comunidad lo abre al público.',
      'Pide permiso antes de fotografiar, sobre todo a niñas, niños y jóvenes.',
      'Escucha y sigue a tus anfitriones: no es un espectáculo.',
      'No dejes residuos en el lugar.',
    ],
    editions: [communityDefined()],
  }),
  event({
    id: 'dia-difuntos',
    name: 'Día de los Difuntos',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: [],
    localities: ['Todo el país'],
    usualMonths: [11],
    dateLabel: '2 de noviembre',
    description:
      'Las familias recuerdan a sus muertos con colada morada y guaguas de pan. Mezcla tradición andina y católica, y se vive en todo el país.',
    protocols: [
      'En los cementerios, las familias están de duelo: habla bajo y no interrumpas.',
      'No fotografíes tumbas ni a familias sin permiso.',
      'Compra colada y guaguas en negocios locales.',
      'No dejes residuos en los cementerios.',
    ],
  }),
  event({
    id: 'maiz-sangolqui',
    name: 'Fiesta del Maíz y del Turismo',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Pichincha'],
    localities: ['Sangolquí'],
    usualMonths: [8, 9],
    dateLabel: 'Fines de agosto y septiembre',
    description:
      'Sangolquí celebra al maíz desde 1960 con el Paseo del Chagra a caballo, bandas y comida típica.',
    protocols: [
      'Durante el Paseo del Chagra, quédate fuera del paso de los caballos.',
      'Pide permiso antes de fotografiar de cerca a jinetes y familias.',
      'Confirma la agenda del Municipio de Rumiñahui.',
      'Llévate tus residuos.',
    ],
  }),
  event({
    id: 'virgen-quinche',
    name: 'Romería a El Quinche',
    category: 'fiesta_popular',
    region: 'sierra',
    provinces: ['Pichincha'],
    localities: ['El Quinche'],
    usualMonths: [11],
    dateLabel: 'Noviembre; día central 21 de noviembre',
    description:
      'Caminata nocturna de devotos hacia el santuario de El Quinche, con más de 400 años de tradición. Una de las peregrinaciones más grandes del país.',
    protocols: [
      'Camina de noche solo por las rutas habilitadas y en grupo.',
      'Es un acto de fe: respeta el silencio y las promesas.',
      'Pide permiso antes de fotografiar a peregrinos.',
      'Lleva tu agua y llévate tus residuos.',
    ],
  }),
  event({
    id: 'fiestas-cuenca',
    name: 'Independencia de Cuenca',
    category: 'civica',
    region: 'sierra',
    provinces: ['Azuay'],
    localities: ['Cuenca'],
    usualMonths: [11],
    dateLabel: '3 de noviembre; agenda de varios días',
    description:
      'Cuenca celebra su independencia con desfiles, conciertos y el Festival de Artesanías de América del CIDAP.',
    protocols: [
      'Revisa la agenda municipal: hay cientos de actos en distintos lugares.',
      'En las ferias, compra directo a artesanas y artesanos y regatea con respeto.',
      'Llévate tus residuos de calles y parques.',
    ],
    relatedExperienceIds: ['gen-08-cuenca'],
  }),

  /* ── Costa ── */
  event({
    id: 'fundacion-guayaquil',
    name: 'Fundación de Guayaquil',
    localName: 'Fiestas Julianas',
    category: 'civica',
    region: 'costa',
    provinces: ['Guayas'],
    localities: ['Guayaquil'],
    usualMonths: [7],
    dateLabel: '25 de julio; fiestas durante todo julio',
    description:
      'Guayaquil celebra su fundación con desfiles estudiantiles, carros alegóricos, conciertos y ferias en julio.',
    protocols: [
      'Revisa la agenda municipal: horarios y recorridos cambian cada año.',
      'Hidrátate y protégete del sol en los desfiles.',
      'Llévate tus residuos.',
    ],
    relatedExperienceIds: ['costa-02-guayaquil-vivo'],
  }),
  event({
    id: 'independencia-guayaquil',
    name: 'Independencia de Guayaquil',
    localName: 'Fiestas Octubrinas',
    category: 'civica',
    region: 'costa',
    provinces: ['Guayas'],
    localities: ['Guayaquil'],
    usualMonths: [10],
    dateLabel: '9 de octubre',
    description:
      'Guayaquil recuerda la gesta de 1820 con la Aurora Gloriosa al amanecer, desfiles y conciertos en la avenida 9 de Octubre.',
    protocols: [
      'Confirma horarios y recorridos con el Municipio.',
      'Ubícate en las zonas para el público y deja libres las salidas.',
      'Llévate tus residuos de la avenida y el Malecón.',
    ],
    relatedExperienceIds: ['costa-02-guayaquil-vivo'],
  }),
  event({
    id: 'ano-viejo',
    name: 'Año Viejo',
    category: 'fiesta_popular',
    region: 'costa',
    provinces: ['Guayas'],
    localities: ['Guayaquil', 'Todo el país'],
    usualMonths: [12],
    dateLabel: '31 de diciembre',
    description:
      'Monigotes de personajes del año, «viudas» que piden caridad y testamentos en verso. A la medianoche se queman donde está permitido.',
    protocols: [
      'Quema el monigote solo en zonas permitidas: hay multas.',
      'Nada de pólvora cerca de niños, mascotas o cables.',
      'Pide permiso antes de fotografiar a las «viudas» y a las familias.',
      'Recoge las cenizas y residuos al terminar.',
    ],
  }),
  event({
    id: 'marimba-esmeraldas',
    name: 'Marimba y arrullos de Esmeraldas',
    category: 'fiesta_popular',
    region: 'costa',
    provinces: ['Esmeraldas'],
    localities: ['Esmeraldas'],
    usualMonths: [12],
    dateLabel: 'Todo el año; los arrullos de Navidad suenan en diciembre',
    description:
      'Música de marimba, cantos y bailes del pueblo afroesmeraldeño. Patrimonio Inmaterial de la Humanidad (UNESCO, 2015), junto con el Pacífico Sur de Colombia.',
    protocols: [
      'Escucha primero: arrullos y alabaos tienen sentido religioso o de duelo.',
      'Pide permiso antes de fotografiar o grabar a músicos y cantoras.',
      'Apoya a los grupos locales comprando su música o pagando la entrada.',
      'Llévate tus residuos de playas y plazas.',
    ],
    relatedExperienceIds: ['costa-07-ola-y-manglar'],
  }),

  /* ── Amazonía ── */
  event({
    id: 'puyo-nacionalidades',
    name: 'Fundación de Puyo y Día de las Nacionalidades',
    category: 'civica',
    region: 'amazonia',
    provinces: ['Pastaza'],
    localities: ['Puyo'],
    usualMonths: [5],
    dateLabel: 'Alrededor del 12 de mayo',
    description:
      'Puyo celebra su fundación con desfile, danza y ferias; el 11 de mayo honra a las siete nacionalidades de Pastaza.',
    protocols: [
      'Confirma la agenda del Municipio de Pastaza.',
      'Pide permiso antes de fotografiar a personas de las nacionalidades.',
      'No uses pintura facial ni coronas como disfraz.',
      'Llévate tus residuos, sobre todo cerca de los ríos.',
    ],
    
  }),
  event({
    id: 'nino-jista',
    name: 'Niño Jista',
    localName: 'Jista',
    category: 'ceremonia_comunitaria',
    region: 'amazonia',
    provinces: ['Pastaza'],
    localities: [],
    community: 'Pueblo Kichwa de Pastaza, según cada comunidad',
    usualMonths: [12],
    dateLabel: 'Fecha definida por cada comunidad; referencia: diciembre',
    description:
      'Fiesta del pueblo kichwa de Pastaza: la Yandachina o fiesta de la leña, la chicha, los tambores y la iglesia con flores. La organiza cada comunidad; no es un espectáculo.',
    protocols: [
      'Asiste solo con invitación o autorización de la comunidad.',
      'No fotografíes ni grabes sin consentimiento expreso.',
      'Sigue a tus anfitriones y acepta un «no» sin insistir.',
      'No dejes residuos en territorio comunitario.',
    ],
    sensitive: true,
    editions: [communityDefined()],
  }),

  /* ── Región Insular ── */
  event({
    id: 'cantonizacion-isabela',
    name: 'Cantonización de Isabela',
    category: 'civica',
    region: 'galapagos',
    provinces: ['Galápagos'],
    localities: ['Puerto Villamil'],
    usualMonths: [3],
    dateLabel: '16 de marzo',
    description:
      'La isla Isabela celebra su cantonización con actos cívicos y actividades en Puerto Villamil.',
    protocols: [
      'Confirma la agenda del municipio de Isabela.',
      'Rigen las reglas del Parque Nacional Galápagos: distancia con la fauna, sin alimentarla.',
      'No dejes residuos: en la isla todo se maneja con cuidado.',
    ],
    relatedExperienceIds: ['gal-09-isabela-4-dias'],
  }),
];
