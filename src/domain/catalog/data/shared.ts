import type { Experience, ExperienceDuration, PetPolicy, WeatherReference } from '../types';
import { SOURCE_CHECKED_AT } from '../sources';
import { SOURCE_TEXTS } from './source-texts';

export const CONTENT_VERSION = '2026-11-13.2';

/** Campos que toda ficha importada lleva fijos: nadie los ha verificado todavía. */
type FixedKeys =
  | 'slug'
  | 'sourceText'
  | 'contentVersion'
  | 'sourceCheckedAt'
  | 'geospatialCoordinatesVerified'
  | 'operatorVerificationStatus'
  | 'verifiedBy'
  | 'bookingEnabled'
  | 'editorialStatus'
  | 'connectivity';

type DefaultedKeys =
  | 'experienceName'
  | 'kind'
  | 'subregion'
  | 'meetingPoint'
  | 'context'
  | 'itinerary'
  | 'recommendations'
  | 'warnings'
  | 'activityConstraints'
  | 'accessStatus'
  | 'accessCheckedAt'
  | 'petPolicy'
  | 'media';

export type ExperienceInput = Omit<Experience, FixedKeys | DefaultedKeys> & Partial<Pick<Experience, DefaultedKeys>>;

const PET_BLANK = {
  species: [],
  maxSize: null,
  maxCount: null,
  requirements: [],
  fee: null,
  confirmedBy: null,
  confirmedAt: null,
} satisfies Omit<PetPolicy, 'status' | 'note'>;

export const petUnverified = (): PetPolicy => ({
  ...PET_BLANK,
  status: 'unverified',
  note: 'La fuente no dice si se admiten mascotas. Pregunta al anfitrión u operador antes de planificar; mientras nadie lo confirme, no lo damos por permitido.',
});

/** Área protegida continental: no se afirma permiso; decide la autoridad del área. */
export const petAskAuthority = (area: string): PetPolicy => ({
  ...PET_BLANK,
  status: 'ask_conditions',
  note: `Esta visita toca ${area}, un área protegida. El ingreso con mascotas debe consultarse antes con la autoridad del área y con el operador; aquí no se afirma que esté permitido.`,
});

export const petProhibitedGalapagos = (): PetPolicy => ({
  ...PET_BLANK,
  status: 'prohibited_protected_area',
  note: 'La autoridad del Parque Nacional Galápagos no admite mascotas en los sitios de visita, para proteger la fauna y la flora nativas. Chulla Pet no ofrece esta ficha para viajar con animales de compañía.',
});

export const wx = (placeName: string, lat: number, lon: number): WeatherReference => ({
  placeName,
  lat,
  lon,
  precision: 'locality_approx',
});

export const days = (label: string, count: number, nights: number | null = null): ExperienceDuration => ({
  label,
  minHours: null,
  maxHours: null,
  days: count,
  nights,
});

export const hours = (label: string, min: number, max: number, dayCount: number | null = null): ExperienceDuration => ({
  label,
  minHours: min,
  maxHours: max,
  days: dayCount,
  nights: null,
});

/*
 * Las fotos reales de cada ficha (Wikimedia Commons, licencia libre, créditos en public/images/CREDITS.md)
 * viven en ./place-photos.ts, generado por scripts/fetch-place-images.py. Cada ficha las toma con placeMedia(id).
 */

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** Completa una ficha con los valores fijos de una importación no verificada y la congela. */
export function defineExperience(input: ExperienceInput): Experience {
  const sourceText = SOURCE_TEXTS[input.id];
  if (sourceText === undefined) throw new Error(`Ficha sin bloque de fuente: ${input.id}`);
  const experience: Experience = {
    experienceName: null,
    kind: 'experience',
    subregion: null,
    meetingPoint: null,
    context: null,
    itinerary: [],
    recommendations: [],
    warnings: [],
    activityConstraints: [],
    accessStatus: 'unknown',
    accessCheckedAt: null,
    petPolicy: petUnverified(),
    media: [],
    ...input,
    slug: input.id.replace(/^[a-z]+-\d{2}-/, ''),
    sourceText,
    contentVersion: CONTENT_VERSION,
    sourceCheckedAt: SOURCE_CHECKED_AT,
    geospatialCoordinatesVerified: false,
    operatorVerificationStatus: 'unverified',
    verifiedBy: null,
    bookingEnabled: false,
    editorialStatus: 'referential',
    connectivity: [],
  };
  return deepFreeze(experience);
}
