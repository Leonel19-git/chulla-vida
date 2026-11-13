-- CHULLA VIDA 3.0 · Identity, roles, organizations and verification workflow.
-- Additive over 202611130001-3: nothing that the current client uses is dropped.
begin;

-- ───────────── Shared helpers ─────────────
create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.prevent_mutation() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Append-only table: % does not allow %', tg_table_name, tg_op using errcode = '42501';
end;
$$;

-- Every migration calls this right after creating its tables: RLS on, default API grants
-- removed, service_role allowed, updated_at maintained. Policies and grants come afterwards.
create function public.secure_new_tables() returns void language plpgsql set search_path = '' as $$
declare r record;
begin
  for r in
    select c.oid, c.oid::regclass::text as tbl
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  loop
    execute format('alter table %s enable row level security', r.tbl);
    execute format('revoke all on table %s from public, anon, authenticated', r.tbl);
    execute format('grant all on table %s to service_role', r.tbl);
    if exists(select 1 from pg_catalog.pg_attribute a where a.attrelid = r.oid and a.attname = 'updated_at' and not a.attisdropped) then
      execute format('create trigger set_updated_at before update on %s for each row execute function public.set_updated_at()', r.tbl);
    end if;
  end loop;
end;
$$;
revoke all on function public.secure_new_tables() from public, anon, authenticated;

-- ───────────── Audit log (append-only) ─────────────
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,                       -- historical value; intentionally not a foreign key
  action text not null check (char_length(action) between 1 and 120),
  target_table text,
  target_id text,
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);
create index admin_audit_logs_target_idx on public.admin_audit_logs(target_table, target_id);
create index admin_audit_logs_actor_idx on public.admin_audit_logs(actor_id);
create trigger admin_audit_logs_append_only before update or delete on public.admin_audit_logs
for each row execute function public.prevent_mutation();

-- ───────────── Profiles ─────────────
alter table public.profiles
  add column avatar_path text check (char_length(avatar_path) <= 400),
  add column onboarding jsonb not null default '{}' check (jsonb_typeof(onboarding) = 'object'),
  add column onboarding_completed_at timestamptz,
  add column travels_with_pet boolean,
  add column age_bracket text not null default 'undeclared' check (age_bracket in ('undeclared', 'minor', 'adult')),
  add column terms_accepted_version text,
  add column terms_accepted_at timestamptz,
  add column marketing_consent_at timestamptz,
  add column voice_consent_at timestamptz,
  add column location_consent_at timestamptz,
  add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
-- Consent and terms columns are written only by server functions (see consent/legal migration).
grant update (avatar_path, onboarding, onboarding_completed_at, travels_with_pet, age_bracket) on public.profiles to authenticated;

-- "verified_email" is derived from Auth, never stored or self-declared.
create function public.current_user_email_verified() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;

-- ───────────── Privileged roles ─────────────
alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'moderator', 'verification_reviewer', 'finance', 'privacy_officer', 'support'));
alter table public.user_roles
  add column granted_by uuid references auth.users(id) on delete set null,
  add column granted_at timestamptz not null default now(),
  add column reason text check (char_length(reason) <= 500);

create function public.has_role(p_role text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = p_role);
$$;
create function public.is_reviewer() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'verification_reviewer'));
$$;
create function public.is_moderator() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'moderator'));
$$;

-- Every change of a privileged role is audited, whichever path performs it.
create function public.audit_user_roles() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'user_role_delete', 'user_roles', old.user_id::text, jsonb_build_object('role', old.role));
    return old;
  end if;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'user_role_' || lower(tg_op), 'user_roles', new.user_id::text,
          jsonb_build_object('role', new.role, 'reason', new.reason));
  return new;
end;
$$;
create trigger audit_user_roles after insert or update or delete on public.user_roles
for each row execute function public.audit_user_roles();

