import type { SupabaseClient } from '@supabase/supabase-js';

export type ReviewDecision = 'approved' | 'needs_changes' | 'rejected';
export type ReviewFilter = 'pending' | 'needs_changes' | 'resolved' | 'all';
export interface AdminOrganization { id: string; name: string; kind: string; owner_id: string; verification_status: string }
export interface AdminRequest {
  id: string; organization_id: string; applicant_id: string; status: string; created_at: string;
  applicant_note: string | null; appeal_note: string | null; organization: AdminOrganization | null;
}
export interface ReviewDocument { id: string; request_id: string; object_path: string; created_at: string }
export interface ReviewHistory { id: string; decision: string; note: string; registry_reference: string | null; created_at: string }
export interface ReviewDetail { documents: ReviewDocument[]; history: ReviewHistory[] }
export const PAGE_SIZE = 20;
export class AdminAccessError extends Error {
  constructor(public reason: 'signed_out' | 'denied' | 'unavailable') { super(reason); }
}

/** UX guard only: RLS and the review RPC enforce permissions on the server. */
export async function requireAdministrator(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at) throw new AdminAccessError('signed_out');
  const role = await client.rpc(data.user.app_metadata?.lane === 'staff' ? 'is_reviewer' : 'is_admin');
  if (role.error) throw new AdminAccessError('unavailable');
  if (role.data !== true) throw new AdminAccessError('denied');
  return data.user.id;
}

export async function loadAdminRequests(client: SupabaseClient, filter: ReviewFilter, page: number) {
  await requireAdministrator(client);
  let query = client.from('merchant_verification_requests').select(
    'id,organization_id,applicant_id,status,created_at,applicant_note,appeal_note,organization:organizations(id,name,kind,owner_id,verification_status)',
    { count: 'exact' },
  );
  if (filter === 'pending') query = query.in('status', ['submitted', 'in_review', 'appealed']);
  if (filter === 'needs_changes') query = query.eq('status', 'needs_changes');
  if (filter === 'resolved') query = query.in('status', ['approved', 'rejected', 'expired']);
  const start = Math.max(0, Math.floor(page)) * PAGE_SIZE;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, start + PAGE_SIZE - 1);
  if (error) throw new AdminAccessError('unavailable');
  return { rows: (data ?? []).map(row => ({ ...row, organization: Array.isArray(row.organization) ? row.organization[0] ?? null : row.organization })) as AdminRequest[], count: count ?? 0 };
}

export async function loadReviewDetail(client: SupabaseClient, requestId: string): Promise<ReviewDetail> {
  await requireAdministrator(client);
  const [documents, history] = await Promise.all([
    client.from('verification_documents').select('id,request_id,object_path,created_at').eq('request_id', requestId).order('created_at').limit(100),
    client.from('verification_reviews').select('id,decision,note,registry_reference,created_at').eq('request_id', requestId).order('created_at', { ascending: false }).limit(100),
  ]);
  if (documents.error || history.error) throw new AdminAccessError('unavailable');
  return { documents: (documents.data ?? []) as ReviewDocument[], history: (history.data ?? []) as ReviewHistory[] };
}

export async function privateDocumentLink(client: SupabaseClient, document: ReviewDocument): Promise<string> {
  await requireAdministrator(client);
  const { data, error } = await client.storage.from('merchant-verification').createSignedUrl(document.object_path, 60);
  if (error || !data?.signedUrl || new URL(data.signedUrl).protocol !== 'https:') throw new AdminAccessError('unavailable');
  return data.signedUrl;
}

export async function decideRequest(client: SupabaseClient, actorId: string, request: AdminRequest, values: {
  decision: ReviewDecision; note: string; checklist: Record<string, boolean>; registryReference?: string;
}): Promise<void> {
  const current = await requireAdministrator(client);
  if (current !== actorId || request.applicant_id === current || request.organization?.owner_id === current) throw new AdminAccessError('denied');
  if (!['submitted', 'in_review', 'appealed'].includes(request.status) || values.note.trim().length < 5 || values.note.length > 2000) throw new AdminAccessError('unavailable');
  if (values.decision === 'approved' && !['identity', 'representation', 'documents'].every(key => values.checklist[key] === true)) throw new AdminAccessError('unavailable');
  const { error } = await client.rpc('review_verification_request', {
    p_request_id: request.id, p_decision: values.decision, p_note: values.note.trim(), p_checklist: values.checklist,
    p_registry_reference: values.decision === 'approved' ? values.registryReference?.trim() || null : null, p_valid_until: null,
  });
  if (error) throw new AdminAccessError('unavailable');
}
