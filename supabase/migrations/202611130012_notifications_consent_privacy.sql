-- CHULLA VIDA 3.0 · Notifications (opt-in), consent evidence, legal document versions and privacy requests.
begin;

-- ───────────── Notifications ─────────────
create table public.notification_templates (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('booking_transactional', 'security_alerts', 'trip_reminders', 'cultural_stories', 'offers_marketing', 'geo_curiosities')),
  channel text not null check (channel in ('in_app', 'email', 'push')),
  locale text not null default 'es-EC',
  subject text,
  body text not null,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('booking_transactional', 'security_alerts', 'trip_reminders', 'cultural_stories', 'offers_marketing', 'geo_curiosities')),
  -- No row = nothing optional is sent. Every channel starts off.
  in_app boolean not null default false,
  email boolean not null default false,
  push boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, category),
  check ((quiet_hours_start is null) = (quiet_hours_end is null))
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('booking_transactional', 'security_alerts', 'trip_reminders', 'cultural_stories', 'offers_marketing', 'geo_curiosities')),
  template_id text references public.notification_templates(id),
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  dedupe_key text not null,
  scheduled_for timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sent', 'suppressed', 'failed')),
  suppressed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key)          -- the same notice is never queued twice
);
create index notification_events_status_idx on public.notification_events(status, scheduled_for);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.notification_events(id) on delete set null,
  category text not null check (category in ('booking_transactional', 'security_alerts', 'trip_reminders', 'cultural_stories', 'offers_marketing', 'geo_curiosities')),
  title text not null check (char_length(title) <= 200),
  body text not null check (char_length(body) <= 2000),
  link text,
  source_label text,                    -- cultural notes carry source and date
  source_checked_at date,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth_key text not null,
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- Opt-ins only. No coordinates or location history are stored here or anywhere else.
create table public.geo_opt_ins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  foreground_location boolean not null default false,
  proximity_notifications boolean not null default false,
  policy_version text,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not proximity_notifications or foreground_location)
);

create table public.delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null references public.notification_events(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'push')),
  status text not null check (status in ('sent', 'failed', 'skipped_no_consent', 'skipped_quiet_hours')),
  provider_message_id text,
  error text,
  attempted_at timestamptz not null default now()
);
create index delivery_attempts_event_idx on public.delivery_attempts(notification_event_id);

create table public.content_freshness (
  id uuid primary key default gen_random_uuid(),
  target_table text not null,
  target_id text not null,
  checked_at timestamptz not null,
  expires_at timestamptz,
  source_url text check (source_url ~ '^https://'),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_table, target_id)
);

-- ───────────── Legal documents ─────────────
create table public.legal_documents (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  kind text not null check (kind in ('terms', 'privacy', 'cookies', 'merchant_agreement', 'community_agreement',
    'cancellations', 'consent_texts', 'legal_checklist', 'data_processing_agreement')),
  source_file text,
  audience text not null default 'public' check (audience in ('public', 'merchants', 'communities', 'internal')),
  requires_acceptance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.legal_documents(id) on delete cascade,
  version text not null,
  content text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),      -- SHA-256 of content
  change_summary text,
  substantial_change boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'legal_review', 'approved', 'published', 'superseded')),
  has_pending_placeholders boolean not null default true,
  reviewed_by_counsel text,
  approved_at timestamptz,
  published_at timestamptz,
  effective_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, version),
  -- Drafts with [PENDIENTE] fields or without legal review can never be approved or published.
  constraint legal_versions_publication_needs_review check (
    status not in ('approved', 'published')
    or (not has_pending_placeholders and reviewed_by_counsel is not null and approved_at is not null
        and content !~* '\[\s*(PENDIENTE|RAZ[ÓO]N SOCIAL|COMPLETAR)'))
);
create unique index legal_document_versions_one_published_idx on public.legal_document_versions(document_id) where status = 'published';

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_version_id uuid not null references public.legal_document_versions(id),
  content_hash text not null,
  -- true while the text is a draft: an acknowledgement, not a binding acceptance.
  is_draft_acknowledgement boolean not null,
  method text not null default 'signup' check (method in ('signup', 'settings', 'checkout', 'merchant_onboarding', 'reacceptance')),
  accepted_at timestamptz not null default now(),
  unique (user_id, document_version_id)
);
create index legal_acceptances_user_idx on public.legal_acceptances(user_id);
create trigger legal_acceptances_append_only before update on public.legal_acceptances
for each row execute function public.prevent_mutation();

