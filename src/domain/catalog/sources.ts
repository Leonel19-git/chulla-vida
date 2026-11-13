import type { CatalogSource, DatedNotice, SeparateCost } from './types';

/** Fecha en que se revisaron los documentos fuente. No acredita verificación con operadores. */
export const SOURCE_CHECKED_AT = '2026-11-12';

const DOCS = 'CHULLA_VIDA_3_PAQUETE/catalogos/';
export const GENERAL_DOCUMENT = `${DOCS}01_catalogo_14_destinos.txt`;
export const GALAPAGOS_DOCUMENT = `${DOCS}02_galapagos_12_experiencias.txt`;
export const COSTA_DOCUMENT = `${DOCS}03_costa_7_experiencias_extraido.txt`;
export const COSTA_PDF_DOCUMENT = `${DOCS}03_costa_7_experiencias_original.pdf`;

/* ── Notas generales textuales de cada documento ── */

export const GENERAL_NOTES = {
  prices:
    'Los precios indicados son valores referenciales del catálogo y no representan tarifas oficiales de ingreso a los destinos ni paquetes comerciales verificados.',
  estimates:
    'Las capacidades, duraciones y niveles de dificultad son parámetros de organización de las experiencias de Chulla Vida, pendientes de confirmación con los operadores correspondientes.',
  beforeBooking:
    'Antes de ofrecer una reserva, se deben confirmar disponibilidad, servicios incluidos, transporte, alimentación, alojamiento, tarifas vigentes y condiciones de seguridad.',
} as const;

export const COSTA_NOTES = {
  cover: 'Servicios prepagados · Transporte del visitante hasta el punto de encuentro no incluido.',
  rates: 'Tarifas de venta estimadas, sujetas a confirmación con los operadores. No son cotizaciones ni reservas activas.',
  footer: 'Tarifas propuestas · USD por persona | Noviembre de 2026',
  /** Línea legal que cierra cada una de las siete fichas. */
  perRecord: 'Precio y prestaciones sujetos a confirmación final por proveedor y fecha. Servicios no descritos se consideran excluidos.',
} as const;

export const GALAPAGOS_NOTES = {
  prices:
    'Los precios indicados son valores referenciales encontrados en plataformas de reservas y sitios de operadores al 12 de noviembre de 2026. No representan tarifas oficiales de ingreso a los destinos ni paquetes comerciales verificados. Varían por temporada, operador y tamaño del grupo, y algunos están en euros.',
  estimates:
    'Las capacidades, duraciones y niveles de dificultad son estimaciones basadas en las descripciones de cada tour, pendientes de confirmación con los operadores correspondientes.',
  status:
    'Estado de los sitios tras las inundaciones: A finales de octubre de 2026, lluvias del fenómeno de El Niño provocaron inundaciones en Santa Cruz. El aeropuerto de Baltra suspendió operaciones el 31 de octubre. Al 7 de noviembre el Parque Nacional reabrió los sitios con condiciones seguras, pero Las Grietas, Los Humedales, Puerto Chino y Playa Baquerizo seguían cerrados de forma preventiva. El Inamhi emitió alerta de lluvias fuertes para Santa Cruz, San Cristóbal e Isabela el 12 de noviembre.',
  lessReliable:
    'Datos menos confiables: Comida por día, transporte local, vuelo del plan normal y tipo de cambio EUR/USD son estimaciones propias. El precio del tour a Santa Fe y del tour terrestre de San Cristóbal proviene de blogs de viajes.',
  beforeBooking:
    'Antes de ofrecer una reserva, se deben confirmar disponibilidad, servicios incluidos, transporte, alimentación, alojamiento, tarifas vigentes, política de cancelación, condiciones de seguridad y el estado de apertura de los sitios de visita.',
} as const;

/* ── Costos fijos de Galápagos: siempre aparte del precio de la experiencia ── */

const FEE_DETAIL =
  'Tasa de ingreso al Parque Nacional Galápagos: $200 para extranjeros (menores de 12 años, $100) y $30 para ecuatorianos y residentes de 12 a 65 años. Menores de 2 años, exentos. Se paga en efectivo al llegar.';
const TCT_DETAIL = 'Tarjeta de Control de Tránsito (TCT): $20 por persona, en el aeropuerto de Quito o Guayaquil antes de embarcar.';
const FLIGHT_DETAIL = 'Vuelo Quito–Galápagos, ida y vuelta: desde $223, mínimo reportado por la prensa en un feriado. Puede subir hasta $755.';
const BOAT_DETAIL =
  'Lancha entre islas (Santa Cruz, San Cristóbal, Isabela): $30 por tramo; a Floreana, $40. Isabela cobra además un impuesto de ingreso, por confirmar.';
const TAXI_BOAT_DETAIL = 'Bote-taxi en el muelle: $0,50 ($1 en Isabela).';
const LODGING_DETAIL = 'Hospedaje en Puerto Ayora: ofertas desde unos $33 a $53 por noche; un hotel de 3 estrellas promedia unos $94.';

const usd = (concept: string, detail: string, min: number | null, max: number | null): SeparateCost => ({
  concept,
  detail,
  currency: 'USD',
  min,
  max,
  requiresRevalidation: true,
});

/**
 * Conceptos que la fuente lista como «Costos fijos de ingreso y traslado».
 * Son referencias del 12 de noviembre de 2026: se muestran por separado, nunca se suman
 * al precio de una ficha sin revisar nacionalidad, residencia, edad e inclusiones.
 */
