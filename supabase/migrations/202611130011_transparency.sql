-- CHULLA VIDA 3.0 · Economic transparency: agreements, allocations, payouts and impact reports.
-- Contract data is private. The public only sees consented aggregates of ACTIVE agreements;
-- with no agreement there is nothing to show ("Distribución pendiente de validar con la comunidad").
begin;

create table public.revenue_share_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  community_id uuid references public.communities(id),
  experience_id text references public.experiences(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'pending_community_validation', 'active', 'suspended', 'ended')),
  effective_from date,
  effective_to date,
  -- Consent of the organization to publish the aggregated distribution.
  public_summary_consented boolean not null default false,
  payment_timing_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);
create index revenue_share_agreements_org_idx on public.revenue_share_agreements(organization_id);
create index revenue_share_agreements_experience_idx on public.revenue_share_agreements(experience_id);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.revenue_share_agreements(id) on delete cascade,
  version integer not null check (version >= 1),
  document_path text,                 -- private storage object
  content_hash text not null,
  signed_by_name text,
  signed_by_role text,
  signed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agreement_id, version),
  check ((signed_at is null) = (signed_by_name is null))
);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  kind text not null check (kind in ('community', 'host', 'guide', 'local_provider', 'operating_costs', 'platform', 'processor', 'tax_authority')),
  display_name text not null,
  public_name_consented boolean not null default false,
  payout_reference text,              -- token at the payout provider; never a bank account number
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index beneficiaries_org_idx on public.beneficiaries(organization_id);

create table public.payout_allocations (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.revenue_share_agreements(id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries(id),
  percentage numeric(7, 4) not null check (percentage > 0 and percentage <= 100),
  basis text not null default 'gross' check (basis in ('gross')),   -- one basis per agreement: no double counting
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, beneficiary_id)
);

create table public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid references public.revenue_share_agreements(id) on delete cascade,   -- null = platform default
  name text not null,
  kind text not null check (kind in ('platform_commission', 'processor_fee', 'fixed_fee')),
  basis text not null default 'gross' check (basis in ('gross', 'net')),
  percentage numeric(7, 4) check (percentage >= 0 and percentage <= 100),
  fixed_amount numeric(12, 2) check (fixed_amount >= 0),
  currency text not null default 'USD' check (currency in ('USD')),
  effective_from date,
  effective_to date,
  -- Only approved rules are real; drafts are never shown as the platform's commission.
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (percentage is not null or fixed_amount is not null)
);

create table public.tax_lines (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  name text not null,
  rate numeric(7, 4) check (rate >= 0 and rate <= 100),
  base_amount numeric(12, 2) not null check (base_amount >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency in ('USD', 'EUR')),
  created_at timestamptz not null default now()
);
create index tax_lines_payment_idx on public.tax_lines(payment_id);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  booking_id uuid references public.bookings(id),
  agreement_id uuid references public.revenue_share_agreements(id),
  beneficiary_id uuid not null references public.beneficiaries(id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency in ('USD', 'EUR')),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'paid', 'failed', 'reversed')),
  scheduled_for date,
  paid_at timestamptz,
  provider_reference text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'paid' or paid_at is not null)
);
create index payouts_payment_idx on public.payouts(payment_id);
create index payouts_beneficiary_idx on public.payouts(beneficiary_id);

create table public.settlement_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  period_start date not null,
  period_end date not null,
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  gross_amount numeric(14, 2) not null check (gross_amount >= 0),
  processor_fees numeric(14, 2) not null default 0 check (processor_fees >= 0),
  platform_fees numeric(14, 2) not null default 0 check (platform_fees >= 0),
  taxes numeric(14, 2) not null default 0 check (taxes >= 0),
  refunds numeric(14, 2) not null default 0 check (refunds >= 0),
  net_to_beneficiaries numeric(14, 2) not null check (net_to_beneficiaries >= 0),
  reconciled boolean not null default false,
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end, currency),
  check (period_end >= period_start),
  -- "Reconciled" means the parts add up exactly to what was charged.
  constraint settlement_reports_reconcile_exactly check (
    not reconciled or gross_amount = processor_fees + platform_fees + taxes + refunds + net_to_beneficiaries)
);

create table public.community_impact_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  community_id uuid references public.communities(id),
  period_start date not null,
  period_end date not null,
  summary text not null,
  totals jsonb not null default '{}' check (jsonb_typeof(totals) = 'object'),
  approved_by_community boolean not null default false,
  approval_reference text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (not approved_by_community or approval_reference is not null),
  check (status <> 'published' or approved_by_community)
);

