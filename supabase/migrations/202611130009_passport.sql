-- CHULLA VIDA 3.0 · Pasaporte Guambra: stamps, journal, achievements and visit verification.
-- A "verified visit" stamp can only be written by server-side functions.
begin;

create table public.passport_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  cover_style text not null default 'classic' check (char_length(cover_style) <= 40),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  share_photos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stamp_rules (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  region_id text references public.regions(id),
  experience_id text references public.experiences(id) on delete cascade,
  event_id text references public.events(id) on delete cascade,
  stamp_type text not null check (stamp_type in ('self_reported', 'verified_visit', 'achievement')),
  verification_method text not null default 'none' check (verification_method in ('none', 'booking_completed', 'host_one_time_code', 'staff_review')),
  -- Cultural practices become game mechanics only with the community's approval.
  community_approved boolean not null default false,
  community_approval_reference text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stamp_type <> 'verified_visit' or verification_method <> 'none'),
  check (not community_approved or community_approval_reference is not null)
);

create table public.visit_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id text not null references public.experiences(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  method text not null check (method in ('booking_completed', 'host_one_time_code', 'staff_review', 'offline_pending')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  evidence jsonb not null default '{}' check (jsonb_typeof(evidence) = 'object'),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'verified' or (verified_at is not null and method <> 'offline_pending'))
);
create index visit_verifications_user_idx on public.visit_verifications(user_id);

create table public.passport_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id text references public.stamp_rules(id) on delete set null,
  experience_id text references public.experiences(id) on delete set null,
  region_id text references public.regions(id),
  stamp_type text not null default 'self_reported' check (stamp_type in ('self_reported', 'pending_sync', 'verified_visit')),
  visit_verification_id uuid references public.visit_verifications(id) on delete set null,
  note text check (char_length(note) <= 500),
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index passport_stamps_unique_idx on public.passport_stamps(user_id, experience_id, stamp_type) where experience_id is not null;
create index passport_stamps_user_idx on public.passport_stamps(user_id);

create table public.passport_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id text references public.experiences(id) on delete set null,
  title text check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 20000),
  entry_date date,
  photo_paths jsonb not null default '[]' check (jsonb_typeof(photo_paths) = 'array'),   -- objects in the private bucket
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index passport_journal_entries_user_idx on public.passport_journal_entries(user_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]+$'),
  title text not null,
  awarded_at timestamptz not null default now(),
  source text not null default 'system',
  unique (user_id, code)
);

select public.secure_new_tables();

-- Defence in depth: API roles can never write a verified stamp, whatever the policies say.
create function public.passport_stamps_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.stamp_type = 'verified_visit' or new.visit_verification_id is not null then
      raise exception 'Verified stamps are granted by the server after validation' using errcode = '42501';
    end if;
  elsif new.stamp_type = 'verified_visit' and not exists(
      select 1 from public.visit_verifications v
      where v.id = new.visit_verification_id and v.user_id = new.user_id and v.status = 'verified') then
    raise exception 'A verified stamp needs a verified visit' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger passport_stamps_guard before insert or update on public.passport_stamps
for each row execute function public.passport_stamps_guard();

create function public.visit_verifications_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and (new.status <> 'pending' or new.verified_by is not null or new.verified_at is not null) then
    raise exception 'Visits are verified by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger visit_verifications_guard before insert or update on public.visit_verifications
for each row execute function public.visit_verifications_guard();

create function public.stamp_rules_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.event_id is not null and not new.community_approved
     and exists(select 1 from public.events e where e.id = new.event_id and e.sensitive) then
    raise exception 'Sensitive cultural events cannot be gamified without community approval' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger stamp_rules_guard before insert or update on public.stamp_rules
for each row execute function public.stamp_rules_guard();

