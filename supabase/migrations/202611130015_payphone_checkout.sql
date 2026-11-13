-- Hosted PayPhone checkout. No PAN, CVV, bank accounts or raw provider payloads are stored.
begin;
-- A test charge must never settle an ordinary live booking, even if server flags change.
create table public.payment_environment_binding (
  id boolean primary key default true check (id),
  environment text not null default 'live' check (environment in ('sandbox','live')),
  note text,
  updated_at timestamptz not null default now()
);
insert into public.payment_environment_binding(id) values(true);
create function public.configured_payment_environment() returns text language sql stable security definer set search_path = '' as $$
  select environment from public.payment_environment_binding where id;
$$;
revoke all on function public.configured_payment_environment() from public,anon,authenticated;
grant execute on function public.configured_payment_environment() to authenticated,service_role;
alter table public.bookings add column payment_environment text not null default 'live'
  check (payment_environment in ('sandbox','live'));
-- Existing bookings remain live. New requests derive the server-controlled database setting.
alter table public.bookings alter column payment_environment set default public.configured_payment_environment();
create function public.booking_environment_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.payment_environment is distinct from old.payment_environment then raise exception 'Booking payment environment is immutable'; end if;
  return new;
end;
$$;
create trigger bookings_environment_immutable before update of payment_environment on public.bookings
for each row execute function public.booking_environment_immutable();
alter table public.payments
  add column server_verified_at timestamptz,
  add column verification_source text check (verification_source in ('provider_api', 'signed_webhook'));

-- Reviewed tax/fee allocation supplied by the platform, never from the checkout request.
create table public.booking_payment_breakdowns (
  booking_id uuid primary key references public.bookings(id),
  amount_without_tax_cents bigint not null check (amount_without_tax_cents >= 0),
  amount_with_tax_cents bigint not null check (amount_with_tax_cents >= 0),
  tax_cents bigint not null check (tax_cents >= 0),
  service_cents bigint not null default 0 check (service_cents >= 0),
  tip_cents bigint not null default 0 check (tip_cents >= 0),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz not null default now()
);

create table public.payment_checkouts (
  reference uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  payer_id uuid not null references auth.users(id),
  idempotency_key uuid not null,
  provider text not null default 'payphone' check (provider = 'payphone'),
  environment text not null check (environment in ('sandbox', 'live')),
  amount_cents bigint not null check (amount_cents > 0),
  prepare_components jsonb not null check (jsonb_typeof(prepare_components) = 'object'),
  currency text not null check (currency = 'USD'),
  state text not null default 'preparing' check (state in ('preparing', 'prepared', 'uncertain', 'captured', 'cancelled')),
  checkout_url text,
  provider_prepare_id text,
  provider_transaction_id bigint unique,
  return_candidate_id bigint check (return_candidate_id > 0), -- untrusted hint only, no authority
  payment_id uuid references public.payments(id),
  requires_review boolean not null default false,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payer_id, idempotency_key)
);
create index payment_checkouts_booking_idx on public.payment_checkouts(booking_id);
select public.secure_new_tables();

-- Keep all existing immutability/authorization/capacity rules, changing only the evidence
-- accepted for paid: authenticated server-to-provider API or a validated signed webhook.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.bookings_guard()'::regprocedure) into v_definition;
  if position('p.verified_via_webhook_at is not null' in v_definition) = 0 then
    raise exception 'Expected booking payment guard was not found';
  end if;
  v_definition := replace(v_definition, 'p.verified_via_webhook_at is not null',
    '(p.verified_via_webhook_at is not null or (p.server_verified_at is not null and p.verification_source = ''provider_api''))');
  v_definition := replace(v_definition,'p.amount = new.total_amount','p.environment = new.payment_environment and p.amount = new.total_amount');
  execute v_definition;
end;
$$;