create function public.grant_role(p_user_id uuid, p_role text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 5 and 500 then raise exception 'Reason required'; end if;
  insert into public.user_roles(user_id, role, granted_by, reason)
  values (p_user_id, p_role, auth.uid(), trim(p_reason))
  on conflict (user_id, role) do nothing;
end;
$$;
create function public.revoke_role(p_user_id uuid, p_role text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 5 and 500 then raise exception 'Reason required'; end if;
  if p_user_id = auth.uid() and p_role = 'admin' then raise exception 'Administrators cannot remove their own admin role'; end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role;
  if found then
    insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'user_role_revoke_reason', 'user_roles', p_user_id::text, jsonb_build_object('role', p_role, 'reason', trim(p_reason)));
  end if;
end;
$$;

-- ───────────── Organizations ─────────────
alter table public.organizations
  add column slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column legal_figure text not null default 'other'
    check (legal_figure in ('establishment', 'tour_operator', 'guide', 'community_association', 'authorized_representative', 'other')),
  add column public_description text check (char_length(public_description) <= 4000),
  add column public_contact jsonb not null default '{}' check (jsonb_typeof(public_contact) = 'object'),
  add column public_profile_consented boolean not null default false,
  add column status text not null default 'draft' check (status in ('draft', 'active', 'suspended', 'archived')),
  add column verified_at timestamptz,
  add column verification_expires_at timestamptz,
  add column suspended_reason text check (char_length(suspended_reason) <= 1000),
  add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.organizations for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'community_representative', 'guide', 'staff')),
  status text not null default 'active' check (status in ('invited', 'active', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);

-- RUC and private contacts live apart from the public organization row.
create table public.organization_private_details (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  ruc text check (ruc ~ '^[0-9]{13}$'),
  legal_name text check (char_length(legal_name) <= 200),
  legal_representative text check (char_length(legal_representative) <= 200),
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 40),
  address text check (char_length(address) <= 400),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_audit_logs (
  id bigint generated always as identity primary key,
  request_id uuid references public.merchant_verification_requests(id) on delete set null,
  organization_id uuid,
  actor_id uuid,
  action text not null,
  from_status text,
  to_status text,
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);
create index verification_audit_logs_request_idx on public.verification_audit_logs(request_id);
create index verification_audit_logs_org_idx on public.verification_audit_logs(organization_id);
create trigger verification_audit_logs_no_delete before delete on public.verification_audit_logs
for each row execute function public.prevent_mutation();

select public.secure_new_tables();

create function public.is_org_member(p_organization_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m
                where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.status = 'active');
$$;
create function public.is_org_manager(p_organization_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m
                where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.status = 'active'
                  and m.role in ('owner', 'manager', 'community_representative'));
$$;

create function public.add_owner_membership() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_members(organization_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict (organization_id, user_id) do update set role = 'owner', status = 'active';
  return new;
end;
$$;
create trigger add_owner_membership after insert on public.organizations
for each row execute function public.add_owner_membership();
insert into public.organization_members(organization_id, user_id, role, status)
select id, owner_id, 'owner', 'active' from public.organizations on conflict do nothing;

-- The owner row cannot be demoted or removed through the client API.
create function public.organization_members_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role = 'owner' then raise exception 'Ownership is assigned by the platform' using errcode = '42501'; end if;
    if tg_op = 'UPDATE' and (old.role = 'owner' or new.role = 'owner' or new.user_id <> old.user_id or new.organization_id <> old.organization_id) then
      raise exception 'Ownership cannot be changed from the client' using errcode = '42501';
    end if;
    if tg_op = 'DELETE' and old.role = 'owner' then raise exception 'Ownership cannot be removed from the client' using errcode = '42501'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger organization_members_guard before insert or update or delete on public.organization_members
for each row execute function public.organization_members_guard();

create policy organization_members_select on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id) or public.is_reviewer());
create policy organization_members_insert on public.organization_members for insert to authenticated
  with check (public.is_org_manager(organization_id) or public.is_admin());
create policy organization_members_update on public.organization_members for update to authenticated
  using (public.is_org_manager(organization_id) or public.is_admin())
  with check (public.is_org_manager(organization_id) or public.is_admin());
create policy organization_members_delete on public.organization_members for delete to authenticated
  using (user_id = auth.uid() or public.is_org_manager(organization_id) or public.is_admin());
grant select, insert, update, delete on public.organization_members to authenticated;

create policy member_organization on public.organizations for select to authenticated
  using (public.is_org_member(id) or public.is_reviewer());
create policy manage_organization_profile on public.organizations for update to authenticated
  using (public.is_org_manager(id)) with check (public.is_org_manager(id));
-- verification_status, status, name and owner are NOT client-writable.
grant update (public_description, public_contact, public_profile_consented) on public.organizations to authenticated;

create policy organization_private_details_select on public.organization_private_details for select to authenticated
  using (public.is_org_manager(organization_id) or public.is_reviewer());
create policy organization_private_details_insert on public.organization_private_details for insert to authenticated
  with check (public.is_org_manager(organization_id));
