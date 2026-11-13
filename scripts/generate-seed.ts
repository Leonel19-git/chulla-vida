/**
 * Genera supabase/seed/seed.sql a partir del catálogo y del calendario cultural del dominio.
 *
 *   npx tsx scripts/generate-seed.ts          escribe el archivo
 *   npx tsx scripts/generate-seed.ts --check  falla si el archivo no coincide con el dominio
 *
 * El SQL es idempotente (insert … on conflict do update) y determinista: no contiene fechas de
 * ejecución. No inventa nada: copia lo que hay en el dominio y se detiene si una ficha llegara
 * marcada como reservable u oferta verificada, porque eso no puede nacer de una importación.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as catalogModule from '../src/domain/catalog/index.ts';
import * as cultureModule from '../src/domain/culture/index.ts';
import type { CatalogSource, CulturalEvent, Experience, RegionId } from '../src/domain/catalog/types.ts';

export interface CultureSourceInfo {
  title: string;
  originalDocument: string;
  checkedAt: string;
  notice?: string;
}

export interface SeedInput {
  experiences: readonly Experience[];
  catalogSources: readonly CatalogSource[];
  culturalEvents: readonly CulturalEvent[];
  cultureSource?: CultureSourceInfo;
}

const REGIONS: { id: RegionId; name: string }[] = [
  { id: 'sierra', name: 'Sierra' },
  { id: 'costa', name: 'Costa' },
  { id: 'amazonia', name: 'Amazonía' },
  { id: 'galapagos', name: 'Galápagos' },
];

const EDITORIAL_SOURCE_ID = 'editorial-chulla-vida';
const CULTURE_SOURCE_ID = 'calendario-cultura-viva';
const EDITORIAL_DOCUMENT = 'CHULLA_VIDA_3_PAQUETE/SUPERPROMPT_CHULLA_VIDA_3_0_CLAUDE_CODE.md';
const EDITORIAL_CHECKED_AT = '2026-11-13';

/** Planes: propuesta editorial por aprobar. Precio NULL = «pendiente de definición». */
const PLANS = [
  { id: 'explorador-gratis', name: 'Explorador Gratis', audience: 'traveler',
    description: 'Para descubrir el Ecuador que se vive. Propuesta editorial pendiente de aprobación.',
    features: ['Descubrimiento de experiencias y Cultura Viva', 'Favoritos', 'Pasaporte Guambra básico'] },
  { id: 'viajero-plus', name: 'Viajero Plus', audience: 'traveler',
    description: 'Herramientas avanzadas de viaje. Propuesta editorial: beneficios y tarifa pendientes de definición.',
    features: ['Herramientas avanzadas de planificación', 'Experiencias digitales'] },
  { id: 'anfitrion-comunidad-negocio', name: 'Anfitrión Comunidad/Negocio', audience: 'host',
    description: 'Para comunidades, anfitriones y negocios locales. Propuesta editorial: condiciones y tarifa pendientes de definición.',
    features: ['Panel de anfitrión', 'Publicación de experiencias tras la verificación'] },
] as const;

