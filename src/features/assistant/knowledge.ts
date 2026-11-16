/**
 * MIJIN's catalog + FAQ answers: short (1–3 sentences) with cards, quick-reply chips and the detail behind a tap.
 * The intent router (intents.ts) decides what was asked; below its confidence threshold MIJIN says it did not
 * understand and offers three options instead of answering something unrelated.
 * Reachable from api/: relative imports end in `.js` and nothing here touches the DOM.
 */
import type { Experience } from '../../domain/catalog/types.js';
import { petAdmission } from '../../domain/planner/index.js';
import { eventStatusLabel, getEventsByMonth, monthName } from '../../domain/culture/index.js';
import { REGION_LABELS } from '../../domain/catalog/types.js';
import { answerCommunityShare, agreementFor } from '../../domain/transparency/index.js';
import { classifyIntent, cleanUtterance, normalizeQuestion, type Intent } from './intents.js';
import { destinationPlace, durationText, extractSlots, groupBudget, recommendTrips, regionName, shortPrice, type Recommendation } from './trip.js';

export { normalizeQuestion } from './intents.js';
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export interface AssistantCard {
  id: string; title: string; summary: string; price: string; source: string; checkedAt: string;
  /** Short price for the card: «$38 por persona». */
  priceShort?: string;
  image?: { src: string; alt: string; credit: string };
  place?: string;
  duration?: string;
  /** Why it fits («Cabe en tus $50», «Cerca de Cuenca»). */
  reasons?: string[];
  fits?: boolean;
}
/** A quick reply: `label` on the chip, `query` is what MIJIN receives when it is tapped. */
export interface AssistantChip { label: string; query: string }
export type AssistantTarget = 'plan' | 'culture' | 'passport' | 'downloads' | 'account' | 'alerts' | 'privacy' | 'build_trip';
export interface AssistantAction { label: string; target: AssistantTarget }
export interface AssistantAnswer {
  /** 1–3 short sentences, shown and read aloud. */
  text: string;
  spokenSummary: string;
  /** Longer detail, shown only when the person taps «Ver detalle». */
  details?: string;
  cards: AssistantCard[];
  chips?: AssistantChip[];
  actions?: AssistantAction[];
  warnings: string[];
  intent?: Intent;
  confidence?: number;
  mode: 'local_faq' | 'offline_downloads' | 'remote_ai';
  pricesAreEstimates: true;
  needsConfirmation: true;
}
export interface LocalContext { catalog: Experience[]; online: boolean; downloadedAt?: string; now?: Date }

