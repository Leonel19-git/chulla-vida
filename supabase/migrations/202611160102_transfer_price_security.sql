-- Close browser-controlled price and idempotency bypasses in the transfer flow.
-- Prerequisite: 202611160101_transfer_payments.sql. Does not enable payments or change any price.
-- Existing transfers retain their audit history; no automatic approval or money movement.
begin;
create or replace function public.start_transfer_payment(
  p_experience_id text, p_start date, p_end date, p_adults integer, p_children integer, p_amount numeric, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); e public.experiences; b public.organization_bank_accounts; t public.transfer_payments; v_reference text; v_try integer := 0;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'Verified account required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_start is null or p_end is null or p_end < p_start or p_end > p_start + 60
    or p_start < current_date or p_adults is null or p_adults < 1 or coalesce(p_children, -1) < 0 or p_adults + p_children > 50
    or p_amount is null or p_amount <= 0 or p_amount > 100000 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid transfer request'; end if;
  select * into t from public.transfer_payments where traveler_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if t.experience_id is distinct from p_experience_id or t.start_date is distinct from p_start
      or t.end_date is distinct from p_end or t.adults is distinct from p_adults
      or t.children is distinct from p_children or t.amount is distinct from p_amount then
      raise exception 'Idempotency conflict'; end if;
    select * into b from public.organization_bank_accounts where organization_id = t.organization_id;
    return public.transfer_payment_json(t, b);
  end if;
  select * into e from public.experiences where id = p_experience_id;
  if not found or e.organization_id is null then raise exception 'Host unavailable' using errcode = 'P0002'; end if;
  -- A browser quote is not a payment authority. Only a reviewed, fixed server tariff can be collected.
  -- More complex tariffs need a server quote/booking before this flow can accept them.
  if e.status <> 'published' or not e.booking_enabled or e.price_type <> 'verified_offer'
    or e.operator_verification_status not in ('identity_reviewed', 'official_registry_verified')
    or e.original_price_currency <> 'USD' or e.price_min is null or e.price_min <= 0
    or (e.price_max is not null and e.price_max <> e.price_min)
    or jsonb_array_length(e.price_options) <> 0 or jsonb_array_length(e.price_group_breakdown) <> 0
    or not exists(select 1 from public.organizations o where o.id = e.organization_id
      and o.verification_status in ('identity_reviewed', 'official_registry_verified')) then
    raise exception 'Verified fixed offer required' using errcode = '42501'; end if;
  if p_amount is distinct from round(e.price_min * (p_adults + p_children), 2) then
    raise exception 'Transfer amount does not match server price' using errcode = '22023'; end if;
  if e.organization_id in (select organization_id from public.organization_members where user_id = v_uid and status = 'active') then
    raise exception 'Hosts cannot pay their own experience' using errcode = '42501'; end if;
  select * into b from public.organization_bank_accounts where organization_id = e.organization_id;
  if not found then raise exception 'Host bank account missing' using errcode = 'P0002'; end if;
  loop
    v_try := v_try + 1;
    v_reference := 'CV-T-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists(select 1 from public.transfer_payments where reference = v_reference);
    if v_try > 8 then raise exception 'Reference unavailable'; end if;
  end loop;
  insert into public.transfer_payments(reference, traveler_id, organization_id, experience_id, start_date, end_date, adults, children, amount, idempotency_key)
    values (v_reference, v_uid, e.organization_id, e.id, p_start, p_end, p_adults, p_children, p_amount, p_idempotency_key)
    returning * into t;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
    values (v_uid, 'transfer.started', 'transfer_payments', t.id::text, jsonb_build_object('amount', t.amount, 'reference', t.reference));
  return public.transfer_payment_json(t, b);
end;
$$;
revoke all on function public.start_transfer_payment(text,date,date,integer,integer,numeric,uuid) from public,anon;
grant execute on function public.start_transfer_payment(text,date,date,integer,integer,numeric,uuid) to authenticated,service_role;
commit;
