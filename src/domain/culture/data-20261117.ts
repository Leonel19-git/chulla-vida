import type { CulturalEvent } from '../catalog/types.js';
import type { CultureCardInfo } from './sources.js';

/** Fuentes primarias consultadas el 17/11/2026. Mes habitual, sin agenda futura confirmada. */
const rows = [
  {
    "id": "san-pedro-tabacundo",
    "name": "San Pedro de Tabacundo",
    "region": "sierra",
    "province": "Pichincha",
    "locality": "Tabacundo",
    "months": [
      6
    ],
    "dateLabel": "Junio; programación local por confirmar",
    "description": "Encuentros de familias y comunidades alrededor de San Pedro. Consulta con la organización local las actividades públicas y los recorridos de cada edición.",
    "url": "https://www.patrimoniocultural.gob.ec/9631-2/",
    "publisher": "Instituto Nacional de Patrimonio Cultural"
  },
  {
    "id": "purificacion-huaca",
    "name": "Virgen de la Purificación de Huaca",
    "region": "sierra",
    "province": "Carchi",
    "locality": "Huaca",
    "months": [
      1,
      2
    ],
    "dateLabel": "Enero y febrero; agenda anual por confirmar",
    "description": "Celebración religiosa organizada por barrios y comunidades de Huaca. La referencia municipal sitúa su ciclo entre enero y comienzos de febrero.",
    "url": "https://huaca.gob.ec/gadhuaca/images/pdf/LOTAIP2021/PDyOT.pdf",
    "publisher": "GAD de San Pedro de Huaca"
  },
  {
    "id": "san-pedro-alausi",
    "name": "San Pedro de Alausí",
    "region": "sierra",
    "province": "Chimborazo",
    "locality": "Alausí",
    "months": [
      6
    ],
    "dateLabel": "Finales de junio; agenda anual por confirmar",
    "description": "Festividad patronal de Alausí recogida en el calendario del INPC. Sus programas municipales permiten revisar las actividades antes de preparar la visita.",
    "url": "https://www.patrimoniocultural.gob.ec/9689-2/",
    "publisher": "Instituto Nacional de Patrimonio Cultural"
  },
  {
    "id": "santa-catalina-colonche",
    "name": "Santa Catalina de Colonche",
    "region": "costa",
    "province": "Santa Elena",
    "locality": "Colonche",
    "months": [
      11
    ],
    "dateLabel": "Noviembre; agenda anual por confirmar",
    "description": "Celebración patronal de Colonche documentada en su plan territorial. Acércate con respeto a los espacios religiosos y confirma la programación con el GAD parroquial.",
    "url": "https://www.gadcolonche.gob.ec/media/gadcolonche/pdot_archivos/PDyOT_Colonche_2023-2027-1_colonche_compressed.pdf",
    "publisher": "GAD de Colonche"
  },
  {
    "id": "san-jacinto-yaguachi",
    "name": "San Jacinto de Yaguachi",
    "region": "costa",
    "province": "Guayas",
    "locality": "Yaguachi",
    "months": [
      8
    ],
    "dateLabel": "Agosto; agenda anual por confirmar",
    "description": "Fiesta patronal que reúne a creyentes y visitantes en Yaguachi. La referencia municipal recuerda al patrono en agosto; revisa la agenda de la edición que quieres visitar.",
    "url": "https://municipiodeyaguachi.gob.ec/turismo-festividades/",
    "publisher": "Municipio de Yaguachi"
  },
  {
    "id": "chonta-archidona",
    "name": "Festival de la Chonta de Archidona",
    "region": "amazonia",
    "province": "Napo",
    "locality": "Archidona",
    "months": [
      4
    ],
    "dateLabel": "Abril; agenda anual por confirmar",
    "description": "Festival local de Archidona registrado por la Asociación de Municipalidades. Su programación pública se consulta por separado de las ceremonias que cada comunidad organiza.",
    "url": "https://repositorio.ame.gob.ec/canton-archidona/",
    "publisher": "Asociación de Municipalidades Ecuatorianas"
  },
  {
    "id": "carmen-huataraco",
    "name": "Virgen del Carmen de Minas de Huataraco",
    "region": "amazonia",
    "province": "Orellana",
    "locality": "Minas de Huataraco, San José de Guayusa",
    "months": [
      7
    ],
    "dateLabel": "Julio; agenda comunitaria por confirmar",
    "description": "Fiesta patronal de Minas de Huataraco, documentada por el GAD de Guayusa. Consulta con sus organizadores qué actividades están abiertas a visitantes antes de ir.",
    "url": "https://guayusa.gob.ec/fiestas/",
    "publisher": "GAD de San José de Guayusa"
  },
  {
    "id": "anexion-galapagos",
    "name": "Anexión de Galápagos al Ecuador",
    "region": "galapagos",
    "province": "Galápagos",
    "locality": "Galápagos",
    "months": [
      2
    ],
    "dateLabel": "Febrero; programación cívica por confirmar",
    "description": "Conmemoración cívica del vínculo de Galápagos con Ecuador, distinta de su provincialización. El Consejo de Gobierno recuerda este hito en febrero; consulta la agenda insular.",
    "url": "https://www.gobiernogalapagos.gob.ec/el-gobierno-del-nuevo-ecuador-celebra-a-galapagos/",
    "publisher": "Consejo de Gobierno de Galápagos"
  }
] as const;

export const CULTURE_EXPANSION_CHECKED_AT = '2026-11-17';
export const CULTURAL_EVENT_EXPANSION: readonly CulturalEvent[] = rows.map(row => ({
  id: row.id, slug: row.id, name: row.name, localName: null, category: row.id === 'anexion-galapagos' ? 'civica' : 'fiesta_popular',
  region: row.region, provinces: [row.province], localities: [row.locality], community: null, usualMonths: [...row.months], dateLabel: row.dateLabel, description: row.description,
  protocols: [`Consulta con la organización de ${row.locality} qué recorridos y espacios están abiertos al público.`, 'Pide permiso para fotografiar personas y respeta los actos religiosos o comunitarios.', 'Deja libre el paso y llévate tus residuos.'],
  sensitive: false, editions: [{year: 2027, startDate: null, endDate: null, confirmation: 'orientative', sourceUrl: null, checkedAt: CULTURE_EXPANSION_CHECKED_AT}],
  officialUrl: row.url, lastCheckedAt: CULTURE_EXPANSION_CHECKED_AT, relatedExperienceIds: [],
}));
export const CULTURE_EXPANSION_CARDS: Readonly<Record<string, CultureCardInfo>> = Object.fromEntries(rows.map(row => [row.id, {
  what: row.name, respect: ['calendar', 'camera', 'trash'], source: {url: row.url, publisher: row.publisher, checkedAt: CULTURE_EXPANSION_CHECKED_AT},
}]));
