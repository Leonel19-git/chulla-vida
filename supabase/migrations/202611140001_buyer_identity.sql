-- CHULLA VIDA · Documento del comprador/titular (cédula ecuatoriana o pasaporte).
-- Principios (LOPDP, minimización):
--   * Nunca se guarda el número completo. Solo los últimos 4 caracteres visibles y una huella
--     SHA-256 con sal aleatoria por fila, útil para comprobar coincidencia en el servidor.
--     La huella NO es cifrado fuerte: el espacio de cédulas es pequeño. Por eso la columna no es
--     legible por los roles del navegador y solo service_role puede compararla.
--   * format_valid indica FORMATO correcto (provincia, tercer dígito, dígito verificador módulo 10).
--     identity_verified es siempre false: no hay acceso al Registro Civil.
--   * Escritura solo mediante set_buyer_document(), que valida en SQL y usa auth.uid().
begin;

create table public.buyer_identity_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('cedula', 'passport')),
  last4 text not null check (last4 ~ '^[0-9A-Z]{4}$'),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  hash_salt uuid not null default gen_random_uuid(),
  format_valid boolean not null check (format_valid),
  identity_verified boolean not null default false check (identity_verified = false),
  updated_at timestamptz not null default now()
);
alter table public.buyer_identity_documents enable row level security;
revoke all on public.buyer_identity_documents from public, anon, authenticated;
-- El titular solo ve columnas no sensibles de SU fila. La huella y la sal quedan fuera.
grant select (user_id, document_type, last4, format_valid, identity_verified, updated_at) on public.buyer_identity_documents to authenticated;
grant all on public.buyer_identity_documents to service_role;
create policy buyer_document_owner_read on public.buyer_identity_documents for select to authenticated using (user_id = auth.uid());

-- Validación de formato de cédula (misma regla que src/domain/identity/cedula.ts).
create function public.is_valid_cedula(p_value text) returns boolean language plpgsql immutable set search_path = '' as $$
declare v_sum integer := 0; v_product integer; v_province integer; i integer;
begin
  if p_value is null or p_value !~ '^[0-9]{10}$' then return false; end if;
  v_province := substr(p_value, 1, 2)::integer;
  if not (v_province between 1 and 24 or v_province = 30) then return false; end if;
  if substr(p_value, 3, 1)::integer >= 6 then return false; end if;
  for i in 1..9 loop
    v_product := substr(p_value, i, 1)::integer * (case when i % 2 = 1 then 2 else 1 end);
    if v_product > 9 then v_product := v_product - 9; end if;
    v_sum := v_sum + v_product;
  end loop;
  return (10 - (v_sum % 10)) % 10 = substr(p_value, 10, 1)::integer;
end;
$$;

create function public.set_buyer_document(p_type text, p_value text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_value text; v_salt uuid := gen_random_uuid(); r public.buyer_identity_documents;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_value := upper(regexp_replace(coalesce(p_value, ''), '[\s.\-]', '', 'g'));
  if p_type = 'cedula' then
    if not public.is_valid_cedula(v_value) then raise exception 'Invalid document format' using errcode = '22023'; end if;
  elsif p_type = 'passport' then
    if v_value !~ '^[A-Z0-9]{5,20}$' then raise exception 'Invalid document format' using errcode = '22023'; end if;
  else raise exception 'Invalid document type' using errcode = '22023';
  end if;
  insert into public.buyer_identity_documents(user_id, document_type, last4, document_hash, hash_salt, format_valid, updated_at)
    values (v_user, p_type, right(v_value, 4), encode(sha256(convert_to(v_salt::text || ':' || p_type || ':' || v_value, 'UTF8')), 'hex'), v_salt, true, now())
  on conflict (user_id) do update set document_type = excluded.document_type, last4 = excluded.last4, document_hash = excluded.document_hash,
    hash_salt = excluded.hash_salt, format_valid = true, updated_at = now()
  returning * into r;
  return jsonb_build_object('documentType', r.document_type, 'last4', r.last4, 'formatValid', r.format_valid, 'identityVerified', false);
end;
$$;

-- Solo el servidor compara un documento presentado con la huella guardada.
create function public.buyer_document_matches(p_user uuid, p_type text, p_value text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare r public.buyer_identity_documents; v_value text;
begin
  select * into r from public.buyer_identity_documents where user_id = p_user;
  if not found or r.document_type <> p_type then return false; end if;
  v_value := upper(regexp_replace(coalesce(p_value, ''), '[\s.\-]', '', 'g'));
  return r.document_hash = encode(sha256(convert_to(r.hash_salt::text || ':' || p_type || ':' || v_value, 'UTF8')), 'hex');
end;
$$;

revoke all on function public.set_buyer_document(text, text), public.buyer_document_matches(uuid, text, text), public.is_valid_cedula(text) from public, anon, authenticated;
grant execute on function public.set_buyer_document(text, text) to authenticated, service_role;
grant execute on function public.is_valid_cedula(text) to authenticated, service_role;
grant execute on function public.buyer_document_matches(uuid, text, text) to service_role;
commit;