const FAQS = [
  { id: 'que-es-chulla-vida', category: 'general', question: '¿Qué es CHULLA VIDA?',
    answer: 'Una plataforma para descubrir experiencias culturales y de naturaleza en Ecuador junto a anfitriones, comunidades y negocios locales. Por ahora funciona como guía editorial: las fichas son referenciales y todavía no se pueden comprar desde aquí.' },
  { id: 'puedo-reservar', category: 'reservas', question: '¿Puedo reservar y pagar desde la aplicación?',
    answer: 'Todavía no. Ninguna ficha del catálogo tiene la reserva habilitada. Se activará únicamente cuando el operador esté verificado, el precio esté confirmado y la pasarela de pagos esté contratada y probada.' },
  { id: 'precios-referenciales', category: 'reservas', question: '¿Los precios que veo son definitivos?',
    answer: 'No. Son valores referenciales o propuestos, tomados de los catálogos de origen y mostrados en su moneda original. Pueden cambiar por temporada, operador y tamaño del grupo; confírmalos antes de armar tu presupuesto.' },
  { id: 'verificacion-anfitriones', category: 'confianza', question: '¿Qué significa que un anfitrión esté verificado?',
    answer: 'Que una persona del equipo revisó su identidad y su documentación. «Registro turístico oficial verificado» es un distintivo aparte y solo aparece cuando existe evidencia de ese registro. Ninguno de los dos implica un aval del Gobierno. Las fichas importadas de los catálogos todavía no tienen un operador verificado.' },
  { id: 'viajar-con-mascota', category: 'chulla-pet', question: '¿Puedo viajar con mi mascota?',
    answer: 'Depende de cada lugar y de cada anfitrión. Si la ficha dice «No verificado», consulta las condiciones antes de ir. No sugerimos ingresar con mascotas a Galápagos ni a áreas protegidas donde la autoridad no lo permite.' },
  { id: 'sin-internet', category: 'offline', question: '¿Funciona sin internet?',
    answer: 'Sí, de forma limitada: puedes consultar lo que hayas descargado antes de salir. Sin conexión no se actualizan el clima, los avisos ni la disponibilidad, y MIJIN responde solo con el contenido descargado.' },
  { id: 'quien-es-mijin', category: 'mijin', question: '¿Quién es MIJIN?',
    answer: 'Es el asistente de CHULLA VIDA, tu pana de aventuras. Responde con la información del catálogo y de las fuentes que cita; cuando no tiene un dato confirmado, te lo dice en lugar de inventarlo. No reemplaza a las autoridades ni a los servicios de emergencia.' },
  { id: 'sellos-pasaporte-guambra', category: 'pasaporte', question: '¿Cómo consigo sellos en el Pasaporte Guambra?',
    answer: 'Puedes anotar tus visitas por tu cuenta; esas quedan como sellos autodeclarados. El sello de «visita verificada» se otorga únicamente después de una validación, por ejemplo una reserva completada con el anfitrión.' },
  { id: 'mis-datos-personales', category: 'privacidad', question: '¿Qué pasa con mis datos personales?',
    answer: 'Puedes pedir acceso, corrección o eliminación de tus datos y retirar tus consentimientos desde «Privacidad y cookies». Los textos legales de esta etapa son borradores pendientes de revisión jurídica.' },
] as const;

/* ───────────── Literales SQL ───────────── */

/** Cadena SQL estándar: comillas simples duplicadas; las barras invertidas quedan literales. */
export function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (value.includes('\u0000')) throw new Error('Una cadena con el carácter NUL no puede guardarse en PostgreSQL.');
  return `'${value.replace(/'/g, "''")}'`;
}
export function sqlNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  if (!Number.isFinite(value)) throw new Error(`Número no válido para SQL: ${value}`);
  return String(value);
}
export const sqlBoolean = (value: boolean): string => (value ? 'true' : 'false');
export const sqlJson = (value: unknown): string => `${sqlString(JSON.stringify(value ?? null))}::jsonb`;
export function sqlDate(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new Error(`Fecha no válida: ${value}`);
  return `${sqlString(day)}::date`;
}

