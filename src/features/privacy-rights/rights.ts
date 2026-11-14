/**
 * Solicitudes de derechos de protección de datos (LOPDP): reglas puras, sin acceso a red ni a almacenamiento.
 * La cédula se valida SOLO en formato y dígito verificador: un resultado válido NO acredita identidad
 * (no hay conexión con el Registro Civil). La validación de identidad la hace una persona del equipo.
 */

import { maskCedula, validateCedula, validatePassport } from '../../domain/identity/cedula';

export const PRIVACY_CONTACT_PLACEHOLDER = '[CORREO DE PRIVACIDAD]';
export const RESPONSE_TERM_PLACEHOLDER = '[PENDIENTE DE CONFIRMAR CON ASESORÍA]';

export type RightId = 'access' | 'rectification' | 'erasure' | 'objection' | 'portability' | 'restriction' | 'withdraw_consent' | 'automated_decisions';
/** Valores permitidos por `public.privacy_requests.kind` (migración 202611130001). */
export type RequestKind = 'access' | 'rectification' | 'erasure' | 'objection' | 'portability' | 'restriction' | 'withdraw_consent';

export const RIGHTS: readonly { id: RightId; title: string; hint: string; kind: RequestKind }[] = [
  { id: 'access', kind: 'access', title: 'Acceso', hint: 'Saber qué datos tuyos tratamos, para qué y con quién los compartimos.' },
  { id: 'rectification', kind: 'rectification', title: 'Rectificación y actualización', hint: 'Corregir o completar datos inexactos o desactualizados.' },
  { id: 'erasure', kind: 'erasure', title: 'Eliminación', hint: 'Borrar tus datos cuando ya no sean necesarios, salvo obligación legal de conservarlos.' },
  { id: 'objection', kind: 'objection', title: 'Oposición', hint: 'Pedir que dejemos de tratar tus datos para un fin concreto.' },
  { id: 'portability', kind: 'portability', title: 'Portabilidad', hint: 'Recibir tus datos en un formato estructurado y de uso común.' },
  { id: 'restriction', kind: 'restriction', title: 'Suspensión del tratamiento', hint: 'Pausar el uso de tus datos mientras se revisa un reclamo.' },
  { id: 'withdraw_consent', kind: 'withdraw_consent', title: 'Retirar un consentimiento', hint: 'Retirar un permiso que diste antes (por ejemplo, avisos o contenido externo).' },
  // La tabla no tiene un valor propio para este derecho: se registra como oposición con la marca en el detalle.
  { id: 'automated_decisions', kind: 'objection', title: 'No ser objeto de decisiones automatizadas', hint: 'Pedir revisión humana de una decisión tomada solo por un sistema automático.' },
];

export type DocumentType = 'cedula' | 'passport';
export interface RightsRequestDraft {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  hasRepresentative: boolean;
  representativeName: string;
  representativeDocument: string;
  rights: RightId[];
  description: string;
  attachments: string;
  declaration: boolean;
}
export const emptyRequest = (): RightsRequestDraft => ({ fullName: '', documentType: 'cedula', documentNumber: '', email: '', phone: '', hasRepresentative: false,
  representativeName: '', representativeDocument: '', rights: [], description: '', attachments: '', declaration: false });

export const DESCRIPTION_MAX = 2500;

/** Cédula ecuatoriana (formato y dígito verificador) con el validador compartido de src/domain/identity/cedula.ts. */
export function isValidCedulaFormat(value: string): boolean { return validateCedula(value).valid; }
export function isValidPassportFormat(value: string) { return validatePassport(value).valid; }
export function normalizeDocument(type: DocumentType, value: string) { return type === 'cedula' ? value.replace(/\D/g, '') : value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }

