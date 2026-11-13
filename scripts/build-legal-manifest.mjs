#!/usr/bin/env node
/**
 * Genera src/domain/legal/manifest.json a partir de los borradores de src/content/legal/.
 * Node puro, sin dependencias. No «completa» ningún campo: solo detecta y cuenta lo pendiente.
 *
 * Uso:  node scripts/build-legal-manifest.mjs          (escribe el manifest)
 *       node scripts/build-legal-manifest.mjs --check  (falla si el manifest está desactualizado)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content', 'legal');
const outFile = join(root, 'src', 'domain', 'legal', 'manifest.json');

export const LEGAL_SOURCES = [
  { id: 'terms', slug: 'terminos', file: '01_TERMINOS_Y_CONDICIONES.md' },
  { id: 'privacy', slug: 'privacidad', file: '02_POLITICA_DE_PRIVACIDAD.md' },
  { id: 'cookies', slug: 'cookies', file: '03_POLITICA_DE_COOKIES.md' },
  { id: 'merchant-agreement', slug: 'acuerdo-comerciantes', file: '04_ACUERDO_COMERCIANTES_ANFITRIONES.md' },
  { id: 'community-agreement', slug: 'convenio-comunidades', file: '05_ACUERDO_COMUNIDADES_REPARTO.md' },
  { id: 'booking-policy', slug: 'reservas-cancelaciones', file: '06_POLITICA_RESERVAS_CANCELACIONES.md' },
  { id: 'consent-texts', slug: 'consentimientos', file: '07_TEXTOS_CONSENTIMIENTO_UI.md' },
  { id: 'legal-checklist', slug: 'checklist-legal', file: '08_CHECKLIST_LEGAL.md' },
  { id: 'data-processing-agreement', slug: 'encargo-tratamiento', file: '09_ACUERDO_ENCARGO_TRATAMIENTO_DATOS.md' },
];

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');

/** Versión declarada en el texto («Versión: 0.9», «Versión 0.1»); null si el borrador no la trae. */
export function detectVersion(text) {
  const match = /Versi[oó]n:?\**\s*(\d+(?:\.\d+)*)/i.exec(text);
  return match ? match[1] : null;
}

/** Fecha declarada junto a la versión. ISO completo si hay día; `AAAA-MM` si solo hay mes; null si no hay. */
export function detectDate(text) {
  const at = text.search(/Versi[oó]n/i);
  if (at < 0) return null;
  const near = text.slice(at, at + 160);
  let m = /(\d{1,2})-(\d{1,2})-(\d{4})/.exec(near);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const months = MONTHS.join('|');
  m = new RegExp(`(\\d{1,2}) de (${months}) de (\\d{4})`, 'i').exec(near);
  if (m) return `${m[3]}-${pad(MONTHS.indexOf(m[2].toLowerCase()) + 1)}-${pad(m[1])}`;
  m = new RegExp(`(${months})(?: de)? (\\d{4})`, 'i').exec(near);
  if (m) return `${m[2]}-${pad(MONTHS.indexOf(m[1].toLowerCase()) + 1)}`;
  return null;
}

/**
 * Campos entre corchetes que siguen sin resolver. Se excluyen las casillas de checklist
 * (`[ ]`, `[x]`) y los enlaces Markdown `[texto](url)`.
 * `placeholder`: dato por completar (p. ej. [RUC]); `editorial_note`: instrucción de redacción
 * que tampoco puede llegar a producción (p. ej. [Desmarcada por defecto]).
 */
export function detectPendingFields(text) {
  const fields = [];
  const pattern = /\[([^\[\]\n]+)\](?!\()/g;
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const match of lineText.matchAll(pattern)) {
      const inner = match[1].trim();
      if (inner === '' || /^x$/i.test(inner)) continue;
      const letters = inner.replace(/[^\p{L}]/gu, '');
      const kind = letters !== '' && letters === letters.toUpperCase() ? 'placeholder' : 'editorial_note';
      fields.push({ text: `[${match[1]}]`, line: index + 1, kind });
    }
  });
  return fields;
}

/** Ítems `- [ ]` / `- [x]` del checklist. */
export function detectChecklistItems(text) {
  const items = [];
  for (const match of text.matchAll(/^- \[( |x|X)\] (.+)$/gm)) {
    items.push({ text: match[2].trim(), done: match[1] !== ' ' });
  }
  return items;
}

export function buildManifest() {
  const documents = LEGAL_SOURCES.map((source) => {
    const path = join(contentDir, source.file);
    if (!existsSync(path)) throw new Error(`Falta el borrador legal: ${path}`);
    const buffer = readFileSync(path);
    const text = buffer.toString('utf8');
    const title = (/^# (.+)$/m.exec(text)?.[1] ?? source.file).trim();
    const pendingFields = detectPendingFields(text);
    const checklistItems = detectChecklistItems(text);
    return {
      id: source.id,
      slug: source.slug,
      file: source.file,
      title,
      version: detectVersion(text),
      date: detectDate(text),
      sha256: createHash('sha256').update(buffer).digest('hex'),
      bytes: buffer.length,
      pendingFieldCount: pendingFields.length,
      pendingFields,
      ...(checklistItems.length ? { checklistItems } : {}),
      status: 'draft_pending_legal_review',
    };
  });
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/build-legal-manifest.mjs',
    notice: 'Borradores sin revisión jurídica. Ningún documento es publicable mientras tenga campos pendientes o no exista aprobación registrada.',
    documents,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const json = `${JSON.stringify(buildManifest(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
    if (current !== json) {
      console.error('manifest.json está desactualizado: ejecuta node scripts/build-legal-manifest.mjs');
      process.exit(1);
    }
    console.log('manifest.json al día.');
  } else {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, json);
    const manifest = JSON.parse(json);
    for (const doc of manifest.documents) {
      console.log(`${doc.slug.padEnd(24)} v${doc.version ?? '—'}  ${String(doc.pendingFieldCount).padStart(3)} pendientes  ${doc.sha256.slice(0, 12)}`);
    }
    console.log(`Escrito ${outFile}`);
  }
}
