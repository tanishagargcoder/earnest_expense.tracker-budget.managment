import { pool } from '../../db/pool.js';
import { addMonths, monthToDate } from '../../utils/dates.js';
import type { Expense } from '../expenses/expenses.service.js';

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  color: string;
  budgetId: string | null;
  budgetAmount: number | null;
  spent: number;
  remaining: number | null;
  expenseCount: number;
}

export interface Dashboard {
  month: string;
  totalSpent: number;
  totalBudget: number;
  remainingBudget: number;
  budgetUsedPercent: number;
  expenseCount: number;
  previousMonthSpent: number;
  overBudgetCategories: number;
  categories: CategorySummary[];
  trend: { month: string; total: number }[];
  recentExpenses: Expense[];
}

const TREND_MONTHS = 6;

export async function getDashboard(userId: string, month: string): Promise<Dashboard> {
  const monthStart = monthToDate(month);

  const [summary, trend, recent] = await Promise.all([
    pool.query<CategorySummary>(
      `SELECT category_id AS "categoryId", category_name AS "categoryName", color,
              budget_id AS "budgetId", budget_amount AS "budgetAmount", spent, remaining,
              expense_count AS "expenseCount"
       FROM fn_budget_summary($1, $2)`,
      [userId, monthStart],
    ),
    pool.query<{ month: string; total: number }>(
      `SELECT to_char(m, 'YYYY-MM') AS month, COALESCE(SUM(e.amount), 0) AS total
       FROM generate_series($2::date - make_interval(months => $3 - 1), $2::date, interval '1 month') AS m
       LEFT JOIN expenses e
              ON e.user_id = $1 AND e.expense_date >= m AND e.expense_date < m + interval '1 month'
       GROUP BY m ORDER BY m`,
      [userId, monthStart, TREND_MONTHS],
    ),
    pool.query<Expense>(
      `SELECT e.id, e.amount, e.description, e.notes, e.expense_date AS "expenseDate",
              e.category_id AS "categoryId", c.name AS "categoryName", c.color AS "categoryColor",
              e.created_at AS "createdAt", e.updated_at AS "updatedAt"
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT 5`,
      [userId],
    ),
  ]);

  const categories = summary.rows;
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const totalBudget = categories.reduce((sum, c) => sum + (c.budgetAmount ?? 0), 0);
  const expenseCount = categories.reduce((sum, c) => sum + c.expenseCount, 0);
  const previousMonth = addMonths(month, -1);
  const previousMonthSpent = trend.rows.find((t) => t.month === previousMonth)?.total ?? 0;

  return {
    month,
    totalSpent: round2(totalSpent),
    totalBudget: round2(totalBudget),
    remainingBudget: round2(totalBudget - totalSpent),
    budgetUsedPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0,
    expenseCount,
    previousMonthSpent,
    overBudgetCategories: categories.filter((c) => c.remaining !== null && c.remaining < 0).length,
    categories,
    trend: trend.rows,
    recentExpenses: recent.rows,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
