-- CHULLA VIDA 3.0 · Relational catalog (section 21 ingestion model), Chulla Pet and connectivity tags.
-- public.catalog_experiences (JSON snapshot used by the current client/CMS) is kept untouched;
-- public.experiences is the normalized model that bookings, slots and policies hang from.
begin;

create table public.knowledge_sources (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  kind text not null default 'catalog' check (kind in ('catalog', 'editorial', 'official', 'community', 'legal', 'provider')),
  original_document text,
  source_url text check (source_url ~ '^https://'),
  checked_at date,
  expected_count integer check (expected_count >= 0),
  notes jsonb not null default '[]' check (jsonb_typeof(notes) = 'array'),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.regions (
  id text primary key check (id in ('sierra', 'costa', 'amazonia', 'galapagos')),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provinces (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  region_id text not null references public.regions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index provinces_region_idx on public.provinces(region_id);

alter table public.organizations add column province_id text references public.provinces(id);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 200),
  organization_id uuid references public.organizations(id) on delete set null,
  region_id text references public.regions(id),
  province_id text references public.provinces(id),
  description text,
  visit_protocol text,
  -- Use of name, portraits, stories and calendar needs an agreement with an authorized representative.
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'withdrawn')),
  consent_granted_at timestamptz,
  consent_reference text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or consent_status = 'granted')
);
create index communities_org_idx on public.communities(organization_id);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  region_id text not null references public.regions(id),
  province_id text references public.provinces(id),
  locality text,
  description text,
  -- Approximate locality point for weather only; never a meeting point.
  weather_reference jsonb check (weather_reference is null or jsonb_typeof(weather_reference) = 'object'),
  source_id text references public.knowledge_sources(id),
  source_url text check (source_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index destinations_region_idx on public.destinations(region_id);

create table public.experiences (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  organization_id uuid references public.organizations(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,

  -- Provenance (section 21)
  content_source_id text references public.knowledge_sources(id),
  original_document text,
  source_order integer check (source_order > 0),
  source_text text,
  content_version text not null default '1',
  source_checked_at date,

  title text not null check (char_length(title) between 2 and 200),
  experience_name text,
  kind text not null default 'experience' check (kind in ('experience', 'multi_day_program', 'trip_plan')),
  localized_region text not null references public.regions(id),
  subregion text,
  province text not null default '',
  province_id text references public.provinces(id),
  locality text not null default '',
  meeting_point text,
  geospatial_coordinates_verified boolean not null default false,
  weather_reference jsonb check (weather_reference is null or jsonb_typeof(weather_reference) = 'object'),

  duration_label text not null default 'Por confirmar',
  duration_min_hours numeric check (duration_min_hours >= 0),
  duration_max_hours numeric check (duration_max_hours >= 0),
  duration_days integer check (duration_days >= 0),
  duration_nights integer check (duration_nights >= 0),
  difficulty text not null default 'facil' check (difficulty in ('facil', 'facil_moderada', 'moderada', 'alta')),
  difficulty_label text not null default 'Por confirmar',
  capacity_max integer check (capacity_max > 0),
  capacity_label text not null default 'Por confirmar con operador',

  summary text not null default '',
  description text not null default '',
  context text,
  attractions jsonb not null default '[]' check (jsonb_typeof(attractions) = 'array'),
  activities jsonb not null default '[]' check (jsonb_typeof(activities) = 'array'),
  itinerary jsonb not null default '[]' check (jsonb_typeof(itinerary) = 'array'),
  recommendations jsonb not null default '[]' check (jsonb_typeof(recommendations) = 'array'),
  conditions jsonb not null default '[]' check (jsonb_typeof(conditions) = 'array'),
  warnings jsonb not null default '[]' check (jsonb_typeof(warnings) = 'array'),
  activity_constraints jsonb not null default '[]' check (jsonb_typeof(activity_constraints) = 'array'),
  location_info jsonb check (location_info is null or jsonb_typeof(location_info) = 'object'),

  -- Price: ORIGINAL currency and range; never converted silently.
  price_type text not null default 'referential' check (price_type in ('proposed', 'referential', 'verified_offer')),
  original_price_currency text not null default 'USD' check (original_price_currency in ('USD', 'EUR')),
  price_min numeric(12, 2) check (price_min >= 0),
  price_max numeric(12, 2) check (price_max >= 0),
  price_unit text not null default 'per_person' check (price_unit in ('per_person')),
  price_original_label text not null default '',
  price_includes jsonb not null default '[]' check (jsonb_typeof(price_includes) = 'array'),
  price_excludes jsonb not null default '[]' check (jsonb_typeof(price_excludes) = 'array'),
  pricing_assumptions jsonb not null default '[]' check (jsonb_typeof(pricing_assumptions) = 'array'),
  price_group_breakdown jsonb not null default '[]' check (jsonb_typeof(price_group_breakdown) = 'array'),
  price_separate_costs jsonb not null default '[]' check (jsonb_typeof(price_separate_costs) = 'array'),
  price_options jsonb not null default '[]' check (jsonb_typeof(price_options) = 'array'),
  cancellation_policy text,

  access_status text not null default 'unknown' check (access_status in ('unknown', 'open_reported', 'partially_closed_reported', 'closed_reported')),
  access_checked_at date,
  operator_verification_status text not null default 'unverified'
    check (operator_verification_status in ('unverified', 'in_review', 'identity_reviewed', 'official_registry_verified', 'suspended')),
  verified_by text,
  verified_by_user uuid references auth.users(id) on delete set null,
  booking_enabled boolean not null default false,
  editorial_status text not null default 'referential' check (editorial_status in ('referential', 'in_review', 'approved')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (price_max is null or price_min is null or price_max >= price_min),
  -- No row can be bookable without a verified operator AND a verified offer.
  constraint experiences_booking_requires_verification check (
    not booking_enabled or (
      organization_id is not null
      and operator_verification_status in ('identity_reviewed', 'official_registry_verified')
      and price_type = 'verified_offer'
      and price_min is not null
      and status = 'published'
    )
  ),
  constraint experiences_verified_offer_requires_operator check (
    price_type <> 'verified_offer' or operator_verification_status in ('identity_reviewed', 'official_registry_verified')
  )
);
create index experiences_region_idx on public.experiences(localized_region);
create index experiences_province_idx on public.experiences(province_id);
create index experiences_org_idx on public.experiences(organization_id);
create index experiences_source_idx on public.experiences(content_source_id, source_order);
create index experiences_status_idx on public.experiences(status);

create table public.experience_media (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  sort_order integer not null default 0,
  src text not null,
  alt text not null default '',
  credit text not null,
  license text not null,
  depicts_this_place boolean not null default false,
  created_at timestamptz not null default now(),
  unique (experience_id, sort_order)
);

create table public.experience_inclusions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  kind text not null check (kind in ('include', 'exclude')),
  sort_order integer not null default 0,
  label text not null check (char_length(label) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (experience_id, kind, sort_order)
);

create table public.experience_dates (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  label text,
  status text not null default 'tentative' check (status in ('tentative', 'confirmed', 'cancelled')),
  source_url text check (source_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index experience_dates_experience_idx on public.experience_dates(experience_id, starts_on);

create table public.experience_tags (
  experience_id text not null references public.experiences(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 80),
  primary key (experience_id, tag)
);
create index experience_tags_tag_idx on public.experience_tags(tag);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer not null check (capacity > 0),
  reserved integer not null default 0,
  price_amount numeric(12, 2) check (price_amount >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Last line of defence against overselling.
  constraint availability_slots_no_oversell check (reserved >= 0 and reserved <= capacity),
  check (ends_at is null or ends_at >= starts_at)
);
create index availability_slots_experience_idx on public.availability_slots(experience_id, starts_at);

-- Chulla Pet: nothing is "pet friendly" without the host's dated confirmation.
create table public.pet_policies (
  experience_id text primary key references public.experiences(id) on delete cascade,
  status text not null default 'unverified'
    check (status in ('confirmed_allowed', 'ask_conditions', 'not_allowed', 'unverified', 'prohibited_protected_area')),
  note text not null default '',
  species jsonb not null default '[]' check (jsonb_typeof(species) = 'array'),
  max_size text,
  max_count integer check (max_count > 0),
  requirements jsonb not null default '[]' check (jsonb_typeof(requirements) = 'array'),
  fee_amount numeric(12, 2) check (fee_amount >= 0),
  fee_currency text check (fee_currency in ('USD', 'EUR')),
  confirmed_by text,
  confirmed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'confirmed_allowed' or (confirmed_by is not null and confirmed_at is not null)),
  check ((fee_amount is null) = (fee_currency is null))
);

-- Access/connectivity tags as provided or confirmed by the operator.
create table public.connectivity_tags (
  experience_id text not null references public.experiences(id) on delete cascade,
  tag text not null check (tag in ('sin_senal', 'senal_intermitente', 'datos_moviles', 'wifi', 'electricidad_limitada',
    'requiere_efectivo', 'punto_encuentro_sin_gps', 'accesibilidad_por_verificar', 'agua_potable_confirmar')),
  verified_by text,
  verified_at date,
  created_at timestamptz not null default now(),
  primary key (experience_id, tag),
  check ((verified_by is null) = (verified_at is null))
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id text not null references public.experiences(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

-- Commercial switch for the whole platform. All flags start false and only the service role
-- (after the company, the contracts and the gateway really exist) can turn them on.
create table public.commercial_readiness (
  id boolean primary key default true check (id),
  legal_entity_confirmed boolean not null default false,
  legal_documents_approved boolean not null default false,
  payment_gateway_live boolean not null default false,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.commercial_readiness(id) values (true);

select public.secure_new_tables();

create function public.can_edit_experience(p_experience_id text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_moderator() or exists(
    select 1 from public.experiences e
    where e.id = p_experience_id and e.organization_id is not null and public.is_org_manager(e.organization_id));
$$;

-- Hosts may draft; they can never self-publish, self-verify or make an offer bookable.
create function public.experiences_guard() returns trigger language plpgsql set search_path = '' as $$
declare v_client boolean := current_user in ('anon', 'authenticated'); v_staff boolean := false; v_org_status text;
begin
  if v_client then
    v_staff := public.is_moderator();
    if tg_op = 'INSERT' then
      if new.booking_enabled or new.operator_verification_status <> 'unverified' or new.price_type = 'verified_offer'
         or new.verified_by is not null or new.verified_by_user is not null then
        raise exception 'Verification and booking flags are set by the platform after review' using errcode = '42501';
      end if;
      if not v_staff and (new.status <> 'draft' or new.editorial_status = 'approved' or new.published_at is not null) then
        raise exception 'Publication requires editorial review' using errcode = '42501';
      end if;
    else
      if new.id <> old.id
         or new.booking_enabled is distinct from old.booking_enabled
         or new.operator_verification_status is distinct from old.operator_verification_status
         or new.verified_by is distinct from old.verified_by
         or new.verified_by_user is distinct from old.verified_by_user
         or (new.price_type is distinct from old.price_type and 'verified_offer' in (new.price_type, old.price_type)) then
        raise exception 'Verification and booking flags are set by the platform after review' using errcode = '42501';
      end if;
      if not v_staff and (
           new.organization_id is distinct from old.organization_id
           or new.editorial_status is distinct from old.editorial_status
           or new.published_at is distinct from old.published_at
           or new.content_source_id is distinct from old.content_source_id
           or (new.status is distinct from old.status and new.status = 'published')) then
        raise exception 'Publication requires editorial review' using errcode = '42501';
      end if;
      -- A bookable offer is frozen for the client; changes go through review.
      if old.booking_enabled and not v_staff then
        raise exception 'A bookable offer can only be changed through review' using errcode = '42501';
      end if;
    end if;
  end if;
  -- Universal rule, also for trusted paths: the organization itself must be verified right now.
  if new.booking_enabled then
    select o.verification_status into v_org_status from public.organizations o where o.id = new.organization_id;
    if v_org_status is null or v_org_status not in ('identity_reviewed', 'official_registry_verified')
       or v_org_status <> new.operator_verification_status then
      raise exception 'Booking requires a currently verified operator' using errcode = '23514';
    end if;
  end if;
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end;
$$;
create trigger experiences_guard before insert or update on public.experiences
for each row execute function public.experiences_guard();

-- Losing verification immediately removes the organization's offers from sale.
create function public.sync_experience_operator_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status in ('identity_reviewed', 'official_registry_verified') then
      update public.experiences set operator_verification_status = new.verification_status where organization_id = new.id;
    else
      update public.experiences
        set booking_enabled = false,
            price_type = case when price_type = 'verified_offer' then 'proposed' else price_type end,
            operator_verification_status = new.verification_status
        where organization_id = new.id;
    end if;
  end if;
  return new;
end;
$$;
create trigger sync_experience_operator_status after update on public.organizations
for each row execute function public.sync_experience_operator_status();

-- The only way to make an experience bookable. Audited; blocked while the platform is not
-- commercially ready (legal entity, approved legal texts, live gateway).
create function public.set_experience_booking(p_experience_id text, p_enabled boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_exp public.experiences; v_ready public.commercial_readiness;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 1000 then raise exception 'Reason required'; end if;
  select * into v_exp from public.experiences where id = p_experience_id for update;
  if not found then raise exception 'Experience not found'; end if;
  if p_enabled then
    select * into v_ready from public.commercial_readiness where id;
    if not (v_ready.legal_entity_confirmed and v_ready.legal_documents_approved and v_ready.payment_gateway_live) then
      raise exception 'Commercial publication blocked: legal entity, legal documents and payment gateway must be ready';
    end if;
    if v_exp.price_type <> 'verified_offer' or v_exp.price_min is null then raise exception 'A verified offer with a confirmed price is required'; end if;
    if not exists(select 1 from public.availability_slots s where s.experience_id = p_experience_id and s.status = 'open' and s.price_amount is not null) then
      raise exception 'At least one open slot with a confirmed price is required';
    end if;
  end if;
  update public.experiences set booking_enabled = p_enabled where id = p_experience_id;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
  values (auth.uid(), case when p_enabled then 'experience_booking_enabled' else 'experience_booking_disabled' end,
          'experiences', p_experience_id, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

-- Reviewer/admin records that an operator's offer and price were validated.
create function public.mark_experience_offer_verified(p_experience_id text, p_verified_by_label text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_exp public.experiences; v_org_status text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 1000 or char_length(trim(coalesce(p_verified_by_label, ''))) < 3 then
    raise exception 'Reason and verifier required';
  end if;
  select * into v_exp from public.experiences where id = p_experience_id for update;
  if not found or v_exp.organization_id is null then raise exception 'Experience has no operator'; end if;
  select verification_status into v_org_status from public.organizations where id = v_exp.organization_id;
  if v_org_status not in ('identity_reviewed', 'official_registry_verified') then raise exception 'Operator is not verified'; end if;
  if v_exp.price_min is null then raise exception 'A confirmed price is required'; end if;
  update public.experiences
    set operator_verification_status = v_org_status, price_type = 'verified_offer',
        verified_by = trim(p_verified_by_label), verified_by_user = auth.uid(), source_checked_at = current_date
    where id = p_experience_id;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'experience_offer_verified', 'experiences', p_experience_id, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

revoke all on function public.can_edit_experience(text), public.set_experience_booking(text, boolean, text),
  public.mark_experience_offer_verified(text, text, text) from public, anon, authenticated;
grant execute on function public.can_edit_experience(text), public.set_experience_booking(text, boolean, text),
  public.mark_experience_offer_verified(text, text, text) to authenticated, service_role;

-- ───────────── Policies ─────────────
grant select on public.knowledge_sources, public.regions, public.provinces, public.communities, public.destinations,
  public.experiences, public.experience_media, public.experience_inclusions, public.experience_dates, public.experience_tags,
  public.availability_slots, public.pet_policies, public.connectivity_tags to anon, authenticated;

create policy regions_public_read on public.regions for select to anon, authenticated using (true);
create policy provinces_public_read on public.provinces for select to anon, authenticated using (true);
create policy knowledge_sources_public_read on public.knowledge_sources for select to anon, authenticated using (status = 'published');
create policy knowledge_sources_staff_read on public.knowledge_sources for select to authenticated using (public.is_moderator());
create policy communities_public_read on public.communities for select to anon, authenticated using (status = 'published');
create policy communities_member_read on public.communities for select to authenticated
  using (public.is_moderator() or (organization_id is not null and public.is_org_member(organization_id)));
create policy destinations_public_read on public.destinations for select to anon, authenticated using (status = 'published');
create policy destinations_staff_read on public.destinations for select to authenticated using (public.is_moderator());

create policy experiences_public_read on public.experiences for select to anon, authenticated using (status = 'published');
create policy experiences_editor_read on public.experiences for select to authenticated
  using (public.is_moderator() or (organization_id is not null and public.is_org_member(organization_id)));
create policy experiences_host_insert on public.experiences for insert to authenticated
  with check (public.is_moderator() or (organization_id is not null and public.is_org_manager(organization_id)));
create policy experiences_host_update on public.experiences for update to authenticated
  using (public.is_moderator() or (organization_id is not null and public.is_org_manager(organization_id)))
  with check (public.is_moderator() or (organization_id is not null and public.is_org_manager(organization_id)));
grant insert, update on public.experiences to authenticated;

-- Children: readable when the parent is readable (parent RLS applies inside the subquery).
create policy experience_media_read on public.experience_media for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy experience_inclusions_read on public.experience_inclusions for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy experience_dates_read on public.experience_dates for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy experience_tags_read on public.experience_tags for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy pet_policies_read on public.pet_policies for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy connectivity_tags_read on public.connectivity_tags for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));
create policy availability_slots_read on public.availability_slots for select to anon, authenticated
  using (exists(select 1 from public.experiences e where e.id = experience_id));

create policy experience_media_write on public.experience_media for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy experience_inclusions_write on public.experience_inclusions for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy experience_dates_write on public.experience_dates for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy experience_tags_write on public.experience_tags for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy pet_policies_write on public.pet_policies for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy connectivity_tags_write on public.connectivity_tags for all to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
create policy availability_slots_insert on public.availability_slots for insert to authenticated
  with check (public.can_edit_experience(experience_id));
create policy availability_slots_update on public.availability_slots for update to authenticated
  using (public.can_edit_experience(experience_id)) with check (public.can_edit_experience(experience_id));
grant insert, update, delete on public.experience_media, public.experience_inclusions, public.experience_dates,
  public.experience_tags, public.pet_policies, public.connectivity_tags to authenticated;
-- "reserved" is never client-writable: only the booking triggers move it.
grant insert (experience_id, starts_at, ends_at, capacity, price_amount, currency, status) on public.availability_slots to authenticated;
grant update (starts_at, ends_at, capacity, price_amount, currency, status) on public.availability_slots to authenticated;

create policy favorites_owner on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.favorites to authenticated;

create policy commercial_readiness_staff_read on public.commercial_readiness for select to authenticated using (public.is_admin());
grant select on public.commercial_readiness to authenticated;
commit;
