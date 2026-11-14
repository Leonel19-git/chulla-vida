import { createDatabase } from './helpers/db';

interface DefinerRow { proname: string; proconfig: string[] | null; returns_trigger: boolean; anon_exec: boolean; auth_exec: boolean }

it('toda función SECURITY DEFINER fija search_path y ninguna queda abierta a anon salvo el consentimiento', async () => {
  const db = await createDatabase();
  try {
    const { rows } = await db.query<DefinerRow>(`select p.proname, p.proconfig, p.prorettype = 'trigger'::regtype as returns_trigger,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef order by 1`);
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.filter(row => !(row.proconfig ?? []).some(setting => setting.startsWith('search_path='))).map(row => row.proname)).toEqual([]);
    // record_consent admite consentimientos seudónimos antes de crear la cuenta; todo lo demás exige sesión o servidor.
    expect(rows.filter(row => row.anon_exec).map(row => row.proname)).toEqual(['record_consent']);
    expect(rows.filter(row => row.returns_trigger && (row.anon_exec || row.auth_exec)).map(row => row.proname)).toEqual([]);
    const anonWrites = await db.query("select table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'");
    expect(anonWrites.rows).toEqual([]);
    const buckets = await db.query<{ id: string; public: boolean }>('select id, public from storage.buckets order by id');
    expect(buckets.rows.filter(bucket => bucket.public).map(bucket => bucket.id)).toEqual(['media-public']);
  } finally { await db.close(); }
}, 120000);
