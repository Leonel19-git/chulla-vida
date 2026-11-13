-- CHULLA VIDA 3.0 · Final security sweep. Policies live next to each table in the earlier files;
-- this migration makes the guarantees explicit and fails loudly if any table slipped through.
begin;

-- Safety net for anything created without the helper (enables RLS, removes API grants).
select public.secure_new_tables();

-- Sequences and future objects stay closed to API roles unless a migration grants them.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

do $$
declare v_missing text;
begin
  select string_agg(c.relname, ', ') into v_missing
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if v_missing is not null then raise exception 'Tables without row level security: %', v_missing; end if;

  -- Tables that must never be writable by API roles, whatever was granted elsewhere.
  select string_agg(t, ', ') into v_missing
  from unnest(array['user_roles', 'payments', 'payment_attempts', 'payment_events', 'refunds', 'receipts', 'payouts',
                    'admin_audit_logs', 'verification_audit_logs', 'booking_status_history', 'commercial_readiness',
                    'achievements', 'legal_acceptances', 'subscriptions', 'plans']) as t
  where has_table_privilege('authenticated', 'public.' || t, 'INSERT')
     or has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
     or has_table_privilege('authenticated', 'public.' || t, 'DELETE')
     or has_table_privilege('anon', 'public.' || t, 'INSERT')
     or has_table_privilege('anon', 'public.' || t, 'UPDATE')
     or has_table_privilege('anon', 'public.' || t, 'DELETE');
  if v_missing is not null then raise exception 'Server-only tables writable by API roles: %', v_missing; end if;
end;
$$;
commit;
