-- CHULLA VIDA 3.0: initial, additive schema. Run with the Supabase migration owner.
-- Live data remains separate from the existing local demonstration.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  locale text not null default 'es-EC',
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 100));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (char_length(name) between 2 and 160),
  kind text not null check (kind in ('business', 'community')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'in_review', 'identity_reviewed', 'official_registry_verified', 'suspended')),
  created_at timestamptz not null default now()
);
create index organizations_owner_idx on public.organizations(owner_id);
create table public.merchant_verification_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  applicant_id uuid not null references auth.users(id),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  treatment_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index merchant_requests_org_idx on public.merchant_verification_requests(organization_id);
create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.merchant_verification_requests(id),
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved', 'rejected')),
  note text not null check (char_length(note) between 5 and 2000),
  registry_reference text,
  created_at timestamptz not null default now()
);
create table public.catalog_experiences (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  organization_id uuid references public.organizations(id),
  published boolean not null default true,
  booking_enabled boolean not null default false,
  price_type text not null default 'referential' check (price_type in ('proposed', 'referential', 'verified_offer')),
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  verified_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check (not booking_enabled or (organization_id is not null and price_type = 'verified_offer' and verified_by is not null)),
  check (coalesce(data->>'bookingEnabled', 'false') = 'false' or booking_enabled)
);
create table public.experience_requests (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references auth.users(id),
  experience_id text not null references public.catalog_experiences(id),
  organization_id uuid references public.organizations(id),
  kind text not null check (kind in ('information', 'booking')),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'requested' check (status in ('requested', 'acknowledged', 'cancelled')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (traveler_id, idempotency_key)
);
-- Keep indexed price metadata consistent with the source JSON, including EUR.
create function public.sync_catalog_price_metadata() returns trigger language plpgsql set search_path = '' as $$
begin
  new.currency := coalesce(new.data->'price'->>'currency', new.currency);
  new.price_type := coalesce(new.data->'price'->>'type', new.price_type);
  return new;
end;
$$;
create trigger sync_catalog_price before insert or update of data on public.catalog_experiences
for each row execute function public.sync_catalog_price_metadata();
create index experience_requests_traveler_idx on public.experience_requests(traveler_id);
create index experience_requests_org_idx on public.experience_requests(organization_id);
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('necessary', 'analytics', 'personalization', 'marketing', 'external_embeds', 'voice', 'location', 'notifications', 'email_marketing')),
  granted boolean not null,
  purpose text not null check (char_length(purpose) between 1 and 500),
  policy_version text not null check (char_length(policy_version) between 1 and 100),
  created_at timestamptz not null default now()
);
create index consent_events_subject_idx on public.consent_events(subject_id);
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references auth.users(id),
  kind text not null check (kind in ('access', 'rectification', 'erasure', 'objection', 'portability', 'restriction', 'withdraw_consent')),
  status text not null default 'received' check (status in ('received', 'in_review', 'fulfilled', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.merchant_verification_requests enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.catalog_experiences enable row level security;
alter table public.experience_requests enable row level security;
alter table public.consent_events enable row level security;
alter table public.privacy_requests enable row level security;

create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
create policy update_own_profile on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own_role on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy own_organization on public.organizations for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy own_verification_request on public.merchant_verification_requests for select to authenticated using (applicant_id = auth.uid() or public.is_admin());
create policy own_verification_review on public.verification_reviews for select to authenticated using (public.is_admin() or exists(select 1 from public.merchant_verification_requests r where r.id = request_id and r.applicant_id = auth.uid()));
create policy published_catalog on public.catalog_experiences for select to anon, authenticated using (published);
create policy own_experience_request on public.experience_requests for select to authenticated using (traveler_id = auth.uid() or public.is_admin() or exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));
create policy own_consent on public.consent_events for select to authenticated using (subject_id = auth.uid());
create policy create_own_consent on public.consent_events for insert to authenticated with check (subject_id = auth.uid());
create policy own_privacy_request on public.privacy_requests for select to authenticated using (subject_id = auth.uid() or public.is_admin());
create policy create_own_privacy_request on public.privacy_requests for insert to authenticated with check (subject_id = auth.uid() and status = 'received');

revoke all on public.profiles, public.user_roles, public.organizations, public.merchant_verification_requests, public.verification_reviews, public.catalog_experiences, public.experience_requests, public.consent_events, public.privacy_requests from anon, authenticated;
-- Reviewer identity and internal organization routing do not belong in the public API.
grant select (id, data, published, booking_enabled, price_type, currency, updated_at) on public.catalog_experiences to anon, authenticated;
grant select on public.profiles, public.user_roles, public.organizations, public.merchant_verification_requests, public.verification_reviews, public.experience_requests, public.consent_events, public.privacy_requests to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;
grant insert (subject_id, category, granted, purpose, policy_version) on public.consent_events to authenticated;
grant insert (subject_id, kind) on public.privacy_requests to authenticated;

create function public.submit_merchant_application(p_name text, p_kind text, p_treatment_consent boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_request uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_treatment_consent is distinct from true then raise exception 'Treatment consent required'; end if;
  insert into public.organizations(owner_id, name, kind, verification_status) values(auth.uid(), trim(p_name), p_kind, 'in_review') returning id into v_org;
  insert into public.merchant_verification_requests(organization_id, applicant_id, treatment_consent_at) values(v_org, auth.uid(), now()) returning id into v_request;
  return v_request;
end;
$$;
create function public.review_merchant_application(p_request_id uuid, p_decision text, p_note text, p_registry_reference text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.merchant_verification_requests;
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into v_request from public.merchant_verification_requests where id = p_request_id for update;
  if not found or v_request.status <> 'submitted' then raise exception 'Request not pending'; end if;
  insert into public.verification_reviews(request_id, reviewer_id, decision, note, registry_reference) values(p_request_id, auth.uid(), p_decision, p_note, nullif(trim(p_registry_reference), ''));
  update public.merchant_verification_requests set status = p_decision where id = p_request_id;
  update public.organizations set verification_status = case when p_decision = 'rejected' then 'unverified' when nullif(trim(p_registry_reference),'') is not null then 'official_registry_verified' else 'identity_reviewed' end where id = v_request.organization_id;
end;
$$;
create function public.submit_experience_request(p_experience_id text, p_kind text, p_message text, p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_experience public.catalog_experiences; v_id uuid; v_existing public.experience_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  -- Serialize retries for one traveler/key; concurrent calls return the original ID.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_idempotency_key::text, 0));
  select * into v_existing from public.experience_requests where traveler_id = auth.uid() and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.experience_id <> p_experience_id or v_existing.kind <> p_kind or v_existing.message <> trim(p_message) then raise exception 'Idempotency key reused for different request'; end if;
    return v_existing.id;
  end if;
  select * into v_experience from public.catalog_experiences where id = p_experience_id and published for share;
  if not found then raise exception 'Experience unavailable'; end if;
  if p_kind = 'booking' then
    -- Capacity and gateway integration are intentionally not activated by this foundation.
    -- Even a verified catalog entry cannot create a commercial booking until those exist.
    raise exception 'Online booking unavailable; request information instead';
  end if;
  insert into public.experience_requests(traveler_id, experience_id, organization_id, kind, message, idempotency_key) values(auth.uid(), p_experience_id, v_experience.organization_id, p_kind, trim(p_message), p_idempotency_key) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.is_admin(), public.handle_new_user(), public.sync_catalog_price_metadata(), public.submit_merchant_application(text,text,boolean), public.review_merchant_application(uuid,text,text,text), public.submit_experience_request(text,text,text,uuid) from public, anon;
grant execute on function public.is_admin(), public.submit_merchant_application(text,text,boolean), public.review_merchant_application(uuid,text,text,text), public.submit_experience_request(text,text,text,uuid) to authenticated;
grant all on public.profiles, public.user_roles, public.organizations, public.merchant_verification_requests, public.verification_reviews, public.catalog_experiences, public.experience_requests, public.consent_events, public.privacy_requests to service_role;
commit;