export function slugify(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

type Row = Record<string, string>;

/** insert … on conflict (…) do update set … [where …]; una fila por sentencia. */
function upsert(table: string, row: Row, conflict: string, options: { keep?: string[]; where?: string } = {}): string {
  const columns = Object.keys(row);
  const keys = new Set(conflict.replace(/\bwhere\b.*$/i, '').split(',').map(part => part.trim()));
  const updatable = columns.filter(column => !keys.has(column) && !(options.keep ?? []).includes(column));
  const action = updatable.length
    ? `do update set ${updatable.map(column => `${column} = excluded.${column}`).join(', ')}${options.where ? ` where ${options.where}` : ''}`
    : 'do nothing';
  return `insert into public.${table} (${columns.join(', ')}) values (${columns.map(column => row[column]).join(', ')}) on conflict (${conflict}) ${action};`;
}

function assertValid(input: SeedInput): void {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const sourceIds = new Set(input.catalogSources.map(source => source.id));
  for (const experience of input.experiences) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(experience.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(experience.slug)) {
      throw new Error(`ID o slug no válido: ${experience.id} / ${experience.slug}`);
    }
    if (ids.has(experience.id) || slugs.has(experience.slug)) throw new Error(`ID o slug duplicado: ${experience.id}`);
    ids.add(experience.id);
    slugs.add(experience.slug);
    if (!sourceIds.has(experience.contentSourceId)) throw new Error(`Fuente desconocida en ${experience.id}: ${experience.contentSourceId}`);
    if ((experience.bookingEnabled as boolean) !== false) throw new Error(`${experience.id}: una ficha importada no puede llegar con reserva habilitada.`);
    if (experience.price.type === 'verified_offer') throw new Error(`${experience.id}: una oferta verificada no puede nacer de una importación.`);
    if (experience.operatorVerificationStatus !== 'unverified') throw new Error(`${experience.id}: la verificación del operador solo la registra una revisión humana.`);
    if (experience.petPolicy.status === 'confirmed_allowed' && !(experience.petPolicy.confirmedBy && experience.petPolicy.confirmedAt)) {
      throw new Error(`${experience.id}: «se aceptan mascotas» exige quién lo confirmó y cuándo.`);
    }
  }
  for (const source of input.catalogSources) {
    const count = input.experiences.filter(experience => experience.contentSourceId === source.id).length;
    if (count !== source.expectedCount) throw new Error(`La fuente ${source.id} declara ${source.expectedCount} fichas y el catálogo trae ${count}.`);
  }
  for (const event of input.culturalEvents) {
    for (const edition of event.editions) {
      if (edition.confirmation === 'confirmed_official' && !(edition.startDate && edition.sourceUrl)) {
        throw new Error(`${event.id} ${edition.year}: una edición confirmada exige fecha y fuente.`);
      }
    }
  }
}

