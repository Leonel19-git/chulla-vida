begin;

create table public.staff_accounts (
  user_id uuid primary key references auth.users(id),
  username text not null unique check (username ~ '^[a-z][a-z0-9._-]{2,47}$'),
  staff_role text not null check (staff_role in ('admin','reviewer')),
  active boolean not null default true,
  must_change_password boolean not null default true,
  credential_changed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.staff_provisioning_tickets (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  username text not null check (username ~ '^[a-z][a-z0-9._-]{2,47}$'),
  staff_role text not null check (staff_role in ('admin','reviewer')),
  requested_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  result_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
select public.secure_new_tables();
create policy staff_self_read on public.staff_accounts for select to authenticated using (user_id=auth.uid());
grant select on public.staff_accounts to authenticated;

-- A password change invalidates the dashboard privileges of every earlier Auth session.
create function public.staff_session_current(p_user_id uuid,p_session_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.staff_accounts a join auth.sessions s on s.user_id=a.user_id
    where a.user_id=p_user_id and s.id=p_session_id and a.active
      and (a.credential_changed_at is null or s.created_at>=a.credential_changed_at));
$$;
revoke all on function public.staff_session_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.staff_session_current(uuid,uuid) to service_role;

create function public.staff_access_enabled() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.staff_accounts a where a.user_id=auth.uid()
    and a.active and not a.must_change_password
    and public.staff_session_current(a.user_id,nullif(auth.jwt()->>'session_id','')::uuid));
$$;
revoke all on function public.staff_access_enabled() from public,anon;
grant execute on function public.staff_access_enabled() to authenticated,service_role;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
    and (not exists(select 1 from public.staff_accounts where user_id=auth.uid()) or public.staff_access_enabled());
$$;
create or replace function public.is_reviewer() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('admin','verification_reviewer'))
    and (not exists(select 1 from public.staff_accounts where user_id=auth.uid()) or public.staff_access_enabled());
$$;
-- Staff provisioning is not a verified traveler identity and cannot create tourist purchases/businesses.
create or replace function public.current_user_email_verified() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
    and not exists(select 1 from public.staff_accounts a where a.user_id=auth.uid());
$$;
alter policy merchant_document_read on storage.objects using (
  bucket_id='merchant-verification' and (public.is_reviewer() or exists(
    select 1 from public.organizations o where o.id::text=(storage.foldername(storage.objects.name))[1] and o.owner_id=auth.uid()))
);

create function public.reserve_staff_identifier() returns trigger language plpgsql set search_path='' as $$
begin
  if lower(coalesce(new.email,'')) like '%@staff.chulla-vida.invalid'
     and coalesce(new.raw_app_meta_data->>'lane','')<>'staff' then
    raise exception 'Staff identities require trusted provisioning' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.reserve_staff_identifier() from public,anon,authenticated;
create trigger reserve_staff_identifier before insert or update of email,raw_app_meta_data on auth.users
for each row execute function public.reserve_staff_identifier();

create function public.consume_staff_provisioning_ticket(p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.staff_provisioning_tickets;
begin
  update public.staff_provisioning_tickets set used_at=now()
    where token_hash=p_hash and used_at is null and expires_at>now()
      and exists(select 1 from public.user_roles r where r.user_id=requested_by and r.role='admin')
    returning * into t;
  if not found then raise exception 'Invalid provisioning ticket' using errcode='42501'; end if;
  return jsonb_build_object('id',t.id,'username',t.username,'staff_role',t.staff_role,'requested_by',t.requested_by);
end;
$$;
create function public.register_staff_account(p_ticket_id uuid,p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.staff_provisioning_tickets;
begin
  select * into t from public.staff_provisioning_tickets where id=p_ticket_id for update;
  if not found or t.used_at is null or t.result_user_id is not null or t.expires_at<now()
    or not exists(select 1 from public.user_roles where user_id=t.requested_by and role='admin') then
    raise exception 'Invalid provisioning ticket' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users u where u.id=p_user_id
     and u.email=t.username||'@staff.chulla-vida.invalid' and u.raw_app_meta_data->>'lane'='staff') then
    raise exception 'Staff identity mismatch';
  end if;
  insert into public.staff_accounts(user_id,username,staff_role,created_by) values(p_user_id,t.username,t.staff_role,t.requested_by);
  insert into public.user_roles(user_id,role,granted_by,reason)
    values(p_user_id,case when t.staff_role='admin' then 'admin' else 'verification_reviewer' end,t.requested_by,'Individual staff dashboard access');
  update public.staff_provisioning_tickets set result_user_id=p_user_id where id=t.id;
  insert into public.admin_audit_logs(actor_id,action,target_table,target_id,detail)
    values(t.requested_by,'staff_account_created','staff_accounts',p_user_id::text,jsonb_build_object('username',t.username,'staff_role',t.staff_role));
end;
$$;
revoke all on function public.consume_staff_provisioning_ticket(text),public.register_staff_account(uuid,uuid) from public,anon,authenticated;
grant execute on function public.consume_staff_provisioning_ticket(text),public.register_staff_account(uuid,uuid) to service_role;

create function public.complete_staff_password_change(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.staff_accounts set must_change_password=false,credential_changed_at=clock_timestamp()
    where user_id=p_user_id and active;
  if not found then raise exception 'Staff account not active'; end if;
  insert into public.admin_audit_logs(actor_id,action,target_table,target_id)
    values(p_user_id,'staff_password_changed','staff_accounts',p_user_id::text);
end;
$$;
revoke all on function public.complete_staff_password_change(uuid) from public,anon,authenticated;
grant execute on function public.complete_staff_password_change(uuid) to service_role;

create or replace function public.guard_verification_review() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_request public.merchant_verification_requests;
begin
  if auth.uid() is null or not public.is_reviewer()
     or not (public.current_user_email_verified() or public.staff_access_enabled()) then
    raise exception 'Confirmed reviewer required' using errcode='42501';
  end if;
  select * into v_request from public.merchant_verification_requests where id=new.request_id;
  if not found or v_request.applicant_id=auth.uid() or public.is_org_member(v_request.organization_id) then
    raise exception 'Reviewers cannot decide on their own organization' using errcode='42501';
  end if;
  if new.reviewer_id is distinct from auth.uid() then raise exception 'Reviewer must match current identity' using errcode='42501'; end if;
  if new.decision='approved' then
    if coalesce(new.checklist->'identity','false'::jsonb)<>'true'::jsonb
       or coalesce(new.checklist->'representation','false'::jsonb)<>'true'::jsonb
       or coalesce(new.checklist->'documents','false'::jsonb)<>'true'::jsonb then
      raise exception 'Completed human review checklist required';
    end if;
    if not exists(select 1 from public.verification_documents d where d.request_id=new.request_id) then raise exception 'Private supporting document required'; end if;
  end if;
  if nullif(trim(new.registry_reference),'') is not null and (
    coalesce(new.checklist->'official_registry','false'::jsonb)<>'true'::jsonb
    or char_length(trim(new.registry_reference)) not between 5 and 1000
  ) then raise exception 'Explicit official registry check and reference required'; end if;
  return new;
end;
$$;
commit;
