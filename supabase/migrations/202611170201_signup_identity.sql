-- Signup summary only: never a full document, hash or identity verification.
-- The browser checked format; this self-declared summary cannot prove that check or ownership.
begin;

create table public.signup_identity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  status text not null default 'unverified' check (status = 'unverified'),
  updated_at timestamptz not null default now()
);
comment on table public.signup_identity is 'Self-declared signup summary; not identity or server format verification.';
alter table public.signup_identity enable row level security;
revoke all on public.signup_identity from public, anon, authenticated;
grant select (user_id, last4, status, updated_at) on public.signup_identity to authenticated;
grant all on public.signup_identity to service_role;
create policy signup_identity_owner_read on public.signup_identity for select to authenticated using (user_id = auth.uid());

create function public.record_signup_identity(p_last4 text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1 from auth.users where id = v_user and email_confirmed_at is not null
  ) then
    raise exception 'Confirmed account required' using errcode = '42501';
  end if;
  if p_last4 is null or p_last4 !~ '^[0-9]{4}$' then
    raise exception 'Invalid document summary' using errcode = '22023';
  end if;
  insert into public.signup_identity(user_id, last4)
    values (v_user, p_last4)
  on conflict (user_id) do update set last4 = excluded.last4, status = 'unverified', updated_at = now();
end;
$$;
revoke all on function public.record_signup_identity(text) from public, anon, authenticated;
grant execute on function public.record_signup_identity(text) to authenticated;

commit;