const STOP_WORDS = new Set(['tengo', 'quiero', 'puedo', 'donde', 'como', 'hacer', 'cuanto', 'desde', 'salgo', 'viaje', 'viajar', 'para', 'esto', 'esta', 'este', 'estos', 'estas', 'con', 'que', 'por', 'del', 'una', 'uno', 'las', 'los', 'hoy', 'mijin', 'dolares', 'total', 'horas', 'dias', 'estoy', 'tiene', 'tienen', 'conocer', 'visitar', 'muestrame', 'muestra', 'abre', 'sobre', 'cuentame', 'quisiera', 'gustaria', 'algo', 'cerca', 'barato', 'tal', 'hola', 'bien', 'gracias', 'mas', 'muy', 'pero', 'cual', 'cuales', 'hay', 'ese', 'esa', 'eso', 'ahi', 'alla', 'aqui', 'todo', 'todos', 'nada', 'personas', 'persona', 'somos', 'precio', 'cuesta', 'llego', 'llegar', 'ir', 'voy', 'vamos', 'queda', 'incluye', 'ficha', 'fichas', 'lugar', 'lugares', 'sitio', 'destino', 'destinos', 'plan', 'planes', 'ideas', 'idea', 'semana', 'fin', 'mes', 'ano', 'favor', 'porfa', 'porfavor', 'saber', 'quiere', 'tambien', 'mucho', 'poco', 'dame', 'dime', 'necesito', 'busco', 'buscar', 'recomienda', 'recomiendas', 'clima', 'tiempo', 'mascota', 'perro', 'gato', 'sierra', 'costa', 'amazonia', 'oriente', 'selva', 'playa', 'aventura', 'naturaleza', 'cultura', 'comida', 'relax', 'gusta', 'encanta', 'barato', 'economico', 'parque', 'nacional', 'ecuador', 'reserva', 'reservas', 'reservar', 'pagar', 'pago', 'tarjeta', 'cuanto', 'cuesta', 'vale', 'llueve', 'lluvia', 'manana', 'fiesta', 'fiestas']);
const stem = (word: string) => word.length > 4 ? word.replace(/(es|s)$/, '') : word;
/** Catalog cards scored by whole-word matches: title 5, place 3, activities/tags 1 (a match needs score ≥ 3). */
export function scoreExperiences(question: string, catalog: readonly Experience[]): { experience: Experience; score: number }[] {
  const tokens = [...new Set(cleanUtterance(question).split(/[^a-z0-9]+/).filter(token => token.length > 3 && !STOP_WORDS.has(token)).map(stem))];
  if (!tokens.length) return [];
  const wordsOf = (value: string) => new Set(normalizeQuestion(value).split(/[^a-z0-9]+/).filter(Boolean).map(stem));
  return catalog.map(experience => {
    const title = wordsOf(`${experience.title} ${experience.experienceName ?? ''} ${experience.slug.replace(/-/g, ' ')}`);
    const location = wordsOf(`${experience.locality} ${experience.province} ${experience.subregion ?? ''}`);
    const content = wordsOf(`${experience.activities.join(' ')} ${experience.tags.join(' ').replace(/-/g, ' ')} ${experience.attractions.join(' ')}`);
    const score = tokens.reduce((sum, token) => sum + (title.has(token) ? 5 : location.has(token) ? 3 : content.has(token) ? 1 : 0), 0);
    return { experience, score };
  }).filter(item => item.score >= 3).sort((a, b) => b.score - a.score);
}
export function retrieveExperiences(question: string, catalog: Experience[], limit = 3): Experience[] {
  return scoreExperiences(question, catalog).slice(0, limit).map(item => item.experience);
}
const where = (experience: Experience) => normalizeQuestion(experience.locality).includes(normalizeQuestion(experience.province)) ? experience.locality : `${experience.locality}, ${experience.province}`;
const firstSentence = (text: string) => (/^.*?[.!?](\s|$)/.exec(text.trim())?.[0] ?? text).trim();
export function cardFor(experience: Experience, extra: Partial<AssistantCard> = {}): AssistantCard {
  const media = experience.media[0];
  return {
    id: experience.id, title: experience.experienceName ?? experience.title, summary: firstSentence(experience.summary), price: experience.price.originalLabel,
    source: experience.originalDocument, checkedAt: experience.sourceCheckedAt, priceShort: shortPrice(experience), place: `${experience.locality.split(',')[0]} · ${REGION_LABELS[experience.localizedRegion]}`,
    duration: durationText(experience), ...(media ? { image: { src: media.src, alt: media.alt, credit: media.credit } } : {}), ...extra,
  };
}
export const recommendationCards = (items: Recommendation[]) => items.map(item => cardFor(item.experience, { reasons: item.reasons, fits: item.fits }));

/** Three concrete options when MIJIN did not understand. */
export const FALLBACK_CHIPS: AssistantChip[] = [
  { label: 'Armar mi viaje', query: 'Quiero armar un viaje' },
  { label: 'Fiestas de este mes', query: '¿Qué fiestas hay este mes?' },
  { label: 'Algo barato cerca de Quito', query: 'Algo barato cerca de Quito' },
];
const TRIP_CHIP: AssistantChip = { label: 'Armar mi viaje', query: 'Quiero armar un viaje' };

