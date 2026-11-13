-- CHULLA VIDA 3.0 · Bookings (state machine + capacity locks), payments, refunds, plans, receipts.
-- Card data never touches this database: only provider references, brand and last four digits.
begin;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  traveler_id uuid not null references auth.users(id),
  experience_id text not null references public.experiences(id),
  organization_id uuid references public.organizations(id),
  slot_id uuid not null references public.availability_slots(id),
  participants integer not null check (participants between 1 and 100),
  status text not null default 'draft' check (status in (
    'draft', 'requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment',
    'paid', 'completed', 'expired', 'cancelled', 'refunded', 'payment_failed')),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency text not null check (currency in ('USD', 'EUR')),
  traveler_note text check (char_length(traveler_note) <= 2000),
  cancel_reason text check (char_length(cancel_reason) <= 1000),
  cancellation_policy_snapshot text,
  terms_version text,
  idempotency_key uuid not null default gen_random_uuid(),
  expires_at timestamptz,
  confirmed_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (traveler_id, idempotency_key)
);
create index bookings_traveler_idx on public.bookings(traveler_id);
create index bookings_org_idx on public.bookings(organization_id);
create index bookings_slot_idx on public.bookings(slot_id);
create index bookings_status_idx on public.bookings(status);

create table public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  age_bracket text not null default 'undeclared' check (age_bracket in ('undeclared', 'minor', 'adult')),
  notes text check (char_length(notes) <= 1000),          -- needs the traveler chooses to share with the host
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index booking_participants_booking_idx on public.booking_participants(booking_id);

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid,
  actor_kind text not null check (actor_kind in ('traveler', 'operator_or_staff', 'system')),
  reason text,
  created_at timestamptz not null default now()
);
create index booking_status_history_booking_idx on public.booking_status_history(booking_id);
create trigger booking_status_history_append_only before update on public.booking_status_history
for each row execute function public.prevent_mutation();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  experience_id text not null references public.experiences(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text check (char_length(body) <= 4000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  operator_reply text check (char_length(operator_reply) <= 2000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_experience_idx on public.reviews(experience_id, status);

create table public.plans (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  audience text not null check (audience in ('traveler', 'host')),
  description text not null default '',
  features jsonb not null default '[]' check (jsonb_typeof(features) = 'array'),
  -- NULL price = "pendiente de definición". A price exists only once approved.
  price_amount numeric(12, 2) check (price_amount >= 0),
  price_currency text check (price_currency in ('USD')),
  billing_interval text check (billing_interval in ('month', 'year')),
  price_status text not null default 'pending_definition' check (price_status in ('pending_definition', 'approved')),
  is_editorial_proposal boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_price_only_when_approved check (
    (price_status = 'pending_definition' and price_amount is null and price_currency is null and billing_interval is null)
    or (price_status = 'approved' and price_amount is not null and price_currency is not null))
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  plan_id text not null references public.plans(id),
  status text not null default 'incomplete' check (status in ('incomplete', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  provider text check (provider in ('payphone', 'kushki', 'sandbox', 'none')),
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
create index subscriptions_user_idx on public.subscriptions(user_id);

create table public.subscription_events (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);
create index subscription_events_subscription_idx on public.subscription_events(subscription_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  subscription_id uuid references public.subscriptions(id),
  payer_id uuid not null references auth.users(id),
  organization_id uuid references public.organizations(id),
  provider text not null check (provider in ('payphone', 'kushki', 'sandbox')),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'live')),
  provider_payment_id text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'EUR')),
  status text not null default 'pending' check (status in ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  -- Set only when a signed provider webhook confirmed the charge (never from a browser redirect).
  verified_via_webhook_at timestamptz,
  card_brand text check (char_length(card_brand) <= 40),
  card_last4 text check (card_last4 ~ '^[0-9]{4}$'),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  check (num_nonnulls(booking_id, subscription_id) = 1),
  check (provider <> 'sandbox' or environment = 'sandbox')
);
create index payments_booking_idx on public.payments(booking_id);
create index payments_payer_idx on public.payments(payer_id);
create index payments_org_idx on public.payments(organization_id);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  attempt_no integer not null check (attempt_no >= 1),
  status text not null check (status in ('started', 'succeeded', 'failed', 'abandoned')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (payment_id, attempt_no)
);

-- Raw provider notifications. unique(provider, provider_event_id) makes webhook replays harmless.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('payphone', 'kushki', 'sandbox')),
  provider_event_id text not null,
  payment_id uuid references public.payments(id) on delete set null,
  event_type text not null,
  signature_valid boolean not null,
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  booking_id uuid references public.bookings(id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'EUR')),
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'requested' check (status in ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null unique,
  provider_refund_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds(payment_id);

-- Payment vouchers of the travel wallet (non-custodial). Not a tax invoice unless stated.
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_id uuid not null references public.payments(id),
  booking_id uuid references public.bookings(id),
  user_id uuid not null references auth.users(id),
  kind text not null default 'payment_receipt' check (kind in ('payment_receipt', 'refund_note')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency in ('USD', 'EUR')),
  is_fiscal_document boolean not null default false,
  storage_path text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index receipts_user_idx on public.receipts(user_id);

select public.secure_new_tables();

-- ───────────── State machine ─────────────
create function public.booking_transition_allowed(p_from text, p_to text) returns boolean language sql immutable set search_path = '' as $$
  select case p_from
    when 'draft' then p_to in ('requested', 'cancelled', 'expired')
    when 'requested' then p_to in ('awaiting_merchant_confirmation', 'confirmed', 'cancelled', 'expired')
    when 'awaiting_merchant_confirmation' then p_to in ('confirmed', 'cancelled', 'expired')
    when 'confirmed' then p_to in ('awaiting_payment', 'cancelled', 'expired')
    when 'awaiting_payment' then p_to in ('paid', 'payment_failed', 'cancelled', 'expired')
    when 'payment_failed' then p_to in ('awaiting_payment', 'cancelled', 'expired')
    when 'paid' then p_to in ('completed', 'cancelled', 'refunded')
    when 'completed' then p_to in ('refunded')
    when 'cancelled' then p_to in ('refunded')
    else false end;
$$;

-- 1) Who may do what. Runs as the caller: API roles are restricted, server paths are trusted.
create function public.bookings_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  v_client boolean := current_user in ('anon', 'authenticated');
  v_uid uuid := auth.uid();
  v_exp record; v_slot record; v_traveler boolean; v_operator boolean;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'requested') then raise exception 'Invalid initial booking status' using errcode = '42501'; end if;
    select e.booking_enabled, e.status, e.organization_id, e.cancellation_policy into v_exp from public.experiences e where e.id = new.experience_id;
    if not found or not v_exp.booking_enabled or v_exp.status <> 'published' then raise exception 'Experience is not bookable'; end if;
    select s.status, s.price_amount, s.currency into v_slot from public.availability_slots s where s.id = new.slot_id and s.experience_id = new.experience_id;
    if not found or v_slot.status <> 'open' or v_slot.price_amount is null then raise exception 'Slot unavailable'; end if;
    if v_client then
      if v_uid is null or new.traveler_id is distinct from v_uid then raise exception 'Bookings can only be created for yourself' using errcode = '42501'; end if;
      if not public.current_user_email_verified() then raise exception 'Confirmed email required' using errcode = '42501'; end if;
    end if;
    -- Amounts always come from the verified slot, never from the request.
    new.organization_id := v_exp.organization_id;
    new.unit_price := v_slot.price_amount;
    new.currency := v_slot.currency;
    new.total_amount := v_slot.price_amount * new.participants;
    new.cancellation_policy_snapshot := v_exp.cancellation_policy;
    new.confirmed_at := null; new.paid_at := null; new.completed_at := null; new.cancelled_at := null;
    return new;
  end if;

  if new.id <> old.id or new.traveler_id <> old.traveler_id or new.experience_id <> old.experience_id or new.slot_id <> old.slot_id
     or new.organization_id is distinct from old.organization_id or new.participants <> old.participants
     or new.unit_price <> old.unit_price or new.total_amount <> old.total_amount or new.currency <> old.currency
     or new.idempotency_key <> old.idempotency_key or new.code <> old.code then
    raise exception 'Booking terms are immutable; create a new request' using errcode = '42501';
  end if;
  if new.status = old.status then
    if v_client and old.traveler_id is distinct from v_uid and new.traveler_note is distinct from old.traveler_note then
      raise exception 'Only the traveler edits the traveler note' using errcode = '42501';
    end if;
    return new;
  end if;
  if not public.booking_transition_allowed(old.status, new.status) then
    raise exception 'Invalid booking transition: % -> %', old.status, new.status;
  end if;
  if v_client then
    v_traveler := v_uid is not null and old.traveler_id = v_uid;
    v_operator := v_uid is not null and ((old.organization_id is not null and public.is_org_manager(old.organization_id)) or public.is_admin());
    if new.status = 'cancelled' and old.status <> 'paid' and (v_traveler or v_operator) then
      null;   -- cancelling before payment; paid bookings go through the refund flow
    elsif v_traveler and old.status = 'draft' and new.status = 'requested' then
      null;
    elsif v_operator and not v_traveler and (
         (old.status = 'requested' and new.status in ('awaiting_merchant_confirmation', 'confirmed'))
      or (old.status = 'awaiting_merchant_confirmation' and new.status = 'confirmed')
      or (old.status = 'confirmed' and new.status = 'awaiting_payment')
      or (old.status = 'paid' and new.status = 'completed')) then
      null;
    else
      raise exception 'Transition % -> % is not permitted for this account', old.status, new.status using errcode = '42501';
    end if;
  end if;
  -- "paid" is true only with a captured payment confirmed by a signed webhook, for the exact amount.
  if new.status = 'paid' then
    if not exists(select 1 from public.payments p where p.booking_id = new.id and p.status = 'captured'
                  and p.verified_via_webhook_at is not null and p.amount = new.total_amount and p.currency = new.currency) then
      raise exception 'Paid status requires a webhook-verified payment for the exact amount' using errcode = '42501';
    end if;
    new.paid_at := now();
  elsif new.status = 'confirmed' then new.confirmed_at := now();
  elsif new.status = 'completed' then new.completed_at := now();
  elsif new.status = 'cancelled' then new.cancelled_at := now();
  end if;
  return new;
