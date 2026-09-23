import { useMemo, useState } from 'react';
import { budgetsApi } from '../api/endpoints';
import { BudgetForm } from '../components/budgets/BudgetForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { MonthPicker } from '../components/ui/MonthPicker';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard } from '../components/ui/StatCard';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import type { Budget, BudgetInput } from '../types';
import { getErrorMessage } from '../utils/errors';
import { currentMonth, formatCurrency, formatMonth, shiftMonth } from '../utils/format';

type Editor = { mode: 'create' } | { mode: 'edit'; budget: Budget } | null;

export function BudgetsPage() {
  useDocumentTitle('Budgets');
  const { user } = useAuth();
  const currency = user?.currency;
  const { notify } = useToast();
  const { categories } = useCategories();
  const [month, setMonth] = useState(currentMonth);
  const { data: budgets, loading, error, reload } = useAsync(() => budgetsApi.list(month), [month]);
  const [editor, setEditor] = useState<Editor>(null);
  const [toDelete, setToDelete] = useState<Budget | null>(null);
  const [copying, setCopying] = useState(false);

  const available = useMemo(() => {
    const used = new Set(budgets?.map((b) => b.categoryId));
    return categories.filter((c) => !used.has(c.id));
  }, [budgets, categories]);

  const totals = useMemo(() => {
    const list = budgets ?? [];
    const limit = list.reduce((s, b) => s + b.amount, 0);
    const spent = list.reduce((s, b) => s + b.spent, 0);
    return { limit, spent, remaining: limit - spent };
  }, [budgets]);

  const handleSave = async (input: BudgetInput) => {
    if (editor?.mode === 'edit') {
      await budgetsApi.update(editor.budget.id, input.amount);
      notify('Budget updated');
    } else {
      await budgetsApi.create(input);
      notify('Budget created');
    }
    setEditor(null);
    reload();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await budgetsApi.remove(toDelete.id);
      notify('Budget deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const copyPrevious = async () => {
    const previous = shiftMonth(month, -1);
    setCopying(true);
    try {
      const { copied } = await budgetsApi.copy(previous, month);
      notify(copied ? `Copied ${copied} budget${copied === 1 ? '' : 's'} from ${formatMonth(previous)}` : 'All budgets already exist');
      reload();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Budgets</h1>
          <p className="page__subtitle">Set monthly spending limits for each category.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </header>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="stats-grid stats-grid--3" aria-label="Budget totals">
        <StatCard featured icon="target" label="Total limit" value={formatCurrency(totals.limit, currency)} />
        <StatCard icon="wallet" label="Spent in budgeted categories" value={formatCurrency(totals.spent, currency)} />
        <StatCard
          icon="shield"
          label={totals.remaining < 0 ? 'Over budget' : 'Remaining'}
          value={formatCurrency(Math.abs(totals.remaining), currency)}
          tone={totals.remaining < 0 ? 'negative' : 'positive'}
        />
      </section>

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={() => setEditor({ mode: 'create' })} disabled={!available.length}>
          <Icon name="plus" size={18} /> Add budget
        </button>
        <button type="button" className="btn btn--ghost" onClick={copyPrevious} disabled={copying}>
          <Icon name="copy" size={18} /> {copying ? 'Copying…' : `Copy from ${formatMonth(shiftMonth(month, -1), true)}`}
        </button>
      </div>

      {loading && !budgets ? (
        <Skeleton variant="rows" />
      ) : budgets && budgets.length > 0 ? (
        <ul className={`budget-grid${loading ? ' is-refreshing' : ''}`}>
          {budgets.map((b) => (
            <li key={b.id} className="card budget-card">
              <div className="budget-card__head">
                <span className="chip">
                  <span className="dot" style={{ background: b.categoryColor }} />
                  {b.categoryName}
                </span>
                <div className="budget-card__actions">
                  <button type="button" className="icon-button" onClick={() => setEditor({ mode: 'edit', budget: b })} aria-label={`Edit ${b.categoryName} budget`}>
                    <Icon name="edit" size={18} />
                  </button>
                  <button type="button" className="icon-button icon-button--danger" onClick={() => setToDelete(b)} aria-label={`Delete ${b.categoryName} budget`}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </div>
              <p className="budget-card__amount">
                <strong>{formatCurrency(b.spent, currency)}</strong>
                <span className="muted"> of {formatCurrency(b.amount, currency)}</span>
              </p>
              <ProgressBar percent={b.percentUsed} color={b.categoryColor} label={`${b.categoryName} budget used`} />
              <p className={`budget-card__status${b.remaining < 0 ? ' text-negative' : ''}`}>
                {b.remaining < 0
                  ? `${formatCurrency(-b.remaining, currency)} over budget`
                  : `${formatCurrency(b.remaining, currency)} left · ${b.percentUsed}% used`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState
            title={`No budgets for ${formatMonth(month)}`}
            text="Add a limit per category, or copy last month's budgets."
          />
        </div>
      )}

      <Modal open={editor !== null} title={editor?.mode === 'edit' ? 'Edit budget' : 'New budget'} onClose={() => setEditor(null)}>
        {editor && (
          <BudgetForm
            month={month}
            availableCategories={available}
            initial={editor.mode === 'edit' ? editor.budget : undefined}
            onSubmit={handleSave}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete budget?"
        message={toDelete ? `The ${toDelete.categoryName} limit for ${formatMonth(toDelete.month)} will be removed. Expenses are not affected.` : ''}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
