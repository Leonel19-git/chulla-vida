/**
 * Contrato de datos del catálogo CHULLA VIDA 3.0 (sección 21 del superprompt).
 *
 * Reglas que este modelo hace cumplir por construcción:
 * - Ninguna ficha importada es reservable: `bookingEnabled` es literalmente `false`.
 * - Los precios conservan moneda original y rango; nunca se convierten en silencio.
 * - Los avisos de cierre/clima de los catálogos son fotografías históricas fechadas.
 * - Sin coordenadas de precisión dudosa: solo un punto de referencia aproximado de la
 *   localidad para consultar clima, marcado como no verificado.
 */

export type RegionId = 'sierra' | 'costa' | 'amazonia' | 'galapagos';

export const REGION_LABELS: Record<RegionId, string> = {
  sierra: 'Sierra',
  costa: 'Costa',
  amazonia: 'Amazonía',
  galapagos: 'Galápagos',
};

export type CatalogSourceId = 'catalogo-general-14' | 'catalogo-costa-7' | 'catalogo-galapagos-12' | 'catalogo-amazonia-usuario';

export interface CatalogSource {
  id: CatalogSourceId;
  title: string;
  /** Ruta del documento original dentro del repositorio. */
  originalDocument: string;
  /** Fecha (ISO) en que la fuente declara o se revisaron sus datos. */
  checkedAt: string;
  expectedCount: number;
  /** Advertencias generales de la fuente, textuales. */
  notes: string[];
  /** Documento que prevalece si difiere de `originalDocument` (p. ej. el PDF de Costa frente a su texto extraído). */
  authoritativeDocument?: string;
}

export type PriceType = 'proposed' | 'referential' | 'verified_offer';
export type Currency = 'USD' | 'EUR';
export type EditorialStatus = 'referential' | 'in_review' | 'approved';
export type OperatorVerificationStatus =
  | 'unverified'
  | 'in_review'
  | 'identity_reviewed'
  | 'official_registry_verified'
  | 'suspended';
/** `experience`: actividad puntual; `multi_day_program`: programa de varios días; `trip_plan`: plan/presupuesto orientativo, no un producto. */
export type ExperienceKind = 'experience' | 'multi_day_program' | 'trip_plan';
export type Difficulty = 'facil' | 'facil_moderada' | 'moderada' | 'alta';
export type AccessStatus = 'unknown' | 'open_reported' | 'partially_closed_reported' | 'closed_reported';

export interface GroupPrice {
  groupSize: number;
  amountPerPerson: number;
}

/** Coste que la fuente menciona aparte del precio de la experiencia (tasas, vuelos, lanchas...). */
export interface SeparateCost {
  concept: string;
  /** Texto original de la fuente con sus condiciones (nacionalidad, edad, etc.). */
  detail: string;
  currency: Currency;
  min: number | null;
  max: number | null;
  /** Siempre requiere revalidación antes de cotizar. */
  requiresRevalidation: true;
}

/** Partida de un desglose que la fuente da dentro del precio (planes de Galápagos). Ya está contenida en el precio: no se suma otra vez. */
export interface CostComponent {
  concept: string;
  amount: number;
  currency: Currency;
  /** Texto original de la partida. */
  detail: string;
}

export interface ExperiencePrice {
  type: PriceType;
  /** Moneda ORIGINAL de la fuente. */
  currency: Currency;
  min: number | null;
  max: number | null;
  unit: 'per_person';
  /** Texto del precio tal como aparece en la fuente. */
  originalLabel: string;
  includes: string[];
  excludes: string[];
  assumptions: string[];
  groupBreakdown?: GroupPrice[];
  separateCosts?: SeparateCost[];
  /** Opciones de la fuente; nunca se suman automáticamente ni sustituyen una cotización. */
  options?: PriceOption[];
  /** Desglose textual del precio cuando la fuente lo da (planes 11 y 12 de Galápagos). */
  costBreakdown?: CostComponent[];
}

export interface PriceOption {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
  currency: Currency;
  unit: 'per_person' | 'per_person_per_day' | 'per_night' | 'per_trip' | 'unknown';
  durationLabel: string | null;
  notes: string;
}

export interface LocationInfo {
  accessSummary: string;
  transportOptions: {
    label: string;
    mode: 'bus' | 'flight' | 'boat' | 'taxi' | 'walk' | 'local' | 'mixed';
    durationLabel: string | null;
    priceLabel: string | null;
    notes: string;
  }[];
  references: { title: string; url: string; checkedAt: string }[];
  approximatePoint?: {
    lat: number;
    lon: number;
    label: string;
    scope: 'locality_reference';
    sourceUrl: string;
    checkedAt: string;
  };
}

export interface ExperienceDuration {
  /** Texto original, p. ej. «4–5 horas» o «5 días y 4 noches». */
  label: string;
  minHours: number | null;
  maxHours: number | null;
  days: number | null;
  nights: number | null;
}

