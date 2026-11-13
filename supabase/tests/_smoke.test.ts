import { createDatabase, migrationFiles } from './helpers/db';
it('aplica todas las migraciones y protege el esquema público y sus tablas de servidor', async () => {
  const db = await createDatabase();
  try {
    expect(migrationFiles()).toContain('202611130001_foundation.sql');
    expect(migrationFiles()).toContain('202611130014_rls.sql');
    const required = ['admin_audit_logs', 'bookings', 'catalog_experiences', 'commercial_readiness', 'experience_requests', 'experiences', 'organizations', 'payments', 'profiles', 'user_roles'];
    const tables = await db.query<{ tablename: string }>("select tablename from pg_tables where schemaname='public' and tablename=any($1::text[]) order by tablename", [required]);
    expect(tables.rows.map(row => row.tablename)).toEqual(required);
    const unprotected = await db.query<{ relname: string }>("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity");
    expect(unprotected.rows).toEqual([]);
    const policies = await db.query<{ tablename: string }>("select distinct tablename from pg_policies where schemaname='public'");
    expect(policies.rows.map(row => row.tablename)).toEqual(expect.arrayContaining(['profiles', 'catalog_experiences', 'experience_requests']));
    const serverOnly = ['user_roles', 'payments', 'commercial_readiness', 'admin_audit_logs'];
    const grants = await db.query<{ tablename: string }>(`select tablename from unnest($1::text[]) as tablename where has_table_privilege('anon', 'public.' || tablename, 'INSERT') or has_table_privilege('authenticated', 'public.' || tablename, 'INSERT') or has_table_privilege('authenticated', 'public.' || tablename, 'UPDATE') or has_table_privilege('authenticated', 'public.' || tablename, 'DELETE')`, [serverOnly]);
    expect(grants.rows).toEqual([]);
  } finally { await db.close(); }
}, 120000);
