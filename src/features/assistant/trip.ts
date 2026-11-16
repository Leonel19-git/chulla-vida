/**
 * Trip details MIJIN understands in free speech («salgo de Cuenca», «unos 50 dólares», «somos 3», «me gusta la playa»)
 * and the catalog ideas that fit them. Pure module (no DOM), reachable from api/: relative imports end in `.js`.
 */
import type { Experience, RegionId } from '../../domain/catalog/types.js';
import { daysNeeded, petAdmission } from '../../domain/planner/index.js';
import { cleanUtterance } from './intents.js';

export type Interest = 'naturaleza' | 'cultura' | 'playa' | 'aventura' | 'comida' | 'relax';
export const INTEREST_LABELS: Record<Interest, string> = { naturaleza: 'naturaleza', cultura: 'cultura', playa: 'playa', aventura: 'aventura', comida: 'comida', relax: 'relax' };
export interface TripSlots {
  origin?: string;
  /** USD as said; total for the group unless `budgetPerPerson`. */
  budget?: number;
  budgetPerPerson?: boolean;
  days?: number;
  hours?: number;
  people?: number;
  interests?: Interest[];
  pet?: boolean;
  /** «en la Sierra», «en la Costa», «en el Oriente». */
  region?: RegionId;
}
export type SlotName = 'origin' | 'budget' | 'days' | 'people' | 'interests' | 'pet';
export const SLOT_ORDER: SlotName[] = ['origin', 'budget', 'days', 'people', 'interests', 'pet'];

interface Place { name: string; province: string; region: RegionId }
/** Cities people leave from, with the province names the catalog uses. */
export const ORIGINS: Record<string, Place> = {
  quito: { name: 'Quito', province: 'Pichincha', region: 'sierra' }, guayaquil: { name: 'Guayaquil', province: 'Guayas', region: 'costa' },
  cuenca: { name: 'Cuenca', province: 'Azuay', region: 'sierra' }, loja: { name: 'Loja', province: 'Loja', region: 'sierra' },
  ambato: { name: 'Ambato', province: 'Tungurahua', region: 'sierra' }, riobamba: { name: 'Riobamba', province: 'Chimborazo', region: 'sierra' },
  latacunga: { name: 'Latacunga', province: 'Cotopaxi', region: 'sierra' }, ibarra: { name: 'Ibarra', province: 'Imbabura', region: 'sierra' },
  otavalo: { name: 'Otavalo', province: 'Imbabura', region: 'sierra' }, cotacachi: { name: 'Cotacachi', province: 'Imbabura', region: 'sierra' },
  tulcan: { name: 'Tulcán', province: 'Carchi', region: 'sierra' }, banos: { name: 'Baños', province: 'Tungurahua', region: 'sierra' },
  azogues: { name: 'Azogues', province: 'Cañar', region: 'sierra' }, guaranda: { name: 'Guaranda', province: 'Bolívar', region: 'sierra' },
  mindo: { name: 'Mindo', province: 'Pichincha', region: 'sierra' }, manta: { name: 'Manta', province: 'Manabí', region: 'costa' },
  portoviejo: { name: 'Portoviejo', province: 'Manabí', region: 'costa' }, machala: { name: 'Machala', province: 'El Oro', region: 'costa' },
  esmeraldas: { name: 'Esmeraldas', province: 'Esmeraldas', region: 'costa' }, salinas: { name: 'Salinas', province: 'Santa Elena', region: 'costa' },
  'santa elena': { name: 'Santa Elena', province: 'Santa Elena', region: 'costa' }, montanita: { name: 'Montañita', province: 'Santa Elena', region: 'costa' },
  'puerto lopez': { name: 'Puerto López', province: 'Manabí', region: 'costa' }, 'santo domingo': { name: 'Santo Domingo', province: 'Santo Domingo de los Tsáchilas', region: 'costa' },
  babahoyo: { name: 'Babahoyo', province: 'Los Ríos', region: 'costa' }, quevedo: { name: 'Quevedo', province: 'Los Ríos', region: 'costa' },
  tena: { name: 'Tena', province: 'Napo', region: 'amazonia' }, puyo: { name: 'Puyo', province: 'Pastaza', region: 'amazonia' },
  macas: { name: 'Macas', province: 'Morona Santiago', region: 'amazonia' }, coca: { name: 'Coca', province: 'Orellana', region: 'amazonia' },
  'lago agrio': { name: 'Lago Agrio', province: 'Sucumbíos', region: 'amazonia' }, zamora: { name: 'Zamora', province: 'Zamora Chinchipe', region: 'amazonia' },
  galapagos: { name: 'Galápagos', province: 'Galápagos', region: 'galapagos' }, 'santa cruz': { name: 'Santa Cruz', province: 'Galápagos', region: 'galapagos' },
  'san cristobal': { name: 'San Cristóbal', province: 'Galápagos', region: 'galapagos' },
};
/** Well-known places that have no catalog card yet: MIJIN says so and shows ideas from the same region. */
export const PLACES_WITHOUT_CARD: Record<string, Place> = {
  cuyabeno: { name: 'Cuyabeno', province: 'Sucumbíos', region: 'amazonia' }, yasuni: { name: 'Yasuní', province: 'Orellana', region: 'amazonia' },
  misahualli: { name: 'Misahuallí', province: 'Napo', region: 'amazonia' }, tena: ORIGINS.tena, puyo: ORIGINS.puyo, macas: ORIGINS.macas,
  coca: ORIGINS.coca, 'lago agrio': ORIGINS['lago agrio'], montanita: ORIGINS.montanita, canoa: { name: 'Canoa', province: 'Manabí', region: 'costa' },
  atacames: { name: 'Atacames', province: 'Esmeraldas', region: 'costa' }, olon: { name: 'Olón', province: 'Santa Elena', region: 'costa' },
  ayampe: { name: 'Ayampe', province: 'Manabí', region: 'costa' }, cajas: { name: 'El Cajas', province: 'Azuay', region: 'sierra' },
  vilcabamba: { name: 'Vilcabamba', province: 'Loja', region: 'sierra' }, papallacta: { name: 'Papallacta', province: 'Napo', region: 'sierra' },
  ingapirca: { name: 'Ingapirca', province: 'Cañar', region: 'sierra' }, chimborazo: { name: 'Chimborazo', province: 'Chimborazo', region: 'sierra' },
  cayambe: { name: 'Cayambe', province: 'Pichincha', region: 'sierra' }, podocarpus: { name: 'Podocarpus', province: 'Loja', region: 'sierra' },
};
const REGION_NAMES: Record<RegionId, string> = { sierra: 'la Sierra', costa: 'la Costa', amazonia: 'la Amazonía', galapagos: 'Galápagos' };
export const regionName = (region: RegionId) => REGION_NAMES[region];
const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const titleCase = (value: string) => value.replace(/\b\p{L}/gu, letter => letter.toUpperCase());
const findKnown = <T>(text: string, table: Record<string, T>) => Object.keys(table).sort((a, b) => b.length - a.length).find(key => new RegExp(`(^|\\s)${key}(\\s|$)`).test(text));
export function placeWithoutCard(raw: string): Place | null { const key = findKnown(cleanUtterance(raw), PLACES_WITHOUT_CARD); return key ? PLACES_WITHOUT_CARD[key] : null; }
/**
 * A place the person wants to visit that may have no catalog card: any well-known place without a card, or a city
 * named after «conocer», «visitar», «ir a»… («quiero conocer Quito»). Never the city they leave from.
 */
