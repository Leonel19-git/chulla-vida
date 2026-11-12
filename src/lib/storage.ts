import type { ChatMessage, OnboardingPreferences, Place, PlaceReview, Raymi, Reservation, Role, Language } from '../types';

const VERSION = 1;
const PREFIX = 'chullavida:v1:';
type Validator<T> = (value: unknown) => value is T;
type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === 'string' && value.length <= 20000;
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const bool = (value: unknown): value is boolean => typeof value === 'boolean';
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 200 && value.every(str);
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value);
const regions = ['Sierra', 'Costa', 'Amazonía', 'Galápagos'];
const levels = ['Tranqui', 'Moderado', 'Adrenalina'];
const isDemoPayment = (value: unknown): boolean => {
  if (!record(value) || Object.keys(value).some(key => !['estado', 'referencia', 'creado_en'].includes(key))) return false;
  if (!oneOf(value.estado, ['aprobado', 'pendiente']) || typeof value.referencia !== 'string'
    || !/^DEMO-[A-Z0-9-]{8,80}$/.test(value.referencia) || typeof value.creado_en !== 'string') return false;
  const created = new Date(value.creado_en);
  return !Number.isNaN(created.getTime()) && created.toISOString() === value.creado_en;
};

/** Browser storage is optional: private mode, quotas and malformed data must not break the app. */
export function readStoredValue<T>(key: string, fallback: T, validate: Validator<T>): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw || raw.length > 2000000) return fallback;
    const stored: unknown = JSON.parse(raw);
    if (!record(stored) || stored.version !== VERSION || !validate(stored.data)) return fallback;
    return stored.data;
  } catch {
    return fallback;
  }
}

export function writeStoredValue(key: string, data: unknown): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(PREFIX + key, JSON.stringify({ version: VERSION, data }));
  } catch {
    // In-memory behavior remains usable when persistence is unavailable.
  }
}

export const isRole: Validator<Role> = (value): value is Role => oneOf(value, ['turista', 'local', 'gestor', 'gad', 'aliado']);
export const isLanguage: Validator<Language> = (value): value is Language => oneOf(value, ['es', 'en', 'fr', 'pt', 'zh', 'ki', 'ki-amz']);
export const isString: Validator<string> = str;
export const isStringArray: Validator<string[]> = strings;
export const isPreferences: Validator<OnboardingPreferences> = (value): value is OnboardingPreferences => {
  if (!record(value)) return false;
  return strings(value.pasiones) && num(value.presupuesto_max) && value.presupuesto_max >= 0 && value.presupuesto_max <= 100000
    && oneOf(value.tipo_gasto, ['mochilero', 'equilibrado', 'experiencias'])
    && num(value.dias_disponibles) && Number.isInteger(value.dias_disponibles) && value.dias_disponibles >= 1 && value.dias_disponibles <= 365
    && num(value.cantidad_personas) && Number.isInteger(value.cantidad_personas) && value.cantidad_personas >= 1 && value.cantidad_personas <= 100
    && oneOf(value.region_preferida, [...regions, 'Todas']) && oneOf(value.nivel_aventura, [...levels, 'Todas'])
    && bool(value.completado) && (value.origen === undefined || str(value.origen))
    && (value.distancia_max === undefined || (num(value.distancia_max) && value.distancia_max >= 0 && value.distancia_max <= 40000));
};

function isReview(value: unknown): value is PlaceReview {
  if (!record(value) || !record(value.sellos_otorgados)) return false;
  return ['id', 'usuario_nombre', 'avatar_url', 'fecha', 'comentario'].every(key => str(value[key]))
    && (value.foto_url === undefined || str(value.foto_url))
    && ['bueno', 'bonito', 'barato', 'seguro'].every(key => bool((value.sellos_otorgados as JsonRecord)[key]));
}

