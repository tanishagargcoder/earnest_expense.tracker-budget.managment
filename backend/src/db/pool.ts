import pg from 'pg';
import { env } from '../config/env.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates, avoiding
// timezone shifts between the server and the client.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC -> number. Amounts are numeric(12,2) so they fit safely in a double.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));
// COUNT(*) returns bigint; counts here are always far below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  // Serverless instances each get their own pool, so keep them small there.
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 30_000,
});

/** Anything that can run a query: the pool itself or a checked-out client. */
export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

/**
 * Runs `work` inside a single database transaction. Commits when it resolves,
 * rolls back when it throws, and always releases the client.
 */
export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