export function buildSeedSql(input: SeedInput): string {
  assertValid(input);
  const { experiences, catalogSources, culturalEvents } = input;
  const cultureSource: CultureSourceInfo = input.cultureSource ?? {
    title: 'Calendario editorial de Cultura Viva',
    originalDocument: EDITORIAL_DOCUMENT,
    checkedAt: culturalEvents.map(event => event.lastCheckedAt).sort().at(-1) ?? EDITORIAL_CHECKED_AT,
  };
  const out: string[] = [];
  const section = (title: string) => out.push('', `-- ───────────── ${title} ─────────────`);

  out.push(
    '-- GENERADO por scripts/generate-seed.ts. No editar a mano: cambia el dominio y vuelve a generar.',
    '-- Aplicar después de TODAS las migraciones. Idempotente: puede ejecutarse varias veces.',
    `-- ${experiences.length} fichas editoriales (${catalogSources.map(source => `${source.id}: ${source.expectedCount}`).join(', ')}).`,
    `-- ${culturalEvents.length} festividades. Ninguna ficha es reservable y ningún operador está verificado.`,
    'begin;',
    'set local standard_conforming_strings = on;',
  );

  section('Regiones');
  REGIONS.forEach((region, index) => out.push(upsert('regions', {
    id: sqlString(region.id), name: sqlString(region.name), sort_order: sqlNumber(index + 1),
  }, 'id')));

  section('Provincias (solo las que aparecen en las fuentes)');
  const provinces = new Map<string, { name: string; region: RegionId }>();
  const addProvince = (name: string, region: RegionId) => {
    const clean = name.trim();
    if (clean && !provinces.has(slugify(clean))) provinces.set(slugify(clean), { name: clean, region });
  };
  experiences.forEach(experience => addProvince(experience.province, experience.localizedRegion));
  culturalEvents.forEach(event => event.provinces.forEach(province => addProvince(province, event.region)));
  for (const [id, province] of provinces) {
    out.push(upsert('provinces', { id: sqlString(id), name: sqlString(province.name), region_id: sqlString(province.region) }, 'id'));
  }

  section('Fuentes de conocimiento');
  for (const source of catalogSources) {
    out.push(upsert('knowledge_sources', {
      id: sqlString(source.id), title: sqlString(source.title), kind: sqlString('catalog'),
      original_document: sqlString(source.originalDocument), checked_at: sqlDate(source.checkedAt),
      expected_count: sqlNumber(source.expectedCount), notes: sqlJson(source.notes), status: sqlString('published'),
    }, 'id'));
  }
  out.push(upsert('knowledge_sources', {
    id: sqlString(CULTURE_SOURCE_ID), title: sqlString(cultureSource.title), kind: sqlString('editorial'),
    original_document: sqlString(cultureSource.originalDocument), checked_at: sqlDate(cultureSource.checkedAt),
    expected_count: sqlNumber(culturalEvents.length), notes: sqlJson(cultureSource.notice ? [cultureSource.notice] : []),
    status: sqlString('published'),
  }, 'id'));
  out.push(upsert('knowledge_sources', {
    id: sqlString(EDITORIAL_SOURCE_ID), title: sqlString('Contenido editorial de CHULLA VIDA'), kind: sqlString('editorial'),
    original_document: sqlString(EDITORIAL_DOCUMENT), checked_at: sqlDate(EDITORIAL_CHECKED_AT),
    expected_count: 'null', notes: sqlJson(['Preguntas frecuentes y planes: propuesta editorial pendiente de aprobación.']),
    status: sqlString('published'),
  }, 'id'));

  section('Experiencias (referenciales; booking_enabled siempre false)');
  // Una ficha que el equipo ya convirtió en oferta reservable no se pisa desde la importación.
  const editorialOnly = 'not public.experiences.booking_enabled';
  for (const experience of experiences) {
    const provinceId = experience.province.trim() ? slugify(experience.province) : null;
    out.push(upsert('experiences', {
      id: sqlString(experience.id),
      slug: sqlString(experience.slug),
      content_source_id: sqlString(experience.contentSourceId),
      original_document: sqlString(experience.originalDocument),
      source_order: sqlNumber(experience.sourceOrder),
      source_text: sqlString(experience.sourceText),
      content_version: sqlString(experience.contentVersion),
      source_checked_at: sqlDate(experience.sourceCheckedAt),
      title: sqlString(experience.title),
      experience_name: sqlString(experience.experienceName),
      kind: sqlString(experience.kind),
      localized_region: sqlString(experience.localizedRegion),
      subregion: sqlString(experience.subregion),
      province: sqlString(experience.province),
      province_id: sqlString(provinceId),
      locality: sqlString(experience.locality),
      meeting_point: sqlString(experience.meetingPoint),
      geospatial_coordinates_verified: sqlBoolean(experience.geospatialCoordinatesVerified),
      weather_reference: experience.weatherReference ? sqlJson(experience.weatherReference) : 'null',
      duration_label: sqlString(experience.duration.label),
      duration_min_hours: sqlNumber(experience.duration.minHours),
      duration_max_hours: sqlNumber(experience.duration.maxHours),
      duration_days: sqlNumber(experience.duration.days),
      duration_nights: sqlNumber(experience.duration.nights),
      difficulty: sqlString(experience.difficulty),
      difficulty_label: sqlString(experience.difficultyLabel),
      capacity_max: sqlNumber(experience.capacity.max),
      capacity_label: sqlString(experience.capacity.label),
      summary: sqlString(experience.summary),
      description: sqlString(experience.description),
      context: sqlString(experience.context),
      attractions: sqlJson(experience.attractions),
      activities: sqlJson(experience.activities),
      itinerary: sqlJson(experience.itinerary),
      recommendations: sqlJson(experience.recommendations),
      conditions: sqlJson(experience.conditions),
      warnings: sqlJson(experience.warnings),
      activity_constraints: sqlJson(experience.activityConstraints),
      location_info: experience.locationInfo ? sqlJson(experience.locationInfo) : 'null',
      price_type: sqlString(experience.price.type),
      original_price_currency: sqlString(experience.price.currency),
      price_min: sqlNumber(experience.price.min),
      price_max: sqlNumber(experience.price.max),
      price_unit: sqlString(experience.price.unit),
      price_original_label: sqlString(experience.price.originalLabel),
      price_includes: sqlJson(experience.price.includes),
      price_excludes: sqlJson(experience.price.excludes),
      pricing_assumptions: sqlJson(experience.price.assumptions),
      price_group_breakdown: sqlJson(experience.price.groupBreakdown ?? []),
      price_separate_costs: sqlJson(experience.price.separateCosts ?? []),
      price_options: sqlJson(experience.price.options ?? []),
      access_status: sqlString(experience.accessStatus),
      access_checked_at: sqlDate(experience.accessCheckedAt),
      operator_verification_status: sqlString('unverified'),
      verified_by: sqlString(experience.verifiedBy),
      booking_enabled: 'false',
      editorial_status: sqlString(experience.editorialStatus),
      status: sqlString('published'),
    }, 'id', { keep: ['operator_verification_status', 'booking_enabled', 'status'], where: editorialOnly }));
  }

  section('Inclusiones y exclusiones');
  const inclusionCounts: string[] = [];
  for (const experience of experiences) {
    for (const [kind, labels] of [['include', experience.price.includes], ['exclude', experience.price.excludes]] as const) {
      labels.forEach((label, index) => out.push(upsert('experience_inclusions', {
        experience_id: sqlString(experience.id), kind: sqlString(kind), sort_order: sqlNumber(index), label: sqlString(label),
      }, 'experience_id, kind, sort_order')));
      inclusionCounts.push(`(${sqlString(experience.id)}, ${sqlString(kind)}, ${labels.length})`);
    }
  }
  if (inclusionCounts.length) {
    out.push(`delete from public.experience_inclusions i using (values ${inclusionCounts.join(', ')}) as v(experience_id, kind, total) where i.experience_id = v.experience_id and i.kind = v.kind and i.sort_order >= v.total;`);
  }

  section('Etiquetas');
  const idList = `array[${experiences.map(experience => sqlString(experience.id)).join(', ')}]::text[]`;
  const tagPairs: string[] = [];
  for (const experience of experiences) {
    for (const tag of new Set(experience.tags.map(tag => tag.trim()).filter(Boolean))) {
      out.push(upsert('experience_tags', { experience_id: sqlString(experience.id), tag: sqlString(tag) }, 'experience_id, tag'));
      tagPairs.push(`(${sqlString(experience.id)}, ${sqlString(tag)})`);
    }
  }
  if (experiences.length) {
    out.push(tagPairs.length
      ? `delete from public.experience_tags t where t.experience_id = any(${idList}) and not exists (select 1 from (values ${tagPairs.join(', ')}) as v(experience_id, tag) where v.experience_id = t.experience_id and v.tag = t.tag);`
      : `delete from public.experience_tags t where t.experience_id = any(${idList});`);
  }

  section('Imágenes (solo las que la fuente trae con crédito y licencia)');
  const mediaCounts: string[] = [];
  for (const experience of experiences) {
    experience.media.forEach((media, index) => out.push(upsert('experience_media', {
      experience_id: sqlString(experience.id), sort_order: sqlNumber(index), src: sqlString(media.src), alt: sqlString(media.alt),
      credit: sqlString(media.credit), license: sqlString(media.license), depicts_this_place: sqlBoolean(media.depictsThisPlace),
    }, 'experience_id, sort_order')));
    mediaCounts.push(`(${sqlString(experience.id)}, ${experience.media.length})`);
  }
  if (mediaCounts.length) {
    out.push(`delete from public.experience_media m using (values ${mediaCounts.join(', ')}) as v(experience_id, total) where m.experience_id = v.experience_id and m.sort_order >= v.total;`);
  }

  section('Chulla Pet y conectividad');
  const connectivityPairs: string[] = [];
  for (const experience of experiences) {
    const pet = experience.petPolicy;
    out.push(upsert('pet_policies', {
      experience_id: sqlString(experience.id), status: sqlString(pet.status), note: sqlString(pet.note),
      species: sqlJson(pet.species), max_size: sqlString(pet.maxSize), max_count: sqlNumber(pet.maxCount),
      requirements: sqlJson(pet.requirements), fee_amount: sqlNumber(pet.fee?.amount ?? null),
      fee_currency: sqlString(pet.fee?.currency ?? null), confirmed_by: sqlString(pet.confirmedBy), confirmed_at: sqlDate(pet.confirmedAt),
    }, 'experience_id'));
    for (const tag of experience.connectivity) {
      const verified = Boolean(tag.verifiedBy && tag.verifiedAt);
      out.push(upsert('connectivity_tags', {
        experience_id: sqlString(experience.id), tag: sqlString(tag.id),
        verified_by: verified ? sqlString(tag.verifiedBy) : 'null', verified_at: verified ? sqlDate(tag.verifiedAt) : 'null',
      }, 'experience_id, tag'));
      connectivityPairs.push(`(${sqlString(experience.id)}, ${sqlString(tag.id)})`);
    }
  }
  if (experiences.length) {
    out.push(connectivityPairs.length
      ? `delete from public.connectivity_tags t where t.experience_id = any(${idList}) and not exists (select 1 from (values ${connectivityPairs.join(', ')}) as v(experience_id, tag) where v.experience_id = t.experience_id and v.tag = t.tag);`
      : `delete from public.connectivity_tags t where t.experience_id = any(${idList});`);
  }

  section('Cultura Viva: festividades, ediciones, fuentes y protocolos');
  const knownExperiences = new Set(experiences.map(experience => experience.id));
  const protocolCounts: string[] = [];
  const eventLinks: string[] = [];
  for (const event of culturalEvents) {
    out.push(upsert('events', {
      id: sqlString(event.id), slug: sqlString(event.slug), name: sqlString(event.name), local_name: sqlString(event.localName),
      category: sqlString(event.category), region_id: sqlString(event.region), provinces: sqlJson(event.provinces),
      localities: sqlJson(event.localities), community_label: sqlString(event.community), usual_months: sqlJson(event.usualMonths),
      date_label: sqlString(event.dateLabel), description: sqlString(event.description), sensitive: sqlBoolean(event.sensitive),
      official_url: sqlString(event.officialUrl), last_checked_at: sqlDate(event.lastCheckedAt), status: sqlString('published'),
    }, 'id', { keep: ['status'] }));
    for (const edition of event.editions) {
      out.push(upsert('event_editions', {
        event_id: sqlString(event.id), year: sqlNumber(edition.year), start_date: sqlDate(edition.startDate), end_date: sqlDate(edition.endDate),
        confirmation: sqlString(edition.confirmation), source_url: sqlString(edition.sourceUrl), checked_at: sqlDate(edition.checkedAt),
      }, 'event_id, year'));
    }
    out.push(upsert('event_sources', {
      event_id: sqlString(event.id), source_id: sqlString(CULTURE_SOURCE_ID), title: sqlString(cultureSource.title),
      url: sqlString(event.officialUrl), original_document: sqlString(cultureSource.originalDocument),
      checked_at: sqlDate(event.lastCheckedAt), note: sqlString(cultureSource.notice ?? null),
    }, 'event_id, title'));
    event.protocols.forEach((protocol, index) => out.push(upsert('cultural_protocols', {
      event_id: sqlString(event.id), sort_order: sqlNumber(index), body: sqlString(protocol),
    }, 'event_id, sort_order) where (event_id is not null')));
    protocolCounts.push(`(${sqlString(event.id)}, ${event.protocols.length})`);
    for (const experienceId of event.relatedExperienceIds) {
      // Un vínculo a una ficha que no existe en el catálogo no se inventa: se omite.
      if (!knownExperiences.has(experienceId)) continue;
      out.push(upsert('event_experiences', { event_id: sqlString(event.id), experience_id: sqlString(experienceId) }, 'event_id, experience_id'));
      eventLinks.push(`(${sqlString(event.id)}, ${sqlString(experienceId)})`);
    }
  }
  if (protocolCounts.length) {
    out.push(`delete from public.cultural_protocols p using (values ${protocolCounts.join(', ')}) as v(event_id, total) where p.event_id = v.event_id and p.sort_order >= v.total;`);
    const eventIds = `array[${culturalEvents.map(event => sqlString(event.id)).join(', ')}]::text[]`;
    out.push(eventLinks.length
      ? `delete from public.event_experiences l where l.event_id = any(${eventIds}) and not exists (select 1 from (values ${eventLinks.join(', ')}) as v(event_id, experience_id) where v.event_id = l.event_id and v.experience_id = l.experience_id);`
      : `delete from public.event_experiences l where l.event_id = any(${eventIds});`);
  }

  section('Planes (propuesta editorial; precio NULL = pendiente de definición)');
  PLANS.forEach((plan, index) => out.push(upsert('plans', {
    id: sqlString(plan.id), name: sqlString(plan.name), audience: sqlString(plan.audience), description: sqlString(plan.description),
    features: sqlJson(plan.features), price_amount: 'null', price_currency: 'null', billing_interval: 'null',
    price_status: sqlString('pending_definition'), is_editorial_proposal: 'true', sort_order: sqlNumber(index + 1), status: sqlString('published'),
  }, 'id', {
    // Si el negocio ya aprobó una tarifa, la semilla no la devuelve a «pendiente».
    keep: ['price_amount', 'price_currency', 'billing_interval', 'price_status', 'is_editorial_proposal', 'status'],
  })));

  section('Preguntas frecuentes base');
  FAQS.forEach((faq, index) => out.push(upsert('faq_entries', {
    id: sqlString(faq.id), category: sqlString(faq.category), question: sqlString(faq.question), answer: sqlString(faq.answer),
    sort_order: sqlNumber(index + 1), source_id: sqlString(EDITORIAL_SOURCE_ID), checked_at: sqlDate(EDITORIAL_CHECKED_AT),
    status: sqlString('published'), published_at: `${sqlString(EDITORIAL_CHECKED_AT)}::timestamptz`,
  }, 'id', { keep: ['status', 'published_at'] })));

  out.push('', 'commit;', '');
  return out.join('\n');
}

