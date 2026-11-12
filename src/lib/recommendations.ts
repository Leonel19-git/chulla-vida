import type { OnboardingPreferences, Place } from '../types';

export const normalizeText = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

/** Published prices already cover the complete experience, per person. */
export const getPlaceTotal = (place: Place, preferences: OnboardingPreferences): number =>
  Math.round(place.precio_base_pp * Math.max(1, preferences.cantidad_personas) * 100) / 100;

const interestTerms: Record<string, string[]> = {
  aventura: ['aventura', 'trekking', 'senderismo', 'sendero', 'kayak', 'volcan', 'expedicion'],
  cultura: ['cultura', 'ancestral', 'tejido', 'taller', 'ceremonia', 'artesania', 'historia'],
  fotografia: ['fotografia', 'paisaje', 'laguna', 'cascada', 'avistamiento'],
  gastronomia: ['gastronomia', 'cocina', 'comida', 'fogón', 'maito', 'chicha'],
  voluntariado: ['voluntariado', 'minga', 'reforestacion', 'conservacion', 'ecoturismo'],
  naturaleza: ['naturaleza', 'biodiversidad', 'bosque', 'selva', 'fauna', 'aves', 'marina'],
  noche: ['noche', 'fogata', 'fogon', 'hospedaje', 'ceremonia'],
  amigos: ['panas', 'grupo', 'convivencia', 'taller', 'comunitari'],
};

export function matchesInterests(place: Place, preferences: OnboardingPreferences): boolean {
  if (!preferences.pasiones.length) return true;
  const haystack = normalizeText([place.titulo, place.descripcion_corta, ...place.etiquetas, ...place.que_incluye].join(' '));
  return preferences.pasiones.some(interest => {
    const normalized = normalizeText(interest);
    const category = Object.keys(interestTerms).find(key => normalized.includes(key) || (key === 'naturaleza' && normalized.includes('fauna')) || (key === 'voluntariado' && normalized.includes('ecoturismo')));
    const terms = category ? interestTerms[category] : [normalized];
    return terms.some(term => haystack.includes(normalizeText(term)));
  });
}

/** Feasibility for the whole group; origin and radius need real distance data and are not guessed. */
export function matchesPreferences(place: Place, preferences: OnboardingPreferences): boolean {
  return getPlaceTotal(place, preferences) <= preferences.presupuesto_max
    && place.duracion_dias <= preferences.dias_disponibles
    && place.cupos_disponibles_dia >= preferences.cantidad_personas
    && (preferences.region_preferida === 'Todas' || place.region === preferences.region_preferida)
    && (preferences.nivel_aventura === 'Todas' || place.nivel_aventura === preferences.nivel_aventura)
    && matchesInterests(place, preferences);
}

export function recommendationScore(place: Place, preferences: OnboardingPreferences): number {
  const total = getPlaceTotal(place, preferences);
  let score = matchesPreferences(place, preferences) ? 100 : 0;
  score += total <= preferences.presupuesto_max ? 30 : -Math.min(50, ((total - preferences.presupuesto_max) / Math.max(1, preferences.presupuesto_max)) * 30);
  score += place.duracion_dias <= preferences.dias_disponibles ? 20 : -30;
  score += place.cupos_disponibles_dia >= preferences.cantidad_personas ? 15 : -50;
  score += preferences.region_preferida === 'Todas' || place.region === preferences.region_preferida ? 20 : -20;
  score += preferences.nivel_aventura === 'Todas' || place.nivel_aventura === preferences.nivel_aventura ? 15 : -10;
  score += matchesInterests(place, preferences) ? 25 : 0;
  return score;
}

export function rankPlaces(places: Place[], preferences: OnboardingPreferences): Place[] {
  return places.map((place, index) => ({ place, index, score: recommendationScore(place, preferences) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(entry => entry.place);
}
