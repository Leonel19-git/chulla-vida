-- CHULLA VIDA 3.3 · Pago por transferencia bancaria con comprobante.
--   organization_bank_accounts  cuenta que cada negocio registra para recibir transferencias.
--                               Solo la gestionan sus responsables; el viajero la ve únicamente
--                               a través de start_transfer_payment / transfer_instructions.
--   transfer_payments           una transferencia por compra: monto, fechas, personas, referencia,
--                               comprobante y estado. Sin escritura directa desde el navegador.
--   payment-receipts            bucket PRIVADO: <organización>/<viajero>/<transferencia>/<archivo>.
--                               Lo leen el viajero que lo subió y los miembros activos del negocio. Nadie más.
-- «paid» solo lo marca un responsable del negocio con review_transfer_payment, que deja auditoría.
begin;

create table public.organization_bank_accounts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  bank_name text not null check (char_length(btrim(bank_name)) between 2 and 80),
  account_type text not null check (account_type in ('ahorros', 'corriente')),
  account_number text not null check (account_number ~ '^[0-9]{6,20}$'),
  holder_name text not null check (char_length(btrim(holder_name)) between 3 and 120),
  holder_id text not null check (holder_id ~ '^([0-9]{10}|[0-9]{13})$'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transfer_payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^CV-T-[A-Z0-9]{6}$'),
  traveler_id uuid not null references auth.users(id),
  organization_id uuid not null references public.organizations(id),
  experience_id text not null references public.experiences(id),
  start_date date not null,
  end_date date not null,
  adults integer not null check (adults between 1 and 50),
  children integer not null default 0 check (children between 0 and 49),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 100000),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'awaiting_receipt'
    check (status in ('awaiting_receipt', 'receipt_submitted', 'paid', 'rejected', 'cancelled')),
  receipt_path text check (char_length(receipt_path) <= 400),
  receipt_mime text check (receipt_mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  receipt_size integer check (receipt_size between 1 and 5242880),
  receipt_submitted_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (traveler_id, idempotency_key),
  check (end_date >= start_date and end_date <= start_date + 60),
  check (adults + children <= 50),
  check (status not in ('receipt_submitted', 'paid') or (receipt_path is not null and receipt_mime is not null))
);
create index transfer_payments_traveler_idx on public.transfer_payments(traveler_id);
create index transfer_payments_org_status_idx on public.transfer_payments(organization_id, status);

select public.secure_new_tables();

-- ───────────── Cuenta bancaria del negocio ─────────────
create function public.organization_bank_accounts_stamp() returns trigger language plpgsql set search_path = '' as $$
begin
  new.bank_name := btrim(new.bank_name);
  new.holder_name := btrim(new.holder_name);
  if current_user in ('anon', 'authenticated') then new.updated_by := auth.uid(); end if;
  return new;
end;
$$;
create trigger organization_bank_accounts_stamp before insert or update on public.organization_bank_accounts
for each row execute function public.organization_bank_accounts_stamp();

create policy bank_accounts_manager_select on public.organization_bank_accounts for select to authenticated
  using (public.is_org_manager(organization_id));
create policy bank_accounts_manager_insert on public.organization_bank_accounts for insert to authenticated
  with check (public.is_org_manager(organization_id));
create policy bank_accounts_manager_update on public.organization_bank_accounts for update to authenticated
  using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy bank_accounts_manager_delete on public.organization_bank_accounts for delete to authenticated
  using (public.is_org_manager(organization_id));
grant select, insert, update, delete on public.organization_bank_accounts to authenticated;

-- ───────────── Transferencias: solo lectura para viajero y negocio ─────────────
create policy transfer_payments_read on public.transfer_payments for select to authenticated
  using (traveler_id = auth.uid() or public.is_org_member(organization_id));
grant select on public.transfer_payments to authenticated;

create function public.transfer_payment_json(t public.transfer_payments, b public.organization_bank_accounts)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'reference', t.reference, 'organizationId', t.organization_id, 'experienceId', t.experience_id,
    'startDate', t.start_date, 'endDate', t.end_date, 'adults', t.adults, 'children', t.children,
    'amount', t.amount, 'currency', t.currency, 'status', t.status, 'rejectionReason', t.rejection_reason,
    'bank', case when b.organization_id is null then null else jsonb_build_object(
      'bankName', b.bank_name, 'accountType', b.account_type, 'accountNumber', b.account_number,
      'holderName', b.holder_name, 'holderId', b.holder_id) end);
$$;
revoke all on function public.transfer_payment_json(public.transfer_payments, public.organization_bank_accounts) from public, anon, authenticated;

