/**
 * MIJIN's guided conversation: greets, asks short questions with quick replies (origin → budget → days → people →
 * interests → pet), remembers the answers as slots, never asks again what was already said, and at the end proposes
 * three cards and «Armar mi viaje». Any other question is answered on the way and the trip waits for the person.
 * Lives only in memory (React state): nothing here is stored.
 */
import type { Experience } from '../../domain/catalog/types.js';
import { answerLocally, recommendationCards, scoreExperiences, type AssistantAnswer, type AssistantChip, type LocalContext } from './knowledge.js';
import { classifyIntent, cleanUtterance, type Intent } from './intents.js';
import { destinationPlace, extractSlots, groupBudget, recommendTrips, regionName, SLOT_ORDER, type Interest, type SlotName, type TripSlots } from './trip.js';

export const GREETING = '¡Hola, wambra! Soy MIJIN, tu pana de aventuras.';
export interface ConversationState {
  slots: TripSlots;
  /** Questions the person chose to skip («no sé», «da igual»). */
  skipped: SlotName[];
  /** The question MIJIN asked last; a bare «50» or «sí» answers it. */
  awaiting?: SlotName;
  done: boolean;
  /** Follow-ups MIJIN offered after the proposal; «sí» takes the first. */
  offers: AssistantChip[];
}
export const initialConversation = (): ConversationState => ({ slots: {}, skipped: [], awaiting: 'origin', done: false, offers: [] });

export const QUESTIONS: Record<SlotName, { ask: string; chips: AssistantChip[] }> = {
  origin: { ask: '¿Desde dónde sales?', chips: ['Quito', 'Guayaquil', 'Cuenca', 'Ambato'].map(city => ({ label: city, query: `Salgo de ${city}` })) },
  budget: { ask: '¿Cuánto quieres gastar en total?', chips: [{ label: '$30', query: '$30' }, { label: '$60', query: '$60' }, { label: '$100', query: '$100' }, { label: '$250', query: '$250' }, { label: 'No sé', query: 'No sé' }] },
  days: { ask: '¿Cuántos días tienes?', chips: [{ label: 'Solo 1 día', query: 'Solo 1 día' }, { label: 'Fin de semana', query: 'Fin de semana' }, { label: '3 días', query: '3 días' }, { label: '1 semana', query: '1 semana' }] },
  people: { ask: '¿Cuántas personas van?', chips: [{ label: 'Solo yo', query: 'Solo yo' }, { label: '2', query: '2 personas' }, { label: '3', query: '3 personas' }, { label: '4 o más', query: '4 personas' }] },
  interests: { ask: '¿Qué te gusta más?', chips: (['naturaleza', 'cultura', 'playa', 'aventura', 'comida'] as Interest[]).map(item => ({ label: item[0].toUpperCase() + item.slice(1), query: `Me gusta ${item === 'playa' ? 'la playa' : item === 'comida' ? 'la comida' : item === 'cultura' ? 'la cultura' : item === 'aventura' ? 'la aventura' : 'la naturaleza'}` })) },
  pet: { ask: '¿Viajas con mascota?', chips: [{ label: 'Sí, con mi perro', query: 'Sí, con mi perro' }, { label: 'No', query: 'No' }] },
};
const CONTINUE: AssistantChip = { label: 'Seguir con mi viaje', query: 'Seguir con mi viaje' };
/** Intents answered on the way without touching the trip questions. */
const SIDE_INTENTS = new Set<Intent>(['injection', 'privacy', 'privacy_data', 'festivals', 'verify_business', 'plans', 'card_payment', 'own_booking', 'community_share', 'downloads', 'offline', 'weather', 'pets', 'closures', 'passport', 'booking', 'directions', 'price', 'includes', 'about', 'goodbye', 'place']);

