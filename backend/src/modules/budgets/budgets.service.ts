import { pool, withTransaction } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';
import { monthToDate } from '../../utils/dates.js';
import type { BudgetInput, CopyBudgetsInput } from './budgets.schemas.js';

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month: string; // YYYY-MM
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

// Budgets joined with the actual spending of their category in their month.
const SELECT_BUDGET = `
  SELECT b.id, b.category_id AS "categoryId", c.name AS "categoryName", c.color AS "categoryColor",
         to_char(b.month, 'YYYY-MM') AS month, b.amount,
         COALESCE(s.spent, 0) AS spent,
         b.amount - COALESCE(s.spent, 0) AS remaining,
         ROUND(COALESCE(s.spent, 0) * 100 / b.amount, 1) AS "percentUsed"
  FROM budgets b
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(e.amount) AS spent
    FROM expenses e
    WHERE e.user_id = b.user_id
      AND e.category_id = b.category_id
      AND e.expense_date >= b.month
      AND e.expense_date < b.month + interval '1 month'
  ) s ON true`;

export async function list(userId: string, month?: string): Promise<Budget[]> {
  const params: unknown[] = [userId];
  let filter = '';
  if (month) {
    params.push(monthToDate(month));
    filter = 'AND b.month = $2';
  }
  const { rows } = await pool.query<Budget>(
    `${SELECT_BUDGET} WHERE b.user_id = $1 ${filter} ORDER BY b.month DESC, lower(c.name)`,
    params,
  );
  return rows;
}

async function getById(userId: string, id: string): Promise<Budget> {
  const { rows } = await pool.query<Budget>(`${SELECT_BUDGET} WHERE b.id = $1 AND b.user_id = $2`, [id, userId]);
  if (!rows[0]) throw AppError.notFound('Budget');
  return rows[0];
}

export async function create(userId: string, input: BudgetInput): Promise<Budget> {
  const { rows } = await pool.query<{ id: string }>(
    'INSERT INTO budgets (user_id, category_id, month, amount) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, input.categoryId, monthToDate(input.month), input.amount],
  );
  return getById(userId, rows[0].id);
}

export async function update(userId: string, id: string, amount: number): Promise<Budget> {
  const { rowCount } = await pool.query('UPDATE budgets SET amount = $3 WHERE id = $1 AND user_id = $2', [
    id,
    userId,
    amount,
  ]);
  if (!rowCount) throw AppError.notFound('Budget');
  return getById(userId, id);
}

export async function remove(userId: string, id: string): Promise<void> {
  const { rowCount } = await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rowCount) throw AppError.notFound('Budget');
}

/**
 * Copies all budget limits from one month to another in a single transaction.
 * Existing limits in the target month are kept unless `overwrite` is set.
 */
export async function copy(userId: string, input: CopyBudgetsInput): Promise<{ copied: number }> {
  return withTransaction(async (client) => {
    const source = await client.query('SELECT 1 FROM budgets WHERE user_id = $1 AND month = $2 LIMIT 1', [
      userId,
      monthToDate(input.fromMonth),
    ]);
    if (!source.rowCount) throw AppError.badRequest(`No budgets found for ${input.fromMonth}`);

    const { rowCount } = await client.query(
      `INSERT INTO budgets (user_id, category_id, month, amount)
       SELECT user_id, category_id, $3, amount
       FROM budgets
       WHERE user_id = $1 AND month = $2
       ON CONFLICT (user_id, month, category_id)
       ${input.overwrite ? 'DO UPDATE SET amount = EXCLUDED.amount' : 'DO NOTHING'}`,
      [userId, monthToDate(input.fromMonth), monthToDate(input.toMonth)],
    );
    return { copied: rowCount ?? 0 };
  });
}
