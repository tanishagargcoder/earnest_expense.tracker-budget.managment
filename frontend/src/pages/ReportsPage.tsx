import { useState } from 'react';
import { reportsApi } from '../api/endpoints';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { TotalsBarChart } from '../components/charts/TotalsBarChart';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { StatCard } from '../components/ui/StatCard';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import type { ExportFormat, ReportParams, ReportPeriod } from '../types';
import { saveBlob } from '../utils/download';
import { getErrorMessage } from '../utils/errors';
import { formatCurrency, formatDate } from '../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ReportsPage() {
  useDocumentTitle('Reports');
  const { user } = useAuth();
  const currency = user?.currency;
  const { notify } = useToast();
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  const params: ReportParams = period === 'monthly' ? { period, year, month } : { period, year };
  const { data: report, loading, error, reload } = useAsync(() => reportsApi.get(params), [period, year, month]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const download = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      const { blob, filename } = await reportsApi.export(params, format);
      saveBlob(blob, filename);
    } catch (err) {
      notify(getErrorMessage(err, 'Could not generate the report'), 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Reports</h1>
          <p className="page__subtitle">Monthly and yearly summaries, ready to export.</p>
        </div>
        <div className="toolbar toolbar--end">
          <button type="button" className="btn btn--ghost" onClick={() => download('csv')} disabled={downloading !== null}>
            <Icon name="download" size={18} /> {downloading === 'csv' ? 'Preparing…' : 'CSV'}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => download('xlsx')} disabled={downloading !== null}>
            <Icon name="download" size={18} /> {downloading === 'xlsx' ? 'Preparing…' : 'Excel'}
          </button>
        </div>
      </header>

      <section className="card report-controls" aria-label="Report period">
        <div className="segmented" role="radiogroup" aria-label="Report type">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} className={period === p ? 'is-active' : ''} onClick={() => setPeriod(p)}>
              {p === 'monthly' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
        {period === 'monthly' && (
          <label>
            <span className="sr-only">Month</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="sr-only">Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !report && (
        <>
          <Skeleton variant="stats" />
          <Skeleton variant="cards" />
        </>
      )}

      {report && (
        <div className={loading ? 'is-refreshing' : undefined}>
          <section className="stats-grid" aria-label={`${report.label} summary`}>
            <StatCard featured icon="wallet" label="Total spent" value={formatCurrency(report.total, currency)} hint={report.label} />
            <StatCard icon="receipt" label="Expenses" value={String(report.expenseCount)} />
            <StatCard icon="trendUp" label="Average per day" value={formatCurrency(report.averagePerDay, currency)} />
            <StatCard
              icon="target"
              label="Budget"
              value={report.totalBudget ? formatCurrency(report.totalBudget, currency) : 'Not set'}
              hint={report.totalBudget ? `${Math.round((report.total / report.totalBudget) * 100)}% used` : undefined}
              tone={report.totalBudget && report.total > report.totalBudget ? 'negative' : 'default'}
            />
          </section>

          {report.expenseCount === 0 ? (
            <div className="card">
              <EmptyState title={`No expenses in ${report.label}`} text="Pick another period or add some expenses." />
            </div>
          ) : (
            <>
              <div className="dashboard-grid">
                <section className="card">
                  <h2 className="card__title">{period === 'monthly' ? 'Daily spending' : 'Monthly spending'}</h2>
                  <TotalsBarChart currency={currency} data={report.breakdown} />
                </section>
                <section className="card">
                  <h2 className="card__title">By category</h2>
                  <CategoryDonut currency={currency} data={report.byCategory.map((c) => ({ name: c.categoryName, value: c.total, color: c.color }))} />
                </section>
              </div>

              <section className="card card--flush">
                <h2 className="card__title card__title--padded">Top expenses</h2>
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Category</th>
                      <th scope="col" className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.expenses]
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 10)
                      .map((e, i) => (
                        <tr key={i}>
                          <td className="expense-table__date">{formatDate(e.expenseDate)}</td>
                          <td className="expense-table__desc">
                            <span>{e.description}</span>
                          </td>
                          <td className="expense-table__cat">{e.categoryName}</td>
                          <td className="num expense-table__amount">{formatCurrency(e.amount, currency)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