const base = (context: LocalContext, intent: Intent, confidence: number): Omit<AssistantAnswer, 'text' | 'spokenSummary'> => ({ cards: [], warnings: [], intent, confidence, mode: context.online ? 'local_faq' : 'offline_downloads', pricesAreEstimates: true, needsConfirmation: true });
export function openingAnswer(context: LocalContext): AssistantAnswer {
  const text = `${GREETING} ${QUESTIONS.origin.ask}`;
  return { ...base(context, 'greeting', 1), text, spokenSummary: text, chips: QUESTIONS.origin.chips };
}
const nextSlot = (state: Pick<ConversationState, 'slots' | 'skipped'>) => SLOT_ORDER.find(slot => state.slots[slot] === undefined && !state.skipped.includes(slot));
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
/** «Listo: sales de Cuenca y tienes $50.» from the slots just understood. */
function acknowledge(found: TripSlots): string {
  const parts: string[] = [];
  if (found.origin) parts.push(`sales de ${found.origin}`);
  if (found.budget !== undefined) parts.push(`$${found.budget}${found.budgetPerPerson ? ' por persona' : ' en total'}`);
  if (found.days !== undefined) parts.push(found.hours ? `${found.hours} horas` : plural(found.days, 'día', 'días'));
  if (found.people !== undefined) parts.push(found.people === 1 ? 'vas solo o sola' : `${found.people} personas`);
  if (found.interests?.length) parts.push(`te gusta ${joinNames(found.interests.map(item => (item === 'relax' ? 'el ' : 'la ') + item))}`);
  if (found.pet !== undefined) parts.push(found.pet ? 'con mascota' : 'sin mascota');
  if (!parts.length) return '';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0];
  return `Listo: ${list}.`;
}
function summary(slots: TripSlots): string {
  const bits = [slots.origin ? `desde ${slots.origin}` : '', groupBudget(slots) !== undefined ? `$${groupBudget(slots)}` : '', slots.days ? plural(slots.days, 'día', 'días') : '', slots.people ? plural(slots.people, 'persona', 'personas') : ''].filter(Boolean);
  return bits.join(', ');
}
const joinNames = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0] ?? '';

