// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { experiences } from '../../src/domain/catalog';
import { converse, GREETING, initialConversation, openingAnswer, type ConversationState } from '../../src/features/assistant/conversation';
import { extractSlots } from '../../src/features/assistant/trip';
import { preferencesFromSlots, saveTripPreferences } from '../../src/features/assistant/preferences';
import { readTravelPreferences, WELCOME_KEY } from '../../src/features/onboarding/WelcomeFlow';

const context = { catalog: [...experiences], online: true };
/** Plays a whole conversation and returns every answer. */
function talk(...phrases: string[]) {
  let state: ConversationState = initialConversation();
  const answers = phrases.map(phrase => {
    let turn = converse(state, phrase, context);
    state = turn.state;
    if (turn.redirect) { turn = converse(state, turn.redirect, context); state = turn.state; }
    return turn.answer!;
  });
  return { state, answers, last: answers.at(-1)! };
}
afterEach(() => window.localStorage.clear());

describe('MIJIN saluda y conduce la conversación', () => {
  it('saluda como pana y pregunta desde dónde sales, con chips', () => {
    const opening = openingAnswer(context);
    expect(opening.text.startsWith(GREETING)).toBe(true);
    expect(GREETING).toBe('¡Hola, wambra! Soy MIJIN, tu pana de aventuras.');
    expect(opening.text).toMatch(/¿Desde dónde sales\?/);
    expect(opening.chips?.map(chip => chip.label)).toEqual(['Quito', 'Guayaquil', 'Cuenca', 'Ambato']);
  });
  it('pregunta en orden: origen → presupuesto → días → personas → gustos → mascota', () => {
    const { answers } = talk('Salgo de Cuenca', 'unos 50 dólares', 'fin de semana', 'somos 3', 'me gusta la naturaleza', 'no');
    expect(answers[0].text).toMatch(/sales de Cuenca.*¿Cuánto quieres gastar en total\?/);
    expect(answers[1].text).toMatch(/\$50 en total.*¿cuántos días tienes\?/i);
    expect(answers[2].text).toMatch(/2 días.*¿Cuántas personas van\?/);
    expect(answers[3].text).toMatch(/3 personas.*¿Qué te gusta más\?/);
    expect(answers[4].text).toMatch(/te gusta la naturaleza.*¿viajas con mascota\?/i);
    expect(answers[5].cards).toHaveLength(3);
  });
  it('al completar propone 3 fichas con foto, precio y por qué encajan, y ofrece «Armar mi viaje»', () => {
    const { last, state } = talk('Salgo de Quito', '$100', '2 días', 'solo yo', 'aventura', 'no');
    expect(state.done).toBe(true);
    expect(last.cards).toHaveLength(3);
    last.cards.forEach(card => { expect(card.priceShort).toBeTruthy(); expect(card.reasons?.length).toBeGreaterThan(0); });
    expect(last.cards.some(card => card.image?.src)).toBe(true);
    expect(last.actions).toEqual([{ label: 'Armar mi viaje', target: 'build_trip' }]);
    expect(last.text).toMatch(/¿Quieres ver el clima de allá\?|¿Te cuento qué fiestas hay\?/);
    expect(last.text.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
  });
  it('si lo que le gusta no alcanza, lo dice y no cambia la playa por otra cosa', () => {
    const { last } = talk('quiero ir a la playa', 'salgo de Guayaquil', 'unos 60 dólares', 'somos 2', '3 días', 'no');
    expect(last.text).toMatch(/^Con \$60 y 3 días no alcanza del todo/);
    last.cards.forEach(card => expect(card.reasons?.[0]).toBe('Te gusta la playa'));
    expect(last.cards.some(card => card.reasons?.some(reason => reason.startsWith('Se pasa')))).toBe(true);
  });
  it('entiende todo en una frase y no vuelve a preguntar lo ya dicho', () => {
    const { answers, state } = talk('Salgo de Cuenca con unos 50 dólares, somos 3 y me gusta la playa');
    expect(state.slots).toMatchObject({ origin: 'Cuenca', budget: 50, people: 3, interests: ['playa'] });
    expect(answers[0].text).toMatch(/¿cuántos días tienes\?/i);
    expect(answers[0].cards).toHaveLength(3);
    expect(answers[0].text).not.toMatch(/Desde dónde|Cuánto quieres gastar|Cuántas personas/);
  });
  it('acepta «no sé» y pasa a la siguiente pregunta', () => {
    const { last, state } = talk('Salgo de Guayaquil', 'no sé');
    expect(state.skipped).toContain('budget');
    expect(last.text).toMatch(/¿Cuántos días tienes\?/);
  });
  it('una pregunta al margen se responde y el viaje espera', () => {
    const { answers, state } = talk('Salgo de Loja', '¿Qué fiestas hay en noviembre?', 'Seguir con mi viaje');
    expect(answers[1].text).toMatch(/noviembre/i);
    expect(answers[1].chips?.some(chip => chip.label === 'Seguir con mi viaje')).toBe(true);
    expect(answers[2].text).toMatch(/¿Cuánto quieres gastar en total\?/);
    expect(state.slots.origin).toBe('Loja');
  });
  it('tras la propuesta, «sí» abre la oferta (clima o fiestas)', () => {
    let state = talk('Salgo de Quito', '$100', '2 días', 'solo yo', 'naturaleza', 'no').state;
    const turn = converse(state, 'sí', context);
    expect(turn.redirect).toMatch(/^Clima de |fiestas/);
    state = turn.state;
    expect(state.offers.length).toBeLessThan(2);
  });
  it('no confunde un destino con el lugar de salida', () => {
    const turn = converse(initialConversation(), 'Quiero conocer Saraguro', context);
    expect(turn.state.slots.origin).toBeUndefined();
    expect(turn.answer?.text).toMatch(/Saraguro/);
    expect(turn.answer?.cards[0]?.title).toMatch(/Saraguro/);
  });
  it('si no entiende, lo dice y vuelve a la pregunta pendiente', () => {
    const turn = converse(initialConversation(), 'asdf qwer', context);
    expect(turn.answer?.text).toMatch(/No te entendí/);
    expect(turn.answer?.text).toMatch(/¿Desde dónde sales\?/);
    expect(turn.answer?.cards).toEqual([]);
  });
});

describe('respuestas libres', () => {
  it.each([
    ['salgo de Cuenca', { origin: 'Cuenca' }],
    ['unos 50 dólares', { budget: 50 }],
    ['cincuenta dólares por persona', { budget: 50, budgetPerPerson: true }],
    ['somos 3', { people: 3 }],
    ['voy con mi novia', { people: 2 }],
    ['me gusta la playa', { interests: ['playa'] }],
    ['una semana', { days: 7 }],
    ['voy con mi perro', { pet: true }],
  ])('«%s»', (phrase, expected) => { expect(extractSlots(phrase).slots).toMatchObject(expected); });
  it('una cifra suelta responde la pregunta pendiente', () => {
    expect(extractSlots('50', 'budget').slots.budget).toBe(50);
    expect(extractSlots('4', 'people').slots.people).toBe(4);
    expect(extractSlots('Cuenca', 'origin').slots.origin).toBe('Cuenca');
    expect(extractSlots('quiero conocer saraguro', 'origin').slots.origin).toBeUndefined();
  });
});

describe('«Armar mi viaje» guarda las preferencias con el formato de la bienvenida', () => {
  it('readTravelPreferences las lee igual', () => {
    const saved = saveTripPreferences({ origin: 'Cuenca', budget: 25, budgetPerPerson: true, people: 2, interests: ['comida', 'playa', 'naturaleza'], pet: true });
    expect(saved).toMatchObject({ origin: 'Cuenca', budgetTotalUsd: 50, travelers: 2, interests: ['gastronomia', 'naturaleza'], pet: true, path: 'traveler', completed: true });
    expect(window.localStorage.getItem(WELCOME_KEY)).toBeTruthy();
    expect(readTravelPreferences()).toEqual(saved);
  });
  it('conserva lo que la persona ya había dicho en la bienvenida', () => {
    const previous = { completed: true, path: 'explore' as const, interests: ['cultura' as const], budgetTotalUsd: 80, origin: 'Quito', travelers: 4, pet: false, updatedAt: '' };
    expect(preferencesFromSlots({ people: 2 }, previous)).toMatchObject({ path: 'explore', interests: ['cultura'], budgetTotalUsd: 80, origin: 'Quito', travelers: 2 });
  });
});
