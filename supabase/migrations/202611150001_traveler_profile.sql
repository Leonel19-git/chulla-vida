-- CHULLA VIDA 3.1 · Perfil de viajero: país y ciudad de origen y preferencias de viaje.
-- Aditiva. RLS de profiles ya limita lectura y edición a la fila propia (own_profile, update_own_profile).
-- La cédula NO vive aquí: se guarda con set_buyer_document() (solo últimos 4 + huella con sal).
-- El consentimiento de marketing NO se edita aquí: se registra con record_consent() y su trigger.
begin;

alter table public.profiles
  add column if not exists home_country text not null default '' check (char_length(home_country) <= 80),
  add column if not exists home_city text not null default '' check (char_length(home_city) <= 120),
  add column if not exists travel_preferences jsonb not null default '{}'
    check (jsonb_typeof(travel_preferences) = 'object' and pg_column_size(travel_preferences) <= 4096);

-- Los navegadores solo pueden escribir estas columnas de su propia fila (la política update_own_profile ya existe).
grant update (display_name, home_country, home_city, travel_preferences) on public.profiles to authenticated;

-- Defensa extra: un cliente no puede tocar columnas de consentimiento o términos aunque cambie un GRANT por error.
create or replace function public.profiles_client_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and (
       new.id is distinct from old.id
    or new.terms_accepted_version is distinct from old.terms_accepted_version
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.marketing_consent_at is distinct from old.marketing_consent_at
    or new.voice_consent_at is distinct from old.voice_consent_at
    or new.location_consent_at is distinct from old.location_consent_at) then
    raise exception 'Consent and terms are recorded by server functions' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_client_guard on public.profiles;
create trigger profiles_client_guard before update on public.profiles
for each row execute function public.profiles_client_guard();
revoke all on function public.profiles_client_guard() from public, anon, authenticated;

commit;