export interface Turn { state: ConversationState; answer?: AssistantAnswer; redirect?: string }
/** One turn of the conversation. `redirect` asks the caller to process that query instead (an accepted offer). */
export function converse(previous: ConversationState, question: string, context: LocalContext): Turn {
  const catalog: Experience[] = context.catalog;
  const text = cleanUtterance(question);
  const { intent, confidence } = classifyIntent(question, scoreExperiences(question, catalog)[0]?.score ?? 0);
  // «Sí» / «no» to an offer made after the proposal.
  if (previous.offers.length && (intent === 'yes' || intent === 'no') && !previous.awaiting) {
    if (intent === 'yes') return { state: { ...previous, offers: previous.offers.slice(1) }, redirect: previous.offers[0].query };
    const reply = '¡Listo! ¿Te ayudo con algo más?';
    return { state: { ...previous, offers: [] }, answer: { ...base(context, intent, confidence), text: reply, spokenSummary: reply, chips: [CONTINUE, { label: '¿Qué fiestas hay?', query: '¿Qué fiestas hay este mes?' }] } };
  }
  const restart = previous.done && /\b(otro viaje|nuevo viaje|empezar de nuevo|de nuevo|desde cero|armar (un|otro|mi) viaje)\b/.test(text);
  const state: ConversationState = restart ? initialConversation() : { ...previous, slots: { ...previous.slots }, skipped: [...previous.skipped] };
  const { slots: found, skipped } = extractSlots(question, state.awaiting);
  const changed = (Object.keys(found) as (keyof TripSlots)[]).filter(key => key !== 'budgetPerPerson' && JSON.stringify(found[key]) !== JSON.stringify(previous.slots[key]));
  const answered = Boolean(previous.awaiting) && changed.includes(previous.awaiting as keyof TripSlots) && text.split(' ').length <= 4;
  const tripTalk = intent === 'trip' || answered || (changed.length > 0 && !SIDE_INTENTS.has(intent)) || (skipped && Boolean(state.awaiting) && !SIDE_INTENTS.has(intent))
    || (intent === 'yes' || intent === 'no') && state.awaiting === 'pet' || /^seguir( con mi viaje)?$/.test(text);
  // Remember what was said even while answering something else («voy con mi perro» also sets the pet).
  if (changed.length) Object.assign(state.slots, found);
  // Offline without downloaded cards there is nothing to propose: say so instead of asking more questions.
  if (tripTalk && !context.online && !catalog.length) return { state, answer: answerLocally(question, context) };
  if (!tripTalk) {
    if (intent === 'greeting' && !previous.done && previous.awaiting) {
      const reply = `¡Hola, pana! ${QUESTIONS[previous.awaiting].ask}`;
      return { state, answer: { ...base(context, intent, confidence), text: reply, spokenSummary: reply, chips: QUESTIONS[previous.awaiting].chips } };
    }
    if (intent === 'unknown' && state.awaiting && !state.done) {
      const reply = `No te entendí bien. ${QUESTIONS[state.awaiting].ask}${state.awaiting === 'origin' ? ' Por ejemplo: «salgo de Latacunga».' : ''}`;
      return { state, answer: { ...base(context, intent, confidence), text: reply, spokenSummary: reply, chips: QUESTIONS[state.awaiting].chips } };
    }
    const answer = answerLocally(question, context);
    if (!state.done && !['goodbye', 'injection'].includes(intent)) answer.chips = [...(answer.chips ?? []).filter(chip => chip.query !== 'Quiero armar un viaje'), CONTINUE].slice(0, 4);
    return { state, answer };
  }
  if (skipped && state.awaiting && !changed.length) state.skipped.push(state.awaiting);
  const ack = acknowledge(Object.fromEntries(changed.map(key => [key, found[key]])) as TripSlots);
  const next = nextSlot(state);
  const missing = destinationPlace(question);
  if (next) {
    state.awaiting = next; state.done = false;
    // A free search («quiero ir a la playa», «quiero conocer Cuyabeno») gets a preview right away.
    const searched = intent === 'trip' && (found.interests?.length || missing || found.budget !== undefined) && changed.length > 0;
    const preview = searched ? recommendTrips(state.slots, catalog, 3, missing?.region) : [];
    const lead = missing && !scoreExperiences(question, catalog).length ? `Aún no tengo ficha de ${missing.name}; mira estas de ${regionName(missing.region)}.` : preview.length ? 'Mira estas ideas.' : '';
    const reply = [ack, lead, preview.length ? `Para afinar: ${QUESTIONS[next].ask.toLowerCase()}` : QUESTIONS[next].ask].filter(Boolean).join(' ');
    return { state, answer: { ...base(context, 'trip', confidence), text: reply, spokenSummary: reply, chips: QUESTIONS[next].chips, cards: recommendationCards(preview) } };
  }
  // Everything known: three ideas, «Armar mi viaje» and follow-up questions.
  state.awaiting = undefined; state.done = true;
  const picks = recommendTrips(state.slots, catalog, 3);
  const fitting = picks[0]?.fits ? picks.filter(pick => pick.fits) : [];
  const first = picks[0]?.experience;
  const offers: AssistantChip[] = [
    ...(first?.weatherReference ? [{ label: '¿Ver el clima de allá?', query: `Clima de ${first.weatherReference.placeName}` }] : []),
    { label: '¿Qué fiestas hay?', query: '¿Qué fiestas hay este mes?' },
  ];
  state.offers = offers;
  const followUp = first?.weatherReference ? '¿Quieres ver el clima de allá?' : '¿Te cuento qué fiestas hay?';
  const names = joinNames(picks.map(pick => pick.experience.experienceName ?? pick.experience.title));
  const said = summary(state.slots);
  const budget = groupBudget(state.slots);
  const limits = [budget !== undefined ? `$${budget}` : '', state.slots.days ? plural(state.slots.days, 'día', 'días') : ''].filter(Boolean).join(' y ');
  const lead = fitting.length ? `¡Listo!${said ? ` ${said.charAt(0).toUpperCase()}${said.slice(1)}.` : ''} Mira estas ${picks.length} ideas.` : `Con ${limits || 'eso'} no alcanza del todo. Mira lo más cercano.`;
  const reply = `${lead} ${followUp}`;
  const spoken = `${fitting.length ? '¡Listo! Te encontré' : 'Lo más cercano es'} ${names}. ${followUp}`;
  return {
    state,
    answer: { ...base(context, 'trip', confidence), text: reply, spokenSummary: spoken, cards: recommendationCards(picks), chips: offers, actions: [{ label: 'Armar mi viaje', target: 'build_trip' }], details: 'Precios referenciales del costo base. Transporte, comida y extras van aparte: confírmalos antes de viajar.' },
  };
}