export function destinationPlace(raw: string): Place | null {
  const text = cleanUtterance(raw);
  const known = findKnown(text, PLACES_WITHOUT_CARD);
  if (known && !new RegExp(`(salgo|salimos|parto|vivo|desde|soy|estoy|estamos) (de |en |desde )?${known}`).test(text)) return PLACES_WITHOUT_CARD[known];
  const after = /(?:^| )(?:conocer|visitar|ir a|ir al|ir para|viajar a|llegar a|pasear por|recorrer) ([a-z ]{3,30})/.exec(text)?.[1];
  const city = after ? findKnown(after, ORIGINS) : undefined;
  return city && after!.startsWith(city) ? ORIGINS[city] : null;
}
export function originPlace(origin: string | undefined): Place | null { if (!origin) return null; const key = findKnown(plain(origin), ORIGINS); return key ? ORIGINS[key] : null; }

const INTEREST_WORDS: Record<Interest, RegExp> = {
  playa: /playa|\bmar\b|costa|surf|snorkel|ballena|isla|arena|bronce/,
  naturaleza: /naturaleza|montana|volcan|cascada|bosque|selva|amazon|paramo|laguna|lago|aves|animales|fauna|parque nacional|senderismo|caminata|trekking|camping|verde|aire libre/,
  cultura: /cultura|historia|comunidad|indigena|tradicion|museo|\barte\b|artesan|colonial|patrimonio|pueblo|mercado|ciudad/,
  aventura: /aventura|adrenalina|extremo|rafting|canopy|tirolesa|puenting|\bbici|ciclismo|escalada|kayak|buceo|parapente|cuadron|deporte/,
  comida: /comida|comer|gastronom|\bplatos?\b|\bcafe\b|chocolate|cocina|mariscos|\bcuy\b|encebollado|probar|sabores|antojitos/,
  relax: /relax|relaj|descans|termas|termales|\bspa\b|tranquil|chill|desconect/,
};
const INTEREST_TAGS: Record<Interest, RegExp> = {
  playa: /^(playa|mar|snorkel|fauna-marina|isla|surf|actividad-acuatica|buceo|tortugas|isla-en-isla)$/,
  naturaleza: /^(area-protegida|naturaleza|cascadas|volcan|laguna|lago|aves|fauna|bosque-nublado|bosque-humedo|paramo|choco-andino|senderismo|caminata|caminatas|ecoturismo|flora-endemica|conservacion|miradores|rio|lava)$/,
  cultura: /^(cultura|turismo-comunitario|patrimonio|artesanias|museos|historia|arquitectura|ciudad|centro-historico|textiles|musica|mercado|arqueologia|cultura-mantena|pueblo-.*)$/,
  aventura: /^(aventura|rafting|canopy|ciclismo|senderismo|surf|buceo|snorkel|caminata-larga|volcan|varios-dias|navegacion)$/,
  comida: /^(gastronomia|cafe-y-chocolate|degustacion|mercado|agroecologia)$/,
  relax: /^(termas|bienestar|playa)$/,
};
const SKIP = /\b(no se|ni idea|da igual|cualquiera|lo que sea|no importa|depende|sorprendeme|paso|saltar|no estoy seguro|todavia no se|aun no se)\b/;
const NOT_A_PLACE = /^(si|no|ok|ya|dale|hola|gracias|claro|bueno|listo|nada|todo|de todo|nose|no se)$/;
const ORIGIN_PATTERNS = [
  /\b(?:salgo|saldria|saldremos|salimos|saldre|parto|partimos|vengo|venimos|viajo|viajamos|viajaria) (?:de|desde) ([a-z ]{3,40})/,
  /\b(?:desde|estoy en|estamos en|vivo en|vivimos en|soy de|somos de|cerca de|por) ([a-z ]{3,40})/,
];
const ORIGIN_STOP = /\s(con|y|tengo|tenemos|somos|para|a|al|en|quiero|queremos|me|hasta|unos|como|el|la|por|pero|que|cerca|de|salgo|mi|mis)(\s|$)/;
const UNIT_AFTER = '(?!\\s*(?:dias?|personas?|horas?|noches?|anos?|amigos?|amigas?|semanas?|km|panas|viajeros|adultos|ninos|meses?))';
const BUDGET_PATTERNS = [
  /\$\s*(\d+(?:\.\d+)?)/,
  /(\d+(?:\.\d+)?)\s*(?:dolares|usd)\b/,
  new RegExp(`\\b(?:presupuesto(?: es)?(?: de)?|gastar|gasto|tengo|tenemos|unos|como|hasta|maximo|maximo de|con)\\s+(\\d+(?:\\.\\d+)?)${UNIT_AFTER}\\b`),
];

