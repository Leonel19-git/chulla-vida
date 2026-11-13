-- A refund request records a review task only. It never reverses money or changes a booking.
begin;

create function public.read_refund_review_request(p_booking_id uuid, p_payer_id uuid, p_environment text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings; r public.refunds;
begin
  if p_payer_id is null or p_environment is null or p_environment not in ('sandbox','live') then raise exception 'Invalid refund request'; end if;
  select * into b from public.bookings where id = p_booking_id;
  if not found or b.traveler_id <> p_payer_id then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  if b.payment_environment <> p_environment or public.configured_payment_environment() is distinct from p_environment then raise exception 'Payment environment mismatch'; end if;
  select f.* into r from public.refunds f join public.payments p on p.id = f.payment_id
    where f.booking_id = b.id and p.booking_id = b.id and p.payer_id = p_payer_id and p.environment = p_environment
    order by f.created_at desc, f.id desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id',r.id,'bookingId',b.id,'status',r.status,'amount',r.amount,'currency',r.currency,
    'reason',r.reason,'createdAt',r.created_at,'environment',p_environment);
end;
$$;

create function public.request_refund_review(p_booking_id uuid, p_payer_id uuid, p_environment text, p_reason text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings; p public.payments; r public.refunds; v_key text; v_count integer;
begin
  if p_payer_id is null or p_idempotency_key is null or p_environment is null or p_environment not in ('sandbox','live')
    or char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'Invalid refund request'; end if;
  -- Same booking-first lock order as payment capture. Requests cannot race into duplicate totals.
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.traveler_id <> p_payer_id then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users where id = p_payer_id and email_confirmed_at is not null) then raise exception 'Verified account required' using errcode = '42501'; end if;
  if b.payment_environment <> p_environment or public.configured_payment_environment() is distinct from p_environment then raise exception 'Payment environment mismatch'; end if;
  v_key := 'refund-review:' || p_payer_id::text || ':' || p_idempotency_key::text;
  select * into r from public.refunds where idempotency_key = v_key;
  if found then
    if r.booking_id is distinct from b.id then raise exception 'Idempotency conflict'; end if;
    return jsonb_build_object('id',r.id,'bookingId',b.id,'status',r.status,'amount',r.amount,'currency',r.currency,
      'reason',r.reason,'createdAt',r.created_at,'environment',p_environment);
  end if;
  -- Any existing active review for this booking is the same task, even after a refreshed key.
  select f.* into r from public.refunds f join public.payments pay on pay.id = f.payment_id
    where f.booking_id = b.id and pay.payer_id = p_payer_id and pay.environment = p_environment
      and f.status in ('requested','approved','processing') order by f.created_at desc limit 1;
  if found then
    return jsonb_build_object('id',r.id,'bookingId',b.id,'status',r.status,'amount',r.amount,'currency',r.currency,
      'reason',r.reason,'createdAt',r.created_at,'environment',p_environment);
  end if;
  -- Full canonical requests cannot be stacked on top of a completed or partial refund.
  if exists(select 1 from public.refunds f join public.payments pay on pay.id = f.payment_id
    where pay.booking_id = b.id and f.status = 'succeeded') then raise exception 'Existing refund requires manual review'; end if;
  if b.status = 'refunded' then raise exception 'Booking already refunded'; end if;
  select count(*) into v_count from public.payments where booking_id = b.id and status in ('captured','partially_refunded','refunded');
  if v_count <> 1 then raise exception 'Captured payment requires manual review'; end if;
  select * into p from public.payments where booking_id = b.id and status in ('captured','partially_refunded','refunded') for update;
  if p.payer_id <> p_payer_id or p.provider <> 'payphone' or p.status <> 'captured'
    or p.environment <> p_environment or p.amount <> b.total_amount or p.currency <> b.currency or p.currency <> 'USD'
    or p.amount <= 0 or (p.verified_via_webhook_at is not null or (p.server_verified_at is not null and p.verification_source = 'provider_api')) is not true
    then raise exception 'Captured payment requires manual review'; end if;
  insert into public.refunds(payment_id,booking_id,amount,currency,reason,status,requested_by,idempotency_key)
    values(p.id,b.id,b.total_amount,b.currency,trim(p_reason),'requested',p_payer_id,v_key) returning * into r;
  return jsonb_build_object('id',r.id,'bookingId',b.id,'status',r.status,'amount',r.amount,'currency',r.currency,
    'reason',r.reason,'createdAt',r.created_at,'environment',p_environment);
end;
$$;

revoke all on function public.read_refund_review_request(uuid,uuid,text), public.request_refund_review(uuid,uuid,text,text,uuid)
  from public,anon,authenticated;
grant execute on function public.read_refund_review_request(uuid,uuid,text), public.request_refund_review(uuid,uuid,text,text,uuid)
  to service_role;
commit;
