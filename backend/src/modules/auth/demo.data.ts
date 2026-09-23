import type { PoolClient } from 'pg';
import { addMonths, currentMonth, monthToDate } from '../../utils/dates.js';

// category -> [description, min, max]
const SAMPLES: Record<string, [string, number, number][]> = {
  'Food & Dining': [['Groceries', 800, 2500], ['Restaurant dinner', 600, 1800], ['Coffee', 120, 350], ['Food delivery', 250, 700]],
  Transport: [['Metro card recharge', 300, 600], ['Cab ride', 150, 500], ['Fuel', 1000, 2500]],
  Shopping: [['Clothes', 900, 3500], ['Electronics accessory', 500, 2500]],
  'Bills & Utilities': [['Electricity bill', 1200, 2400], ['Mobile recharge', 299, 699], ['Internet bill', 699, 999]],
  Entertainment: [['Movie tickets', 300, 900], ['Streaming subscription', 199, 649]],
  Health: [['Pharmacy', 200, 1200], ['Gym membership', 1500, 2000]],
  Education: [['Online course', 499, 3000], ['Books', 300, 1200]],
};

const BUDGETS: Record<string, number> = {
  'Food & Dining': 9000,
  Transport: 7000,
  Shopping: 5000,
  'Bills & Utilities': 5000,
  Entertainment: 2000,
  Health: 3000,
  Education: 8000,
};

/**
 * Fills an account (that already has the default categories) with six months
 * of realistic expenses and monthly budgets. Deterministic for a given seed.
 * Uses two set-based INSERTs, so it stays fast on remote databases.
 */
export async function insertDemoData(client: PoolClient, userId: string, now = new Date(), seed = 42): Promise<void> {
  let state = seed;
  const rand = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100;

  const { rows: categories } = await client.query<{ id: string; name: string }>(
    'SELECT id, name FROM categories WHERE user_id = $1',
    [userId],
  );
  const idOf = new Map(categories.map((c) => [c.name, c.id]));
  const thisMonth = currentMonth(now);

  const expenses: { category_id: string; amount: number; description: string; expense_date: string }[] = [];
  const budgets: { category_id: string; month: string; amount: number }[] = [];

  for (let offset = -5; offset <= 0; offset++) {
    const month = addMonths(thisMonth, offset);
    const [y, m] = month.split('-').map(Number);
    const lastDay = offset === 0 ? now.getUTCDate() : new Date(Date.UTC(y, m, 0)).getUTCDate();

    for (const [category, items] of Object.entries(SAMPLES)) {
      const categoryId = idOf.get(category);
      if (!categoryId) continue;
      const count = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < count; i++) {
        const [description, min, max] = items[Math.floor(rand() * items.length)];
        const day = String(1 + Math.floor(rand() * lastDay)).padStart(2, '0');
        expenses.push({ category_id: categoryId, amount: between(min, max), description, expense_date: `${month}-${day}` });
      }
    }
    for (const [category, amount] of Object.entries(BUDGETS)) {
      const categoryId = idOf.get(category);
      if (categoryId) budgets.push({ category_id: categoryId, month: monthToDate(month), amount });
    }
  }

  await client.query(
    `INSERT INTO expenses (user_id, category_id, amount, description, expense_date)
     SELECT $1, e.category_id, e.amount, e.description, e.expense_date
     FROM jsonb_to_recordset($2::jsonb) AS e(category_id uuid, amount numeric, description text, expense_date date)`,
    [userId, JSON.stringify(expenses)],
  );
  await client.query(
    `INSERT INTO budgets (user_id, category_id, month, amount)
     SELECT $1, b.category_id, b.month, b.amount
     FROM jsonb_to_recordset($2::jsonb) AS b(category_id uuid, month date, amount numeric)`,
    [userId, JSON.stringify(budgets)],
  );
}
