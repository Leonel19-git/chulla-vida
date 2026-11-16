/**
 * MIJIN intent router: cleans what the person typed or dictated (accents, typical voice-dictation slips, number
 * words), then scores each intent with patterns and returns the best one with a confidence. Below MIN_CONFIDENCE
 * the answer is «no te entendí» with three concrete options, never a random catalog card.
 * Pure module (no DOM): it is also reachable from api/ — keep relative imports with the `.js` extension.
 */
export type Intent =
  | 'injection' | 'greeting' | 'smalltalk' | 'about' | 'thanks' | 'goodbye' | 'yes' | 'no'
  | 'privacy' | 'privacy_data' | 'festivals' | 'verify_business' | 'plans' | 'card_payment' | 'own_booking'
  | 'community_share' | 'downloads' | 'offline' | 'weather' | 'pets' | 'closures' | 'passport' | 'booking'
  | 'directions' | 'price' | 'includes' | 'place' | 'trip' | 'unknown';
export interface IntentResult { intent: Intent; confidence: number; text: string }
export const MIN_CONFIDENCE = 0.5;

export const normalizeQuestion = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Slips that voice dictation and fast typing produce, on normalized text (no accents, lowercase). */
const FIXES: [RegExp, string][] = [
  [/\b(mi ?jin|mi ?gin|mi ?hijin|mi ?chin|mi ?yin|mijn|mishin|mixin)\b/g, 'mijin'],
  [/\b(cuya ?ve?no|cuya ?vino|kuyabeno|cuyaveno)\b/g, 'cuyabeno'],
  [/\b(quilo ?toa|kilo ?toa|kilotoa|quilotoa)\b/g, 'quilotoa'],
  [/\b(sara ?guro|zaraguro)\b/g, 'saraguro'],
  [/\b(ota ?balo|ota valo)\b/g, 'otavalo'],
  [/\b(galapago|galapagos islas|islas galapagos)\b/g, 'galapagos'],
  [/\b(montanita|monta nita)\b/g, 'montanita'],
  [/\b(guaya ?quil|guayakil)\b/g, 'guayaquil'],
  [/\b(dollars?|dolar|dolares|dlls?|varos|lucas)\b/g, 'dolares'],
  [/\b(q|k|ke)\b/g, 'que'], [/\b(xq|pq|porq)\b/g, 'por que'], [/\b(tmb|tb|tbn)\b/g, 'tambien'],
  [/\b(olaa+|holaa+|holi+s?)\b/g, 'hola'], [/\b(grax|grasias|gracia|graciass+|thx|thanks)\b/g, 'gracias'],
  [/\b(aki)\b/g, 'aqui'], [/\b(kiero|qiero)\b/g, 'quiero'], [/\b(cuantos? sale)\b/g, 'cuanto cuesta'],
  [/\bfinde\b/g, 'fin de semana'], [/\bpet ?friendly\b/g, 'mascota'],
];
const UNITS: Record<string, number> = { cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const HUNDREDS: Record<string, number> = { cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
const NUMBER_WORD = new RegExp(`\\b((?:${[...Object.keys(HUNDREDS), ...Object.keys(TENS), ...Object.keys(UNITS), 'mil', 'y'].join('|')})(?:\\s+(?:${[...Object.keys(HUNDREDS), ...Object.keys(TENS), ...Object.keys(UNITS), 'mil', 'y'].join('|')}))*)\\b`, 'g');
/** «cincuenta y cinco» → 55, «mil doscientos» → 1200; null when the words are not a number. */
export function wordsToNumber(words: string): number | null {
  const parts = words.trim().split(/\s+/).filter(word => word !== 'y');
  if (!parts.length) return null;
  let total = 0; let current = 0;
  for (const word of parts) {
    if (word in UNITS) current += UNITS[word];
    else if (word in TENS) current += TENS[word];
    else if (word in HUNDREDS) current += HUNDREDS[word];
    else if (word === 'mil') { total += (current || 1) * 1000; current = 0; }
    else return null;
  }
  return total + current;
}
/** Turns number words into digits; «un/una» only before a unit («un día», «una persona»), never in «una playa». */
function numbersToDigits(text: string): string {
  return text.replace(NUMBER_WORD, match => {
    const trimmed = match.trim();
    if (/^(un|una|y)$/.test(trimmed)) return match;
    const words = trimmed.replace(/^y\s+|\s+y$/g, '');
    const value = wordsToNumber(words);
    return value === null ? match : match.replace(words, String(value));
  }).replace(/\b(un|una)\s+(dia|noche|persona|semana|hora|amigo|amiga)\b/g, '1 $2');
}
/** Normalized, corrected text: lowercase, no accents, digits, only letters/digits/$ and spaces. */
export function cleanUtterance(raw: string): string {
  let text = normalizeQuestion(raw).slice(0, 1000).replace(/(\d)[.,](\d{1,2})\b/g, '$1.$2').replace(/(\d)[.,](\d{3})\b/g, '$1$2')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/[¿?¡!,;:()"«»“”/\\-]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of FIXES) text = text.replace(pattern, replacement);
  text = numbersToDigits(text);
  return text.replace(/^(oye |ey |hey )?mijin\b[ ,]*/, '').replace(/\s+/g, ' ').trim();
}

const words = (text: string) => text.split(' ').filter(Boolean).length;
interface Rule { intent: Intent; pattern: RegExp; weight: number; maxWords?: number }
/** Earlier rules win ties, so specific and safety intents go first. */
const RULES: Rule[] = [
  { intent: 'injection', pattern: /ignora\w* (las |tus |todas )?(instruc|reglas)|ignore (previous|all|the) |system prompt|prompt del sistema|otra persona|otros usuarios|de otro usuario|reserva ajena|contrasena|clave privada|datos de (otr|alguien)/, weight: 1 },
  { intent: 'card_payment', pattern: /(^| )pagar (mi |la |una |el |esta )?(reserva|tour|viaje|ficha|experiencia)/, weight: 0.97 },
  { intent: 'own_booking', pattern: /\b(mi|mis) (proxima |ultima )?(reserva|solicitud)|cuanto (tiempo )?falta|cuando es mi|estado de mi/, weight: 0.95 },
  { intent: 'community_share', pattern: /(cuanto|que|cuanta plata).*(llega|recibe|va|gana|queda).*comunidad|comunidad.*(recibe|llega|gana|cobra)|reparto|comision/, weight: 0.95 },
  { intent: 'privacy_data', pattern: /guardan de mi|que (informacion|datos) (guardan|tienen|recogen|usan)|dato personal|datos personales|mis datos|lopdp|proteccion de datos/, weight: 0.95 },
  { intent: 'privacy', pattern: /\b(borrar|eliminar|retirar|revocar)\b.*(dato|audio|conversacion|chat|consentimiento|ubicacion|cuenta|historial)|\bcookies?\b|consentimiento|privacidad|mi ubicacion|ubicacion (actual|precisa)|me (escuchas|grabas|espias)|graban mi voz/, weight: 0.9 },
  { intent: 'festivals', pattern: /fiesta|festival|festividad|raymi|celebracion|cultura viva|tradicion|carnaval|desfile|feriado|que se celebra|pase del nino|mama negra|diablada|yamor/, weight: 0.9 },
  { intent: 'verify_business', pattern: /verific\w* (mi |el |un )?(negocio|emprendimiento|comunidad|hostal|empresa)|tengo un (negocio|hostal|restaurante|emprendimiento)|registrar mi (negocio|empresa|emprendimiento)|soy (anfitrion|guia|operador)|publicar (mi|una|mis) (experiencia|tour)|ofrecer (mis )?tours/, weight: 0.9 },
  { intent: 'plans', pattern: /plan(es)? de pago|suscripci|diferencia.*plan|membresi|viajero plus|explorador gratis|(la app|chulla vida) es gratis|cuanto cuesta (la app|chulla vida|usar)|plan premium/, weight: 0.9 },
  { intent: 'card_payment', pattern: /tarjeta|payphone|kushki|deuna|transferencia|como (pago|se paga|puedo pagar)|formas? de pago|metodos? de pago|pagar con|pago en linea/, weight: 0.85 },
  { intent: 'weather', pattern: /clima|lluev|lluvia|llovera|va a llover|temperatura|pronostico|que tiempo|tiempo hace|tiempo hay|hace frio|hace calor|esta soleado/, weight: 0.9 },
  { intent: 'closures', pattern: /cerrad|derrumbe|desliza|via (esta )?(cerrada|bloqueada)|cambia(r)? (el |mi )?plan|chulla flex|\bflex\b|bloqueo|paro\b/, weight: 0.85 },
  { intent: 'pets', pattern: /mascota|\bperr[oia]s?\b|\bgat[oia]s?\b|lomito|michi|chuchito/, weight: 0.85 },
  { intent: 'downloads', pattern: /descarg|sin senal|sin cobertura|guardar (la |las )?fichas?|modo offline|sin datos moviles/, weight: 0.85 },
  { intent: 'offline', pattern: /sin internet|sin conexion|\boffline\b|mi ruta/, weight: 0.8 },
  { intent: 'passport', pattern: /pasaporte|sello|selle|estampilla/, weight: 0.85 },
  { intent: 'booking', pattern: /reserv|cupos?\b|disponib|reembolso|devolucion|cancelar (el |mi )?(tour|viaje|pago)/, weight: 0.75 },
  { intent: 'directions', pattern: /como (llego|llegar|voy|se llega|ir)\b|donde (queda|esta|se encuentra)|ubicacion de|que bus|en bus|transporte|cuanto (se demora|tarda|demora)|distancia/, weight: 0.55 },
  { intent: 'price', pattern: /cuanto (cuesta|vale|cobran|es)|precio|tarifa|costo/, weight: 0.55 },
  { intent: 'includes', pattern: /que incluye|incluye|incluido|alimentacion|hospedaje|alojamiento|donde dormir/, weight: 0.55 },
  { intent: 'trip', pattern: /quiero (ir|viajar|conocer|salir|pasear|hacer|visitar|algo)|\bviaj|paseo|escapada|vacacion|recomiend|sugier|a donde (puedo|voy|ir|vamos)|que (hago|puedo hacer|me recomiendas|hacemos)|algo (barato|economico|cerca|bonito|chevere)|barat|economic|cerca de|fin de semana|playa|\bmar\b|montana|naturaleza|aventura|selva|amazonia|cascada|volcan|destinos?|lugares?|armar (mi |un )?viaje|planear|plan para/, weight: 0.75 },
  { intent: 'about', pattern: /quien eres|que eres|como te llamas|eres (un |una )?(robot|ia|humano|persona|bot)|que significa mijin|que puedes hacer|en que (me )?(ayudas|puedes ayudar)|que sabes hacer|^ayuda$|^help$|como funciona (esto|la app|mijin|chulla vida)|para que sirves/, weight: 0.9 },
  { intent: 'smalltalk', pattern: /que tal|como (estas|te va|vas|andas|amaneciste)|todo bien|que haces|que mas pues|como te sientes|que cuentas/, weight: 0.85, maxWords: 6 },
  { intent: 'greeting', pattern: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|alo|hello|hi|que mas|habla)\b/, weight: 0.9, maxWords: 4 },
  { intent: 'thanks', pattern: /\b(gracias|chevere|bacan|genial|excelente|buenisimo|de lujo|perfecto|que bien|super|me sirve|muy amable)\b/, weight: 0.85, maxWords: 6 },
  { intent: 'goodbye', pattern: /\b(chao|chau|adios|hasta luego|nos vemos|bye|me voy|hasta pronto|cuidate|hasta manana)\b/, weight: 0.9, maxWords: 6 },
  { intent: 'yes', pattern: /^(si|sii+|claro|dale|ya|de una|obvio|sip|bueno|ok|okay|va|listo|por supuesto|si por favor|me parece)\b/, weight: 0.7, maxWords: 4 },
  { intent: 'no', pattern: /^(no|nop|nel|para nada|tampoco|ninguno|ninguna|no gracias|mejor no)\b/, weight: 0.7, maxWords: 4 },
];
/** Budget or a known origin in the phrase means the person is shaping a trip. */
const TRIP_SIGNAL = /\$\s*\d|\d+\s*dolares|\b(salgo|salimos|parto|vivo|estoy) (de|desde|en)\b|\bsomos \d|\d+ (dias|personas|noches)|\b(algo|lugares?|ideas?|planes?|destinos?) (barat|economic|cerca|para|de (playa|aventura|naturaleza|cultura))|cerca de \w+|en la (sierra|costa|amazonia)|en el oriente/;

/**
 * Best intent for a phrase. `placeScore` comes from catalog retrieval (title or locality match) and lets a named
 * destination win over generic patterns; directions/price/includes only count with a place.
 */
export function classifyIntent(raw: string, placeScore = 0): IntentResult {
  const text = cleanUtterance(raw);
  if (!text) return { intent: 'unknown', confidence: 0, text };
  const length = words(text);
  const scores = new Map<Intent, number>();
  const add = (intent: Intent, weight: number) => { if (weight > (scores.get(intent) ?? 0)) scores.set(intent, weight); };
  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    // Greetings and thanks inside a longer request are politeness, not the request itself.
    add(rule.intent, rule.maxWords !== undefined && length > rule.maxWords ? 0.3 : rule.weight);
  }
  if (TRIP_SIGNAL.test(text)) add('trip', 0.9);
  const place = placeScore >= 5 ? 0.85 : placeScore >= 3 ? 0.7 : 0;
  if (place) {
    add('place', place);
    for (const intent of ['directions', 'price', 'includes'] as const) if (scores.has(intent)) add(intent, 0.92);
  }
  // A budget question about a named place is a price question; a budget about the whole trip is a trip.
  if (!place) for (const intent of ['directions', 'price', 'includes'] as const) if (scores.has(intent) && (scores.get('trip') ?? 0) >= 0.75) scores.delete(intent);
  let best: Intent = 'unknown'; let confidence = 0;
  for (const rule of RULES) { const value = scores.get(rule.intent); if (value !== undefined && value > confidence) { best = rule.intent; confidence = value; } }
  const placeValue = scores.get('place') ?? 0;
  if (placeValue > confidence) { best = 'place'; confidence = placeValue; }
  if (confidence < MIN_CONFIDENCE) return { intent: 'unknown', confidence, text };
  return { intent: best, confidence, text };
}
