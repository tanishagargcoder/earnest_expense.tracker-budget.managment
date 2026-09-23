/**
 * Creates a demo account with six months of realistic data.
 *   Email: demo@example.com   Password: Demo@1234
 * Re-running the script resets the demo account.
 */
import { register } from '../modules/auth/auth.service.js';
import { insertDemoData } from '../modules/auth/demo.data.js';
import { runMigrations } from './migrate.js';
import { pool, withTransaction } from './pool.js';

const DEMO_EMAIL = 'demo@example.com';

async function seed() {
  await runMigrations(() => undefined);
  await pool.query('DELETE FROM users WHERE lower(email) = $1', [DEMO_EMAIL]);
  const { user } = await register({ name: 'Demo User', email: DEMO_EMAIL, password: 'Demo@1234' });
  await withTransaction((client) => insertDemoData(client, user.id));
  console.log(`Seeded demo account: ${DEMO_EMAIL} / Demo@1234`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
