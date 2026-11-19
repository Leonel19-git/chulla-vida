begin;
-- GoTrue inserts the identity and applies app_metadata later in the same transaction.
-- Validate its final committed state, while still rejecting public namespace registration.
drop trigger reserve_staff_identifier on auth.users;
create or replace function public.reserve_staff_identifier() returns trigger
language plpgsql security definer set search_path='' as $$
declare account auth.users;
begin
  select * into account from auth.users where id=new.id;
  if found and lower(coalesce(account.email,'')) like '%@staff.chulla-vida.invalid'
     and coalesce(account.raw_app_meta_data->>'lane','')<>'staff' then
    raise exception 'Staff identities require trusted provisioning' using errcode='42501';
  end if;
  return null;
end;
$$;
create constraint trigger reserve_staff_identifier after insert or update on auth.users
deferrable initially deferred for each row
when(lower(coalesce(new.email,'')) like '%@staff.chulla-vida.invalid')
execute function public.reserve_staff_identifier();
commit;
