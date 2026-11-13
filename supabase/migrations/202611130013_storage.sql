-- CHULLA VIDA 3.0 · Storage buckets and object policies.
--   media-public       PUBLIC. Supabase serves public buckets without checking RLS, so nothing is
--                      uploaded here by clients: staff copies a file in only after it was approved
--                      with credit, licence and permission (public.media_assets).
--   media-uploads      private staging for uploads waiting for review:  <user id>/<file>
--   verification-docs  private:  <organization id>/<user id>/<file>   (owner org + reviewers)
--   journal-private    private:  <user id>/<file>                     (owner only, no staff)
-- The earlier bucket 'merchant-verification' (202611130002) keeps working for the current client.
begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('media-public', 'media-public', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']),
  ('media-uploads', 'media-uploads', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']),
  ('verification-docs', 'verification-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png']),
  ('journal-private', 'journal-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- media-public: listing through the API only shows approved media; writes are staff only.
create policy media_public_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'media-public'
  and exists(select 1 from public.media_assets m where m.bucket = 'media-public' and m.storage_path = storage.objects.name and m.status = 'approved'));
create policy media_public_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media-public' and public.is_moderator());
create policy media_public_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media-public' and public.is_moderator()) with check (bucket_id = 'media-public' and public.is_moderator());
create policy media_public_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media-public' and public.is_moderator());

-- media-uploads: each person in their own folder; moderators read to review.
create policy media_uploads_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_uploads_read on storage.objects for select to authenticated
  using (bucket_id = 'media-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));
create policy media_uploads_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()));

-- verification-docs: upload only into your organization's folder and under your own id.
-- No client update or delete: retention is handled by staff with the service role.
create policy verification_docs_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'verification-docs'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists(select 1 from public.organization_members m
             where m.organization_id::text = (storage.foldername(storage.objects.name))[1] and m.user_id = auth.uid()
               and m.status = 'active' and m.role in ('owner', 'manager', 'community_representative')));
create policy verification_docs_read on storage.objects for select to authenticated using (
  bucket_id = 'verification-docs'
  and (public.is_reviewer()
       or exists(select 1 from public.organization_members m
                 where m.organization_id::text = (storage.foldername(storage.objects.name))[1] and m.user_id = auth.uid()
                   and m.status = 'active' and m.role in ('owner', 'manager', 'community_representative'))));

-- journal-private: the owner and nobody else.
create policy journal_private_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'journal-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy journal_private_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'journal-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy journal_private_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'journal-private' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'journal-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy journal_private_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'journal-private' and (storage.foldername(name))[1] = auth.uid()::text);
commit;
