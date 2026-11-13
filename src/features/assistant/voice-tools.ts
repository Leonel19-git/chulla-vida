import type { Experience } from '../../domain/catalog/types';
import { normalizeQuestion, retrieveExperiences } from './knowledge';
export type VoiceNavigation = 'plan' | 'culture' | 'passport' | 'downloads' | 'account' | 'alerts';
export function navigationFromVoice(question: string): VoiceNavigation | null {
  const q = normalizeQuestion(question);
  if (!/\b(abre|abrir|muestra|muestrame|llevame|ver)\b/.test(q)) return null;
  if (/pasaporte|mis sellos/.test(q)) return 'passport';
  if (/cultura|fiestas|tradiciones/.test(q)) return 'culture';
  if (/descarga|sin senal|sin internet|biblioteca/.test(q)) return 'downloads';
  if (/cuenta|registr|perfil|negocio/.test(q)) return 'account';
  if (/alertas|notificaciones|avisos/.test(q)) return 'alerts';
  if (/plan|itinerario|mi viaje|ruta/.test(q)) return 'plan';
  return null;
}
export const isWeatherQuestion = (question: string) => /clima|lluev|lluvia|temperatura|pronostico|tiempo hace|tiempo hay/.test(normalizeQuestion(question));
const cities = ['Baños de Agua Santa', 'Puerto Misahuallí', 'San Cristóbal', 'Puerto Ayora', 'Lago Agrio', 'Nueva Loja', 'Shushufindi', 'Riobamba', 'Guayaquil', 'Cotacachi', 'Archidona', 'Saraguro', 'Otavalo', 'Cuyabeno', 'Misahuallí', 'Nangaritza', 'Cuenca', 'Zamora', 'Macas', 'Manta', 'Quito', 'Salinas', 'Tena', 'Puyo', 'Coca', 'Loja', 'Baños'];
export function weatherLocalityFromVoice(question: string, catalog: Experience[]): string | null {
  const q = normalizeQuestion(question);
  const named = cities.find(city => new RegExp(`(^|[^a-z])${normalizeQuestion(city)}([^a-z]|$)`).test(q));
  if (named) return named;
  const matched = retrieveExperiences(question, catalog, 1)[0];
  if (matched?.weatherReference) return matched.weatherReference.placeName;
  const after = /(?:clima|pronostico|temperatura)(?:\s+(?:de|en|para|hoy|manana))*\s+(.+)/.exec(q)?.[1]?.replace(/\b(hoy|manana|ahora|por favor)\b/g, '').replace(/[^a-z ]/g, '').trim();
  return after && after.length > 2 && after.length < 70 ? after : null;
}