select public.secure_new_tables();

-- An agreement becomes active only with a signed contract and allocations that add up to exactly 100 %.
create function public.revenue_share_agreements_guard() returns trigger language plpgsql set search_path = '' as $$
declare v_total numeric;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    if not exists(select 1 from public.contract_versions c where c.agreement_id = new.id and c.signed_at is not null) then
      raise exception 'An active agreement needs a signed contract version' using errcode = '23514';
    end if;
    select coalesce(sum(a.percentage), 0) into v_total from public.payout_allocations a where a.agreement_id = new.id;
    if v_total <> 100 then
      raise exception 'Allocations must add up to exactly 100 %% (currently %)', v_total using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger revenue_share_agreements_guard before insert or update on public.revenue_share_agreements
for each row execute function public.revenue_share_agreements_guard();

-- Allocations of an active agreement are frozen: changing the split needs a new contract version.
create function public.payout_allocations_guard() returns trigger language plpgsql set search_path = '' as $$
declare v_agreement uuid := case when tg_op = 'DELETE' then old.agreement_id else new.agreement_id end;
begin
  if exists(select 1 from public.revenue_share_agreements a where a.id = v_agreement and a.status = 'active') then
    raise exception 'Allocations of an active agreement cannot change; suspend it and sign a new version' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger payout_allocations_guard before insert or update or delete on public.payout_allocations
for each row execute function public.payout_allocations_guard();

-- Public, aggregated and consented: percentage per kind of beneficiary of an active agreement.
create view public.experience_revenue_distribution as
  select a.experience_id, a.id as agreement_id, b.kind as beneficiary_kind,
         sum(p.percentage) as percentage, a.payment_timing_note, a.effective_from
  from public.revenue_share_agreements a
  join public.payout_allocations p on p.agreement_id = a.id
  join public.beneficiaries b on b.id = p.beneficiary_id
  where a.status = 'active' and a.public_summary_consented and a.experience_id is not null
  group by a.experience_id, a.id, b.kind, a.payment_timing_note, a.effective_from;
revoke all on public.experience_revenue_distribution from public, anon, authenticated;
grant select on public.experience_revenue_distribution to anon, authenticated;

-- ───────────── Policies: contract data is private (organization managers + finance/admin) ─────────────
create function public.can_read_agreement(p_agreement_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.revenue_share_agreements a where a.id = p_agreement_id
    and (public.is_org_manager(a.organization_id) or public.is_admin() or public.has_role('finance')));
$$;
revoke all on function public.can_read_agreement(uuid) from public, anon, authenticated;
grant execute on function public.can_read_agreement(uuid) to authenticated, service_role;

create policy revenue_share_agreements_read on public.revenue_share_agreements for select to authenticated
  using (public.is_org_manager(organization_id) or public.is_admin() or public.has_role('finance'));
create policy contract_versions_read on public.contract_versions for select to authenticated using (public.can_read_agreement(agreement_id));
create policy payout_allocations_read on public.payout_allocations for select to authenticated using (public.can_read_agreement(agreement_id));
create policy beneficiaries_read on public.beneficiaries for select to authenticated
  using (public.is_admin() or public.has_role('finance') or (organization_id is not null and public.is_org_manager(organization_id)));
create policy fee_rules_read on public.fee_rules for select to authenticated
  using (public.is_admin() or public.has_role('finance') or (agreement_id is not null and public.can_read_agreement(agreement_id)));
create policy tax_lines_read on public.tax_lines for select to authenticated
  using (exists(select 1 from public.payments p where p.id = payment_id));
create policy payouts_read on public.payouts for select to authenticated
  using (public.is_admin() or public.has_role('finance')
         or exists(select 1 from public.beneficiaries b where b.id = beneficiary_id and b.organization_id is not null and public.is_org_manager(b.organization_id)));
create policy settlement_reports_read on public.settlement_reports for select to authenticated
  using (public.is_org_manager(organization_id) or public.is_admin() or public.has_role('finance'));
create policy community_impact_reports_public_read on public.community_impact_reports for select to anon, authenticated
  using (status = 'published' and approved_by_community);
create policy community_impact_reports_member_read on public.community_impact_reports for select to authenticated
  using (public.is_org_member(organization_id) or public.is_admin());
grant select on public.revenue_share_agreements, public.contract_versions, public.payout_allocations, public.beneficiaries,
  public.fee_rules, public.tax_lines, public.payouts, public.settlement_reports to authenticated;
grant select on public.community_impact_reports to anon, authenticated;
-- All writes: service role (back office), after the contract really exists.
commit;