/** Lee los módulos del dominio aceptando las dos convenciones de nombre de exportación. */
export function loadDomain(): SeedInput {
  const catalog = catalogModule as unknown as Record<string, unknown>;
  const culture = cultureModule as unknown as Record<string, unknown>;
  const pick = <T>(module: Record<string, unknown>, names: string[], label: string): T => {
    for (const name of names) if (module[name] !== undefined) return module[name] as T;
    throw new Error(`No se encontró la exportación ${label} (${names.join(' / ')}).`);
  };
  return {
    experiences: pick<Experience[]>(catalog, ['EXPERIENCES', 'experiences'], 'de experiencias'),
    catalogSources: pick<CatalogSource[]>(catalog, ['CATALOG_SOURCES', 'catalogSources'], 'de fuentes del catálogo'),
    culturalEvents: pick<CulturalEvent[]>(culture, ['CULTURAL_EVENTS', 'culturalEvents'], 'de festividades'),
    cultureSource: (culture.CULTURE_SOURCE ?? culture.cultureSource) as CultureSourceInfo | undefined,
  };
}

export const SEED_OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed', 'seed.sql');

function main(): void {
  const sql = buildSeedSql(loadDomain());
  if (process.argv.includes('--check')) {
    const current = existsSync(SEED_OUTPUT) ? readFileSync(SEED_OUTPUT, 'utf8') : null;
    if (current !== sql) {
      console.error('supabase/seed/seed.sql no coincide con el dominio. Ejecuta: npx tsx scripts/generate-seed.ts');
      process.exit(1);
    }
    console.log('supabase/seed/seed.sql está al día.');
    return;
  }
  mkdirSync(dirname(SEED_OUTPUT), { recursive: true });
  writeFileSync(SEED_OUTPUT, sql, 'utf8');
  console.log(`Semilla escrita en ${SEED_OUTPUT} (${(Buffer.byteLength(sql) / 1024).toFixed(0)} KB).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
