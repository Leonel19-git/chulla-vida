import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const root = resolve('supabase');
export const MIGRATIONS_DIR = resolve(root, 'migrations');
export const SEED_PATH = resolve(root, 'seed', 'seed.sql');
export const LEGACY_SEED_PATH = resolve(root, 'seed.sql');

/** Migraciones reales, en el mismo orden en que las aplica Supabase (por nombre de archivo). */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith('.sql')).sort();
}

/** Base PGlite con el bootstrap de pruebas y TODAS las migraciones reales, sin omitir ninguna. */
export async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(resolve(root, 'tests', 'helpers', 'bootstrap.sql'), 'utf8'));
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
    } catch (error) {
      throw new Error(`La migración ${file} falló: ${(error as Error).message}`, { cause: error });
    }
  }
  return db;
}

export const seedExists = (): boolean => existsSync(SEED_PATH);
export async function applySeed(db: PGlite): Promise<void> {
  await db.exec(readFileSync(SEED_PATH, 'utf8'));
}

export type Actor = { role: 'anon' } | { role: 'authenticated'; sub: string } | { role: 'service_role' };
export const anon: Actor = { role: 'anon' };
export const service: Actor = { role: 'service_role' };
export const user = (sub: string): Actor => ({ role: 'authenticated', sub });

export interface Session {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Ejecuta `work` como lo haría PostgREST: dentro de una transacción, con el rol de la API y los
 * claims del JWT en request.jwt.claims. Si `work` falla, la transacción se revierte entera.
 * PGlite serializa las transacciones, así que dos llamadas lanzadas a la vez no se mezclan.
 */
export async function as<T>(db: PGlite, actor: Actor, work: (session: Session) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    const claims = actor.role === 'authenticated' ? { role: actor.role, sub: actor.sub } : { role: actor.role };
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${actor.role}`);
    return work({
      async query<R>(sql: string, params: unknown[] = []) {
        return (await tx.query<R>(sql, params)).rows;
      },
    });
  }) as Promise<T>;
}

/** Atajo para una sola sentencia. */
export function run<T = Record<string, unknown>>(db: PGlite, actor: Actor, sql: string, params: unknown[] = []): Promise<T[]> {
  return as(db, actor, session => session.query<T>(sql, params));
}

/** Sentencia como propietario de la base (preparación de datos de prueba). */
export async function admin<T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
