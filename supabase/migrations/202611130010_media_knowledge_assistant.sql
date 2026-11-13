-- CHULLA VIDA 3.0 · Media with permissions, social links, reports, MIJIN knowledge base and sessions.
begin;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  experience_id text references public.experiences(id) on delete set null,
  bucket text not null check (bucket in ('media-uploads', 'media-public')),
  storage_path text not null,
  kind text not null check (kind in ('image', 'video', 'audio')),
  alt text not null default '',
  credit text,
  license text,
  depicts_identifiable_people boolean not null default false,
  -- Synthetic images are never presented as real people, places or testimonials.
  is_synthetic boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'removed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path),
  constraint media_assets_approved_needs_credit check (status <> 'approved' or (credit is not null and license is not null)),
  constraint media_assets_no_synthetic_people check (not (is_synthetic and depicts_identifiable_people))
);
create index media_assets_owner_idx on public.media_assets(owner_id);
create index media_assets_experience_idx on public.media_assets(experience_id);

alter table public.experience_media add column media_asset_id uuid references public.media_assets(id) on delete set null;

create table public.media_permissions (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  granted_by_name text not null,
  granted_by_user uuid references auth.users(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  scope text not null check (char_length(scope) between 3 and 500),
  evidence_path text,                      -- private document, never public
  status text not null default 'pending' check (status in ('pending', 'granted', 'revoked')),
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'granted' or granted_at is not null)
);
create index media_permissions_asset_idx on public.media_permissions(media_asset_id);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  experience_id text references public.experiences(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'facebook', 'whatsapp', 'website', 'other')),
  url text not null check (url ~ '^https://'),
  label text,
  -- true only after staff checked that the account belongs to the organization.
  verified boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review', 'published', 'hidden')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(organization_id, experience_id, community_id) >= 1)
);
create index social_links_org_idx on public.social_links(organization_id);
create index social_links_experience_idx on public.social_links(experience_id);

