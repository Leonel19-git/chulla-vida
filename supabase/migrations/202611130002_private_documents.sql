begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('merchant-verification', 'merchant-verification', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Object paths: <organization UUID>/<applicant UUID>/<random UUID>.<extension>.
-- A public URL cannot retrieve these objects. Signed links must remain short lived.
create policy merchant_document_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'merchant-verification'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists(select 1 from public.organizations o where o.id::text = (storage.foldername(storage.objects.name))[1] and o.owner_id = auth.uid())
  and exists(select 1 from public.merchant_verification_requests r where r.organization_id::text = (storage.foldername(storage.objects.name))[1] and r.applicant_id = auth.uid() and r.status = 'submitted')
);
create policy merchant_document_read on storage.objects for select to authenticated using (
  bucket_id = 'merchant-verification'
  and (public.is_admin() or exists(select 1 from public.organizations o where o.id::text = (storage.foldername(storage.objects.name))[1] and o.owner_id = auth.uid()))
);
-- No overwrite or client delete: staff retention review handles destruction.
create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.merchant_verification_requests(id),
  uploaded_by uuid not null references auth.users(id),
  object_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.verification_documents enable row level security;
create policy own_verification_documents on public.verification_documents for select to authenticated using (
  public.is_admin() or exists(select 1 from public.merchant_verification_requests r where r.id = request_id and r.applicant_id = auth.uid())
);
create policy register_own_verification_document on public.verification_documents for insert to authenticated with check (
  uploaded_by = auth.uid()
  and exists(select 1 from public.merchant_verification_requests r where r.id = request_id and r.applicant_id = auth.uid() and r.status = 'submitted' and split_part(object_path, '/', 1) = r.organization_id::text and split_part(object_path, '/', 2) = auth.uid()::text)
  and exists(select 1 from storage.objects o where o.bucket_id = 'merchant-verification' and o.name = object_path)
);
revoke all on public.verification_documents from anon, authenticated;
grant select on public.verification_documents to authenticated;
grant insert(request_id, uploaded_by, object_path) on public.verification_documents to authenticated;
grant all on public.verification_documents to service_role;
commit;
