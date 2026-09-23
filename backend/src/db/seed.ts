/**
 * Creates a demo account with a few months of realistic data.
 *   Email: demo@example.com   Password: Demo@1234
 * Re-running the script resets the demo account.
 */
import { withTransaction, pool } from './pool.js';
import { runMigrations } from './migrate.js';
import { register } from '../modules/auth/auth.service.js';
import { addMonths, currentMonth, monthToDate } from '../utils/dates.js';

const DEMO_EMAIL = 'demo@example.com';

const SAMPLES: Record<string, [string, number, number][]> = {
  // category: [description, min, max]
  'Food & Dining': [['Groceries', 800, 2500], ['Restaurant dinner', 600, 1800], ['Coffee', 120, 350], ['Food delivery', 250, 700]],
  Transport: [['Metro card recharge', 300, 600], ['Cab ride', 150, 500], ['Fuel', 1000, 2500]],
  Shopping: [['Clothes', 900, 3500], ['Electronics accessory', 500, 2500]],
  'Bills & Utilities': [['Electricity bill', 1200, 2400], ['Mobile recharge', 299, 699], ['Internet bill', 699, 999]],
  Entertainment: [['Movie tickets', 300, 900], ['Streaming subscription', 199, 649]],
  Health: [['Pharmacy', 200, 1200], ['Gym membership', 1500, 2000]],
  Education: [['Online course', 499, 3000], ['Books', 300, 1200]],
};

const BUDGETS: Record<string, number> = {
  'Food & Dining': 9000, Transport: 4000, Shopping: 5000, 'Bills & Utilities': 5000, Entertainment: 2000, Health: 3000,
};

// Deterministic pseudo-random numbers so every seed produces the same data.
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100;

async function seed() {
  await runMigrations(() => undefined);
  await pool.query('DELETE FROM users WHERE lower(email) = $1', [DEMO_EMAIL]);
  const { user } = await register({ name: 'Demo User', email: DEMO_EMAIL, password: 'Demo@1234' });

  await withTransaction(async (client) => {
    const { rows: categories } = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM categories WHERE user_id = $1',
      [user.id],
    );
    const idOf = new Map(categories.map((c) => [c.name, c.id]));
    const today = new Date();
    const thisMonth = currentMonth(today);

    for (let offset = -5; offset <= 0; offset++) {
      const month = addMonths(thisMonth, offset);
      const lastDay = offset === 0 ? today.getUTCDate() : new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).getUTCDate();

      for (const [category, items] of Object.entries(SAMPLES)) {
        const count = 2 + Math.floor(rand() * 4);
        for (let i = 0; i < count; i++) {
          const [description, min, max] = items[Math.floor(rand() * items.length)];
          const day = String(1 + Math.floor(rand() * lastDay)).padStart(2, '0');
          await client.query(
            `INSERT INTO expenses (user_id, category_id, amount, description, expense_date) VALUES ($1, $2, $3, $4, $5)`,
            [user.id, idOf.get(category), between(min, max), description, `${month}-${day}`],
          );
        }
      }
      for (const [category, amount] of Object.entries(BUDGETS)) {
        await client.query('INSERT INTO budgets (user_id, category_id, month, amount) VALUES ($1, $2, $3, $4)', [
          user.id,
          idOf.get(category),
          monthToDate(month),
          amount,
        ]);
      }
    }
  });

  console.log(`Seeded demo account: ${DEMO_EMAIL} / Demo@1234`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