/**
 * Trip details found in one phrase. `awaiting` is the question MIJIN just asked: a bare «50» then means the budget,
 * «3» the people, «sí» a pet. `skipped` is true when the person says they do not know («no sé», «da igual»).
 */
export function extractSlots(raw: string, awaiting?: SlotName): { slots: TripSlots; skipped: boolean } {
  const text = cleanUtterance(raw);
  const slots: TripSlots = {};
  if (!text) return { slots, skipped: false };
  // Budget
  for (const pattern of BUDGET_PATTERNS) { const match = pattern.exec(text); if (match) { const value = Number(match[1]); if (Number.isFinite(value) && value > 0 && value <= 100000) { slots.budget = value; break; } } }
  if (slots.budget !== undefined && /por persona|cada uno|por cabeza|c u\b/.test(text)) slots.budgetPerPerson = true;
  // Days and hours
  const hours = /(\d+)\s*horas?\b/.exec(text); if (hours) { slots.hours = Math.min(24, Number(hours[1])); slots.days = 1; }
  const days = /(\d+)\s*dias?\b/.exec(text); if (days) slots.days = Number(days[1]);
  const nights = /(\d+)\s*noches?\b/.exec(text); if (nights && !days) slots.days = Number(nights[1]) + 1;
  const weeks = /(\d+)\s*semanas?\b/.exec(text); if (weeks && !days) slots.days = Number(weeks[1]) * 7;
  if (!slots.days && /fin de semana|feriado largo/.test(text)) slots.days = 2;
  if (!slots.days && /medio dia|solo hoy|hoy mismo|en el dia|un rato|unas horas|por el dia|full day|ida y vuelta el mismo dia/.test(text)) slots.days = 1;
  // People
  const group = /\bsomos (\d+)|(\d+)\s*(?:personas?|panas|panitas|viajeros|adultos|wambras|integrantes|de nosotros)\b/.exec(text);
  const friends = /\bcon (\d+)\s*(?:amigos?|amigas?|panas|companeros?|primos?|hermanos?)\b/.exec(text);
  if (group) slots.people = Number(group[1] ?? group[2]);
  else if (friends) slots.people = Number(friends[1]) + 1;
  else if (/\b(solo yo|yo solo|yo sola|voy sol[oa]|viajo sol[oa]|solit[oa]|sol[oa]s? yo|nadie mas)\b/.test(text)) slots.people = 1;
  else if (/en pareja|con mi (novi[oa]|pareja|espos[oa]|enamorad[oa]|marido|mujer)|yo y mi (novi|pareja|espos|enamorad|amig|herman|mama|papa)|\b(los|las|nosotros) 2\b/.test(text)) slots.people = 2;
  // Origin
  for (const pattern of ORIGIN_PATTERNS) {
    const match = pattern.exec(text); if (!match) continue;
    const known = findKnown(match[1], ORIGINS);
    if (known && match[1].startsWith(known)) { slots.origin = ORIGINS[known].name; break; }
    const head = match[1].split(ORIGIN_STOP)[0].trim().split(' ').slice(0, 3).join(' ');
    if (pattern === ORIGIN_PATTERNS[0] && head.length >= 3 && !NOT_A_PLACE.test(head) && !/\d/.test(head)) { slots.origin = titleCase(head); break; }
  }
  if (!slots.origin && awaiting === 'origin') {
    const known = findKnown(text, ORIGINS);
    if (known) slots.origin = ORIGINS[known].name;
  }
  // Interests
  const interests = (Object.keys(INTEREST_WORDS) as Interest[]).filter(interest => INTEREST_WORDS[interest].test(text));
  if (interests.length) slots.interests = interests;
  // Region
  const region = /b(sierra|andes)b/.test(text) ? 'sierra' : /b(en la costa|la costa|litoral)b/.test(text) ? 'costa' : /b(amazonia|oriente|selva)b/.test(text) ? 'amazonia' : /bgalapagosb/.test(text) ? 'galapagos' : null;
  if (region) slots.region = region;
  // Pet
  if (/\bsin (mascota|perro|gato)|no (tengo|llevo|viajo con|voy con) (mascota|perro|gato)/.test(text)) slots.pet = false;
  else if (/\bcon (mi |mis |un |una )?(mascota|perr|gat|lomito|michi|chuchito)/.test(text) || /\b(llevo|tengo) (a )?(mi |un )?(perr|gat|mascota)/.test(text)) slots.pet = true;
  // A bare answer to the question just asked
  const foundAny = Object.keys(slots).length > 0;
  const bare = foundAny ? null : /^(?:unos |como |mas o menos |solo |somos |son )?(\d+(?:\.\d+)?)(?: mas o menos| nomas| no mas)?$/.exec(text);
  if (bare) {
    const value = Number(bare[1]);
    if (awaiting === 'budget' && slots.budget === undefined && value > 0) slots.budget = value;
    if (awaiting === 'days' && slots.days === undefined && value >= 1) slots.days = Math.round(value);
    if (awaiting === 'people' && slots.people === undefined && value >= 1) slots.people = Math.round(value);
  }
  if (awaiting === 'pet' && slots.pet === undefined) {
    if (/^(si|sii+|claro|obvio|dale|ya|sip|de una|si llevo|si tengo)\b/.test(text)) slots.pet = true;
    else if (/^(no|nop|nel|ninguna|ninguno|para nada|no tengo|no llevo)\b/.test(text)) slots.pet = false;
  }
  if (awaiting === 'interests' && !slots.interests && /\b(de todo|todo|lo que sea|cualquier cosa)\b/.test(text)) return { slots, skipped: true };
  return { slots, skipped: SKIP.test(text) };
}
/** Budget for the whole group, when known. */
export function groupBudget(slots: TripSlots): number | undefined {
  if (slots.budget === undefined) return undefined;
  return slots.budgetPerPerson ? slots.budget * (slots.people ?? 1) : slots.budget;
}
const UNIT_TEXT: Record<string, string> = { per_person: 'por persona' };
const amount = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
/** «$38 por persona», «$270–315 por persona», «€46.4 por persona (en euros)». */
export function shortPrice(experience: Experience): string {
  const price = experience.price;
  if (price.min === null) return 'Precio por confirmar';
  const symbol = price.currency === 'USD' ? '$' : '€';
  const range = price.max !== null && price.max !== price.min ? `${symbol}${amount(price.min)}–${amount(price.max)}` : `${symbol}${amount(price.min)}`;
  return `${range} ${UNIT_TEXT[price.unit] ?? ''}`.trim() + (price.currency === 'USD' ? '' : ' (en euros)');
}
/** Base cost of the experience for the group in USD (null when the source price is in EUR or missing). */
export function groupCost(experience: Experience, people = 1): number | null {
  const price = experience.price;
  if (price.currency !== 'USD' || price.min === null) return null;
  return Math.round(price.min * people * 100) / 100;
}
export const durationText = (experience: Experience) => { const need = daysNeeded(experience); return experience.duration.days ? `${experience.duration.days} ${experience.duration.days === 1 ? 'día' : 'días'}` : need === 1 && experience.duration.maxHours ? `${experience.duration.maxHours} h` : experience.duration.label; };

