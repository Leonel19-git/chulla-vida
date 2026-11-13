-- A draft acknowledgement must never prevent the later formal acceptance of that version.
-- Preserve both immutable records, with their original hashes, timestamps and methods.
begin;
alter table public.legal_acceptances
  drop constraint legal_acceptances_user_id_document_version_id_key,
  add constraint legal_acceptances_user_version_kind_key unique (user_id, document_version_id, is_draft_acknowledgement);

create or replace function public.accept_legal_document(p_document_version_id uuid, p_method text default 'settings') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_version public.legal_document_versions; v_doc public.legal_documents; v_id uuid; v_draft boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_version from public.legal_document_versions where id = p_document_version_id for share;
  if not found or v_version.status = 'superseded' then raise exception 'Document version not available'; end if;
  if v_version.status = 'published' and v_version.effective_from > current_date then raise exception 'Document version is not effective yet'; end if;
  select * into v_doc from public.legal_documents where id = v_version.document_id;
  v_draft := v_version.status <> 'published';
  insert into public.legal_acceptances(user_id, document_version_id, content_hash, is_draft_acknowledgement, method)
  values (auth.uid(), p_document_version_id, v_version.content_hash, v_draft, p_method)
  on conflict (user_id, document_version_id, is_draft_acknowledgement) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.legal_acceptances
      where user_id = auth.uid() and document_version_id = p_document_version_id and is_draft_acknowledgement = v_draft;
  elsif v_doc.kind = 'terms' and not v_draft then
    update public.profiles set terms_accepted_version = v_version.version, terms_accepted_at = now() where id = auth.uid();
  end if;
  return v_id;
end;
$$;
revoke all on function public.accept_legal_document(uuid,text) from public,anon,authenticated;
grant execute on function public.accept_legal_document(uuid,text) to authenticated,service_role;
commit;
