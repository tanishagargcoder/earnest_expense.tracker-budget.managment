import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './pool.js';

const MIGRATION_LOCK_ID = 7_310_001;

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies every migration in ./migrations that has not been applied yet, in filename order. */
export async function runMigrations(log: (msg: string) => void = console.log): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       varchar(255) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    // Each migration runs atomically together with its bookkeeping row. The
    // transaction-scoped advisory lock stops parallel instances (e.g. several
    // serverless cold starts) from applying the same migration twice.
    const applied = await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount) return false;
      await client.query(await readFile(path.join(migrationsDir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      return true;
    });
    if (applied) log(`Applied migration ${file}`);
  }
}

const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
  runMigrations()
    .then(() => console.log('Migrations complete'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
