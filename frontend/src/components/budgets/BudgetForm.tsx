import { useState, type FormEvent } from 'react';
import type { Budget, BudgetInput, Category } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { formatMonth } from '../../utils/format';
import { ErrorBanner } from '../ui/Feedback';
import { FormField } from '../ui/FormField';

interface BudgetFormProps {
  month: string;
  /** Categories that do not have a budget for this month yet. */
  availableCategories: Category[];
  initial?: Budget;
  onSubmit: (input: BudgetInput) => Promise<void>;
  onCancel: () => void;
}

export function BudgetForm({ month, availableCategories, initial, onSubmit, onCancel }: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? availableCategories[0]?.id ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    const value = Number(amount);
    if (!categoryId) found.categoryId = 'Choose a category';
    if (!amount || !Number.isFinite(value) || value <= 0) found.amount = 'Enter a limit greater than 0';
    else if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) found.amount = 'Use at most 2 decimals';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ categoryId, month, amount: value });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && <ErrorBanner message={formError} />}
      <p className="form__context">Monthly limit for {formatMonth(month)}</p>
      <FormField label="Category" error={errors.categoryId}>
        {initial ? (
          <input type="text" value={initial.categoryName} disabled />
        ) : (
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {availableCategories.length === 0 && <option value="">All categories already have a budget</option>}
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField label="Limit (₹)" error={errors.amount}>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((errs) => ({ ...errs, amount: '' }));
          }}
          placeholder="5000"
        />
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting || (!initial && !availableCategories.length)}>
          {submitting ? 'Saving…' : initial ? 'Update limit' : 'Set budget'}
        </button>
      </div>
    </form>
  );
}
