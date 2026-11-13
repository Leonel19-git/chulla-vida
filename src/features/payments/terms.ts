import { getSupabase } from '../../lib/supabase';

export interface ApprovedCheckoutTerms {
  id: string;
  documentId: string;
  kind: 'terms';
  title: string;
  version: string;
  content: string;
  hash: string;
  approvedAt: string;
  publishedAt: string;
  effectiveFrom: string | null;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const instant = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function ecuadorToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Only a single current public, published terms document can authorize this checkout. */
export async function loadCheckoutTerms(now = new Date()): Promise<ApprovedCheckoutTerms | null> {
  const client = getSupabase();
  if (!client) throw new Error('Conecta tu cuenta para consultar los términos aprobados del pago.');
  const today = ecuadorToday(now);
  const { data, error } = await client.from('legal_document_versions')
    .select('id,document_id,version,content,content_hash,status,has_pending_placeholders,reviewed_by_counsel,approved_at,published_at,effective_from,legal_documents!inner(id,title,kind,audience)')
    .eq('status', 'published').eq('has_pending_placeholders', false).eq('legal_documents.kind', 'terms').eq('legal_documents.audience', 'public')
    .or(`effective_from.is.null,effective_from.lte.${today}`).order('published_at', { ascending: false }).order('id', { ascending: true }).limit(2);
  if (error || !Array.isArray(data)) throw new Error('No se pudieron cargar los términos aprobados. Vuelve a consultar antes de pagar.');
  if (!data.length) return null;
  if (data.length !== 1) throw new Error('Hay más de un documento de términos vigente. El equipo debe resolver cuál corresponde antes de habilitar el pago.');
  const row = object(data[0]);
  const document = object(Array.isArray(row.legal_documents) ? row.legal_documents.length === 1 ? row.legal_documents[0] : null : row.legal_documents);
  const effective = row.effective_from;
  if (!text(row.id, 36) || !uuid.test(row.id) || !text(row.document_id, 200) || document.id !== row.document_id || document.kind !== 'terms' || document.audience !== 'public'
    || !text(document.title, 300) || !text(row.version, 100) || !text(row.content, 1000000) || !text(row.content_hash, 64) || !/^[0-9a-f]{64}$/.test(row.content_hash)
    || row.status !== 'published' || row.has_pending_placeholders !== false || !text(row.reviewed_by_counsel, 500) || !instant(row.approved_at) || !instant(row.published_at)
    || /\[\s*(PENDIENTE|RAZ[ÓO]N SOCIAL|COMPLETAR)/i.test(row.content)
    || !(effective === null || typeof effective === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(effective) && Number.isFinite(Date.parse(effective)) && new Date(effective).toISOString().slice(0, 10) === effective && effective <= today)) {
    throw new Error('No se pudo verificar una versión pública aprobada y vigente de los términos. Vuelve a consultar antes de pagar.');
  }
  return { id: row.id, documentId: row.document_id, kind: 'terms', title: document.title, version: row.version, content: row.content, hash: row.content_hash, approvedAt: row.approved_at, publishedAt: row.published_at, effectiveFrom: effective };
}

/** A draft acknowledgement or a changed version cannot satisfy this action. The RPC is idempotent per user/version. */
export async function acceptCheckoutTerms(terms: ApprovedCheckoutTerms): Promise<void> {
  const current = await loadCheckoutTerms();
  if (!current || current.id !== terms.id || current.documentId !== terms.documentId || current.version !== terms.version || current.hash !== terms.hash || current.content !== terms.content) {
    throw new Error('Los términos cambiaron o dejaron de estar vigentes. Carga la versión actual y léela antes de aceptar.');
  }
  const client = getSupabase();
  if (!client) throw new Error('Vuelve a iniciar sesión para registrar la aceptación.');
  const { data, error } = await client.rpc('accept_legal_document', { p_document_version_id: current.id, p_method: 'checkout' });
  if (error || typeof data !== 'string' || !uuid.test(data)) throw new Error('No se pudo registrar la aceptación. Vuelve a consultar; el pago permanece bloqueado.');
}
