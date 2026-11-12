import type { Place } from '../../types';
import { INITIAL_PLACES } from '../../data/mockData';

export const shortTitle = (p: Place) => p.titulo.split(':')[0].replace(' y el Galápagos de los Pobres (Isla de la Plata)', ' e Isla de la Plata');
export const placeImage = (p: Place) => {
  const original = INITIAL_PLACES.find(item => item.id === p.id);
  const candidate = p.imagenes?.[0];
  if (candidate?.startsWith('/images/')) return candidate;
  if (candidate && candidate !== original?.imagenes[0]) {
    try { const url = new URL(candidate, 'https://chullavida.local'); if (['https:', 'http:'].includes(url.protocol)) return candidate; } catch { /* Use the regional image below. */ }
  }
  return p.id === 'place-quilotoa' ? '/images/quilotoa.jpg' : p.region === 'Costa' ? '/images/coast.jpg' : p.region === 'Amazonía' || /yunguilla|intag/.test(p.id) ? '/images/forest.jpg' : '/images/andes.jpg';
};
export const money = (n: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const faqs = [
  { category: 'Viajeros', question: '¿Cómo encuentro un viaje que vaya conmigo?', answer: 'Abre «Planificar mi viaje» y responde las ocho preguntas: intereses, presupuesto del grupo, días, personas, región, intensidad, origen y cercanía. Las sugerencias se ordenan según tus respuestas. Puedes cambiarlas cuando quieras.' },
  { category: 'Viajeros', question: '¿El presupuesto es por persona o por todo el grupo?', answer: 'El planificador utiliza el presupuesto total del grupo para toda la escapada. En cada experiencia mostramos la tarifa por persona y calculamos el total según cuántos viajan. Transporte, alimentación o alojamiento solo se incluyen cuando la ficha lo indica.' },
  { category: 'Viajeros', question: '¿Puedo viajar sin experiencia previa?', answer: 'Sí: elige intensidad suave para ver actividades tranquilas. Revisa la duración, la altitud y las recomendaciones de cada ficha, y confirma los requisitos con el anfitrión antes de tu visita.' },
  { category: 'Viajeros', question: '¿Cómo funcionan las solicitudes de reserva?', answer: 'Selecciona una experiencia y pulsa «Reservar y probar pago». Elige fecha, personas y un método de prueba; revisa el total y simula el resultado. La solicitud y su pago de demostración se guardan por separado. El negocio confirma la visita desde su panel; no hay cobros ni mensajes externos.' },
  { category: 'Viajeros', question: '¿Qué pasa si cambian mis planes?', answer: 'En «Mis viajes y pagos» puedes cancelar una solicitud pendiente o confirmada. Para una reserva real, consulta directamente las condiciones de cambio y cancelación del anfitrión antes de contratar.' },
  { category: 'Viajeros', question: '¿Qué debo llevar y cómo cuido el lugar?', answer: 'Consulta las recomendaciones de cada experiencia. Como base, lleva agua en un recipiente reutilizable, ropa adecuada al clima y tu identificación. Respeta los senderos, pregunta antes de fotografiar a las personas y regresa con tus residuos.' },
  { category: 'Negocios', question: '¿Qué puedo hacer desde mi espacio de negocios?', answer: 'Puedes publicar una experiencia, actualizar sus datos, ajustar precio y capacidad, y revisar o responder las solicitudes que correspondan a tu negocio. Las herramientas de gestión están separadas del recorrido de los viajeros.' },
  { category: 'Negocios', question: '¿La información se conserva al cerrar la aplicación?', answer: 'Los favoritos, las preferencias, las experiencias y las solicitudes se guardan en este navegador. No se sincronizan entre dispositivos ni entre personas. Si borras los datos del navegador, se eliminan estos cambios.' },
  { category: 'Viajeros', question: '¿Los pagos con tarjeta, transferencia o Deuna son reales?', answer: 'Son simulaciones. La tarjeta está precargada con datos de prueba y no pide datos bancarios. La transferencia utiliza una referencia ficticia y el QR contiene solo texto de demostración. Puedes probar aprobación, rechazo y reintento. En «Mis viajes y pagos» puedes completar una transferencia pendiente. Ninguna opción mueve dinero ni confirma una reserva real.' },
  { category: 'Música', question: '¿Cómo escucho la música del viaje?', answer: 'En la sección de música encontrarás «Folklore ecuatoriano», la playlist compartida para CHULLA VIDA, y otras recomendaciones. Elige una y pulsa «Abrir reproductor» o «Ir a Spotify». La música comienza cuando tú la reproduces. Algunas funciones pueden requerir tu cuenta de Spotify; CHULLA VIDA no solicita tu contraseña.' },
];