export interface DatedNotice {
  text: string;
  /** Fecha ISO a la que se refiere el aviso, o null si la fuente no la da. */
  asOf: string | null;
  kind: 'closure' | 'weather' | 'pricing' | 'safety' | 'general';
  /** Los avisos del catálogo NO son un feed en tiempo real. */
  historical: true;
}

export type PetPolicyStatus =
  | 'confirmed_allowed'
  | 'ask_conditions'
  | 'not_allowed'
  | 'unverified'
  | 'prohibited_protected_area';

export interface PetPolicy {
  status: PetPolicyStatus;
  note: string;
  species: string[];
  maxSize: string | null;
  maxCount: number | null;
  requirements: string[];
  fee: { amount: number; currency: Currency } | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export type ConnectivityTagId =
  | 'sin_senal'
  | 'senal_intermitente'
  | 'datos_moviles'
  | 'wifi'
  | 'electricidad_limitada'
  | 'requiere_efectivo'
  | 'punto_encuentro_sin_gps'
  | 'accesibilidad_por_verificar'
  | 'agua_potable_confirmar';

export interface ConnectivityTag {
  id: ConnectivityTagId;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface ExperienceMedia {
  src: string;
  alt: string;
  credit: string;
  license: string;
  /** false cuando la imagen es ilustrativa de la región y no del lugar concreto. */
  depictsThisPlace: boolean;
}

export interface WeatherReference {
  /** Nombre de la localidad usada como referencia. */
  placeName: string;
  lat: number;
  lon: number;
  /** Punto aproximado de la localidad; nunca un punto de encuentro. */
  precision: 'locality_approx';
}

export interface ItineraryStep {
  time: string | null;
  text: string;
}

export interface Experience {
  locationInfo?: LocationInfo;
  /** ID estable, p. ej. `gen-01-saraguro-ancestral`. */
  id: string;
  slug: string;
  contentSourceId: CatalogSourceId;
  originalDocument: string;
  /** Posición (1-n) de la ficha dentro de su documento fuente. */
  sourceOrder: number;
  /** Bloque original íntegro de la ficha, incluidas condiciones e itinerarios. */
  sourceText: string;
  contentVersion: string;
  sourceCheckedAt: string;

  title: string;
  /** Nombre comercial de la experiencia cuando difiere del destino (catálogo Costa). */
  experienceName: string | null;
  kind: ExperienceKind;

  localizedRegion: RegionId;
  /** Texto de región/subregión tal como lo da la fuente (p. ej. «Chocó Andino», «Galápagos central»). */
  subregion: string | null;
  province: string;
  /** Ubicación original completa. */
  locality: string;
  meetingPoint: string | null;
  geospatialCoordinatesVerified: false;
  weatherReference: WeatherReference | null;

  duration: ExperienceDuration;
  difficulty: Difficulty;
  difficultyLabel: string;
  capacity: { max: number | null; label: string };

  /** Resumen de una frase. */
  summary: string;
  description: string;
  /** «Historia y contexto» cuando la fuente lo trae. */
  context: string | null;
  attractions: string[];
  activities: string[];
  itinerary: ItineraryStep[];
  recommendations: string[];
  /** Condiciones contractuales/legales textuales de la fuente. */
  conditions: string[];
  warnings: DatedNotice[];
  activityConstraints: string[];

  price: ExperiencePrice;
  accessStatus: AccessStatus;
  accessCheckedAt: string | null;
  operatorVerificationStatus: OperatorVerificationStatus;
  verifiedBy: string | null;
  bookingEnabled: false;
  editorialStatus: EditorialStatus;

  tags: string[];
  petPolicy: PetPolicy;
  connectivity: ConnectivityTag[];
  media: ExperienceMedia[];
}

/* ───────────────────────── Cultura Viva ───────────────────────── */

export type EventConfirmation = 'confirmed_official' | 'orientative' | 'community_defined';

export interface EventEdition {
  year: number;
  /** Fechas ISO solo cuando la edición está confirmada con fuente. */
  startDate: string | null;
  endDate: string | null;
  confirmation: EventConfirmation;
  sourceUrl: string | null;
  checkedAt: string;
  /** De dónde sale la fecha y qué falta revalidar; visible para el equipo editorial. */
  provenanceNote?: string;
}

export interface CulturalEvent {
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  /** `raymi` solo para festividades a las que corresponde ese nombre. */
  category: 'raymi' | 'fiesta_popular' | 'ceremonia_comunitaria' | 'festival_artes' | 'civica';
  region: RegionId;
  provinces: string[];
  localities: string[];
  community: string | null;
  /** Meses habituales (1-12); vacío cuando la fecha la define el calendario ceremonial. */
  usualMonths: number[];
  /** Texto orientativo de fecha, p. ej. «1–6 de enero». */
  dateLabel: string;
  description: string;
  protocols: string[];
  /** true cuando no debe presentarse como espectáculo público. */
  sensitive: boolean;
  editions: EventEdition[];
  officialUrl: string | null;
  lastCheckedAt: string;
  relatedExperienceIds: string[];
}