end;
$$;

-- 2) Capacity: taken when a booking starts holding seats, returned when it stops. Row lock on the slot.
create function public.bookings_capacity() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_slot public.availability_slots;
  v_holding constant text[] := array['requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'payment_failed', 'paid'];
begin
  if new.status = any(v_holding) and (tg_op = 'INSERT' or not old.status = any(v_holding)) then
    select * into v_slot from public.availability_slots where id = new.slot_id for update;
    if not found or v_slot.status <> 'open' then raise exception 'Slot unavailable'; end if;
    if v_slot.reserved + new.participants > v_slot.capacity then
      raise exception 'Not enough capacity: % seat(s) left', v_slot.capacity - v_slot.reserved using errcode = 'P0001';
    end if;
    update public.availability_slots set reserved = reserved + new.participants where id = new.slot_id;
  elsif tg_op = 'UPDATE' and old.status = any(v_holding) and new.status in ('cancelled', 'expired', 'refunded') then
    perform 1 from public.availability_slots where id = old.slot_id for update;
    update public.availability_slots set reserved = greatest(reserved - old.participants, 0) where id = old.slot_id;
  end if;
  return new;
end;
$$;

-- 3) History of every status change.
create function public.bookings_history() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, actor_kind, reason)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, v_uid,
            case when v_uid is null then 'system' when v_uid = new.traveler_id then 'traveler' else 'operator_or_staff' end,
            case when new.status = 'cancelled' then new.cancel_reason else null end);
  end if;
  return new;
