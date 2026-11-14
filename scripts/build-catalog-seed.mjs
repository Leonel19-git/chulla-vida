#!/usr/bin/env node
/** Ingestión determinista de los catálogos locales; nunca verifica una oferta. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestAmazonia } from './catalog-amazonia.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = 'CHULLA_VIDA_3_PAQUETE/catalogos/';
const importedAt = '2026-11-12';
const clean = text => text.replace(/\s+/g, ' ').trim();
const slugify = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sentence = text => text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
const field = (text, label) => clean(new RegExp(`^${label}:\\s*([^\\r\\n]+)`, 'mi').exec(text.replaceAll('**', ''))?.[1] || '');
const paragraphs = text => text.trim().split(/\r?\n\s*\r?\n/).map(clean).filter(Boolean);
const list = text => text ? text.split(/,\s*/).map(x => x.replace(/\.$/, '').trim()).filter(Boolean) : [];
const amount = text => Number(text.replaceAll('.', '').replace(',', '.'));

function duration(label) {
  const hours = /(\d+)(?:[–-](\d+))? horas?/.exec(label);
  return { label, minHours: hours ? Number(hours[1]) : null, maxHours: hours ? Number(hours[2] || hours[1]) : null,
    days: Number(/(\d+) días?/.exec(label)?.[1]) || null, nights: Number(/(\d+) noches?/.exec(label)?.[1]) || null };
}
function difficulty(label) {
  if (/alta/i.test(label)) return 'alta';
  if (/fácil a moderada/i.test(label)) return 'facil_moderada';
  return /moderada/i.test(label) ? 'moderada' : 'facil';
}
function base(source, order, title, sourceText, prefix, nameSlug) {
  const idSlug = nameSlug || slugify(title);
  return {
    id: `${prefix}-${String(order).padStart(2, '0')}-${idSlug}`, slug: idSlug,
    contentSourceId: source.id, originalDocument: source.originalDocument, sourceOrder: order, sourceText,
    contentVersion: '2026-11-12.1', sourceCheckedAt: importedAt, title, experienceName: null, kind: 'experience',
    localizedRegion: 'sierra', subregion: null, province: '', locality: '', meetingPoint: null,
    geospatialCoordinatesVerified: false, weatherReference: null,
    duration: duration('Por confirmar'), difficulty: 'facil', difficultyLabel: 'Por confirmar', capacity: { max: null, label: 'Por confirmar con operador' },
    summary: '', description: '', context: null, attractions: [], activities: [], itinerary: [], recommendations: [], conditions: [], warnings: [], activityConstraints: [],
    price: { type: 'referential', currency: 'USD', min: null, max: null, unit: 'per_person', originalLabel: '', includes: [], excludes: [], assumptions: ['Precio, duración, capacidad, servicios y disponibilidad pendientes de validación con un operador.'] },
    accessStatus: 'unknown', accessCheckedAt: null, operatorVerificationStatus: 'unverified', verifiedBy: null, bookingEnabled: false, editorialStatus: 'referential',
    tags: [], petPolicy: { status: 'unverified', note: 'La fuente no confirma admisión de mascotas. Consultar condiciones y restricciones del lugar antes de planificar.', species: [], maxSize: null, maxCount: null, requirements: [], fee: null, confirmedBy: null, confirmedAt: null },
    connectivity: [{ id: 'accesibilidad_por_verificar', verifiedBy: null, verifiedAt: null }], media: [],
  };
}
const sourceSpecs = [
  ['catalogo-general-14', '14 destinos turísticos del Ecuador', '01_catalogo_14_destinos.txt', 14],
  ['catalogo-costa-7', 'Experiencias de la Costa', '03_costa_7_experiencias_extraido.txt', 7],
  ['catalogo-galapagos-12', '12 experiencias turísticas de Galápagos', '02_galapagos_12_experiencias.txt', 12],
  ['catalogo-amazonia-usuario', '18 inspiraciones de la Amazonía aportadas por el usuario', '04_amazonia_usuario.txt', 18],
];
function readSources() {
  return sourceSpecs.map(([id, title, file, expectedCount]) => {
    const originalDocument = sourceRoot + file;
    return { id, title, originalDocument, checkedAt: importedAt, expectedCount,
      notes: [], text: readFileSync(join(root, originalDocument), 'utf8') };
  });
}
function sectionBlocks(text, pattern, endMarker) {
  const end = endMarker ? text.indexOf(endMarker) : -1;
  const content = end < 0 ? text : text.slice(0, end);
  const matches = [...content.matchAll(pattern)];
  return matches.map((match, index) => ({ order: Number(match[1]), title: match[2]?.trim(),
    raw: content.slice(match.index, matches[index + 1]?.index ?? content.length).trim().replace(/\s*---\s*$/, '').trim() }));
}