create policy organization_private_details_update on public.organization_private_details for update to authenticated
  using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
grant select, insert, update on public.organization_private_details to authenticated;

create policy verification_audit_logs_select on public.verification_audit_logs for select to authenticated using (public.is_reviewer());
grant select on public.verification_audit_logs to authenticated;
create policy admin_audit_logs_select on public.admin_audit_logs for select to authenticated using (public.is_admin());
grant select on public.admin_audit_logs to authenticated;

-- Public host profile: only consented fields of active organizations. The view runs with its
-- owner's rights on purpose, so the base table can stay closed to anonymous visitors.
create view public.organization_public_profiles as
  select o.id, o.slug, o.name, o.kind, o.legal_figure, o.public_description, o.public_contact,
         o.verification_status, o.verified_at
  from public.organizations o
  where o.status = 'active' and o.public_profile_consented;
revoke all on public.organization_public_profiles from public, anon, authenticated;
grant select on public.organization_public_profiles to anon, authenticated;

-- ───────────── Verification workflow ─────────────
alter table public.merchant_verification_requests drop constraint merchant_verification_requests_status_check;
alter table public.merchant_verification_requests add constraint merchant_verification_requests_status_check
  check (status in ('submitted', 'in_review', 'needs_changes', 'approved', 'rejected', 'appealed', 'expired'));
alter table public.merchant_verification_requests
  add column legal_figure text check (legal_figure in ('establishment', 'tour_operator', 'guide', 'community_association', 'authorized_representative', 'other')),
  add column tourism_registry_required boolean,       -- null = not yet determined by a reviewer
  add column applicant_note text check (char_length(applicant_note) <= 2000),
  add column appeal_note text check (char_length(appeal_note) <= 2000),
  add column appealed_at timestamptz,
  add column decided_at timestamptz,
  add column valid_until timestamptz,
  add column next_review_at timestamptz,
  add column updated_at timestamptz not null default now();
create trigger set_updated_at before update on public.merchant_verification_requests for each row execute function public.set_updated_at();
create index merchant_requests_status_idx on public.merchant_verification_requests(status);
create index merchant_requests_applicant_idx on public.merchant_verification_requests(applicant_id);

alter table public.verification_reviews drop constraint verification_reviews_decision_check;
alter table public.verification_reviews add constraint verification_reviews_decision_check
  check (decision in ('approved', 'rejected', 'needs_changes'));
alter table public.verification_reviews
  add column checklist jsonb not null default '{}' check (jsonb_typeof(checklist) = 'object');
create index verification_reviews_request_idx on public.verification_reviews(request_id);

create policy reviewer_verification_request on public.merchant_verification_requests for select to authenticated using (public.is_reviewer());
create policy reviewer_verification_review on public.verification_reviews for select to authenticated using (public.is_reviewer());
create policy reviewer_verification_documents on public.verification_documents for select to authenticated using (public.is_reviewer());

create function public.audit_verification_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.verification_audit_logs(request_id, organization_id, actor_id, action, from_status, to_status)
    values (new.id, new.organization_id, auth.uid(), 'request_status', case when tg_op = 'INSERT' then null else old.status end, new.status);
  end if;
  return new;
end;
$$;
create trigger audit_verification_request after insert or update on public.merchant_verification_requests
for each row execute function public.audit_verification_request();

create function public.audit_organization_verification() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status is distinct from old.verification_status then
    insert into public.verification_audit_logs(organization_id, actor_id, action, from_status, to_status, detail)
    values (new.id, auth.uid(), 'organization_verification_status', old.verification_status, new.verification_status,
            jsonb_build_object('suspended_reason', new.suspended_reason));
  end if;
  return new;
end;
$$;
create trigger audit_organization_verification after update on public.organizations
for each row execute function public.audit_organization_verification();

