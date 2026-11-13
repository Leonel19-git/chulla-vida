import type { Experience } from '../../domain/catalog/types';
import { petAdmission, planItinerary } from '../../domain/planner';
import { eventStatusLabel, getEventsByMonth, monthName, CULTURAL_EVENTS } from '../../domain/culture';
import { REGION_LABELS } from '../../domain/catalog/types';
import { answerCommunityShare, agreementFor } from '../../domain/transparency';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export interface AssistantCard { id: string; title: string; summary: string; price: string; source: string; checkedAt: string }
export interface AssistantAnswer {
  text: string;
  spokenSummary: string;
  cards: AssistantCard[];
  warnings: string[];
  mode: 'local_faq' | 'offline_downloads' | 'remote_ai';
  pricesAreEstimates: true;
  needsConfirmation: true;
}
export interface LocalContext { catalog: Experience[]; online: boolean; downloadedAt?: string }
export const normalizeQuestion = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stopWords = new Set(['tengo', 'quiero', 'puedo', 'donde', 'como', 'hacer', 'cuanto', 'desde', 'salgo', 'viaje', 'para', 'esto', 'esta', 'con', 'que', 'por', 'del', 'una', 'las', 'los', 'hoy', 'mijin', 'dolares', 'total', 'horas', 'dias', 'estoy', 'tiene']);
export function retrieveExperiences(question: string, catalog: Experience[], limit = 3): Experience[] {
  const tokens = normalizeQuestion(question).split(/[^a-z0-9]+/).filter(token => token.length > 2 && !stopWords.has(token));
  if (!tokens.length) return [];
  return catalog.map(experience => {
    const title = normalizeQuestion(experience.title + ' ' + (experience.experienceName ?? ''));
    const location = normalizeQuestion(experience.locality + ' ' + experience.province + ' ' + experience.localizedRegion);
    const content = normalizeQuestion(experience.activities.join(' ') + ' ' + experience.tags.join(' ') + ' ' + experience.summary);
    const score = tokens.reduce((sum, token) => sum + (title.includes(token) ? 5 : location.includes(token) ? 3 : content.includes(token) ? 1 : 0), 0);
    return { experience, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.experience);
}
export function cardFor(experience: Experience): AssistantCard {
  return { id: experience.id, title: experience.experienceName ?? experience.title, summary: experience.summary, price: experience.price.originalLabel, source: experience.originalDocument, checkedAt: experience.sourceCheckedAt };
}
export function answerLocally(question: string, context: LocalContext): AssistantAnswer {
  const q = normalizeQuestion(question).slice(0, 1000);
  const catalog = context.catalog;
  const result = (text: string, cards: Experience[] = [], warnings: string[] = []): AssistantAnswer => ({ text, spokenSummary: text.slice(0, 650), cards: cards.map(cardFor), warnings, mode: context.online ? 'local_faq' : 'offline_downloads', pricesAreEstimates: true, needsConfirmation: true });
  if (!q.trim()) return result('Cuéntame tu punto de partida, presupuesto total, tiempo disponible y qué te gustaría conocer.');
  if (/otra persona|otros usuarios|reserva ajena|contrasena|clave privada|ignore.*instrucc|ignora.*instrucc|system prompt/.test(q)) return result('Solo consulto contenido público. No tengo acceso a datos privados de otras personas, contraseñas ni instrucciones internas.');
  if (/borrar|eliminar|audio|privacidad|datos personales|consentimiento|cookies|mi ubicacion|ubicacion (actual|precisa)/.test(q)) return result('Esta conversación se mantiene en memoria y puedes borrarla con «Borrar conversación». No guardamos audio bruto. Voz, lectura y clima requieren una acción tuya; el reconocimiento del navegador puede usar servidores del proveedor. Revoca micrófono o ubicación desde los permisos del navegador y gestiona el resto en «Privacidad y cookies». No puedo borrar datos de una cuenta remota desde el chat.');
  if (/guardan de mi|que (informacion|datos) (guardan|tienen)|dato personal|mis datos/.test(q)) return result('En este dispositivo se guardan tus preferencias, favoritos, viaje, descargas y elecciones de privacidad. Sin cuenta conectada no enviamos esos datos a un servidor. El audio no se guarda y la conversación con MIJIN vive solo en memoria. Un dato personal es cualquier información que te identifica o puede identificarte; puedes pedir acceso, rectificación, eliminación, oposición o portabilidad. Revisa la Política de Privacidad (borrador pendiente de revisión legal) y gestiona tus permisos en «Privacidad y cookies».');
  if (/fiesta|festival|festividad|raymi|celebracion|cultura viva|tradicion/.test(q)) {
    const monthIndex = MONTHS.findIndex(month => q.includes(month));
    const month = monthIndex >= 0 ? monthIndex + 1 : /este mes|ahora|proxim/.test(q) ? new Date().getMonth() + 1 : null;
    const events = month ? getEventsByMonth(month) : [...CULTURAL_EVENTS];
    if (!events.length) return result(`No tengo festividades registradas para ${month ? monthName(month) : 'esa fecha'} en Cultura Viva. Algunas, como la Kasama tsáchila, dependen del calendario ceremonial de cada comunidad y no tienen fecha fija.`);
    const list = events.slice(0, 6).map(event => `${event.name} (${REGION_LABELS[event.region]}, ${event.localities.join(', ') || event.provinces.join(', ')}): ${event.dateLabel}. ${eventStatusLabel(event, new Date())}.`).join(' ');
    return result(`${month ? `En ${monthName(month)}` : 'En Cultura Viva'} tengo: ${list} Las fechas son orientativas salvo que se indique una edición confirmada con fuente oficial; revisa la agenda del organizador antes de viajar y respeta los protocolos de cada comunidad.`);
  }
  if (/verific.*(negocio|emprendimiento|comunidad)|tengo un negocio|registrar mi negocio|soy anfitrion|publicar (mi|una) experiencia/.test(q)) return result('Para verificar tu negocio: crea tu cuenta y confirma el correo, elige tu figura (establecimiento, operador, guía, asociación comunitaria o representante), sube solo los documentos que corresponden a tu actividad en un espacio privado y una persona del equipo los revisa. Puede pedirte correcciones y explica su decisión. El distintivo de Chulla Vida no es un aval del Gobierno; el registro turístico oficial se verifica aparte cuando tu actividad lo requiere. Abre «Anfitriones» para ver qué te pedirían.');
  if (/plan(es)? de pago|suscripci|diferencia.*plan|membresi|viajero plus|explorador gratis/.test(q)) return result('La propuesta editorial tiene tres planes: Explorador Gratis (descubrir, guardar y pasaporte básico), Viajero Plus (herramientas avanzadas) y Anfitrión Comunidad/Negocio (panel y publicaciones). Sus precios están pendientes de definición: no hay suscripciones reales activas. Los planes semanal, mensual y anual que verás en el menú son una demostración sin cobro.');
  if (/tarjeta|payphone|kushki|deuna|transferencia/.test(q)) return result('El pago con tarjeta se hará solo a través de la pasarela del proveedor (PayPhone como primera opción), sin que Chulla Vida vea tu número de tarjeta. Hoy ninguna ficha está habilitada para pagar: todas son referenciales y primero se confirma con el anfitrión. Un pago solo se da por confirmado cuando el servidor lo verifica con el proveedor, nunca por volver de una página.');
  if (/(mi|mis) (proxima )?reservas?|cuanto falta|cuando es mi/.test(q)) return result('Solo puedo ver tus propias reservas cuando inicias sesión con una cuenta conectada, y nunca las de otra persona. Revisa «Reservas y pagos»: ahí verás el estado de cada solicitud y cuánto falta. Recuerda que una solicitud de información no es una reserva confirmada.');
  if (/(cuanto|que).*(llega|recibe|va).*(comunidad)/.test(q)) { const amount = Number(/$s*(d+(?:[.,]d+)?)|(d+(?:[.,]d+)?)s*(?:dolares|usd)/.exec(q)?.slice(1).find(Boolean)?.replace(',', '.') ?? 49); return result(answerCommunityShare(amount, agreementFor(''))); }
  if (/descarg|sin senal|sin señal/.test(q)) return result(`Abre «Sin señal» y elige las fichas de tu viaje: se guardan en este dispositivo con su fecha de descarga. Sin internet podrás leerlas, consultar tu viaje y tu pasaporte básico; reservas, pagos, clima actual e IA remota necesitan conexión. ${context.downloadedAt ? `Última descarga: ${context.downloadedAt}.` : 'Aún no tienes fichas descargadas.'}`);
  if (!context.online && !catalog.length) return result('Sin conexión: no hay fichas descargadas disponibles para MIJIN. Descarga tu viaje mientras tengas internet. No puedo consultar clima actual, IA remota, pagos ni reservas nuevas.');
  const matched = retrieveExperiences(question, catalog);
  const offlineNote = !context.online ? ` Solo uso fichas descargadas${context.downloadedAt ? ` el ${context.downloadedAt}` : ''}; podrían estar desactualizadas.` : '';
  const place = matched[0];
  if (place && /como lleg|donde qued|ubicacion|localizacion|transporte/.test(q)) {
    const access = place.locationInfo;
    const stages = access?.transportOptions.map(option => `${option.label}${option.durationLabel ? `, ${option.durationLabel}` : ''}${option.priceLabel ? `, ${option.priceLabel}` : ''}. ${option.notes}`).join(' ') ?? '';
    return result(`${place.title} está en ${place.locality}, provincia de ${place.province}. Tiempos y costes de transporte referenciales, por confirmar. ${access ? `${access.accessSummary} ${stages}` : 'La fuente no tiene un trayecto confirmado. Consulta el acceso y el punto de encuentro antes de salir.'} No son indicaciones de navegación en vivo.${offlineNote}`, [place]);
  }
  if (place && /cuanto cuesta|precio|tarifa|cuanto vale|presupuesto de/.test(q) && !/\$|\d+\s*(dolares|usd)/.test(q)) {
    const requestedDays = /\b(\d+)\s*dias?/.exec(q)?.[1];
    const choices = place.price.options ?? [];
    const selected = requestedDays ? choices.filter(option => normalizeQuestion(`${option.label} ${option.durationLabel ?? ''}`).includes(`${requestedDays} dias`)) : [];
    const options = (selected.length ? selected : choices).map(option => `${option.label}: ${option.currency} ${option.min ?? 'por cotizar'}${option.max !== null && option.max !== option.min ? ` a ${option.max}` : ''}, ${option.unit === 'per_night' ? 'por noche' : option.unit === 'per_person_per_day' ? 'por persona por día' : option.unit === 'per_person' ? 'por persona' : 'unidad según fuente'}. ${option.notes}`).join(' ');
    return result(`${place.title}: precios referenciales, sin venta ni cupos confirmados. ${place.price.originalLabel}. ${options ?? ''} ${place.price.excludes.length ? `Gastos aparte: ${place.price.excludes.join('; ')}.` : ''}${offlineNote}`, [place]);
  }
  if (place && /que incluye|comida|alimentacion|hospedaje|alojamiento/.test(q)) return result(`${place.title}. ${place.price.includes.length ? `La fuente menciona: ${place.price.includes.join('; ')}.` : 'No hay inclusiones confirmadas.'} ${place.price.excludes.length ? `Gastos aparte: ${place.price.excludes.join('; ')}.` : ''} Revisa cada modalidad y confirma servicios con el operador antes de viajar.${offlineNote}`, [place]);
  if (/sin internet|sin conexion|offline|mi ruta/.test(q)) return result(`Sin señal puedes leer el viaje y las fichas que descargaste. No se confirman reservas, pagos, visitas ni clima actual. ${catalog.length} fichas disponibles en este contexto.${offlineNote}`);
  if (/clima|lluev|lluvia|temperatura|pronostico|tiempo hace/.test(q)) return result(context.online ? 'No tengo el clima actualizado hasta consultarlo. Abre «Consultar clima» en una ficha sugerida; antes de la consulta verás el proveedor. La referencia es aproximada y el pronóstico no confirma accesos.' : `No tengo el clima actualizado sin internet.${offlineNote}`, matched);
  if (/mascota|perro|gato|pet.friend/.test(q)) {
    const eligible = (matched.length ? matched : catalog).filter(e => petAdmission(e, { species: /gato/.test(q) ? 'gato' : 'perro', count: 1 }).allowed);
    return result(eligible.length ? 'Estas fichas tienen política confirmada. Revisa especie, cantidad, tamaño, fecha y transporte con el anfitrión.' : 'No encuentro experiencias con política de mascotas confirmada por anfitrión y fecha. No recomiendo entrar con mascotas a zonas protegidas de Galápagos. Consulta condiciones directamente; no se asigna un sello pet-friendly a fichas sin verificar.', eligible);
  }
  if (/cerrad|derrumbe|desliza|cambia.*plan|flex/.test(q)) return result('No tengo un feed de cierres actuales. Un aviso del catálogo es histórico y requiere revalidación. Chulla Flex puede proponer alternativas con tus restricciones o demostrar un cierre simulado; nunca modifica reservas pagadas ni confirma una ruta segura automáticamente.', matched);
  if (/comunidad.*(?:pago|recibe|llega)|(?:cuanto|porcentaje|comision|distribu).*(?:comunidad|dinero)|reparto/.test(q)) return result('Distribución pendiente de validar con la comunidad. No existe convenio confirmado para estas fichas ni venta habilitada, así que no calculo ingresos comunitarios inventados. La billetera anterior es una demostración separada.');
  if (/pasaporte|sello/.test(q)) return result('El Pasaporte Guambra guarda tus recuerdos. Abrir una ficha o probar un sello no acredita una visita real. Los sellos de visita necesitan validación autorizada; las pruebas visuales se identifican como demostración.');
  if (/reserv|pagar|cupos|disponib|reembolso/.test(q)) return result(`Las ${catalog.length} fichas disponibles son referenciales y no tienen compra, cupos ni operadores verificados. Puedes conocerlas, guardarlas y preparar un borrador. Una solicitud o una prueba de pago no confirma un servicio real.`, matched);
  const budgetMatch = /\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dolares|usd)/.exec(q);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1] ?? budgetMatch[2]);
    const days = /\b(\d+)\s*dias?/.exec(q)?.[1];
    const hours = Number(/(\d+)\s*horas?/.exec(q)?.[1] ?? (days ? +days * 24 : 8));
    const people = Number(/\b(\d+)\s*(?:personas|panas|viajeros|wambras)/.exec(q)?.[1] ?? 1);
    if (!Number.isFinite(budget) || !Number.isFinite(hours) || hours <= 0 || !Number.isInteger(people) || people < 1 || people > 50) return result('Dime un presupuesto válido, al menos una hora y entre 1 y 50 personas para buscar ideas sin inventar costes.');
    const origin = /(?:salgo de|desde|estoy en)\s+([a-z ]+?)(?:,| con| tengo| por| y|$)/.exec(q)?.[1]?.trim() ?? '';
    const region = /galapagos/.test(q) ? 'galapagos' : undefined;
    const options = planItinerary({ origin, budgetTotal: budget, people, maxHours: hours, region }, catalog);
    const candidates = options.filter(option => option.fitsKnownConstraints && (option.classification === 'posiblemente_viable' || option.classification === 'dentro_del_presupuesto')).slice(0, 3);
    if (region === 'galapagos' && budget <= 20) return result('Galápagos con $20 totales no se considera viable. Las fichas no incluyen un viaje completo: vuelos, tasas y traslados se cotizan aparte y deben revalidarse. Puedes conservarlo como inspiración.', matched);
    return result(candidates.length ? `Estas ideas caben solo en el coste base para ${people} ${people === 1 ? 'persona' : 'personas'} y hasta ${hours} horas de actividad; el presupuesto total está incompleto. Faltan transporte ida/vuelta, comida, tasas y contingencia. ${origin ? `Priorizo referencias de ${origin}, sin calcular carreteras ni tiempos reales.` : 'Dime de dónde sales y cuántas personas viajan para afinar el borrador.'}${offlineNote}` : `No encuentro una opción con coste base en USD dentro de $${budget} para ${people} ${people === 1 ? 'persona' : 'personas'} y el tiempo indicado. No convierto precios en EUR sin una tasa fechada. Amplía presupuesto/tiempo o consulta una salida local.${offlineNote}`, candidates.map(option => option.experience));
  }
  if (place) return result(`${place.title}: ${place.summary} Está en ${place.locality}, ${place.province}. ${place.duration.label}. ${place.price.originalLabel}. ${place.activities.length ? `Puedes explorar: ${place.activities.slice(0, 3).join(', ')}.` : ''} Son referencias por confirmar y no ofertas reservables. ${place.warnings.length ? 'Hay avisos históricos en la ficha; confirma el acceso antes de planificar.' : ''}${offlineNote}`, matched, matched.flatMap(e => e.warnings.map(warning => `${warning.asOf ?? 'Sin fecha'} · Aviso histórico: ${warning.text}`)).slice(0, 3));
  return result(`Puedo buscar destinos por nombre, actividad o región, explicar el pasaporte, privacidad y reservas, y preparar ideas por presupuesto. Prueba «Salgo de Quito con $20» o «Quiero conocer Saraguro». ${context.online ? 'Modo catálogo y FAQ: no es IA generativa conectada.' : offlineNote}`);
}
