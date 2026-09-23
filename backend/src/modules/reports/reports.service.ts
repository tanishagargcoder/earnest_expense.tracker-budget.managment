import { pool } from '../../db/pool.js';
import { monthRange } from '../../utils/dates.js';
import type { ReportQuery } from './reports.schemas.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface ReportExpense {
  expenseDate: string;
  description: string;
  categoryName: string;
  amount: number;
  notes: string | null;
}

export interface Report {
  period: 'monthly' | 'yearly';
  label: string;
  from: string;
  to: string;
  total: number;
  expenseCount: number;
  averagePerDay: number;
  totalBudget: number;
  byCategory: { categoryId: string; categoryName: string; color: string; total: number; expenseCount: number; percent: number }[];
  /** Daily totals for a monthly report, monthly totals for a yearly one. */
  breakdown: { label: string; total: number }[];
  expenses: ReportExpense[];
}

export function reportRange(q: ReportQuery): { from: string; to: string; label: string; days: number } {
  if (q.period === 'monthly') {
    const month = q.month as number;
    const { from, to } = monthRange(q.year, month);
    return { from, to, label: `${MONTH_NAMES[month - 1]} ${q.year}`, days: Number(to.slice(8)) };
  }
  const leap = (q.year % 4 === 0 && q.year % 100 !== 0) || q.year % 400 === 0;
  return { from: `${q.year}-01-01`, to: `${q.year}-12-31`, label: `Year ${q.year}`, days: leap ? 366 : 365 };
}

export async function buildReport(userId: string, q: ReportQuery): Promise<Report> {
  const { from, to, label, days } = reportRange(q);

  const breakdownQuery =
    q.period === 'yearly'
      ? pool.query<{ label: string; total: number }>(
          `SELECT to_char(make_date($2, month, 1), 'Mon') AS label, total FROM fn_monthly_totals($1, $2)`,
          [userId, q.year],
        )
      : pool.query<{ label: string; total: number }>(
          `SELECT to_char(d, 'DD') AS label, COALESCE(SUM(e.amount), 0) AS total
           FROM generate_series($2::date, $3::date, interval '1 day') AS d
           LEFT JOIN expenses e ON e.user_id = $1 AND e.expense_date = d::date
           GROUP BY d ORDER BY d`,
          [userId, from, to],
        );

  const [byCategory, breakdown, expenses, budget] = await Promise.all([
    pool.query<{ categoryId: string; categoryName: string; color: string; total: number; expenseCount: number }>(
      `SELECT category_id AS "categoryId", category_name AS "categoryName", color, total,
              expense_count AS "expenseCount"
       FROM fn_category_totals($1, $2, $3)`,
      [userId, from, to],
    ),
    breakdownQuery,
    pool.query<ReportExpense>(
      `SELECT e.expense_date AS "expenseDate", e.description, c.name AS "categoryName", e.amount, e.notes
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND e.expense_date BETWEEN $2 AND $3
       ORDER BY e.expense_date, e.created_at`,
      [userId, from, to],
    ),
    pool.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM budgets WHERE user_id = $1 AND month BETWEEN $2 AND $3`,
      [userId, from, to],
    ),
  ]);

  const total = round2(byCategory.rows.reduce((sum, c) => sum + c.total, 0));

  return {
    period: q.period,
    label,
    from,
    to,
    total,
    expenseCount: expenses.rows.length,
    averagePerDay: round2(total / days),
    totalBudget: budget.rows[0].total,
    byCategory: byCategory.rows.map((c) => ({
      ...c,
      percent: total > 0 ? Math.round((c.total / total) * 1000) / 10 : 0,
    })),
    breakdown: breakdown.rows,
    expenses: expenses.rows,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
