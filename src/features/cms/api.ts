import { experiences, getExperienceById, type Experience } from '../../domain/catalog';
import { applyEditorialFields, fieldsFromPublicRecord, isEditorialDraft, type EditorialDraft } from '../../domain/editorial';
import { getSupabase } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BusinessExperience {
  id: string; organization_id: string; title: string; summary: string; description: string;
  status: 'draft' | 'published' | 'archived'; booking_enabled: boolean; updated_at: string;
}
/** Only these application-authored errors may be displayed by the connected editor. */
export class EditorialServiceError extends Error {}
const BUSINESS_COLUMNS = 'id,organization_id,title,summary,description,status,booking_enabled,updated_at';
export async function loadBusinessExperiences(client: SupabaseClient, organizationIds: string[]): Promise<BusinessExperience[]> {
  if (!organizationIds.length) return [];
  const { data, error } = await client.from('experiences').select(BUSINESS_COLUMNS).in('organization_id', organizationIds);
  if (error || !Array.isArray(data)) throw new Error('No se pudieron cargar las experiencias.');
  return (data as BusinessExperience[]).filter(item => organizationIds.includes(item.organization_id));
}
/** Whitelist, organization scope and version condition; existing RLS/experiences_guard enforce ownership and publication. */
export async function saveBusinessExperience(client: SupabaseClient, draft: BusinessExperience): Promise<BusinessExperience> {
  if (draft.status !== 'draft' || draft.booking_enabled || draft.title.trim().length < 2 || draft.title.trim().length > 200
    || draft.summary.length > 1200 || draft.description.length > 20000) throw new Error('Revisa el borrador.');
  const { data, error } = await client.from('experiences').update({ title: draft.title.trim(), summary: draft.summary.trim(), description: draft.description.trim() })
    .eq('id', draft.id).eq('organization_id', draft.organization_id).eq('updated_at', draft.updated_at)
    .eq('status', 'draft').eq('booking_enabled', false).select(BUSINESS_COLUMNS).maybeSingle();
  if (error || !data) throw new Error('No se pudo guardar. Recarga la ficha y comprueba tus permisos.');
  return data as BusinessExperience;
}

const LOCAL_KEY = 'chullavida:editorial-drafts:v1';
export function readLocalEditorialDrafts(): EditorialDraft[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw || raw.length > 5000000) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isEditorialDraft).filter(item => getExperienceById(item.experienceId)).slice(0, 100) : [];
  } catch { return []; }
}
export function saveLocalEditorialDraft(draft: EditorialDraft): void {
  if (!isEditorialDraft(draft) || !getExperienceById(draft.experienceId)) throw new Error('El borrador no es válido.');
  const records = [draft, ...readLocalEditorialDrafts().filter(item => item.experienceId !== draft.experienceId)].slice(0, 100);
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(records)); }
  catch { throw new Error('El navegador no pudo guardar. Exporta el JSON para conservar el borrador.'); }
}
export interface ConnectedDraft {
  experience_id: string;
  revision: number;
  content: Experience;
  source_note: string;
  status: 'in_review' | 'changes_requested' | 'ready_for_legal';
  base_catalog_updated_at: string;
  updated_at: string;
}
/** Only published, validated data is returned; private review drafts are queried separately after an admin check. */
export async function readPublishedCatalog(): Promise<Experience[]> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('catalog_experiences').select('id,data').eq('published', true).limit(500);
  if (error) throw new Error('No se pudo cargar el catálogo publicado. Se conserva la fuente local.');
  return (data ?? []).flatMap(row => {
    const canonical = experiences.find(item => item.id === row.id);
    if (!canonical) return [];
    const fields = fieldsFromPublicRecord(row.data, canonical);
    return fields ? [applyEditorialFields(canonical, fields)] : [];
  });
}
export async function loadConnectedDraft(id: string): Promise<{ draft: ConnectedDraft | null; catalogUpdatedAt: string }> {
  const client = getSupabase();
  if (!client) throw new EditorialServiceError('Supabase no está configurado.');
  const admin = await client.rpc('is_admin');
  if (admin.error || admin.data !== true) throw new EditorialServiceError('Hace falta una cuenta administradora autorizada.');
  const [catalog, draft] = await Promise.all([
    client.from('catalog_experiences').select('updated_at').eq('id', id).single(),
    client.from('editorial_drafts').select('experience_id,revision,content,source_note,status,base_catalog_updated_at,updated_at').eq('experience_id', id).maybeSingle(),
  ]);
  if (catalog.error || draft.error) throw new EditorialServiceError('No se pudo leer la revisión. Comprueba las migraciones y tu conexión.');
  return { draft: draft.data as ConnectedDraft | null, catalogUpdatedAt: catalog.data.updated_at };
}
export async function saveConnectedDraft(draft: EditorialDraft, expectedCatalogUpdatedAt: string, expectedRevision: number): Promise<ConnectedDraft> {
  const client = getSupabase(); if (!client) throw new EditorialServiceError('Supabase no está configurado.');
  const { fields } = draft;
  const { data, error } = await client.rpc('save_editorial_draft', { p_experience_id: draft.experienceId,
    p_patch: { title: fields.title, summary: fields.summary, description: fields.description, activities: fields.activities, price: fields.price,
      sourceCheckedAt: fields.sourceCheckedAt, locationInfo: { accessSummary: fields.accessSummary, transportOptions: fields.transportOptions } },
    p_source_note: draft.sourceNote, p_expected_revision: expectedRevision, p_expected_catalog_updated_at: expectedCatalogUpdatedAt });
  if (error) throw new EditorialServiceError(error.code === '40001' ? 'Otra persona cambió la ficha o el borrador. Recarga la revisión antes de guardar; tu borrador local permanece.' : 'No se pudo guardar la revisión. Comprueba permisos, migraciones y conexión.');
  return data as ConnectedDraft;
}