export type RequestErrors = Partial<Record<keyof RightsRequestDraft, string>>;
export function validateRequest(draft: RightsRequestDraft): RequestErrors {
  const errors: RequestErrors = {};
  if (draft.fullName.trim().length < 5 || !/\s/.test(draft.fullName.trim())) errors.fullName = 'Escribe tus nombres y apellidos completos.';
  const document = normalizeDocument(draft.documentType, draft.documentNumber);
  if (draft.documentType === 'cedula') {
    const result = validateCedula(document);
    if (!result.valid) errors.documentNumber = result.reason ?? 'Revisa el número de cédula.';
  } else {
    const result = validatePassport(document);
    if (!result.valid) errors.documentNumber = result.reason ?? 'Revisa el número de pasaporte.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim())) errors.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (draft.phone.trim() && !/^\+?[\d\s-]{7,16}$/.test(draft.phone.trim())) errors.phone = 'Escribe solo números, con o sin +593.';
  if (draft.hasRepresentative) {
    if (draft.representativeName.trim().length < 5) errors.representativeName = 'Escribe el nombre completo de quien te representa.';
    if (normalizeDocument('passport', draft.representativeDocument).length < 5) errors.representativeDocument = 'Escribe la cédula o pasaporte de quien te representa.';
  }
  if (draft.rights.length === 0) errors.rights = 'Marca al menos un derecho.';
  if (draft.description.trim().length < 10) errors.description = 'Cuéntanos en pocas palabras qué necesitas (mínimo 10 caracteres).';
  else if (draft.description.length > DESCRIPTION_MAX) errors.description = `Máximo ${DESCRIPTION_MAX} caracteres.`;
  if (!draft.declaration) errors.declaration = 'Necesitamos tu declaración para tramitar la solicitud.';
  return errors;
}

export const maskDocument = maskCedula;

/** Texto que se guarda en `privacy_requests.detail` (máx. 4000 caracteres según la migración). */
export function buildDetail(draft: RightsRequestDraft, right: RightId): string {
  const document = normalizeDocument(draft.documentType, draft.documentNumber);
  const lines = [
    right === 'automated_decisions' ? '[Derecho: no ser objeto de decisiones automatizadas]' : `[Derecho: ${RIGHTS.find(item => item.id === right)?.title}]`,
    `Titular: ${draft.fullName.trim()}`,
    `${draft.documentType === 'cedula' ? 'Cédula (formato válido, identidad sin verificar)' : 'Pasaporte'}: ${document}`,
    `Correo de contacto: ${draft.email.trim()}`,
    draft.phone.trim() ? `Teléfono: ${draft.phone.trim()}` : '',
    draft.hasRepresentative ? `Representante: ${draft.representativeName.trim()} · documento ${normalizeDocument('passport', draft.representativeDocument)}` : '',
    `Derechos marcados en la misma solicitud: ${draft.rights.map(id => RIGHTS.find(item => item.id === id)?.title).join(', ')}`,
    `Descripción: ${draft.description.trim()}`,
    draft.attachments.trim() ? `Documentos que adjuntará: ${draft.attachments.trim()}` : '',
  ].filter(Boolean);
  return lines.join('\n').slice(0, 4000);
}

/** Filas a insertar: una por derecho (la columna `kind` admite un solo valor). Solo columnas con permiso de inserción. */
export function buildRows(draft: RightsRequestDraft, subjectId: string) {
  return draft.rights.map(right => ({ subject_id: subjectId, kind: RIGHTS.find(item => item.id === right)!.kind, detail: buildDetail(draft, right) }));
}

/** Resumen descargable (texto plano) para enviar por correo cuando la recepción en línea no está disponible. */
export function buildSummary(draft: RightsRequestDraft, now = new Date()): string {
  const document = normalizeDocument(draft.documentType, draft.documentNumber);
  return [
    'CHULLA VIDA — Solicitud de ejercicio de derechos de protección de datos personales',
    'BORRADOR — pendiente de revisión jurídica',
    `Fecha de preparación: ${now.toISOString().slice(0, 10)}`,
    '',
    `Nombres y apellidos: ${draft.fullName.trim()}`,
    `${draft.documentType === 'cedula' ? 'Cédula' : 'Pasaporte'}: ${document}`,
    `Correo: ${draft.email.trim()}`,
    `Teléfono: ${draft.phone.trim() || '—'}`,
    `Representante: ${draft.hasRepresentative ? `${draft.representativeName.trim()} (${normalizeDocument('passport', draft.representativeDocument)})` : 'No aplica'}`,
    '',
    'Derechos que ejerzo:',
    ...draft.rights.map(id => `  [x] ${RIGHTS.find(item => item.id === id)?.title}`),
    '',
    'Descripción:',
    draft.description.trim(),
    '',
    `Documentos que adjunto: ${draft.attachments.trim() || '—'}`,
    '',
    'Declaro que la información es verdadera y que soy la persona titular de los datos o su representante debidamente autorizado.',
    '',
    `Envía este resumen y una copia de tu documento de identidad a ${PRIVACY_CONTACT_PLACEHOLDER}.`,
    `Plazo de respuesta: ${RESPONSE_TERM_PLACEHOLDER}.`,
    'Si no recibes respuesta, puedes acudir a la Superintendencia de Protección de Datos Personales: https://www.spdp.gob.ec/',
  ].join('\n');
}