export interface Recommendation { experience: Experience; reasons: string[]; fits: boolean }
/**
 * Up to `limit` catalog ideas for the trip so far, best first, each with one or two short reasons. Only the
 * experience base price is compared; transport, food and extras are never invented.
 */
export function recommendTrips(slots: TripSlots, catalog: readonly Experience[], limit = 3, region?: RegionId, prefer: { cheap?: boolean } = {}): Recommendation[] {
  const people = slots.people ?? 1;
  const budget = groupBudget(slots);
  const origin = originPlace(slots.origin);
  const interests = slots.interests ?? [];
  const area = region ?? slots.region;
  const scored = catalog.filter(experience => experience.accessStatus !== 'closed_reported' && (!area || experience.localizedRegion === area)).map(experience => {
    const reasons: string[] = [];
    let score = 0; let fits = true;
    const tags = experience.tags;
    const liked = interests.filter(interest => tags.some(tag => INTEREST_TAGS[interest].test(tag)) || (interest === 'playa' && experience.localizedRegion === 'costa' && tags.includes('playa')));
    if (liked.length) { score += 3 + liked.length; reasons.push(`Te gusta ${liked.map(item => (item === 'relax' ? 'el ' : 'la ') + INTEREST_LABELS[item]).join(' y ')}`); }
    else if (interests.length) score -= 2;
    const cost = groupCost(experience, people);
    if (budget !== undefined) {
      if (cost !== null && cost <= budget) { score += 3; reasons.push(`Cabe en tus $${amount(budget)}${people > 1 ? ` para ${people}` : ''}`); }
      else { score -= 5; fits = false; reasons.push(cost === null ? 'Precio en euros: confirma el cambio' : `Se pasa: $${amount(cost)}${people > 1 ? ` para ${people}` : ''}`); }
    } else if (cost !== null) score -= cost / (prefer.cheap ? 12 : 100);
    else score -= 2;
    const need = daysNeeded(experience);
    if (slots.days !== undefined && need !== null) { if (need <= slots.days) score += 1; else { score -= 4; fits = false; reasons.push(`Necesita ${need} días`); } }
    if (slots.hours !== undefined && experience.duration.maxHours !== null && experience.duration.maxHours > slots.hours) { score -= 2; }
    if (origin) {
      const near = plain(experience.province) === plain(origin.province) || plain(experience.locality).includes(plain(origin.name));
      if (near) { score += 3; reasons.push(`Cerca de ${origin.name}`); }
      else if (experience.localizedRegion === origin.region) score += 1.5;
      else if (experience.localizedRegion === 'galapagos') score -= 1;
    }
    if (experience.localizedRegion === 'galapagos' && (origin?.region ?? 'sierra') !== 'galapagos') reasons.push('Vuelos y tasas aparte');
    if (slots.pet) { if (petAdmission(experience, { species: 'perro', count: 1 }).allowed) { score += 2; reasons.push('Acepta mascotas'); } else { score -= 1; } }
    if (experience.media[0]) score += 0.5;
    return { experience, reasons: reasons.slice(0, 2), fits, score };
  });
  const matches = (item: { reasons: string[] }) => !interests.length || item.reasons.some(reason => reason.startsWith('Te gusta'));
  // What the person likes comes first: a beach idea that runs a bit over budget beats a mountain one that fits.
  return scored.sort((a, b) => Number(b.fits && matches(b)) - Number(a.fits && matches(a)) || Number(matches(b)) - Number(matches(a)) || Number(b.fits) - Number(a.fits) || b.score - a.score).slice(0, limit).map(({ experience, reasons, fits }) => ({ experience, reasons, fits }));
}
