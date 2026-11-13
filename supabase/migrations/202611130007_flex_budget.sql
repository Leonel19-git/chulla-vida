-- CHULLA VIDA 3.0 · Chulla Flex: itineraries, constraints, alerts, replanning and honest budgets.
begin;

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  origin_label text,
  start_date date,
  end_date date,
  participants integer not null default 1 check (participants between 1 and 50),
  has_pet boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  current_version integer not null default 0 check (current_version >= 0),
  client_updated_at timestamptz,          -- for conflict resolution after offline edits
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index itineraries_owner_idx on public.itineraries(owner_id);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  experience_id text references public.experiences(id) on delete set null,
  event_id text references public.events(id) on delete set null,
  custom_label text check (char_length(custom_label) <= 200),
  day_index integer not null default 1 check (day_index >= 1),
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  status text not null default 'planned' check (status in ('planned', 'affected', 'removed', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (experience_id is not null or event_id is not null or custom_label is not null),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index itinerary_items_itinerary_idx on public.itinerary_items(itinerary_id, day_index, sort_order);

create table public.itinerary_versions (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  version integer not null check (version >= 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  reason text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (itinerary_id, version)
);

create table public.travel_constraints (
  itinerary_id uuid primary key references public.itineraries(id) on delete cascade,
  max_hours_per_day numeric check (max_hours_per_day > 0 and max_hours_per_day <= 24),
  nights integer check (nights >= 0),
  fitness_level text check (fitness_level in ('facil', 'facil_moderada', 'moderada', 'alta')),
  mobility_needs text check (char_length(mobility_needs) <= 500),
  interests jsonb not null default '[]' check (jsonb_typeof(interests) = 'array'),
  budget_total numeric(12, 2) check (budget_total >= 0),
  budget_currency text not null default 'USD' check (budget_currency in ('USD', 'EUR')),
  fixed_costs_committed numeric(12, 2) check (fixed_costs_committed >= 0),
  paid_non_recoverable numeric(12, 2) check (paid_non_recoverable >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('official', 'provider', 'crowdsourced', 'editorial')),
  url text check (url ~ '^https://'),
  license_note text,
  allows_offline_cache boolean not null default false,
  checked_at date,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('weather_warning', 'road_closure', 'site_closed', 'provider_cancelled', 'time_overrun', 'budget_overrun')),
  reliability text not null default 'unknown' check (reliability in ('official_verified', 'provider_verified', 'crowdsourced_unverified', 'unknown')),
  critical boolean not null default false,
  region_id text references public.regions(id),
  province_id text references public.provinces(id),
  experience_id text references public.experiences(id) on delete cascade,
  itinerary_id uuid references public.itineraries(id) on delete cascade,   -- private alert (time/budget overrun, simulation)
  title text not null check (char_length(title) between 3 and 200),
  detail text,
  source_id uuid references public.route_sources(id),
  source_url text check (source_url ~ '^https://'),
  issued_at timestamptz not null,
  valid_until timestamptz,
  -- Demo mode: a simulated closure is never shown as something that happened.
  is_simulation boolean not null default false,
  status text not null default 'active' check (status in ('active', 'expired', 'withdrawn')),
  reported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= issued_at),
  constraint route_alerts_verified_needs_source check (
    reliability not in ('official_verified', 'provider_verified') or source_id is not null or source_url is not null),
  constraint route_alerts_simulation_is_private check (not is_simulation or (itinerary_id is not null and reliability = 'unknown')),
  constraint route_alerts_critical_needs_official check (not critical or reliability = 'official_verified')
);
create index route_alerts_scope_idx on public.route_alerts(status, region_id, province_id);
create index route_alerts_experience_idx on public.route_alerts(experience_id);
create index route_alerts_itinerary_idx on public.route_alerts(itinerary_id);

create table public.itinerary_replan_events (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  alert_id uuid references public.route_alerts(id) on delete set null,
  trigger_kind text not null check (trigger_kind in ('weather_warning', 'road_closure', 'site_closed', 'provider_cancelled', 'time_overrun', 'budget_overrun', 'manual')),
  is_simulation boolean not null default false,
  from_version integer,
  to_version integer,
  -- A proposal never cancels or replaces a purchase by itself.
  decision text not null default 'pending' check (decision in ('pending', 'applied', 'rejected', 'restored')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index itinerary_replan_events_itinerary_idx on public.itinerary_replan_events(itinerary_id);

create table public.route_options (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  replan_event_id uuid not null references public.itinerary_replan_events(id) on delete cascade,
  rank integer not null check (rank between 1 and 3),   -- at most three alternatives
  reason text not null,
  proposal jsonb not null default '{}' check (jsonb_typeof(proposal) = 'object'),
  distance_km numeric check (distance_km >= 0),
  duration_minutes integer check (duration_minutes >= 0),
  estimate_source_id uuid references public.route_sources(id),
  estimated_total numeric(12, 2) check (estimated_total >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  budget_complete boolean not null default false,
  difference_from_original numeric(12, 2),
  risks jsonb not null default '[]' check (jsonb_typeof(risks) = 'array'),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'rejected', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (replan_event_id, rank),
  -- Distance/time only with a source.
  check ((distance_km is null and duration_minutes is null) or estimate_source_id is not null)
);
create index route_options_itinerary_idx on public.route_options(itinerary_id);

create table public.budget_estimates (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  itinerary_version integer,
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  -- null = no defensible estimate for that component (never treated as zero).
  transport numeric(12, 2) check (transport >= 0),
  tickets numeric(12, 2) check (tickets >= 0),
  experiences numeric(12, 2) check (experiences >= 0),
  food numeric(12, 2) check (food >= 0),
  lodging numeric(12, 2) check (lodging >= 0),
  fees numeric(12, 2) check (fees >= 0),
  pet numeric(12, 2) check (pet >= 0),
  contingency numeric(12, 2) check (contingency >= 0),
  paid_non_recoverable numeric(12, 2) not null default 0 check (paid_non_recoverable >= 0),
  missing_components jsonb not null default '[]' check (jsonb_typeof(missing_components) = 'array'),
  is_complete boolean generated always as (
    transport is not null and tickets is not null and experiences is not null and food is not null
    and lodging is not null and fees is not null and pet is not null and contingency is not null) stored,
  trip_total_estimate numeric(14, 2) generated always as (
    coalesce(transport, 0) + coalesce(tickets, 0) + coalesce(experiences, 0) + coalesce(food, 0)
    + coalesce(lodging, 0) + coalesce(fees, 0) + coalesce(pet, 0) + coalesce(contingency, 0)) stored,
  user_budget numeric(12, 2) check (user_budget >= 0),
  fits_budget boolean not null default false,
  created_at timestamptz not null default now(),
  -- "Fits your budget" only with every component estimated and the total within the budget.
  constraint budget_estimates_fit_is_defensible check (
    not fits_budget or (
      transport is not null and tickets is not null and experiences is not null and food is not null
      and lodging is not null and fees is not null and pet is not null and contingency is not null
      and user_budget is not null
      and transport + tickets + experiences + food + lodging + fees + pet + contingency <= user_budget))
);
create index budget_estimates_itinerary_idx on public.budget_estimates(itinerary_id);

create table public.transport_estimates (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references public.itineraries(id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items(id) on delete cascade,
  mode text not null check (mode in ('bus', 'flight', 'boat', 'taxi', 'walk', 'local', 'mixed', 'car')),
  origin_label text not null,
  destination_label text not null,
  distance_km numeric check (distance_km >= 0),
  duration_minutes integer check (duration_minutes >= 0),
  cost_min numeric(12, 2) check (cost_min >= 0),
  cost_max numeric(12, 2) check (cost_max >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  source_id uuid references public.route_sources(id),
  source_label text,
  checked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (cost_max is null or cost_min is null or cost_max >= cost_min),
  -- Numbers always carry where they came from.
  check ((distance_km is null and duration_minutes is null and cost_min is null and cost_max is null)
         or source_id is not null or source_label is not null)
);
create index transport_estimates_itinerary_idx on public.transport_estimates(itinerary_id);

select public.secure_new_tables();

create function public.owns_itinerary(p_itinerary_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.itineraries i where i.id = p_itinerary_id and i.owner_id = auth.uid());
$$;
revoke all on function public.owns_itinerary(uuid) from public, anon, authenticated;
grant execute on function public.owns_itinerary(uuid) to authenticated, service_role;

create policy itineraries_owner on public.itineraries for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy itinerary_items_owner on public.itinerary_items for all to authenticated
  using (public.owns_itinerary(itinerary_id)) with check (public.owns_itinerary(itinerary_id));
create policy itinerary_versions_owner_read on public.itinerary_versions for select to authenticated using (public.owns_itinerary(itinerary_id));
create policy itinerary_versions_owner_insert on public.itinerary_versions for insert to authenticated
  with check (public.owns_itinerary(itinerary_id) and created_by = auth.uid());
create policy travel_constraints_owner on public.travel_constraints for all to authenticated
  using (public.owns_itinerary(itinerary_id)) with check (public.owns_itinerary(itinerary_id));
create policy itinerary_replan_events_owner on public.itinerary_replan_events for all to authenticated
  using (public.owns_itinerary(itinerary_id)) with check (public.owns_itinerary(itinerary_id));
create policy route_options_owner on public.route_options for all to authenticated
  using (public.owns_itinerary(itinerary_id)) with check (public.owns_itinerary(itinerary_id));
create policy budget_estimates_owner on public.budget_estimates for all to authenticated
  using (public.owns_itinerary(itinerary_id)) with check (public.owns_itinerary(itinerary_id));
create policy transport_estimates_owner on public.transport_estimates for all to authenticated
  using (itinerary_id is not null and public.owns_itinerary(itinerary_id))
  with check (itinerary_id is not null and public.owns_itinerary(itinerary_id));
grant select, insert, update, delete on public.itineraries, public.itinerary_items, public.travel_constraints,
  public.itinerary_replan_events, public.route_options, public.budget_estimates, public.transport_estimates to authenticated;
grant select, insert on public.itinerary_versions to authenticated;

grant select on public.route_sources to anon, authenticated;
create policy route_sources_public_read on public.route_sources for select to anon, authenticated using (status = 'active');

-- Public alerts: active, not simulated, not tied to one person's itinerary.
grant select on public.route_alerts to anon, authenticated;
create policy route_alerts_public_read on public.route_alerts for select to anon, authenticated
  using (status = 'active' and not is_simulation and itinerary_id is null);
create policy route_alerts_owner_read on public.route_alerts for select to authenticated
  using (itinerary_id is not null and public.owns_itinerary(itinerary_id));
create policy route_alerts_reporter_read on public.route_alerts for select to authenticated using (reported_by = auth.uid());
create policy route_alerts_staff_all on public.route_alerts for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
-- Travelers can only add private alerts (simulations/overruns) or UNVERIFIED community reports.
create policy route_alerts_traveler_insert on public.route_alerts for insert to authenticated with check (
  reported_by = auth.uid() and not critical
  and ((itinerary_id is not null and public.owns_itinerary(itinerary_id) and reliability = 'unknown')
       or (itinerary_id is null and not is_simulation and reliability = 'crowdsourced_unverified')));
grant insert, update, delete on public.route_alerts to authenticated;
commit;