-- El viajero abre una transferencia. Si el negocio no registró su cuenta, no se crea nada.
create function public.start_transfer_payment(
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
    if t.experience_id <> p_experience_id then raise exception 'Idempotency conflict'; end if;
    select * into b from public.organization_bank_accounts where organization_id = t.organization_id;
    return public.transfer_payment_json(t, b);
  end if;
  select * into e from public.experiences where id = p_experience_id;
  if not found or e.organization_id is null then raise exception 'Host unavailable' using errcode = 'P0002'; end if;
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

-- Datos para transferir, otra vez: solo el viajero dueño y mientras falte un comprobante válido.
create function public.transfer_instructions(p_transfer_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfer_payments; b public.organization_bank_accounts;
begin
  select * into t from public.transfer_payments where id = p_transfer_id;
  if not found or t.traveler_id is distinct from auth.uid() then raise exception 'Transfer unavailable' using errcode = '42501'; end if;
  if t.status not in ('awaiting_receipt', 'rejected') then return public.transfer_payment_json(t, null); end if;
  select * into b from public.organization_bank_accounts where organization_id = t.organization_id;
  return public.transfer_payment_json(t, b);
end;
$$;

-- El viajero adjunta el comprobante que ya subió al bucket privado.
create function public.submit_transfer_receipt(p_transfer_id uuid, p_path text, p_mime text, p_size integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t public.transfer_payments;
begin
  select * into t from public.transfer_payments where id = p_transfer_id for update;
  if not found or v_uid is null or t.traveler_id <> v_uid then raise exception 'Transfer unavailable' using errcode = '42501'; end if;
  if t.status not in ('awaiting_receipt', 'rejected') then raise exception 'Transfer is not waiting for a receipt'; end if;
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') or p_size is null or p_size < 1 or p_size > 5242880
    or p_path is null or char_length(p_path) > 400
    or p_path not like (t.organization_id::text || '/' || v_uid::text || '/' || t.id::text || '/%') or p_path like '%..%' then
    raise exception 'Invalid receipt'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id = 'payment-receipts' and o.name = p_path) then
    raise exception 'Receipt file not found'; end if;
  update public.transfer_payments set status = 'receipt_submitted', receipt_path = p_path, receipt_mime = p_mime, receipt_size = p_size,
    receipt_submitted_at = now(), rejection_reason = null, reviewed_by = null, reviewed_at = null
    where id = t.id returning * into t;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
    values (v_uid, 'transfer.receipt_submitted', 'transfer_payments', t.id::text, jsonb_build_object('mime', p_mime, 'size', p_size));
  return public.transfer_payment_json(t, null);
end;
$$;

-- Solo un responsable activo del negocio (owner, manager o representante) decide. Nunca el propio viajero.
create function public.review_transfer_payment(p_transfer_id uuid, p_decision text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); t public.transfer_payments; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into t from public.transfer_payments where id = p_transfer_id for update;
  if not found or v_uid is null or not public.is_org_manager(t.organization_id) or t.traveler_id = v_uid then
    raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_decision not in ('paid', 'rejected') then raise exception 'Invalid decision'; end if;
  if t.status <> 'receipt_submitted' then raise exception 'Transfer is not waiting for review'; end if;
  if p_decision = 'rejected' and (v_reason is null or char_length(v_reason) not between 3 and 500) then
    raise exception 'Rejection reason required'; end if;
  update public.transfer_payments set status = p_decision, reviewed_by = v_uid, reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then v_reason else null end
    where id = t.id returning * into t;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
    values (v_uid, 'transfer.' || p_decision, 'transfer_payments', t.id::text,
            jsonb_build_object('organization_id', t.organization_id, 'amount', t.amount, 'reference', t.reference, 'reason', v_reason));
  return public.transfer_payment_json(t, null);
end;
$$;

revoke all on function public.start_transfer_payment(text, date, date, integer, integer, numeric, uuid),
  public.transfer_instructions(uuid), public.submit_transfer_receipt(uuid, text, text, integer),
  public.review_transfer_payment(uuid, text, text) from public, anon;
grant execute on function public.start_transfer_payment(text, date, date, integer, integer, numeric, uuid),
  public.transfer_instructions(uuid), public.submit_transfer_receipt(uuid, text, text, integer),
  public.review_transfer_payment(uuid, text, text) to authenticated, service_role;

-- ───────────── Bucket privado de comprobantes ─────────────
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Subir: solo el viajero, en la carpeta de SU transferencia abierta.
create policy payment_receipts_traveler_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists(select 1 from public.transfer_payments t
             where t.id::text = (storage.foldername(storage.objects.name))[3]
               and t.organization_id::text = (storage.foldername(storage.objects.name))[1]
               and t.traveler_id = auth.uid()
               and t.status in ('awaiting_receipt', 'rejected')));
-- Leer: el viajero que lo subió o un miembro activo del negocio de esa carpeta.
create policy payment_receipts_read on storage.objects for select to authenticated using (
  bucket_id = 'payment-receipts'
  and ((storage.foldername(name))[2] = auth.uid()::text
       or exists(select 1 from public.organization_members m
                 where m.organization_id::text = (storage.foldername(storage.objects.name))[1]
                   and m.user_id = auth.uid() and m.status = 'active')));
-- Sin update ni delete desde el cliente: el comprobante es evidencia; la retención la gestiona el equipo.
commit;