export function answerLocally(question: string, context: LocalContext): AssistantAnswer {
  const catalog = context.catalog;
  const offline = !context.online;
  const offlineNote = offline ? ` Solo uso fichas descargadas${context.downloadedAt ? ` el ${context.downloadedAt}` : ''}; podrían estar desactualizadas.` : '';
  const scored = scoreExperiences(question, catalog);
  const { intent, confidence, text: q } = classifyIntent(question, scored[0]?.score ?? 0);
  const result = (text: string, options: { cards?: AssistantCard[]; details?: string; chips?: AssistantChip[]; actions?: AssistantAction[]; warnings?: string[]; spoken?: string } = {}): AssistantAnswer => ({
    text, spokenSummary: (options.spoken ?? text).slice(0, 650), cards: options.cards ?? [], warnings: options.warnings ?? [],
    ...(options.details ? { details: options.details } : {}), ...(options.chips?.length ? { chips: options.chips } : {}), ...(options.actions?.length ? { actions: options.actions } : {}),
    intent, confidence, mode: offline ? 'offline_downloads' : 'local_faq', pricesAreEstimates: true, needsConfirmation: true,
  });
  if (!q) return result('Cuéntame de dónde sales, cuánto quieres gastar y qué te gusta.', { chips: FALLBACK_CHIPS });
  switch (intent) {
    case 'injection': return result('Solo consulto información pública. No tengo acceso a datos privados de otras personas ni a contraseñas.');
    case 'greeting': return result('¡Hola, wambra! Soy MIJIN, tu pana de aventuras. ¿Armamos un viaje?', { chips: FALLBACK_CHIPS });
    case 'smalltalk': return result('¡Todo chévere, gracias! Listo para buscarte un buen plan. ¿A dónde te gustaría ir?', { chips: [TRIP_CHIP, { label: 'Quiero ir a la playa', query: 'Quiero ir a la playa' }, { label: 'Algo de naturaleza', query: 'Me gusta la naturaleza' }] });
    case 'about': return result('Soy MIJIN, la guía de Chulla Vida: no soy una persona. Te ayudo a armar viajes y te cuento de fiestas, clima y cómo usar la app.', { chips: FALLBACK_CHIPS });
    case 'thanks': return result('¡De nada, pana! ¿Te ayudo con algo más?', { chips: [TRIP_CHIP, { label: '¿Qué fiestas hay?', query: '¿Qué fiestas hay este mes?' }] });
    case 'goodbye': return result('¡Chao, wambra! Buen viaje y cuídate.');
    case 'yes': return result('¡Dale! Cuéntame desde dónde sales y armamos tu viaje.', { chips: [TRIP_CHIP] });
    case 'no': return result('Tranqui. Pregúntame lo que quieras cuando quieras.', { chips: FALLBACK_CHIPS });
    case 'privacy': return result(/cookie|analitic/.test(q) ? 'Las cookies de analítica son opcionales. Recházalas o cámbialas cuando quieras en «Privacidad y cookies».'
      : /ubicacion/.test(q) ? 'MIJIN no usa tu ubicación. Si se la diste al navegador, la quitas en los permisos del sitio.'
      : /audio|voz|grab/.test(q) ? 'No guardamos tu audio: no hay nada que borrar. El chat lo borras con «Borrar conversación».'
      : 'El chat vive solo en memoria y no guardamos audio. Puedes borrarlo con «Borrar conversación».', {
      details: 'Voz, lectura en voz alta y clima empiezan solo cuando tú tocas. El reconocimiento del navegador puede usar servidores de su proveedor. Micrófono y ubicación se revocan en los permisos del navegador; cookies y analítica, en «Privacidad y cookies». Desde el chat no puedo borrar datos de una cuenta.',
      actions: [{ label: 'Privacidad y cookies', target: 'privacy' }] });
    case 'privacy_data': return result('En este dispositivo guardo tus preferencias, favoritos, viaje y descargas. El audio no se guarda y el chat vive solo en memoria.', {
      details: 'Sin cuenta conectada no enviamos esos datos a un servidor. Un dato personal es cualquier información que te identifica. Puedes pedir acceso, rectificación, eliminación, oposición o portabilidad. La Política de Privacidad es un borrador pendiente de revisión legal.',
      actions: [{ label: 'Privacidad y cookies', target: 'privacy' }] });
    case 'festivals': {
      const monthIndex = MONTHS.findIndex(month => q.includes(month));
      const now = context.now ?? new Date();
      const month = monthIndex >= 0 ? monthIndex + 1 : now.getMonth() + 1;
      const events = getEventsByMonth(month);
      if (!events.length) return result(`No tengo fiestas registradas para ${monthName(month)}. Algunas, como la Kasama tsáchila, dependen del calendario de cada comunidad.`, { actions: [{ label: 'Ver Cultura Viva', target: 'culture' }] });
      const names = events.slice(0, 3).map(event => `${event.name} (${REGION_LABELS[event.region]})`);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0];
      const details = events.slice(0, 6).map(event => {
        const status = eventStatusLabel(event, now).replace(/\.+$/, '');
        const when = status.includes(event.dateLabel) ? status : `${event.dateLabel.replace(/\.+$/, '')}. ${status}`;
        return `${event.name} (${event.localities.join(', ') || event.provinces.join(', ')}): ${when}.`;
      }).join(' ');
      return result(`En ${monthName(month)}: ${list}. Fechas orientativas: confírmalas antes de ir.`, { details: `${details} Respeta los protocolos de cada comunidad.`, actions: [{ label: 'Ver Cultura Viva', target: 'culture' }] });
    }
    case 'verify_business': return result('Creas tu cuenta, subes los documentos de tu actividad a un espacio privado y una persona del equipo los revisa. El distintivo de Chulla Vida no es un aval del Gobierno.', {
      details: 'Elige tu figura: establecimiento, operador, guía, asociación comunitaria o representante. Te pueden pedir correcciones y siempre te explican la decisión. El registro turístico oficial se verifica aparte cuando tu actividad lo requiere.',
      actions: [{ label: 'Cuenta y negocio', target: 'account' }] });
    case 'plans': return result('Hay tres planes: Explorador Gratis, Viajero Plus y Anfitrión. Sus precios están pendientes de definición: no hay suscripciones reales activas.', { details: 'Los planes semanal, mensual y anual del menú son una demostración sin cobro.' });
    case 'card_payment': return result('Con tarjeta se pagará solo por la pasarela del proveedor (PayPhone), sin que veamos tu número. Hoy ninguna ficha está habilitada para pagar: todas son referenciales.', { details: 'Un pago solo cuenta como confirmado cuando el servidor lo verifica con el proveedor, nunca por volver de una página.' });
    case 'own_booking': return result('Solo puedo ver tus propias reservas cuando inicias sesión, nunca las de otra persona. Revisa «Reservas y pagos».', { details: 'Una solicitud de información no es una reserva confirmada.' });
    case 'community_share': {
      const amount = Number(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*dolares/.exec(q)?.slice(1).find(Boolean) ?? 49);
      const sentences = answerCommunityShare(amount, agreementFor('')).split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚ¿¡])/);
      return result(sentences.slice(0, 2).join(' '), { details: sentences.slice(2).join(' ') || undefined });
    }
    case 'downloads': return result('Abre «Sin señal» y elige las fichas de tu viaje: quedan en este dispositivo. Reservas, pagos, clima actual e IA remota necesitan conexión.', {
      details: context.downloadedAt ? `Última descarga: ${context.downloadedAt}.` : 'Aún no tienes fichas descargadas.', actions: [{ label: 'Mis descargas', target: 'downloads' }] });
    default: break;
  }
  if (offline && !catalog.length) return result('Sin conexión: no hay fichas descargadas. Descarga tu viaje cuando tengas internet.', { details: 'Sin internet no puedo consultar clima actual, IA remota, pagos ni reservas nuevas.' });
  const matched = scored.slice(0, 3).map(item => item.experience);
  const place = matched[0];
  switch (intent) {
    case 'offline': return result(`Sin señal puedes leer tu viaje y las fichas que descargaste. ${catalog.length} fichas disponibles aquí.${offlineNote}`, { details: 'Sin conexión no se confirman reservas, pagos, visitas ni clima actual.', actions: [{ label: 'Mis descargas', target: 'downloads' }] });
    case 'weather': return result(context.online ? 'No tengo el clima actualizado hasta consultarlo. Dime la localidad y lo pido con tu permiso.' : `No tengo el clima actualizado sin internet.${offlineNote}`, { cards: matched.slice(0, 1).map(item => cardFor(item)) });
    case 'pets': {
      const eligible = (matched.length ? matched : catalog).filter(e => petAdmission(e, { species: /gat/.test(q) ? 'gato' : 'perro', count: 1 }).allowed);
      return eligible.length
        ? result('Estas fichas tienen política de mascotas confirmada. Revisa tamaño, fecha y transporte con el anfitrión.', { cards: eligible.slice(0, 3).map(item => cardFor(item)) })
        : result('No encuentro fichas con política de mascotas confirmada. No recomiendo entrar con mascotas a zonas protegidas de Galápagos.', { details: 'Consulta las condiciones directamente con cada anfitrión: no ponemos el sello pet-friendly a fichas sin verificar.' });
    }
    case 'closures': return result('No tengo un feed de cierres en vivo. Chulla Flex te propone alternativas, pero nunca cambia una reserva solo.', { cards: matched.slice(0, 2).map(item => cardFor(item)), details: 'Los avisos del catálogo son históricos y hay que revalidarlos.', actions: [{ label: 'Abrir mi viaje', target: 'plan' }] });
    case 'passport': return result('Tu Pasaporte Guambra guarda los recuerdos de tus viajes. Los sellos de visita real los valida el anfitrión: abrir una ficha no cuenta.', { details: 'Las pruebas visuales se marcan como demostración.', actions: [{ label: 'Mi pasaporte', target: 'passport' }] });
    case 'booking': return result(`Las ${catalog.length} fichas son referenciales: no tienen compra, cupos ni operadores verificados todavía. Puedes guardarlas y armar un borrador.`, { cards: matched.slice(0, 2).map(item => cardFor(item)), details: 'Una solicitud o una prueba de pago no confirma un servicio real.' });
    default: break;
  }
  if (!place && (intent === 'directions' || intent === 'price' || intent === 'includes')) {
    const examples = catalog.filter(item => item.media.length).slice(0, 3);
    return result('¿De qué lugar? Dime el nombre, por ejemplo «¿Cuánto cuesta Quilotoa?».', { chips: examples.map(item => ({ label: item.title, query: intent === 'directions' ? `¿Cómo llego a ${item.title}?` : intent === 'includes' ? `¿Qué incluye ${item.title}?` : `¿Cuánto cuesta ${item.title}?` })) });
  }
  if (place && intent === 'directions') {
    const access = place.locationInfo;
    const stages = access?.transportOptions.map(option => `${option.label}${option.durationLabel ? `, ${option.durationLabel}` : ''}${option.priceLabel ? `, ${option.priceLabel}` : ''}. ${option.notes}`).join(' ') ?? '';
    const leg = access?.transportOptions[0];
    const firstLeg = leg ? ` Primer tramo: ${leg.label}${leg.durationLabel ? ` (${leg.durationLabel})` : ''}, por confirmar.` : '';
    return result(`${place.title} está en ${where(place)}. ${access ? firstSentence(access.accessSummary) : 'Confirma el acceso y el punto de encuentro antes de salir.'}${firstLeg}${offlineNote}`, {
      cards: [cardFor(place)], details: `${access ? `${access.accessSummary} ${stages} ` : ''}Tiempos y costos referenciales, por confirmar. No es navegación en vivo.`.trim() });
  }
  if (place && intent === 'price') {
    const days = /\b(\d+)\s*dias?/.exec(q)?.[1];
    const choices = place.price.options ?? [];
    const selected = days ? choices.filter(option => normalizeQuestion(`${option.label} ${option.durationLabel ?? ''}`).includes(`${days} dias`)) : [];
    const options = (selected.length ? selected : choices).map(option => `${option.label}: ${option.currency} ${option.min ?? 'por cotizar'}${option.max !== null && option.max !== option.min ? ` a ${option.max}` : ''}. ${option.notes}`).join(' ');
    return result(`${place.title}: desde ${shortPrice(place)}. Precio referencial, sin cupos confirmados.${offlineNote}`, { cards: [cardFor(place)], details: `${place.price.originalLabel}. ${options} ${place.price.excludes.length ? `Gastos aparte: ${place.price.excludes.join('; ')}.` : ''}`.trim() });
  }
  if (place && intent === 'includes') return result(`${place.title}: ${place.price.includes.length ? `incluye ${place.price.includes.slice(0, 3).join(', ')}.` : 'no hay inclusiones confirmadas.'} Confírmalo con el operador.${offlineNote}`, { cards: [cardFor(place)], details: place.price.excludes.length ? `Gastos aparte: ${place.price.excludes.join('; ')}.` : undefined });
  if (intent === 'trip') return answerTrip(question, context, offlineNote, result);
  if (place && (intent === 'place' || intent === 'directions' || intent === 'price' || intent === 'includes')) {
    const warnings = matched.flatMap(e => e.warnings.map(warning => `${warning.asOf ?? 'Sin fecha'} · Aviso histórico: ${warning.text}`)).slice(0, 3);
    const lead = firstSentence(place.summary);
    return result(`${place.title}: ${lead.length <= 120 ? `${lead} ` : ''}Desde ${shortPrice(place)}, ${durationText(place)}.${offlineNote}`, {
      cards: matched.map(item => cardFor(item)), warnings,
      details: `${lead.length > 120 ? `${place.summary} ` : ''}Está en ${where(place)}. ${place.activities.length ? `Puedes: ${place.activities.slice(0, 4).join(', ')}.` : ''} Son referencias por confirmar, no ofertas reservables.`,
      chips: [{ label: '¿Cómo llego?', query: `¿Cómo llego a ${place.title}?` }, ...(place.weatherReference ? [{ label: 'Ver el clima', query: `Clima de ${place.weatherReference.placeName}` }] : []), TRIP_CHIP] });
  }
  return result('Mmm, no te entendí bien. ¿Te refieres a una de estas?', { chips: FALLBACK_CHIPS });
}