export const GALAPAGOS_FIXED_COSTS: readonly SeparateCost[] = [
  usd('Tasa de ingreso al Parque Nacional Galápagos · personas extranjeras', FEE_DETAIL, 200, 200),
  usd('Tasa de ingreso al Parque Nacional Galápagos · personas extranjeras menores de 12 años', FEE_DETAIL, 100, 100),
  usd('Tasa de ingreso al Parque Nacional Galápagos · ecuatorianos y residentes de 12 a 65 años', FEE_DETAIL, 30, 30),
  usd('Tasa de ingreso al Parque Nacional Galápagos · menores de 2 años (exentos)', FEE_DETAIL, 0, 0),
  usd('Tarjeta de Control de Tránsito (TCT)', TCT_DETAIL, 20, 20),
  usd('Vuelo Quito–Galápagos, ida y vuelta', FLIGHT_DETAIL, 223, 755),
  usd('Lancha entre islas (Santa Cruz, San Cristóbal, Isabela), por tramo', BOAT_DETAIL, 30, 30),
  usd('Lancha a Floreana, por tramo', BOAT_DETAIL, 40, 40),
  usd('Impuesto de ingreso a Isabela (monto por confirmar)', BOAT_DETAIL, null, null),
  usd('Bote-taxi en el muelle', TAXI_BOAT_DETAIL, 0.5, 0.5),
  usd('Bote-taxi en el muelle de Isabela', TAXI_BOAT_DETAIL, 1, 1),
  usd('Hospedaje en Puerto Ayora, ofertas por noche', LODGING_DETAIL, 33, 53),
  usd('Hospedaje en Puerto Ayora, hotel de 3 estrellas por noche (promedio)', LODGING_DETAIL, 94, 94),
];

/** Vacíos de la fuente que nadie debe rellenar con suposiciones. */
export const GALAPAGOS_COST_CAVEATS: readonly string[] = [
  'La fuente no indica la tasa de ingreso para ecuatorianos o residentes menores de 12 años ni mayores de 65: consultar a la autoridad del Parque Nacional Galápagos.',
  'El impuesto de ingreso a Isabela figura como «por confirmar»: no tiene monto en la fuente.',
  'Valores y requisitos cambian según nacionalidad, residencia y edad; deben revalidarse antes de cotizar.',
];

/**
 * Fotografía histórica del estado de los sitios que trae el catálogo de Galápagos.
 * No es un feed en tiempo real: al planificar hay que consultar al Parque Nacional
 * Galápagos, a los operadores y a los organismos competentes.
 */
export const GALAPAGOS_STATUS_SNAPSHOT: readonly DatedNotice[] = [
  {
    text: 'A finales de octubre de 2026, lluvias del fenómeno de El Niño provocaron inundaciones en Santa Cruz. El aeropuerto de Baltra suspendió operaciones el 31 de octubre.',
    asOf: '2026-10-31',
    kind: 'weather',
    historical: true,
  },
  {
    text: 'Al 7 de noviembre el Parque Nacional reabrió los sitios con condiciones seguras, pero Las Grietas, Los Humedales, Puerto Chino y Playa Baquerizo seguían cerrados de forma preventiva.',
    asOf: '2026-11-07',
    kind: 'closure',
    historical: true,
  },
  {
    text: 'El Inamhi emitió alerta de lluvias fuertes para Santa Cruz, San Cristóbal e Isabela el 12 de noviembre.',
    asOf: '2026-11-12',
    kind: 'weather',
    historical: true,
  },
];

export const CATALOG_SOURCES: readonly CatalogSource[] = [
  {
    id: 'catalogo-general-14',
    title: '14 destinos turísticos del Ecuador',
    originalDocument: GENERAL_DOCUMENT,
    checkedAt: SOURCE_CHECKED_AT,
    expectedCount: 14,
    notes: [GENERAL_NOTES.prices, GENERAL_NOTES.estimates, GENERAL_NOTES.beforeBooking],
  },
  {
    id: 'catalogo-costa-7',
    title: 'Experiencias de la Costa',
    originalDocument: COSTA_DOCUMENT,
    authoritativeDocument: COSTA_PDF_DOCUMENT,
    checkedAt: SOURCE_CHECKED_AT,
    expectedCount: 7,
    notes: [
      'Fichas completas y tarifas propuestas por persona',
      COSTA_NOTES.cover,
      COSTA_NOTES.rates,
      COSTA_NOTES.footer,
      COSTA_NOTES.perRecord,
    ],
  },
  {
    id: 'catalogo-galapagos-12',
    title: '12 experiencias turísticas de las Islas Galápagos',
    originalDocument: GALAPAGOS_DOCUMENT,
    checkedAt: SOURCE_CHECKED_AT,
    expectedCount: 12,
    notes: [
      GALAPAGOS_NOTES.prices,
      GALAPAGOS_NOTES.estimates,
      'Costos fijos de ingreso y traslado:',
      FEE_DETAIL,
      TCT_DETAIL,
      FLIGHT_DETAIL,
      BOAT_DETAIL,
      TAXI_BOAT_DETAIL,
      LODGING_DETAIL,
      GALAPAGOS_NOTES.status,
      GALAPAGOS_NOTES.lessReliable,
      GALAPAGOS_NOTES.beforeBooking,
    ],
  },
];