function ingestGeneral(source) {
  source.notes = paragraphs(source.text.split('## NOTA GENERAL PARA LA APLICACIÓN')[1] || '');
  return sectionBlocks(source.text, /^### (\d+)\. (.+)$/gm, '## NOTA GENERAL PARA LA APLICACIÓN').map(({ order, title, raw }) => {
    const record = base(source, order, title, raw, 'gen');
    const region = field(raw, 'Región');
    record.locality = field(raw, 'Ubicación');
    record.province = record.locality.split(',').at(-1).replace(/^Provincia de /, '').trim();
    record.localizedRegion = record.province === 'Napo' ? 'amazonia' : 'sierra';
    record.subregion = region === 'Sierra' ? null : region;
    record.duration = duration(field(raw, 'Duración'));
    record.difficultyLabel = field(raw, 'Dificultad');
    record.difficulty = difficulty(record.difficultyLabel);
    record.capacity.label = field(raw, 'Capacidad');
    record.capacity.max = Number(/\d+/.exec(record.capacity.label)?.[0]) || null;
    record.description = field(raw, 'Descripción');
    record.summary = sentence(record.description);
    record.attractions = list(field(raw, 'Atractivos'));
    record.activities = list(field(raw, 'Actividades'));
    const originalLabel = field(raw, 'Precio referencial');
    const value = Number(/\$(\d+)/.exec(originalLabel)?.[1]);
    record.price = { ...record.price, min: value, max: value, originalLabel,
      excludes: ['La fuente no confirma transporte, alimentación, alojamiento ni entradas dentro del precio; deben acordarse por separado.'] };
    const important = field(raw, 'Importante');
    if (important) record.warnings.push({ text: important, asOf: null, kind: 'safety', historical: true });
    if (order === 7 || order === 14) record.activityConstraints.push('Las actividades de aventura requieren proveedores autorizados, condiciones de seguridad y confirmación independiente.');
    if (order === 9) record.activityConstraints.push('Confirmar accesos y condiciones volcánicas y climáticas con autoridades; el catálogo no comunica un estado actual.');
    record.conditions = [...source.notes];
    record.tags = [record.localizedRegion, record.subregion, record.province, ...record.activities].filter(Boolean);
    return record;
  });
}

const costaHeaders = ['HISTORIA Y CONTEXTO', 'SERVICIOS INCLUIDOS EN EL PAQUETE', 'ITINERARIO TENTATIVO', 'NO INCLUYE', 'RECOMENDACIONES Y CONDICIONES'];
function costaSection(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return '';
  const from = start + heading.length;
  const stops = costaHeaders.map(next => text.indexOf(next, from)).filter(index => index >= 0);
  return text.slice(from, stops.length ? Math.min(...stops) : text.length).trim();
}
function ingestCosta(source) {
  source.notes = ['Tarifas de venta estimadas, sujetas a confirmación con los operadores. No son cotizaciones ni reservas activas.',
    'Servicios prepagados · Transporte del visitante hasta el punto de encuentro no incluido.',
    'Fuente extraída del PDF original: CHULLA_VIDA_3_PAQUETE/catalogos/03_costa_7_experiencias_original.pdf.'];
  return sectionBlocks(source.text, /^EXPERIENCIA (\d+)\s*$/gm).map(({ order, raw }) => {
    const original = raw.split('\f')[0].trim();
    const parsed = original.replace(/^\s*Tarifas propuestas · USD por persona \| Noviembre de 2026\s*$/gm, '').trim();
    const title = parsed.split(/\r?\n/).find(line => line.includes(' · '))?.trim();
    if (!title) throw new Error(`Título Costa ausente ${order}`);
    const [destination, experienceName] = title.split(' · ');
    const record = base(source, order, title, original, 'cos', slugify(destination));
    record.experienceName = experienceName;
    record.localizedRegion = 'costa';
    record.locality = field(parsed, 'Ubicación');
    record.province = record.locality.split(',').at(-1).trim();
    record.meetingPoint = field(parsed, 'Punto de encuentro');
    record.duration = duration(field(parsed, 'Duración'));
    record.difficultyLabel = field(parsed, 'Dificultad');
    record.difficulty = difficulty(record.difficultyLabel);
    const tariffLine = parsed.split(/\r?\n/).find(line => line.startsWith('TARIFA PROPUESTA'));
    const value = Number(/\$(\d+)/.exec(tariffLine)?.[1]);
    const descriptionStart = parsed.indexOf(tariffLine) + tariffLine.length;
    record.description = clean(parsed.slice(descriptionStart, parsed.indexOf('HISTORIA Y CONTEXTO')));
    record.summary = sentence(record.description);
    record.context = clean(costaSection(parsed, 'HISTORIA Y CONTEXTO'));
    const services = costaSection(parsed, 'SERVICIOS INCLUIDOS EN EL PAQUETE').split('').map(clean).filter(Boolean);
    record.itinerary = costaSection(parsed, 'ITINERARIO TENTATIVO').split(/\r?\n/).reduce((steps, line) => {
      const match = /^\s*(\d{2}:\d{2}(?:[–-]\d{2}:\d{2})?)\s+(.+)$/.exec(line);
      if (match) steps.push({ time: match[1], text: match[2].trim() });
      else if (line.trim() && steps.length) steps.at(-1).text += ` ${line.trim()}`;
      return steps;
    }, []);
    record.activities = record.itinerary.map(step => step.text);
    record.recommendations = [clean(costaSection(parsed, 'RECOMENDACIONES Y CONDICIONES'))];
    record.conditions = [...record.recommendations, ...source.notes.slice(0, 2)];
    record.activityConstraints = [...record.recommendations];
    record.price = { ...record.price, type: 'proposed', min: value, max: value, originalLabel: tariffLine,
      includes: services, excludes: [clean(costaSection(parsed, 'NO INCLUYE'))] };
    record.tags = ['costa', destination, record.province, experienceName];
    return record;
  });
}