type Build = (text: string, options?: { cards?: AssistantCard[]; details?: string; chips?: AssistantChip[]; actions?: AssistantAction[]; warnings?: string[]; spoken?: string }) => AssistantAnswer;
/** A trip question in one phrase («Salgo de Quito con $20», «quiero ir a la playa»), without conversation memory. */
function answerTrip(question: string, context: LocalContext, offlineNote: string, result: Build): AssistantAnswer {
  const catalog = context.catalog;
  const q = cleanUtterance(question);
  const { slots } = extractSlots(question);
  const missing = destinationPlace(question);
  if (missing && !scoreExperiences(question, catalog).length) {
    if (!context.online) return result(`No tengo fichas de ${missing.name} descargadas.${offlineNote}`, { actions: [{ label: 'Mis descargas', target: 'downloads' }] });
    const near = recommendTrips(slots, catalog, 3, missing.region);
    if (!near.length) return result(`Aún no tengo ficha de ${missing.name}.`, { chips: FALLBACK_CHIPS });
    return result(`Aún no tengo ficha de ${missing.name}. En ${regionName(missing.region)} te puedo mostrar ${near.length === 1 ? 'esta' : 'estas'}:${offlineNote}`, { cards: recommendationCards(near), chips: [TRIP_CHIP] });
  }
  const budget = groupBudget(slots);
  if (budget !== undefined) {
    const hours = slots.hours ?? (slots.days ? slots.days * 24 : 8);
    const people = slots.people ?? Number(/\b(\d+)\s*(?:personas|panas|viajeros|wambras)/.exec(q)?.[1] ?? 1);
    const explicitZero = /\b0\s*(horas?|dias?|personas?)\b/.test(q);
    if (explicitZero || !Number.isFinite(budget) || hours <= 0 || !Number.isInteger(people) || people < 1 || people > 50) return result('Dime un presupuesto válido, al menos una hora y entre 1 y 50 personas.');
    if (/galapagos/.test(q) && budget <= 20) return result('Galápagos con $20 en total no se considera viable: vuelos, tasas y traslados van aparte.', { details: 'Las fichas no incluyen el viaje completo. Puedes guardarlo como inspiración.', chips: [TRIP_CHIP] });
    const picks = recommendTrips({ ...slots, people, hours, budget, budgetPerPerson: false }, catalog, 6).filter(pick => pick.fits && (pick.experience.duration.maxHours === null || pick.experience.duration.maxHours <= hours)).slice(0, 3);
    const who = `${people} ${people === 1 ? 'persona' : 'personas'}`;
    if (!picks.length) return result(`Con $${budget} para ${who} no encuentro una opción que quepa. Prueba con más presupuesto o tiempo.${offlineNote}`, { details: 'No convierto precios en euros sin una tasa fechada.', chips: [TRIP_CHIP] });
    return result(`Con $${budget} para ${who}, estas ideas caben en el costo base. Faltan transporte, comida y extras.${offlineNote}`, {
      cards: recommendationCards(picks), details: `${slots.origin ? `Priorizo lo cercano a ${slots.origin}, sin calcular carreteras ni tiempos reales.` : 'Dime de dónde sales para afinar.'} Precios referenciales por confirmar.`, chips: [TRIP_CHIP] });
  }
  const cheap = /barat|economic|poca plata|low cost/.test(q);
  const picks = recommendTrips(slots, catalog, 3, undefined, { cheap });
  if (!picks.length) return result(`No encuentro ideas con eso.${offlineNote}`, { chips: FALLBACK_CHIPS });
  const what = slots.interests?.length ? ` de ${slots.interests.join(' y ')}` : cheap ? ' baratas' : '';
  const where = slots.origin ? ` cerca de ${slots.origin}` : '';
  return result(`Mira estas ideas${what}${where}. ¿Cuánto quieres gastar en total?${offlineNote}`, { cards: recommendationCards(picks), chips: [{ label: '$30', query: '$30' }, { label: '$60', query: '$60' }, { label: '$100', query: '$100' }, TRIP_CHIP] });
}