select public.secure_new_tables();

-- ───────────── Consent evidence (extends the existing table) ─────────────
alter table public.consent_events alter column subject_id drop not null;
alter table public.consent_events
  add column pseudonymous_id text check (pseudonymous_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  add column version text check (char_length(version) <= 100),
  add column method text not null default 'settings'
    check (method in ('banner', 'settings', 'signup', 'voice_prompt', 'location_prompt', 'push_prompt', 'checkout')),
  add column proof_source text check (char_length(proof_source) <= 200),
  add constraint consent_events_has_subject check (subject_id is not null or pseudonymous_id is not null);
create index consent_events_pseudonymous_idx on public.consent_events(pseudonymous_id) where pseudonymous_id is not null;
grant insert (pseudonymous_id, version, method, proof_source) on public.consent_events to authenticated;

-- Accepting the Terms is a different act from consenting to optional processing:
-- "necessary" is never recorded as a consent that can be granted or refused.
create function public.record_consent(
  p_category text, p_granted boolean, p_purpose text, p_policy_version text,
  p_method text default 'settings', p_pseudonymous_id text default null, p_version text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if p_granted is null then raise exception 'Explicit choice required'; end if;
  if p_category = 'necessary' then raise exception 'Necessary processing is not based on optional consent'; end if;
  if v_uid is null and p_pseudonymous_id is null then raise exception 'Subject required'; end if;
  if v_uid is null and p_category not in ('analytics', 'personalization', 'marketing', 'external_embeds') then
    raise exception 'This consent requires an account' using errcode = '42501';
  end if;
  insert into public.consent_events(subject_id, pseudonymous_id, category, granted, purpose, policy_version, method, version, proof_source)
  values (v_uid, case when v_uid is null then p_pseudonymous_id else null end, p_category, p_granted, trim(p_purpose), p_policy_version,
          p_method, p_version, 'record_consent')
  returning id into v_id;
  return v_id;
end;
$$;

-- Latest choice per category mirrored on the profile (revoking clears the timestamp).
create function public.sync_profile_consent() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.subject_id is not null then
    update public.profiles set
      marketing_consent_at = case when new.category in ('marketing', 'email_marketing') then case when new.granted then new.created_at else null end else marketing_consent_at end,
      voice_consent_at = case when new.category = 'voice' then case when new.granted then new.created_at else null end else voice_consent_at end,
      location_consent_at = case when new.category = 'location' then case when new.granted then new.created_at else null end else location_consent_at end
    where id = new.subject_id;
  end if;
  return new;
end;
$$;
create trigger sync_profile_consent after insert on public.consent_events
for each row execute function public.sync_profile_consent();

create function public.accept_legal_document(p_document_version_id uuid, p_method text default 'settings') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_version public.legal_document_versions; v_doc public.legal_documents; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_version from public.legal_document_versions where id = p_document_version_id;
  if not found or v_version.status = 'superseded' then raise exception 'Document version not available'; end if;
  select * into v_doc from public.legal_documents where id = v_version.document_id;
  insert into public.legal_acceptances(user_id, document_version_id, content_hash, is_draft_acknowledgement, method)
  values (auth.uid(), p_document_version_id, v_version.content_hash, v_version.status <> 'published', p_method)
  on conflict (user_id, document_version_id) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.legal_acceptances where user_id = auth.uid() and document_version_id = p_document_version_id;
  elsif v_doc.kind = 'terms' and v_version.status = 'published' then
    update public.profiles set terms_accepted_version = v_version.version, terms_accepted_at = now() where id = auth.uid();
  end if;
  return v_id;
end;
$$;

-- ───────────── Privacy requests (extends the existing table) ─────────────
alter table public.privacy_requests
  add column detail text check (char_length(detail) <= 4000),
  add column due_at timestamptz,
  add column handled_by uuid references auth.users(id) on delete set null,
  add column resolution_note text check (char_length(resolution_note) <= 4000),
  -- When data must be kept by legal obligation, the reason is written down.
  add column retention_justification text check (char_length(retention_justification) <= 2000),
  add column resolved_at timestamptz,
  add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.privacy_requests for each row execute function public.set_updated_at();
create index privacy_requests_subject_idx on public.privacy_requests(subject_id);
create index privacy_requests_status_idx on public.privacy_requests(status);
grant insert (detail) on public.privacy_requests to authenticated;
create policy privacy_officer_privacy_request on public.privacy_requests for select to authenticated using (public.has_role('privacy_officer'));

create function public.process_privacy_request(p_request_id uuid, p_status text, p_note text, p_retention_justification text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_request public.privacy_requests;
begin
  if auth.uid() is null or not (public.is_admin() or public.has_role('privacy_officer')) then
    raise exception 'Privacy officer required' using errcode = '42501';
  end if;
  if p_status not in ('in_review', 'fulfilled', 'rejected') then raise exception 'Invalid status'; end if;
  if char_length(trim(coalesce(p_note, ''))) not between 5 and 4000 then raise exception 'Reasoned note required'; end if;
  select * into v_request from public.privacy_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.status in ('fulfilled', 'rejected') then raise exception 'Request already closed'; end if;
  if v_request.subject_id = auth.uid() then raise exception 'Officers cannot process their own request' using errcode = '42501'; end if;
  if p_status = 'rejected' and char_length(trim(coalesce(p_retention_justification, ''))) < 10 then
    raise exception 'A rejection must state its legal justification';
  end if;
  update public.privacy_requests
    set status = p_status, handled_by = auth.uid(), resolution_note = trim(p_note),
        retention_justification = nullif(trim(coalesce(p_retention_justification, '')), ''),
        resolved_at = case when p_status in ('fulfilled', 'rejected') then now() else null end
    where id = p_request_id;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'privacy_request_' || p_status, 'privacy_requests', p_request_id::text, jsonb_build_object('kind', v_request.kind));
end;
$$;

revoke all on function public.record_consent(text, boolean, text, text, text, text, text), public.accept_legal_document(uuid, text),
  public.process_privacy_request(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_consent(text, boolean, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.accept_legal_document(uuid, text), public.process_privacy_request(uuid, text, text, text) to authenticated, service_role;

-- ───────────── Policies ─────────────
create policy notifications_owner_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_owner_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notification_preferences_owner on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.notification_preferences to authenticated;

create policy push_subscriptions_owner on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy geo_opt_ins_owner on public.geo_opt_ins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.geo_opt_ins to authenticated;

create policy notification_templates_admin_read on public.notification_templates for select to authenticated using (public.is_admin());
grant select on public.notification_templates to authenticated;
-- notification_events and delivery_attempts: service role only (no policy, no grant).

create policy content_freshness_public_read on public.content_freshness for select to anon, authenticated using (true);
grant select on public.content_freshness to anon, authenticated;

create policy legal_documents_public_read on public.legal_documents for select to anon, authenticated using (audience = 'public');
create policy legal_documents_staff_read on public.legal_documents for select to authenticated using (public.is_admin());
create policy legal_document_versions_public_read on public.legal_document_versions for select to anon, authenticated
  using (status = 'published' and exists(select 1 from public.legal_documents d where d.id = document_id));
create policy legal_document_versions_staff_read on public.legal_document_versions for select to authenticated using (public.is_admin());
grant select on public.legal_documents, public.legal_document_versions to anon, authenticated;

create policy legal_acceptances_owner_read on public.legal_acceptances for select to authenticated using (user_id = auth.uid() or public.is_admin());
grant select on public.legal_acceptances to authenticated;
commit;