-- Human review with checklist. Reviewers never decide on their own organization.
create function public.review_verification_request(
  p_request_id uuid, p_decision text, p_note text, p_checklist jsonb default '{}',
  p_registry_reference text default null, p_valid_until timestamptz default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_request public.merchant_verification_requests; v_registry text := nullif(trim(coalesce(p_registry_reference, '')), '');
begin
  if auth.uid() is null or not public.is_reviewer() then raise exception 'Verification reviewer required' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'rejected', 'needs_changes') then raise exception 'Invalid decision'; end if;
  if char_length(trim(coalesce(p_note, ''))) not between 5 and 2000 then raise exception 'Reasoned note required'; end if;
  if p_checklist is null or jsonb_typeof(p_checklist) <> 'object' then raise exception 'Invalid checklist'; end if;
  select * into v_request from public.merchant_verification_requests where id = p_request_id for update;
  if not found or v_request.status not in ('submitted', 'in_review', 'appealed') then raise exception 'Request not pending'; end if;
  if v_request.applicant_id = auth.uid() or public.is_org_member(v_request.organization_id) then
    raise exception 'Reviewers cannot decide on their own organization' using errcode = '42501';
  end if;
  insert into public.verification_reviews(request_id, reviewer_id, decision, note, registry_reference, checklist)
  values (p_request_id, auth.uid(), p_decision, trim(p_note), v_registry, p_checklist);
  update public.merchant_verification_requests
    set status = p_decision, decided_at = now(),
        valid_until = case when p_decision = 'approved' then p_valid_until else null end,
        next_review_at = case when p_decision = 'approved' then p_valid_until else null end
    where id = p_request_id;
  update public.organizations
    set verification_status = case
          when p_decision = 'rejected' then 'unverified'
          when p_decision = 'needs_changes' then 'in_review'
          when v_registry is not null then 'official_registry_verified'
          else 'identity_reviewed' end,
        verified_at = case when p_decision = 'approved' then now() else null end,
        verification_expires_at = case when p_decision = 'approved' then p_valid_until else null end,
        status = case when p_decision = 'approved' and status = 'draft' then 'active' else status end
    where id = v_request.organization_id;
end;
$$;

create function public.resubmit_verification_request(p_request_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_request public.merchant_verification_requests;
begin
  select * into v_request from public.merchant_verification_requests where id = p_request_id for update;
  if not found or auth.uid() is null or v_request.applicant_id <> auth.uid() then raise exception 'Request not found' using errcode = '42501'; end if;
  if v_request.status <> 'needs_changes' then raise exception 'Request does not accept changes'; end if;
  update public.merchant_verification_requests set status = 'submitted', applicant_note = nullif(trim(coalesce(p_note, '')), '') where id = p_request_id;
end;
$$;

create function public.appeal_verification_request(p_request_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_request public.merchant_verification_requests;
begin
  select * into v_request from public.merchant_verification_requests where id = p_request_id for update;
  if not found or auth.uid() is null or v_request.applicant_id <> auth.uid() then raise exception 'Request not found' using errcode = '42501'; end if;
  if v_request.status <> 'rejected' or v_request.appealed_at is not null then raise exception 'Request cannot be appealed'; end if;
  if char_length(trim(coalesce(p_note, ''))) not between 10 and 2000 then raise exception 'Appeal note required'; end if;
  update public.merchant_verification_requests set status = 'appealed', appeal_note = trim(p_note), appealed_at = now() where id = p_request_id;
  update public.organizations set verification_status = 'in_review' where id = v_request.organization_id;
end;
$$;

create function public.suspend_organization(p_organization_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 1000 then raise exception 'Reason required'; end if;
  update public.organizations
    set verification_status = 'suspended', status = 'suspended', suspended_reason = trim(p_reason), verified_at = null
    where id = p_organization_id;
  if not found then raise exception 'Organization not found'; end if;
  insert into public.admin_audit_logs(actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'organization_suspended', 'organizations', p_organization_id::text, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

revoke all on function
  public.current_user_email_verified(), public.has_role(text), public.is_reviewer(), public.is_moderator(),
  public.is_org_member(uuid), public.is_org_manager(uuid), public.grant_role(uuid, text, text), public.revoke_role(uuid, text, text),
  public.review_verification_request(uuid, text, text, jsonb, text, timestamptz),
  public.resubmit_verification_request(uuid, text), public.appeal_verification_request(uuid, text),
  public.suspend_organization(uuid, text)
from public, anon, authenticated;
grant execute on function
  public.current_user_email_verified(), public.has_role(text), public.is_reviewer(), public.is_moderator(),
  public.is_org_member(uuid), public.is_org_manager(uuid), public.grant_role(uuid, text, text), public.revoke_role(uuid, text, text),
  public.review_verification_request(uuid, text, text, jsonb, text, timestamptz),
  public.resubmit_verification_request(uuid, text), public.appeal_verification_request(uuid, text),
  public.suspend_organization(uuid, text)
to authenticated, service_role;
commit;
