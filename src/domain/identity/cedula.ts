/**
 * Validación de FORMATO de la cédula ecuatoriana y del RUC de persona natural.
 *
 * Comprueba longitud, código de provincia (01–24 o 30), tercer dígito (< 6) y el dígito
 * verificador con el algoritmo módulo 10 (coeficientes 2-1-2-1-2-1-2-1-2).
 *
 * IMPORTANTE: una cédula que pasa esta validación tiene un FORMATO VÁLIDO. No significa que
 * exista, que pertenezca a quien la escribe ni que la identidad esté verificada: CHULLA VIDA no
 * consulta el Registro Civil. Nunca presentes este resultado como «identidad verificada».
 */

export const ECUADOR_PROVINCES: Readonly<Record<string, string>> = Object.freeze({
  '01': 'Azuay', '02': 'Bolívar', '03': 'Cañar', '04': 'Carchi', '05': 'Cotopaxi', '06': 'Chimborazo',
  '07': 'El Oro', '08': 'Esmeraldas', '09': 'Guayas', '10': 'Imbabura', '11': 'Loja', '12': 'Los Ríos',
  '13': 'Manabí', '14': 'Morona Santiago', '15': 'Napo', '16': 'Pastaza', '17': 'Pichincha', '18': 'Tungurahua',
  '19': 'Zamora Chinchipe', '20': 'Galápagos', '21': 'Sucumbíos', '22': 'Orellana', '23': 'Santo Domingo de los Tsáchilas',
  '24': 'Santa Elena', '30': 'Ecuatorianos registrados en el exterior',
});

export type CedulaFailure = 'empty' | 'not_numeric' | 'incomplete' | 'too_long' | 'province' | 'third_digit' | 'check_digit';

export interface CedulaValidation {
  valid: boolean;
  /** Motivo legible del rechazo; `null` cuando el formato es válido. */
  reason: string | null;
  code: CedulaFailure | null;
  /** Solo dígitos, sin espacios ni guiones. */
  normalized: string;
  provinceCode: string | null;
  provinceName: string | null;
  /** `0102030405` → `010203040-5`; vacío si el número no está completo. */
  formatted: string;
  /** Siempre `false`: este módulo no verifica identidades. */
  identityVerified: false;
}

const REASONS: Record<CedulaFailure, string> = {
  empty: 'Escribe tu número de cédula.',
  not_numeric: 'La cédula solo lleva números.',
  incomplete: 'La cédula tiene 10 dígitos.',
  too_long: 'La cédula tiene 10 dígitos; sobran números.',
  province: 'Los dos primeros dígitos no corresponden a una provincia (01–24 o 30).',
  third_digit: 'El tercer dígito de una cédula de persona natural va de 0 a 5.',
  check_digit: 'El último dígito no coincide con el verificador. Revisa si hay un número cambiado.',
};

/** Quita espacios, puntos y guiones que la gente suele escribir. */
export const normalizeDocument = (value: string): string => value.replace(/[\s.-]/g, '');

/** Dígito verificador módulo 10 para los nueve primeros dígitos. */
export function cedulaCheckDigit(firstNine: string): number {
  if (!/^\d{9}$/.test(firstNine)) throw new Error('Se necesitan nueve dígitos');
  let sum = 0;
  for (let index = 0; index < 9; index++) {
    let product = Number(firstNine[index]) * (index % 2 === 0 ? 2 : 1);
    if (product > 9) product -= 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10;
}

export const formatCedula = (digits: string): string => /^\d{10}$/.test(digits) ? `${digits.slice(0, 9)}-${digits.slice(9)}` : '';

function failure(code: CedulaFailure, normalized: string, provinceCode: string | null = null): CedulaValidation {
  return { valid: false, reason: REASONS[code], code, normalized, provinceCode, provinceName: provinceCode ? ECUADOR_PROVINCES[provinceCode] ?? null : null, formatted: formatCedula(normalized), identityVerified: false };
}

export function validateCedula(value: string): CedulaValidation {
  const normalized = normalizeDocument(String(value ?? ''));
  if (!normalized) return failure('empty', normalized);
  if (!/^\d+$/.test(normalized)) return failure('not_numeric', normalized);
  if (normalized.length < 10) return failure('incomplete', normalized);
  if (normalized.length > 10) return failure('too_long', normalized);
  const provinceCode = normalized.slice(0, 2);
  if (!ECUADOR_PROVINCES[provinceCode]) return failure('province', normalized);
  if (Number(normalized[2]) >= 6) return failure('third_digit', normalized, provinceCode);
  if (cedulaCheckDigit(normalized.slice(0, 9)) !== Number(normalized[9])) return failure('check_digit', normalized, provinceCode);
  return { valid: true, reason: null, code: null, normalized, provinceCode, provinceName: ECUADOR_PROVINCES[provinceCode], formatted: formatCedula(normalized), identityVerified: false };
}

export interface RucValidation { valid: boolean; reason: string | null; cedula: CedulaValidation | null; establishment: string | null }
/** RUC de persona natural: cédula válida + número de establecimiento (normalmente `001`). */
export function validateRucPersonaNatural(value: string): RucValidation {
  const normalized = normalizeDocument(String(value ?? ''));
  if (!/^\d{13}$/.test(normalized)) return { valid: false, reason: 'El RUC tiene 13 dígitos.', cedula: null, establishment: null };
  const cedula = validateCedula(normalized.slice(0, 10));
  const establishment = normalized.slice(10);
  if (!cedula.valid) return { valid: false, reason: `Los 10 primeros dígitos no forman una cédula válida: ${cedula.reason}`, cedula, establishment };
  if (establishment === '000') return { valid: false, reason: 'El establecimiento del RUC no puede ser 000 (lo habitual es 001).', cedula, establishment };
  return { valid: true, reason: null, cedula, establishment };
}

export interface PassportValidation { valid: boolean; reason: string | null; normalized: string }
/** Validación básica: 5–20 letras o números. No comprueba el país emisor ni la vigencia. */
export function validatePassport(value: string): PassportValidation {
  const normalized = normalizeDocument(String(value ?? '')).toUpperCase();
  if (!normalized) return { valid: false, reason: 'Escribe tu número de pasaporte.', normalized };
  if (!/^[A-Z0-9]+$/.test(normalized)) return { valid: false, reason: 'El pasaporte lleva solo letras y números.', normalized };
  if (normalized.length < 5) return { valid: false, reason: 'El pasaporte suele tener al menos 5 caracteres.', normalized };
  if (normalized.length > 20) return { valid: false, reason: 'Ese número es demasiado largo para un pasaporte.', normalized };
  return { valid: true, reason: null, normalized };
}

/** Deja visibles solo los últimos 4 caracteres: `0102030405` → `******0405`. */
export function maskCedula(value: string): string {
  const normalized = normalizeDocument(String(value ?? '')).toUpperCase();
  if (normalized.length <= 4) return '*'.repeat(normalized.length);
  return `${'*'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}
export const maskDocument = maskCedula;
/** Un documento enmascarado: asteriscos seguidos exactamente de 4 caracteres visibles. */
export const isMaskedDocument = (value: unknown): value is string => typeof value === 'string' && /^\*{1,16}[0-9A-Z]{4}$/.test(value);

export type DocumentType = 'cedula' | 'passport';
export function validateDocument(type: DocumentType, value: string): { valid: boolean; reason: string | null; normalized: string } {
  if (type === 'passport') return validatePassport(value);
  const result = validateCedula(value);
  return { valid: result.valid, reason: result.reason, normalized: result.normalized };
}