export const isPlace: Validator<Place> = (value): value is Place => {
  if (!record(value) || !record(value.sellos) || !record(value.cooperativa_pago)) return false;
  const textKeys = ['id', 'slug', 'titulo', 'comunidad_nombre', 'provincia', 'canton_parroquia', 'descripcion_corta', 'historia_ancestral', 'clima', 'altitud', 'mejor_epoca', 'contacto_whatsapp', 'telefono_llamadas'];
  const arrayKeys = ['datos_curiosos', 'imagenes', 'etiquetas', 'que_incluye', 'que_no_incluye', 'recomendaciones_eco'];
  return textKeys.every(key => str(value[key])) && !!value.id && !!value.titulo
    && arrayKeys.every(key => strings(value[key])) && oneOf(value.region, regions) && oneOf(value.nivel_aventura, levels)
    && num(value.precio_base_pp) && value.precio_base_pp >= 0 && value.precio_base_pp <= 1000000
    && num(value.duracion_dias) && Number.isInteger(value.duracion_dias) && value.duracion_dias >= 1 && value.duracion_dias <= 365
    && num(value.cupos_disponibles_dia) && Number.isInteger(value.cupos_disponibles_dia) && value.cupos_disponibles_dia >= 0
    && ['bueno', 'bonito', 'barato', 'votos_totales'].every(key => num((value.sellos as JsonRecord)[key]) && ((value.sellos as JsonRecord)[key] as number) >= 0)
    && bool(value.sellos.seguro) && bool(value.sellos.verificado_gad) && bool(value.es_destacado)
    && (value.etiqueta_plan_pagado === undefined || str(value.etiqueta_plan_pagado))
    && ['nombre_banco', 'tipo_cuenta', 'numero_cuenta', 'titular'].every(key => str((value.cooperativa_pago as JsonRecord)[key]))
    && Array.isArray(value.preguntas_frecuentes) && value.preguntas_frecuentes.length <= 100
    && value.preguntas_frecuentes.every(faq => record(faq) && str(faq.pregunta) && str(faq.respuesta))
    && Array.isArray(value.reviews) && value.reviews.length <= 1000 && value.reviews.every(isReview);
};

export const isReservation: Validator<Reservation> = (value): value is Reservation => {
  if (!record(value)) return false;
  return ['id', 'codigo_voucher', 'lugar_id', 'lugar_titulo', 'comunidad_nombre', 'turista_nombre', 'turista_email', 'turista_telefono', 'fecha_tour', 'qr_data', 'pagado_en', 'telefono_notificado'].every(key => str(value[key]))
    && num(value.cantidad_personas) && Number.isInteger(value.cantidad_personas) && value.cantidad_personas > 0 && value.cantidad_personas <= 100
    && ['precio_total', 'monto_comunidad_90', 'comision_plataforma_10'].every(key => num(value[key]) && (value[key] as number) >= 0)
    && oneOf(value.estado, ['pendiente', 'confirmado', 'pagado', 'validado_en_sitio', 'liquidado_al_local', 'completado', 'cancelado'])
    && oneOf(value.metodo_pago, ['tarjeta', 'transferencia', 'deuna']) && bool(value.notificacion_whatsapp_enviada)
    && (value.pago_demo === undefined || (isDemoPayment(value.pago_demo) && value.pagado_en === ''
      && oneOf(value.estado, ['pendiente', 'confirmado', 'completado', 'cancelado'])))
    && (value.validado_en === undefined || str(value.validado_en)) && (value.liquidado_en === undefined || str(value.liquidado_en))
    && Array.isArray(value.extras_seleccionados) && value.extras_seleccionados.length <= 100
    && value.extras_seleccionados.every(extra => record(extra) && str(extra.nombre) && num(extra.precio) && extra.precio >= 0);
};

const isRaymi: Validator<Raymi> = (value): value is Raymi => record(value)
  && ['id', 'nombre', 'nombre_kichwa', 'provincia', 'canton', 'fecha_celebracion', 'proxima_fecha', 'significado_ancestral', 'historia_origen', 'imagen_url'].every(key => str(value[key]))
  && oneOf(value.region, regions) && strings(value.protocolo_respeto) && strings(value.elementos_rituales);
const isChatMessage: Validator<ChatMessage> = (value): value is ChatMessage => record(value)
  && ['id', 'canal', 'usuario_id', 'usuario_nombre', 'avatar_url', 'origen', 'mensaje', 'timestamp'].every(key => str(value[key]));
const listOf = <T,>(validate: Validator<T>): Validator<T[]> => (value): value is T[] => Array.isArray(value) && value.length <= 2000 && value.every(validate);
export const isPlaceArray = listOf(isPlace);
export const isReservationArray = listOf(isReservation);
export const isRaymiArray = listOf(isRaymi);
export const isChatMessageArray = listOf(isChatMessage);