function ingestGalapagos(source) {
  const notesText = source.text.split('NOTA GENERAL PARA LA APLICACIÓN')[1] || '';
  source.notes = notesText.split(/\r?\n/).map(clean).filter(Boolean);
  const sourceCosts = [
    { concept: 'Ingreso al Parque Nacional Galápagos', detail: source.notes.find(x => x.startsWith('Tasa de ingreso')), min: 0, max: 200 },
    { concept: 'Tarjeta de Control de Tránsito (TCT)', detail: source.notes.find(x => x.startsWith('Tarjeta de Control')), min: 20, max: 20 },
    { concept: 'Vuelo Quito–Galápagos, ida y vuelta', detail: source.notes.find(x => x.startsWith('Vuelo Quito')), min: 223, max: 755 },
    { concept: 'Lancha entre islas, por tramo', detail: source.notes.find(x => x.startsWith('Lancha entre islas')), min: 30, max: 40 },
    { concept: 'Bote-taxi en el muelle', detail: source.notes.find(x => x.startsWith('Bote-taxi')), min: 0.5, max: 1 },
    { concept: 'Hospedaje en Puerto Ayora, por noche', detail: source.notes.find(x => x.startsWith('Hospedaje en Puerto Ayora')), min: 33, max: 94 },
  ].map(cost => ({ ...cost, currency: 'USD', requiresRevalidation: true }));
  return sectionBlocks(source.text, /^(\d+)\. (.+)$/gm, 'NOTA GENERAL PARA LA APLICACIÓN').map(({ order, title, raw }) => {
    const record = base(source, order, title, raw, 'gal');
    record.localizedRegion = 'galapagos';
    record.province = 'Galápagos';
    record.subregion = field(raw, 'Región');
    record.locality = field(raw, 'Ubicación');
    record.duration = duration(field(raw, 'Duración'));
    record.difficultyLabel = field(raw, 'Dificultad');
    record.difficulty = difficulty(record.difficultyLabel);
    record.capacity.label = field(raw, 'Capacidad');
    record.description = field(raw, 'Descripción');
    record.summary = sentence(record.description);
    record.attractions = list(field(raw, 'Atractivos'));
    record.activities = list(field(raw, 'Actividades'));
    record.kind = order >= 11 ? 'trip_plan' : order >= 9 ? 'multi_day_program' : 'experience';
    const originalLabel = field(raw, 'Precio referencial');
    const monies = [...originalLabel.matchAll(/[$€]([\d.,]+)/g)].map(match => amount(match[1]));
    record.price = { ...record.price, currency: originalLabel.includes('€') ? 'EUR' : 'USD', min: monies[0],
      max: order >= 11 ? monies[0] : /^Desde/i.test(originalLabel) ? null : monies[1] ?? monies[0], originalLabel,
      excludes: ['Vuelos y tasas de acceso no se deben asumir incluidos. Confirmar cada servicio con el operador.'],
      separateCosts: sourceCosts,
      assumptions: [record.price.assumptions[0], ...source.notes.filter(x => x.startsWith('Datos menos confiables')),
        'Los costes separados son referencias históricas, con condiciones por nacionalidad y edad. No constituyen cotización ni se suman sin revisar inclusiones.'] };
    if (order === 9) record.price.groupBreakdown = [ [2, 1135], [3, 1010], [4, 915], [5, 880], [6, 855] ].map(([groupSize, amountPerPerson]) => ({ groupSize, amountPerPerson }));
    if (order === 10) record.price.includes = ['Excursiones guiadas, un día de barco a Bartolomé o Seymour Norte, el tour a Kicker Rock y los traslados en lancha entre islas (según la descripción, sin validación contractual).'];
    if (order >= 11) {
      record.price.includes = [record.description.slice(record.description.indexOf('Desglose por persona:'))];
      record.price.assumptions.push(originalLabel);
      record.price.assumptions.push('Plan estimativo de viaje, no un paquete operado ni un precio comercial. Hospedaje, comida, lancha, tours y transporte local ya se describen dentro de la base insular.');
    }
    const important = field(raw, 'Importante');
    if (important) record.warnings.push({ text: important, asOf: important.includes('7 de noviembre') ? '2026-11-07' : importedAt,
      kind: /cerrad|inundacion/i.test(important) ? 'closure' : 'pricing', historical: true });
    record.warnings.push({ text: source.notes.find(x => x.startsWith('Estado de los sitios')), asOf: importedAt, kind: 'closure', historical: true });
    record.activityConstraints = ['No se conoce el estado actual de apertura. Consultar los canales oficiales y el operador; estos avisos describen fechas de la fuente, no un feed vigente.',
      'Los accesos, guías, navegación y actividades en áreas protegidas requieren autorización y confirmación. No garantizar avistamiento de especies.'];
    if (order === 4) record.activityConstraints.push('El buceo requiere certificación cuando corresponda; considerar agua fría, corrientes y condiciones del operador.');
    if (order === 7) record.activityConstraints.push('La fuente describe aproximadamente 16 km de caminata y dificultad alta.');
    record.conditions = [...source.notes];
    record.tags = ['galapagos', record.subregion, record.kind, ...record.activities];
    return record;
  });
}