end;
$$;

-- Trigger names fix the firing order: guard, then capacity.
create trigger bookings_1_guard before insert or update on public.bookings for each row execute function public.bookings_guard();
create trigger bookings_2_capacity before insert or update on public.bookings for each row execute function public.bookings_capacity();
create trigger bookings_3_history after insert or update on public.bookings for each row execute function public.bookings_history();

-- Reserve seats atomically. Idempotent per traveler + key; locks the slot row so that two
-- simultaneous requests for the last seats cannot both succeed.
create function public.request_booking(
  p_experience_id text, p_slot_id uuid, p_participants integer, p_idempotency_key uuid, p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_existing public.bookings; v_slot public.availability_slots; v_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.current_user_email_verified() then raise exception 'Confirmed email required' using errcode = '42501'; end if;
  if p_idempotency_key is null then raise exception 'Idempotency key required'; end if;
  if p_participants is null or p_participants not between 1 and 100 then raise exception 'Invalid number of participants'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_idempotency_key::text, 0));
  select * into v_existing from public.bookings where traveler_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.experience_id <> p_experience_id or v_existing.slot_id <> p_slot_id or v_existing.participants <> p_participants then
      raise exception 'Idempotency key reused for a different request';
    end if;
    return v_existing.id;
  end if;
  if not exists(select 1 from public.experiences e where e.id = p_experience_id and e.booking_enabled and e.status = 'published') then
    raise exception 'Experience is not bookable';
  end if;
  select * into v_slot from public.availability_slots where id = p_slot_id and experience_id = p_experience_id for update;
  if not found or v_slot.status <> 'open' or v_slot.price_amount is null or v_slot.starts_at <= now() then raise exception 'Slot unavailable'; end if;
  if v_slot.reserved + p_participants > v_slot.capacity then
    raise exception 'Not enough capacity: % seat(s) left', v_slot.capacity - v_slot.reserved using errcode = 'P0001';
  end if;
  insert into public.bookings(traveler_id, experience_id, slot_id, participants, status, unit_price, total_amount, currency, traveler_note, idempotency_key)
  values (v_uid, p_experience_id, p_slot_id, p_participants, 'requested', 0, 0, v_slot.currency, nullif(trim(coalesce(p_note, '')), ''), p_idempotency_key)
  returning id into v_id;
  return v_id;