-- Traveler claims the verified stamp of a booking that the host marked as completed.
create function public.claim_verified_stamp(p_booking_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_visit uuid; v_stamp uuid; v_region text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and traveler_id = auth.uid();
  if not found then raise exception 'Booking not found' using errcode = '42501'; end if;
  if v_booking.status <> 'completed' then raise exception 'The visit is not completed yet'; end if;
  select id into v_stamp from public.passport_stamps
    where user_id = auth.uid() and experience_id = v_booking.experience_id and stamp_type = 'verified_visit';
  if found then return v_stamp; end if;
  select localized_region into v_region from public.experiences where id = v_booking.experience_id;
  insert into public.visit_verifications(user_id, experience_id, booking_id, method, status, verified_at)
  values (auth.uid(), v_booking.experience_id, p_booking_id, 'booking_completed', 'verified', now()) returning id into v_visit;
  insert into public.passport_stamps(user_id, experience_id, region_id, stamp_type, visit_verification_id)
  values (auth.uid(), v_booking.experience_id, v_region, 'verified_visit', v_visit) returning id into v_stamp;
  return v_stamp;
end;
$$;

-- Server only: resolves a pending visit (host one-time code, staff review) and stamps it.
create function public.award_verified_stamp(p_visit_verification_id uuid, p_verified_by uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_visit public.visit_verifications; v_stamp uuid; v_region text;
begin
  select * into v_visit from public.visit_verifications where id = p_visit_verification_id for update;
  if not found then raise exception 'Visit not found'; end if;
  if v_visit.method = 'offline_pending' then raise exception 'Offline claims need a validation method before being verified'; end if;
  if v_visit.status = 'rejected' then raise exception 'Visit was rejected'; end if;
  update public.visit_verifications set status = 'verified', verified_by = p_verified_by, verified_at = coalesce(verified_at, now()) where id = v_visit.id;
  select id into v_stamp from public.passport_stamps
    where user_id = v_visit.user_id and experience_id = v_visit.experience_id and stamp_type = 'verified_visit';
  if found then return v_stamp; end if;
  select localized_region into v_region from public.experiences where id = v_visit.experience_id;
  insert into public.passport_stamps(user_id, experience_id, region_id, stamp_type, visit_verification_id)
  values (v_visit.user_id, v_visit.experience_id, v_region, 'verified_visit', v_visit.id) returning id into v_stamp;
  return v_stamp;
end;
$$;

revoke all on function public.claim_verified_stamp(uuid), public.award_verified_stamp(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_verified_stamp(uuid) to authenticated, service_role;
grant execute on function public.award_verified_stamp(uuid, uuid) to service_role;

-- ───────────── Policies ─────────────
create policy passport_profiles_owner on public.passport_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy passport_profiles_public_read on public.passport_profiles for select to anon, authenticated using (visibility = 'public');
grant select on public.passport_profiles to anon, authenticated;
grant insert, update, delete on public.passport_profiles to authenticated;

create policy stamp_rules_public_read on public.stamp_rules for select to anon, authenticated using (status = 'published');
grant select on public.stamp_rules to anon, authenticated;

create policy passport_stamps_owner_read on public.passport_stamps for select to authenticated using (user_id = auth.uid());
create policy passport_stamps_shared_read on public.passport_stamps for select to anon, authenticated
  using (exists(select 1 from public.passport_profiles p where p.user_id = passport_stamps.user_id and p.visibility = 'public'));
create policy passport_stamps_owner_insert on public.passport_stamps for insert to authenticated
  with check (user_id = auth.uid() and stamp_type in ('self_reported', 'pending_sync') and visit_verification_id is null);
create policy passport_stamps_owner_delete on public.passport_stamps for delete to authenticated
  using (user_id = auth.uid() and stamp_type in ('self_reported', 'pending_sync'));
grant select on public.passport_stamps to anon, authenticated;
grant insert (user_id, rule_id, experience_id, region_id, stamp_type, note) on public.passport_stamps to authenticated;
grant delete on public.passport_stamps to authenticated;

create policy visit_verifications_owner_read on public.visit_verifications for select to authenticated using (user_id = auth.uid());
create policy visit_verifications_owner_insert on public.visit_verifications for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and method = 'offline_pending');
grant select on public.visit_verifications to authenticated;
grant insert (user_id, experience_id, method, evidence) on public.visit_verifications to authenticated;

-- Journal: strictly the owner. No staff policy exists.
create policy passport_journal_entries_owner on public.passport_journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.passport_journal_entries to authenticated;

create policy achievements_owner_read on public.achievements for select to authenticated using (user_id = auth.uid());
grant select on public.achievements to authenticated;
commit;