/**
 * Fotos reales (Wikimedia Commons, licencia libre) registradas por scripts/fetch-place-images.py.
 * Solo se aplican a las inspiraciones amazónicas: las otras 33 fichas que muestra la app viven en
 * src/domain/catalog/data/*.ts y toman su foto de place-photos.ts, generado del mismo registro.
 */
function applyPlacePhotos(records) {
  const registryPath = join(root, 'scripts/place-images.json');
  if (!existsSync(registryPath)) return;
  const photos = new Map(JSON.parse(readFileSync(registryPath, 'utf8')).map(photo => [photo.id, photo]));
  for (const record of records) {
    const photo = photos.get(record.id);
    if (!photo) continue;
    record.media = [{ src: photo.src, srcLarge: photo.srcLarge || photo.src, alt: photo.alt, credit: `${photo.author} · Wikimedia Commons`,
      license: photo.license, pageUrl: photo.pageUrl, depictsThisPlace: true }];
  }
}

export function buildCatalog() {
  const sources = readSources();
  const experiences = [...ingestGeneral(sources[0]), ...ingestCosta(sources[1]), ...ingestGalapagos(sources[2]), ...ingestAmazonia(sources[3], base)];
  for (const source of sources) {
    const count = experiences.filter(record => record.contentSourceId === source.id).length;
    if (count !== source.expectedCount) throw new Error(`${source.id}: ${count} fichas; se esperaban ${source.expectedCount}`);
  }
  applyPlacePhotos(experiences.filter(record => record.contentSourceId === sources[3].id));
  return { schemaVersion: 1, importedAt: sources.map(source => source.checkedAt).sort().at(-1), catalogSources: sources.map(({ text: _text, ...source }) => source), experiences };
}

function writeOrCheck(path, text, check) {
  if (check) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) throw new Error(`Desactualizado: ${path}`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const catalog = buildCatalog();
  const check = process.argv.includes('--check');
  writeOrCheck(join(root, 'src/domain/catalog/data.json'), `${JSON.stringify(catalog, null, 2)}\n`, check);
  const quote = text => `'${text.replaceAll("'", "''")}'`;
  const sql = `-- Generado por scripts/build-catalog-seed.mjs. Ejecutar después de las migraciones.\n-- ${catalog.experiences.length} fichas editoriales; sin reservas ni operadores verificados.\nBEGIN;\n` + catalog.experiences.map(record =>
    `INSERT INTO public.catalog_experiences (id, data) VALUES (${quote(record.id)}, ${quote(JSON.stringify(record))}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`).join('\n') + '\nCOMMIT;\n';
  writeOrCheck(join(root, 'supabase/seed.sql'), sql, check);
  for (const source of catalog.catalogSources) {
    writeOrCheck(join(root, 'public/catalogos', source.originalDocument.split('/').at(-1)), readFileSync(join(root, source.originalDocument), 'utf8'), check);
  }
  console.log(`Catálogo ${check ? 'validado' : 'generado'}: ${catalog.experiences.length} fichas (14 + 7 + 12 + 18), sin reservas.`);
}
