import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { expensesApi } from '../api/endpoints';
import { ExpenseFilters } from '../components/expenses/ExpenseFilters';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseList } from '../components/expenses/ExpenseList';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner, Skeleton } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import type { Expense, ExpenseFilters as Filters, ExpenseInput } from '../types';
import { getErrorMessage } from '../utils/errors';
import { formatCurrency } from '../utils/format';

const DEFAULT_FILTERS: Filters = { sortBy: 'date', order: 'desc', page: 1, limit: 15 };

type Editor = { mode: 'create' } | { mode: 'edit'; expense: Expense } | null;

export function ExpensesPage() {
  useDocumentTitle('Expenses');
  const { user } = useAuth();
  const { notify } = useToast();
  const { categories } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Typing in text/number filters should not fire a request per keystroke.
  const debouncedFilters = useDebounce(filters, 350);
  const { data, loading, error, reload } = useAsync(() => expensesApi.list(debouncedFilters), [debouncedFilters]);

  const [editor, setEditor] = useState<Editor>(() => (searchParams.get('new') ? { mode: 'create' } : null));
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  // The mobile quick-add button links to /expenses?new=1.
  useEffect(() => {
    if (searchParams.get('new')) setEditor({ mode: 'create' });
  }, [searchParams]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    // Any filter change starts again from the first page.
    setFilters((f) => ({ ...f, ...patch, page: 'page' in patch ? (patch.page as number) : 1 }));
  }, []);

  const closeEditor = useCallback(() => {
    setEditor(null);
    if (searchParams.has('new')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSave = async (input: ExpenseInput) => {
    if (editor?.mode === 'edit') {
      await expensesApi.update(editor.expense.id, input);
      notify('Expense updated');
    } else {
      await expensesApi.create(input);
      notify('Expense added');
    }
    closeEditor();
    reload();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await expensesApi.remove(toDelete.id);
      notify('Expense deleted');
      setToDelete(null);
      // Step back a page if we just removed the last row of it.
      if (data && data.data.length === 1 && filters.page > 1) updateFilters({ page: filters.page - 1 });
      else reload();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const pagination = data?.pagination;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Expenses</h1>
          <p className="page__subtitle">
            {data
              ? `${data.pagination.total} expense${data.pagination.total === 1 ? '' : 's'} · ${formatCurrency(data.totalAmount, user?.currency)} total`
              : 'Add, edit and filter your spending.'}
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditor({ mode: 'create' })} disabled={!categories.length}>
          <Icon name="plus" size={18} /> Add expense
        </button>
      </header>

      <ExpenseFilters categories={categories} value={filters} onChange={updateFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="card card--flush">
        {loading && !data ? (
          <Skeleton variant="rows" />
        ) : data && data.data.length > 0 ? (
          <div className={loading ? 'is-refreshing' : undefined}>
            <ExpenseList
              expenses={data.data}
              currency={user?.currency}
              onEdit={(expense) => setEditor({ mode: 'edit', expense })}
              onDelete={setToDelete}
            />
          </div>
        ) : (
          <EmptyState
            title="No expenses found"
            text={JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS) ? 'Add your first expense to get started.' : 'Try changing or clearing the filters.'}
          />
        )}
      </section>

      {pagination && pagination.totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button type="button" className="btn btn--ghost" disabled={pagination.page <= 1} onClick={() => updateFilters({ page: pagination.page - 1 })}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateFilters({ page: pagination.page + 1 })}
          >
            Next
          </button>
        </nav>
      )}

      <Modal open={editor !== null} title={editor?.mode === 'edit' ? 'Edit expense' : 'Add expense'} onClose={closeEditor}>
        {editor && (
          <ExpenseForm
            key={editor.mode === 'edit' ? editor.expense.id : 'new'}
            categories={categories}
            initial={editor.mode === 'edit' ? editor.expense : undefined}
            onSubmit={handleSave}
            onCancel={closeEditor}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete expense?"
        message={toDelete ? `"${toDelete.description}" (${formatCurrency(toDelete.amount, user?.currency)}) will be permanently deleted.` : ''}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
