-- CHULLA VIDA 3.0 · Cultura Viva: events, editions, sources and visit protocols.
begin;

create table public.events (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  local_name text,
  -- 'raymi' only for celebrations that really carry that name.
  category text not null check (category in ('raymi', 'fiesta_popular', 'ceremonia_comunitaria', 'festival_artes', 'civica')),
  region_id text not null references public.regions(id),
  provinces jsonb not null default '[]' check (jsonb_typeof(provinces) = 'array'),
  localities jsonb not null default '[]' check (jsonb_typeof(localities) = 'array'),
  community_label text,
  community_id uuid references public.communities(id) on delete set null,
  usual_months jsonb not null default '[]' check (jsonb_typeof(usual_months) = 'array'),
  date_label text not null,
  description text not null,
  -- true: must not be presented as a public show.
  sensitive boolean not null default false,
  official_url text check (official_url ~ '^https://'),
  last_checked_at date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_region_idx on public.events(region_id);

create table public.event_editions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  start_date date,
  end_date date,
  confirmation text not null default 'orientative' check (confirmation in ('confirmed_official', 'orientative', 'community_defined')),
  source_url text check (source_url ~ '^https://'),
  checked_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, year),
  check (end_date is null or (start_date is not null and end_date >= start_date)),
  -- An edition is "confirmed" only with dates and a source.
  constraint event_editions_confirmed_needs_source check (confirmation <> 'confirmed_official' or (start_date is not null and source_url is not null))
);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  source_id text references public.knowledge_sources(id),
  title text not null,
  url text check (url ~ '^https://'),
  original_document text,
  checked_at date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (event_id, title),
  check (url is not null or original_document is not null or source_id is not null)
);

create table public.cultural_protocols (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.events(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  experience_id text references public.experiences(id) on delete cascade,
  sort_order integer not null default 0,
  body text not null check (char_length(body) between 3 and 2000),
  approved_by_community boolean not null default false,
  approved_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(event_id, community_id, experience_id) = 1),
  check (not approved_by_community or approved_reference is not null)
);
create unique index cultural_protocols_event_order_idx on public.cultural_protocols(event_id, sort_order) where event_id is not null;
create index cultural_protocols_community_idx on public.cultural_protocols(community_id);
create index cultural_protocols_experience_idx on public.cultural_protocols(experience_id);

create table public.event_experiences (
  event_id text not null references public.events(id) on delete cascade,
  experience_id text not null references public.experiences(id) on delete cascade,
  primary key (event_id, experience_id)
);

select public.secure_new_tables();

grant select on public.events, public.event_editions, public.event_sources, public.cultural_protocols, public.event_experiences to anon, authenticated;
create policy events_public_read on public.events for select to anon, authenticated using (status = 'published');
create policy events_staff_read on public.events for select to authenticated using (public.is_moderator());
create policy event_editions_read on public.event_editions for select to anon, authenticated
  using (exists(select 1 from public.events e where e.id = event_id));
create policy event_sources_read on public.event_sources for select to anon, authenticated
  using (exists(select 1 from public.events e where e.id = event_id));
create policy event_experiences_read on public.event_experiences for select to anon, authenticated
  using (exists(select 1 from public.events e where e.id = event_id) and exists(select 1 from public.experiences x where x.id = experience_id));
create policy cultural_protocols_read on public.cultural_protocols for select to anon, authenticated using (
  (event_id is not null and exists(select 1 from public.events e where e.id = event_id))
  or (community_id is not null and exists(select 1 from public.communities c where c.id = community_id))
  or (experience_id is not null and exists(select 1 from public.experiences x where x.id = experience_id)));

-- Editorial writes: moderators only (community approval is recorded by staff with a reference).
create policy events_staff_write on public.events for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy event_editions_staff_write on public.event_editions for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy event_sources_staff_write on public.event_sources for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy cultural_protocols_staff_write on public.cultural_protocols for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy event_experiences_staff_write on public.event_experiences for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant insert, update, delete on public.events, public.event_editions, public.event_sources, public.cultural_protocols, public.event_experiences to authenticated;

-- Catalog reference tables follow the same editorial rule.
create policy communities_staff_write on public.communities for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy destinations_staff_write on public.destinations for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy knowledge_sources_staff_write on public.knowledge_sources for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant insert, update, delete on public.communities, public.destinations, public.knowledge_sources to authenticated;
commit;
