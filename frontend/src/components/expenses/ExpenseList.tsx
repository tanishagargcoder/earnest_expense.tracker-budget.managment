import type { Expense } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { Icon } from '../ui/Icon';

interface ExpenseListProps {
  expenses: Expense[];
  currency?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

/** A table on desktop that collapses into stacked cards on mobile (see CSS). */
export function ExpenseList({ expenses, currency, onEdit, onDelete }: ExpenseListProps) {
  const withActions = Boolean(onEdit || onDelete);
  return (
    <table className="expense-table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Description</th>
          <th scope="col">Category</th>
          <th scope="col" className="num">
            Amount
          </th>
          {withActions && (
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {expenses.map((e) => (
          <tr key={e.id}>
            <td className="expense-table__date">{formatDate(e.expenseDate)}</td>
            <td className="expense-table__desc">
              <span>{e.description}</span>
              {e.notes && <small>{e.notes}</small>}
            </td>
            <td className="expense-table__cat">
              <span className="chip">
                <span className="dot" style={{ background: e.categoryColor }} />
                {e.categoryName}
              </span>
            </td>
            <td className="num expense-table__amount">{formatCurrency(e.amount, currency)}</td>
            {withActions && (
              <td className="expense-table__actions">
                {onEdit && (
                  <button type="button" className="icon-button" onClick={() => onEdit(e)} aria-label={`Edit ${e.description}`}>
                    <Icon name="edit" size={18} />
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="icon-button icon-button--danger" onClick={() => onDelete(e)} aria-label={`Delete ${e.description}`}>
                    <Icon name="trash" size={18} />
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
