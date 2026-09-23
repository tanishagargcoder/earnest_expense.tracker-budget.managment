import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/endpoints';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { TotalsBarChart } from '../components/charts/TotalsBarChart';
import { ExpenseList } from '../components/expenses/ExpenseList';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui/Feedback';
import { MonthPicker } from '../components/ui/MonthPicker';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard } from '../components/ui/StatCard';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { currentMonth, formatCurrency, formatMonth, percentChange } from '../utils/format';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const currency = user?.currency;
  const [month, setMonth] = useState(currentMonth);
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get(month), [month]);

  const change = data ? percentChange(data.totalSpent, data.previousMonthSpent) : null;
  const firstName = user?.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>
            {greeting}, {firstName}
          </h1>
          <p className="page__subtitle">Here's your financial overview for {formatMonth(month)}.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </header>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && (
        <>
          <Skeleton variant="stats" />
          <Skeleton variant="cards" />
        </>
      )}

      {data && (
        <div className={loading ? 'is-refreshing' : undefined}>
          <section className="stats-grid" aria-label="Summary">
            <StatCard
              featured
              icon="wallet"
              label="Total spent"
              value={formatCurrency(data.totalSpent, currency)}
              hint={
                change === null
                  ? `${data.expenseCount} expenses`
                  : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs last month`
              }
            />
            <StatCard
              icon="target"
              label="Monthly budget"
              value={data.totalBudget > 0 ? formatCurrency(data.totalBudget, currency) : 'Not set'}
              hint={data.totalBudget > 0 ? `${data.budgetUsedPercent}% used` : <Link to="/budgets">Set a budget →</Link>}
            />
            <StatCard
              icon="shield"
              label={data.remainingBudget < 0 ? 'Over budget' : 'Remaining budget'}
              value={formatCurrency(Math.abs(data.remainingBudget), currency)}
              tone={data.remainingBudget < 0 ? 'negative' : 'positive'}
              hint={
                data.overBudgetCategories > 0
                  ? `${data.overBudgetCategories} categor${data.overBudgetCategories === 1 ? 'y' : 'ies'} over limit`
                  : 'All categories within limit'
              }
            />
            <StatCard icon="receipt" label="Transactions" value={String(data.expenseCount)} hint={`in ${formatMonth(month)}`} />
          </section>

          <div className="dashboard-grid">
            <section className="card">
              <h2 className="card__title">Spending by category</h2>
              {data.totalSpent > 0 ? (
                <CategoryDonut
                  currency={currency}
                  data={data.categories.map((c) => ({ name: c.categoryName, value: c.spent, color: c.color }))}
                />
              ) : (
                <EmptyState title="No expenses this month" action={<Link className="btn btn--primary" to="/expenses?new=1">Add an expense</Link>} />
              )}
            </section>

            <section className="card">
              <h2 className="card__title">Last 6 months</h2>
              <TotalsBarChart
                currency={currency}
                highlight={formatMonth(month, true)}
                data={data.trend.map((t) => ({ label: formatMonth(t.month, true), total: t.total }))}
              />
            </section>

            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Budget by category</h2>
                <Link to="/budgets" className="link">Manage</Link>
              </div>
              {data.categories.length === 0 ? (
                <EmptyState title="Nothing to show yet" text="Set budgets or add expenses to see progress here." />
              ) : (
                <ul className="budget-progress-list">
                  {data.categories.map((c) => {
                    const pct = c.budgetAmount ? (c.spent / c.budgetAmount) * 100 : 0;
                    return (
                      <li key={c.categoryId}>
                        <div className="budget-progress-list__row">
                          <span className="chip">
                            <span className="dot" style={{ background: c.color }} />
                            {c.categoryName}
                          </span>
                          <span className="muted">
                            {formatCurrency(c.spent, currency)}
                            {c.budgetAmount ? ` / ${formatCurrency(c.budgetAmount, currency)}` : ' · no budget'}
                          </span>
                        </div>
                        {c.budgetAmount ? <ProgressBar percent={pct} color={c.color} label={`${c.categoryName} budget used`} /> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="card__head">
                <h2 className="card__title">Recent expenses</h2>
                <Link to="/expenses" className="link">View all</Link>
              </div>
              {data.recentExpenses.length ? (
                <ExpenseList expenses={data.recentExpenses} currency={currency} />
              ) : (
                <EmptyState title="No expenses yet" />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
