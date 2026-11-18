begin;
-- Applicants may add evidence while addressing staff feedback, still only in their own scope.
alter policy merchant_document_upload on storage.objects with check (
  bucket_id = 'merchant-verification'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists(select 1 from public.organizations o where o.id::text = (storage.foldername(storage.objects.name))[1] and o.owner_id = auth.uid())
  and exists(select 1 from public.merchant_verification_requests r where r.organization_id::text = (storage.foldername(storage.objects.name))[1] and r.applicant_id = auth.uid() and r.status in ('submitted','needs_changes'))
);
alter policy register_own_verification_document on public.verification_documents with check (
  uploaded_by = auth.uid()
  and exists(select 1 from public.merchant_verification_requests r where r.id = request_id and r.applicant_id = auth.uid() and r.status in ('submitted','needs_changes') and split_part(object_path, '/', 1) = r.organization_id::text and split_part(object_path, '/', 2) = auth.uid()::text)
  and exists(select 1 from storage.objects o where o.bucket_id = 'merchant-verification' and o.name = object_path)
);
commit;
