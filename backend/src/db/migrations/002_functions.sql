-- =====================================================================
-- 002 - Stored functions for the heavier aggregate queries.
-- =====================================================================

-- Budget vs. actual spending for every category of a user in one month.
-- Categories without a budget are included when they have spending, so the
-- dashboard can flag unbudgeted expenses.
CREATE OR REPLACE FUNCTION fn_budget_summary(p_user_id uuid, p_month date)
RETURNS TABLE (
  category_id    uuid,
  category_name  varchar,
  color          char(7),
  budget_id      uuid,
  budget_amount  numeric,
  spent          numeric,
  remaining      numeric,
  expense_count  bigint
)
LANGUAGE sql STABLE AS $$
  WITH bounds AS (
    SELECT date_trunc('month', p_month)::date AS m_start,
           (date_trunc('month', p_month) + interval '1 month')::date AS m_end
  ),
  spending AS (
    SELECT e.category_id, SUM(e.amount) AS spent, COUNT(*) AS expense_count
    FROM expenses e, bounds b
    WHERE e.user_id = p_user_id
      AND e.expense_date >= b.m_start
      AND e.expense_date <  b.m_end
    GROUP BY e.category_id
  )
  SELECT c.id,
         c.name,
         c.color,
         bu.id,
         bu.amount,
         COALESCE(s.spent, 0),
         CASE WHEN bu.amount IS NULL THEN NULL ELSE bu.amount - COALESCE(s.spent, 0) END,
         COALESCE(s.expense_count, 0)
  FROM categories c
  CROSS JOIN bounds b
  LEFT JOIN budgets bu
         ON bu.category_id = c.id AND bu.user_id = p_user_id AND bu.month = b.m_start
  LEFT JOIN spending s ON s.category_id = c.id
  WHERE c.user_id = p_user_id
    AND (bu.id IS NOT NULL OR s.spent IS NOT NULL)
  ORDER BY COALESCE(s.spent, 0) DESC, c.name;
$$;

-- Total spending for each of the 12 months of a year (zero-filled).
CREATE OR REPLACE FUNCTION fn_monthly_totals(p_user_id uuid, p_year int)
RETURNS TABLE (month int, total numeric, expense_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT m.month,
         COALESCE(SUM(e.amount), 0),
         COUNT(e.id)
  FROM generate_series(1, 12) AS m(month)
  LEFT JOIN expenses e
         ON e.user_id = p_user_id
        AND e.expense_date >= make_date(p_year, m.month, 1)
        AND e.expense_date <  make_date(p_year, m.month, 1) + interval '1 month'
  GROUP BY m.month
  ORDER BY m.month;
$$;

-- Spending per category between two dates (inclusive).
CREATE OR REPLACE FUNCTION fn_category_totals(p_user_id uuid, p_from date, p_to date)
RETURNS TABLE (category_id uuid, category_name varchar, color char(7), total numeric, expense_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.name, c.color, SUM(e.amount), COUNT(*)
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  WHERE e.user_id = p_user_id
    AND e.expense_date BETWEEN p_from AND p_to
  GROUP BY c.id, c.name, c.color
  ORDER BY SUM(e.amount) DESC;
$$;