end;
$$;

-- Server only. Called by the webhook handler AFTER it checked the provider signature.
-- Replays return the same payment; amount, currency and booking state must match exactly.
create function public.record_payment_webhook(
  p_provider text, p_provider_event_id text, p_provider_payment_id text, p_idempotency_key text,
  p_booking_id uuid, p_amount numeric, p_currency text, p_outcome text, p_signature_valid boolean,
  p_environment text default 'sandbox', p_payload jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_payment public.payments; v_event_id bigint;
begin
  if p_outcome not in ('captured', 'failed') then raise exception 'Unsupported payment outcome'; end if;
  insert into public.payment_events(provider, provider_event_id, event_type, signature_valid, payload)
  values (p_provider, p_provider_event_id, 'payment.' || p_outcome, coalesce(p_signature_valid, false), coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, provider_event_id) do nothing returning id into v_event_id;
  if v_event_id is null then
    -- Replay of an already received notification.
    select p.* into v_payment from public.payment_events e join public.payments p on p.id = e.payment_id
      where e.provider = p_provider and e.provider_event_id = p_provider_event_id;
    return v_payment.id;
  end if;
  if p_signature_valid is distinct from true then
    return null;   -- stored for forensics, never applied
  end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  select * into v_payment from public.payments where idempotency_key = p_idempotency_key for update;
  if found then
    if v_payment.booking_id is distinct from p_booking_id or v_payment.amount <> p_amount or v_payment.currency <> p_currency then
      raise exception 'Idempotency key reused for a different payment';
    end if;
  else
    if p_amount <> v_booking.total_amount or p_currency <> v_booking.currency then raise exception 'Amount or currency does not match the booking'; end if;
    insert into public.payments(booking_id, payer_id, organization_id, provider, environment, provider_payment_id, amount, currency, status, idempotency_key)
    values (p_booking_id, v_booking.traveler_id, v_booking.organization_id, p_provider, p_environment, p_provider_payment_id, p_amount, p_currency, 'pending', p_idempotency_key)
    returning * into v_payment;
  end if;
  if p_amount <> v_booking.total_amount or p_currency <> v_booking.currency then raise exception 'Amount or currency does not match the booking'; end if;
  if v_payment.status <> 'captured' then
    if p_outcome = 'captured' then
      if v_booking.status not in ('awaiting_payment', 'payment_failed') then raise exception 'Booking is not awaiting payment'; end if;
      update public.payments set status = 'captured', verified_via_webhook_at = now(), provider_payment_id = p_provider_payment_id where id = v_payment.id;
      if v_booking.status = 'payment_failed' then update public.bookings set status = 'awaiting_payment' where id = p_booking_id; end if;
      update public.bookings set status = 'paid' where id = p_booking_id;
    else
      update public.payments set status = 'failed' where id = v_payment.id;
      if v_booking.status = 'awaiting_payment' then update public.bookings set status = 'payment_failed' where id = p_booking_id; end if;
    end if;
  end if;
  update public.payment_events set payment_id = v_payment.id, processed_at = now() where id = v_event_id;
  return v_payment.id;
end;
$$;

-- Server only (scheduled job): free seats held by requests nobody answered or paid in time.
create function public.expire_stale_bookings(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.bookings set status = 'expired'
  where expires_at is not null and expires_at <= p_now
    and status in ('draft', 'requested', 'awaiting_merchant_confirmation', 'confirmed', 'awaiting_payment', 'payment_failed');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.booking_transition_allowed(text, text), public.request_booking(text, uuid, integer, uuid, text),
  public.record_payment_webhook(text, text, text, text, uuid, numeric, text, text, boolean, text, jsonb),
  public.expire_stale_bookings(timestamptz) from public, anon, authenticated;
grant execute on function public.booking_transition_allowed(text, text), public.request_booking(text, uuid, integer, uuid, text) to authenticated, service_role;
grant execute on function public.record_payment_webhook(text, text, text, text, uuid, numeric, text, text, boolean, text, jsonb),
  public.expire_stale_bookings(timestamptz) to service_role;

-- ───────────── Policies ─────────────
create function public.can_read_booking(p_booking_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bookings b where b.id = p_booking_id
    and (b.traveler_id = auth.uid() or public.is_admin() or (b.organization_id is not null and public.is_org_manager(b.organization_id))));
$$;
revoke all on function public.can_read_booking(uuid) from public, anon, authenticated;
grant execute on function public.can_read_booking(uuid) to authenticated, service_role;

create policy bookings_parties_read on public.bookings for select to authenticated
  using (traveler_id = auth.uid() or public.is_admin() or (organization_id is not null and public.is_org_manager(organization_id)));
create policy bookings_traveler_insert on public.bookings for insert to authenticated with check (traveler_id = auth.uid());
create policy bookings_parties_update on public.bookings for update to authenticated
  using (traveler_id = auth.uid() or public.is_admin() or (organization_id is not null and public.is_org_manager(organization_id)))
  with check (traveler_id = auth.uid() or public.is_admin() or (organization_id is not null and public.is_org_manager(organization_id)));
grant select on public.bookings to authenticated;
grant insert (traveler_id, experience_id, slot_id, participants, status, traveler_note, idempotency_key) on public.bookings to authenticated;
grant update (status, traveler_note, cancel_reason) on public.bookings to authenticated;

create policy booking_participants_read on public.booking_participants for select to authenticated using (public.can_read_booking(booking_id));
create policy booking_participants_traveler_insert on public.booking_participants for insert to authenticated
  with check (exists(select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid()));
create policy booking_participants_traveler_update on public.booking_participants for update to authenticated
  using (exists(select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid()))
  with check (exists(select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid()));
create policy booking_participants_traveler_delete on public.booking_participants for delete to authenticated
  using (exists(select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid()));
grant select, insert, update, delete on public.booking_participants to authenticated;

create policy booking_status_history_read on public.booking_status_history for select to authenticated using (public.can_read_booking(booking_id));
grant select on public.booking_status_history to authenticated;

-- Reviews: only after a completed booking of your own; publication is moderated.
create policy reviews_public_read on public.reviews for select to anon, authenticated using (status = 'published');
create policy reviews_author_read on public.reviews for select to authenticated using (author_id = auth.uid() or public.is_moderator());
create policy reviews_author_insert on public.reviews for insert to authenticated with check (
  author_id = auth.uid()
  and exists(select 1 from public.bookings b where b.id = booking_id and b.traveler_id = auth.uid()
             and b.status = 'completed' and b.experience_id = reviews.experience_id));
create policy reviews_moderator_update on public.reviews for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
grant select on public.reviews to anon, authenticated;
grant insert (booking_id, experience_id, author_id, rating, body) on public.reviews to authenticated;
grant update (status, published_at) on public.reviews to authenticated;

-- Money tables: read-only for the parties; every write goes through the service role.
create policy payments_parties_read on public.payments for select to authenticated
  using (payer_id = auth.uid() or public.has_role('admin') or public.has_role('finance')
         or (organization_id is not null and public.is_org_manager(organization_id)));
create policy payment_attempts_payer_read on public.payment_attempts for select to authenticated
  using (exists(select 1 from public.payments p where p.id = payment_id and p.payer_id = auth.uid()));
create policy refunds_parties_read on public.refunds for select to authenticated
  using (exists(select 1 from public.payments p where p.id = payment_id));
create policy receipts_owner_read on public.receipts for select to authenticated using (user_id = auth.uid() or public.has_role('finance') or public.is_admin());
grant select on public.payments, public.payment_attempts, public.refunds, public.receipts to authenticated;
-- payment_events: no policy and no grant on purpose (service role only).

create policy plans_public_read on public.plans for select to anon, authenticated using (status = 'published');
create policy plans_admin_read on public.plans for select to authenticated using (public.is_admin());
grant select on public.plans to anon, authenticated;
create policy subscriptions_owner_read on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy subscription_events_owner_read on public.subscription_events for select to authenticated
  using (exists(select 1 from public.subscriptions s where s.id = subscription_id));
grant select on public.subscriptions, public.subscription_events to authenticated;
commit;
