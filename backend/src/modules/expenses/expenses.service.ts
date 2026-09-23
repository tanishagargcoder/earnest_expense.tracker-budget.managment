import { pool } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';
import type { ExpenseInput, ListExpensesQuery, UpdateExpenseInput } from './expenses.schemas.js';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  notes: string | null;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePage {
  data: Expense[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  totalAmount: number;
}

const SELECT_EXPENSE = `
  SELECT e.id, e.amount, e.description, e.notes, e.expense_date AS "expenseDate",
         e.category_id AS "categoryId", c.name AS "categoryName", c.color AS "categoryColor",
         e.created_at AS "createdAt", e.updated_at AS "updatedAt"
  FROM expenses e
  JOIN categories c ON c.id = e.category_id`;

// Whitelisted ORDER BY columns - never interpolate user input directly.
const SORT_COLUMNS: Record<ListExpensesQuery['sortBy'], string> = {
  date: 'e.expense_date',
  amount: 'e.amount',
  createdAt: 'e.created_at',
};

/** Builds a parameterised WHERE clause for the list filters. */
export function buildExpenseFilter(userId: string, q: Omit<ListExpensesQuery, 'sortBy' | 'order' | 'page' | 'limit'>) {
  const conditions = ['e.user_id = $1'];
  const params: unknown[] = [userId];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (q.from) add('e.expense_date >= ?', q.from);
  if (q.to) add('e.expense_date <= ?', q.to);
  if (q.categoryId) add('e.category_id = ?', q.categoryId);
  if (q.minAmount !== undefined) add('e.amount >= ?', q.minAmount);
  if (q.maxAmount !== undefined) add('e.amount <= ?', q.maxAmount);
  if (q.search) add(`e.description ILIKE ?`, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`);

  return { where: conditions.join(' AND '), params };
}

export async function list(userId: string, q: ListExpensesQuery): Promise<ExpensePage> {
  const { where, params } = buildExpenseFilter(userId, q);
  const offset = (q.page - 1) * q.limit;
  const order = q.order === 'asc' ? 'ASC' : 'DESC';

  // Page of rows and the aggregate for the whole filtered set, in parallel.
  const [rowsResult, totalsResult] = await Promise.all([
    pool.query<Expense>(
      `${SELECT_EXPENSE}
       WHERE ${where}
       ORDER BY ${SORT_COLUMNS[q.sortBy]} ${order}, e.created_at ${order}, e.id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.limit, offset],
    ),
    pool.query<{ total: number; totalAmount: number }>(
      `SELECT COUNT(*) AS total, COALESCE(SUM(e.amount), 0) AS "totalAmount" FROM expenses e WHERE ${where}`,
      params,
    ),
  ]);

  const { total, totalAmount } = totalsResult.rows[0];
  return {
    data: rowsResult.rows,
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
    totalAmount,
  };
}

export async function getById(userId: string, id: string): Promise<Expense> {
  const { rows } = await pool.query<Expense>(`${SELECT_EXPENSE} WHERE e.id = $1 AND e.user_id = $2`, [id, userId]);
  if (!rows[0]) throw AppError.notFound('Expense');
  return rows[0];
}

export async function create(userId: string, input: ExpenseInput): Promise<Expense> {
  // The composite FK (category_id, user_id) rejects categories of other users.
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, input.categoryId, input.amount, input.description, input.expenseDate, input.notes ?? null],
  );
  return getById(userId, rows[0].id);
}

export async function update(userId: string, id: string, input: UpdateExpenseInput): Promise<Expense> {
  const { rowCount } = await pool.query(
    `UPDATE expenses SET
       category_id  = COALESCE($3, category_id),
       amount       = COALESCE($4, amount),
       description  = COALESCE($5, description),
       expense_date = COALESCE($6, expense_date),
       notes        = CASE WHEN $7::boolean THEN $8 ELSE notes END
     WHERE id = $1 AND user_id = $2`,
    [
      id,
      userId,
      input.categoryId ?? null,
      input.amount ?? null,
      input.description ?? null,
      input.expenseDate ?? null,
      'notes' in input,
      input.notes ?? null,
    ],
  );
  if (!rowCount) throw AppError.notFound('Expense');
  return getById(userId, id);
}

export async function remove(userId: string, id: string): Promise<void> {
  const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rowCount) throw AppError.notFound('Expense');
}