create table public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  experience_id text references public.experiences(id) on delete set null,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'upload')),
  url text check (url ~ '^https://'),
  media_asset_id uuid references public.media_assets(id) on delete set null,
  caption text check (char_length(caption) <= 1000),
  people_consent_declared boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (url is not null or media_asset_id is not null)
);
create index video_submissions_user_idx on public.video_submissions(submitted_by);
create index video_submissions_experience_idx on public.video_submissions(experience_id, status);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_table text not null check (target_table in ('experiences', 'events', 'reviews', 'media_assets', 'video_submissions',
    'organizations', 'communities', 'social_links', 'assistant_messages', 'route_alerts', 'other')),
  target_id text not null,
  reason text not null check (reason in ('incorrect_information', 'unsafe', 'disrespectful', 'no_consent', 'fraud', 'copyright', 'other')),
  detail text check (char_length(detail) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  handled_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_reports_status_idx on public.content_reports(status);

create table public.knowledge_documents (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source_id text not null references public.knowledge_sources(id),
  experience_id text references public.experiences(id) on delete cascade,
  event_id text references public.events(id) on delete cascade,
  title text not null,
  doc_type text not null check (doc_type in ('experience', 'event', 'faq', 'safety', 'policy', 'guide')),
  language text not null default 'es',
  content text not null,
  content_hash text not null,
  version text not null default '1',
  checked_at date not null,
  expires_at date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_documents_source_idx on public.knowledge_documents(source_id);

-- Retrieval uses PostgreSQL full-text search. Embeddings (pgvector) are a later, separate migration.
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  search tsvector generated always as (to_tsvector('spanish', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index knowledge_chunks_search_idx on public.knowledge_chunks using gin(search);

create table public.faq_entries (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  source_id text references public.knowledge_sources(id),
  checked_at date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audio is never stored. Text is kept only for sessions the person chose to save.
create table public.assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'text' check (channel in ('text', 'voice')),
  retention text not null default 'saved' check (retention in ('saved')),
  title text check (char_length(title) <= 200),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistant_sessions_user_idx on public.assistant_sessions(user_id);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assistant_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null check (char_length(content) <= 20000),
  tool_name text,
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  created_at timestamptz not null default now()
);
create index assistant_messages_session_idx on public.assistant_messages(session_id, created_at);

create table public.assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.assistant_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating in (-1, 1)),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

select public.secure_new_tables();

create function public.owns_assistant_session(p_session_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.assistant_sessions s where s.id = p_session_id and s.user_id = auth.uid());
$$;
revoke all on function public.owns_assistant_session(uuid) from public, anon, authenticated;
grant execute on function public.owns_assistant_session(uuid) to authenticated, service_role;

-- Uploaders describe their media; review status, bucket and publication are staff decisions.
create function public.media_assets_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    if tg_op = 'INSERT' and (new.status <> 'pending_review' or new.bucket <> 'media-uploads' or new.reviewed_by is not null or new.published_at is not null) then
      raise exception 'Media is published after review' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.bucket <> old.bucket or new.storage_path <> old.storage_path
        or new.reviewed_by is distinct from old.reviewed_by or new.published_at is distinct from old.published_at
        or new.owner_id is distinct from old.owner_id) then
      -- The owner may always withdraw their own media.
      if not (new.status = 'removed' and new.bucket = old.bucket and new.storage_path = old.storage_path and new.owner_id is not distinct from old.owner_id) then
        raise exception 'Media is published after review' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger media_assets_guard before insert or update on public.media_assets
for each row execute function public.media_assets_guard();

-- ───────────── Policies ─────────────
create policy media_assets_public_read on public.media_assets for select to anon, authenticated using (status = 'approved' and bucket = 'media-public');
create policy media_assets_owner_read on public.media_assets for select to authenticated
  using (owner_id = auth.uid() or public.is_moderator() or (organization_id is not null and public.is_org_member(organization_id)));
create policy media_assets_owner_insert on public.media_assets for insert to authenticated
  with check (owner_id = auth.uid() and (organization_id is null or public.is_org_member(organization_id)));
create policy media_assets_owner_update on public.media_assets for update to authenticated
  using (owner_id = auth.uid() or public.is_moderator()) with check (owner_id = auth.uid() or public.is_moderator());
grant select on public.media_assets to anon, authenticated;
grant insert, update on public.media_assets to authenticated;

create policy media_permissions_read on public.media_permissions for select to authenticated
  using (public.is_moderator() or exists(select 1 from public.media_assets m where m.id = media_asset_id and m.owner_id = auth.uid()));
create policy media_permissions_owner_insert on public.media_permissions for insert to authenticated
  with check (status = 'pending' and exists(select 1 from public.media_assets m where m.id = media_asset_id and m.owner_id = auth.uid()));
create policy media_permissions_staff_update on public.media_permissions for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant select, update on public.media_permissions to authenticated;
grant insert (media_asset_id, granted_by_name, granted_by_user, community_id, scope, evidence_path) on public.media_permissions to authenticated;

create policy social_links_public_read on public.social_links for select to anon, authenticated using (status = 'published');
create policy social_links_member_read on public.social_links for select to authenticated
  using (public.is_moderator() or (organization_id is not null and public.is_org_member(organization_id)));
create policy social_links_member_insert on public.social_links for insert to authenticated
  with check (created_by = auth.uid() and organization_id is not null and public.is_org_manager(organization_id));
create policy social_links_staff_update on public.social_links for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy social_links_member_delete on public.social_links for delete to authenticated
  using (public.is_moderator() or (organization_id is not null and public.is_org_manager(organization_id)));
grant select on public.social_links to anon, authenticated;
grant insert (organization_id, experience_id, community_id, platform, url, label, created_by) on public.social_links to authenticated;
grant update, delete on public.social_links to authenticated;

create policy video_submissions_public_read on public.video_submissions for select to anon, authenticated using (status = 'approved');
create policy video_submissions_owner_read on public.video_submissions for select to authenticated using (submitted_by = auth.uid() or public.is_moderator());
create policy video_submissions_owner_insert on public.video_submissions for insert to authenticated with check (submitted_by = auth.uid());
create policy video_submissions_owner_delete on public.video_submissions for delete to authenticated using (submitted_by = auth.uid());
create policy video_submissions_staff_update on public.video_submissions for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant select on public.video_submissions to anon, authenticated;
grant insert (submitted_by, experience_id, platform, url, media_asset_id, caption, people_consent_declared) on public.video_submissions to authenticated;
grant update, delete on public.video_submissions to authenticated;

create policy content_reports_reporter_read on public.content_reports for select to authenticated using (reporter_id = auth.uid() or public.is_moderator());
create policy content_reports_reporter_insert on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy content_reports_staff_update on public.content_reports for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant select, update on public.content_reports to authenticated;
grant insert (reporter_id, target_table, target_id, reason, detail) on public.content_reports to authenticated;

create policy knowledge_documents_public_read on public.knowledge_documents for select to anon, authenticated using (status = 'published');
create policy knowledge_chunks_public_read on public.knowledge_chunks for select to anon, authenticated
  using (exists(select 1 from public.knowledge_documents d where d.id = document_id));
create policy faq_entries_public_read on public.faq_entries for select to anon, authenticated using (status = 'published');
create policy knowledge_documents_staff on public.knowledge_documents for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy knowledge_chunks_staff on public.knowledge_chunks for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy faq_entries_staff on public.faq_entries for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant select on public.knowledge_documents, public.knowledge_chunks, public.faq_entries to anon, authenticated;
grant insert, update, delete on public.knowledge_documents, public.faq_entries to authenticated;
grant insert (document_id, chunk_index, content), update (content, chunk_index), delete on public.knowledge_chunks to authenticated;

-- Conversations: only their owner, who can also delete them. No staff access.
create policy assistant_sessions_owner on public.assistant_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assistant_messages_owner_read on public.assistant_messages for select to authenticated using (public.owns_assistant_session(session_id));
create policy assistant_messages_owner_insert on public.assistant_messages for insert to authenticated
  with check (public.owns_assistant_session(session_id) and role = 'user');
create policy assistant_messages_owner_delete on public.assistant_messages for delete to authenticated using (public.owns_assistant_session(session_id));
create policy assistant_feedback_owner on public.assistant_feedback for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and exists(select 1 from public.assistant_messages m where m.id = message_id));
grant select, insert, update, delete on public.assistant_sessions, public.assistant_feedback to authenticated;
grant select, insert, delete on public.assistant_messages to authenticated;
commit;