create function public.claim_payphone_checkout(p_booking_id uuid, p_payer_id uuid, p_idempotency_key uuid, p_environment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings; c public.payment_checkouts; d public.booking_payment_breakdowns; v_components jsonb; v_existing boolean := false;
begin
  if p_environment is null or p_environment not in ('sandbox', 'live') or p_idempotency_key is null or p_payer_id is null then raise exception 'Invalid checkout'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.traveler_id <> p_payer_id then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  select * into c from public.payment_checkouts where payer_id = p_payer_id and idempotency_key = p_idempotency_key;
  if found then
    if c.booking_id <> p_booking_id or c.environment <> p_environment then raise exception 'Idempotency conflict'; end if;
    v_existing := true;
  end if;
  if b.status not in ('awaiting_payment', 'payment_failed') or b.total_amount <= 0 or b.currency <> 'USD'
    or (b.expires_at is not null and b.expires_at <= now()) then raise exception 'Booking not payable'; end if;
  if b.payment_environment <> p_environment then raise exception 'Booking payment environment mismatch'; end if;
  if p_environment is distinct from public.configured_payment_environment() then raise exception 'Database payment environment mismatch'; end if;
  if not exists(select 1 from auth.users u where u.id = p_payer_id and u.email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
  if not exists(select 1 from public.availability_slots s where s.id = b.slot_id and s.starts_at > now() and s.status = 'open') then raise exception 'Slot unavailable'; end if;
  if not exists(select 1 from public.experiences e join public.organizations o on o.id = e.organization_id
    where e.id = b.experience_id and e.booking_enabled and e.status = 'published' and e.price_type = 'verified_offer'
    and o.verification_status in ('identity_reviewed', 'official_registry_verified') and e.operator_verification_status = o.verification_status)
    then raise exception 'Verified offer required'; end if;
  if p_environment = 'live' and not exists(select 1 from public.commercial_readiness where id and legal_entity_confirmed and legal_documents_approved and payment_gateway_live)
    then raise exception 'Commercial configuration pending'; end if;
  if p_environment = 'live' and (b.cancellation_policy_snapshot is null or not exists(
    select 1 from public.legal_acceptances a join public.legal_document_versions v on v.id = a.document_version_id
      join public.legal_documents doc on doc.id = v.document_id where a.user_id = p_payer_id and not a.is_draft_acknowledgement
      and doc.kind = 'terms' and v.status = 'published' and not v.has_pending_placeholders and a.content_hash = v.content_hash
      and (v.effective_from is null or v.effective_from <= current_date))) then raise exception 'Approved checkout terms required'; end if;
  select * into d from public.booking_payment_breakdowns where booking_id = b.id;
  if found then
    if d.amount_without_tax_cents + d.amount_with_tax_cents + d.tax_cents + d.service_cents + d.tip_cents <> b.total_amount * 100 then raise exception 'Tax allocation mismatch'; end if;
    v_components := jsonb_build_object('amountWithoutTax',d.amount_without_tax_cents,'amountWithTax',d.amount_with_tax_cents,'tax',d.tax_cents,'service',d.service_cents,'tip',d.tip_cents);
  elsif p_environment = 'live' then raise exception 'Reviewed tax allocation required';
  else v_components := jsonb_build_object('amountWithoutTax',(b.total_amount * 100)::bigint,'amountWithTax',0,'tax',0,'service',0,'tip',0);
  end if;
  if v_existing then return to_jsonb(c) || jsonb_build_object('claimed', false); end if;
  -- An uncertain or expired provider request must be reconciled, never blindly retried.
  select * into c from public.payment_checkouts where booking_id = b.id and payer_id = p_payer_id and state <> 'cancelled' order by created_at desc limit 1;
  if found then return to_jsonb(c) || jsonb_build_object('claimed', false); end if;
  insert into public.payment_checkouts(booking_id,payer_id,idempotency_key,environment,amount_cents,currency,prepare_components)
  values(b.id,p_payer_id,p_idempotency_key,p_environment,(b.total_amount * 100)::bigint,b.currency,v_components) returning * into c;
  return to_jsonb(c) || jsonb_build_object('claimed', true);
end;
$$;

create function public.finish_payphone_prepare(p_reference uuid, p_checkout_url text, p_provider_prepare_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_checkout_url !~ '^https://pay\.payphonetodoesposible\.com/Anonymous/Index\?paymentId='
    or char_length(p_checkout_url) > 2048 or char_length(coalesce(p_provider_prepare_id,'')) not between 1 and 200 then raise exception 'Invalid provider URL'; end if;
  update public.payment_checkouts set checkout_url = p_checkout_url, provider_prepare_id = p_provider_prepare_id, state = 'prepared'
    where reference = p_reference and state = 'preparing';
  if not found then raise exception 'Checkout not preparing'; end if;
end;
$$;

create function public.record_payphone_confirmation(p_reference uuid, p_transaction_id bigint, p_amount_cents bigint,
  p_currency text, p_outcome text, p_card_brand text default null, p_card_last4 text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.payment_checkouts; b public.bookings; p public.payments; v_review boolean;
begin
  if p_outcome is null or p_outcome not in ('captured','cancelled') or p_transaction_id is null or p_transaction_id <= 0 then raise exception 'Invalid confirmation'; end if;
  select * into c from public.payment_checkouts where reference = p_reference;
  if not found then raise exception 'Checkout unavailable'; end if;
  -- Same lock order as claim_payphone_checkout.
  select * into b from public.bookings where id = c.booking_id for update;
  select * into c from public.payment_checkouts where reference = p_reference for update;
  if p_amount_cents is distinct from c.amount_cents or p_currency is distinct from c.currency
    or b.total_amount * 100 <> c.amount_cents or b.currency <> c.currency then raise exception 'Amount or currency mismatch'; end if;
  if b.payment_environment <> c.environment then raise exception 'Booking payment environment mismatch'; end if;
  if c.provider_transaction_id is not null and c.provider_transaction_id <> p_transaction_id then raise exception 'Provider transaction mismatch'; end if;
  if c.state = 'captured' then return to_jsonb(c); end if;
  if c.state not in ('prepared','uncertain','cancelled') then raise exception 'Checkout not prepared'; end if;
  v_review := p_outcome = 'captured' and (b.status not in ('awaiting_payment','payment_failed')
    or (b.expires_at is not null and b.expires_at <= now())
    or not exists(select 1 from public.availability_slots s where s.id = b.slot_id and s.starts_at > now() and s.status = 'open')
    or not exists(select 1 from public.experiences e join public.organizations o on o.id = e.organization_id
      where e.id = b.experience_id and e.status = 'published' and e.booking_enabled
        and o.verification_status in ('identity_reviewed','official_registry_verified') and e.operator_verification_status = o.verification_status));
  select * into p from public.payments where idempotency_key = 'payphone:' || c.reference::text for update;
  if not found then
    insert into public.payments(booking_id,payer_id,organization_id,provider,environment,provider_payment_id,amount,currency,status,idempotency_key,
      server_verified_at,verification_source,card_brand,card_last4)
    values(b.id,c.payer_id,b.organization_id,'payphone',c.environment,p_transaction_id::text,c.amount_cents::numeric/100,c.currency,
      p_outcome,'payphone:' || c.reference::text,now(),'provider_api',p_card_brand,p_card_last4) returning * into p;
  else
    if p.booking_id <> b.id or p.provider <> 'payphone' or p.environment <> c.environment
      or p.provider_payment_id <> p_transaction_id::text then raise exception 'Payment identity mismatch'; end if;
    update public.payments set status = p_outcome,server_verified_at = now(),verification_source = 'provider_api' where id = p.id;
  end if;
  update public.payment_checkouts set state = p_outcome,provider_transaction_id = p_transaction_id,payment_id = p.id,requires_review = v_review
    where reference = p_reference returning * into c;
  insert into public.payment_events(provider,provider_event_id,payment_id,event_type,signature_valid,payload,processed_at)
    values('payphone','api:' || p_transaction_id::text || ':' || p_outcome,p.id,'provider_api.' || p_outcome,false,
      jsonb_build_object('verification_source','provider_api','checkout_reference',c.reference),now())
    on conflict(provider,provider_event_id) do nothing;
  if p_outcome = 'captured' then
    if not v_review then
      if b.status = 'payment_failed' then update public.bookings set status = 'awaiting_payment' where id = b.id; end if;
      update public.bookings set status = 'paid' where id = b.id;
    end if;
    if not exists(select 1 from public.receipts where payment_id = p.id and kind = 'payment_receipt') then
      insert into public.receipts(receipt_number,payment_id,booking_id,user_id,amount,currency)
      values('CV-PP-' || p_transaction_id::text,p.id,b.id,c.payer_id,c.amount_cents::numeric/100,c.currency);
    end if;
  end if;
  return to_jsonb(c);
end;
$$;

revoke all on function public.claim_payphone_checkout(uuid,uuid,uuid,text), public.finish_payphone_prepare(uuid,text,text),
  public.record_payphone_confirmation(uuid,bigint,bigint,text,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_payphone_checkout(uuid,uuid,uuid,text), public.finish_payphone_prepare(uuid,text,text),
  public.record_payphone_confirmation(uuid,bigint,bigint,text,text,text,text) to service_role;
commit;
