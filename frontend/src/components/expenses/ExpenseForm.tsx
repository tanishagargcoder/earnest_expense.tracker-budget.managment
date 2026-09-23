import { useState, type FormEvent } from 'react';
import type { Category, Expense, ExpenseInput } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { todayIso } from '../../utils/format';
import { ErrorBanner } from '../ui/Feedback';
import { FormField } from '../ui/FormField';

interface ExpenseFormProps {
  categories: Category[];
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  amount: string;
  description: string;
  categoryId: string;
  expenseDate: string;
  notes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

export function validateExpense(values: FormState): Errors {
  const errors: Errors = {};
  const amount = Number(values.amount);
  if (!values.amount.trim()) errors.amount = 'Amount is required';
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0';
  else if (!/^\d+(\.\d{1,2})?$/.test(values.amount.trim())) errors.amount = 'Use at most 2 decimals';
  if (!values.description.trim()) errors.description = 'Description is required';
  else if (values.description.trim().length > 255) errors.description = 'Keep it under 255 characters';
  if (!values.categoryId) errors.categoryId = 'Choose a category';
  if (!values.expenseDate) errors.expenseDate = 'Pick a date';
  return errors;
}

export function ExpenseForm({ categories, initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<FormState>({
    amount: initial ? String(initial.amount) : '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    expenseDate: initial?.expenseDate ?? todayIso(),
    notes: initial?.notes ?? '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof FormState) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateExpense(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        amount: Number(values.amount),
        description: values.description.trim(),
        categoryId: values.categoryId,
        expenseDate: values.expenseDate,
        notes: values.notes.trim() || null,
      });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && <ErrorBanner message={formError} />}
      <div className="form-grid">
        <FormField label="Amount (₹)" error={errors.amount}>
          <input type="number" inputMode="decimal" min="0.01" step="0.01" value={values.amount} onChange={update('amount')} placeholder="0.00" />
        </FormField>
        <FormField label="Date" error={errors.expenseDate}>
          <input type="date" value={values.expenseDate} onChange={update('expenseDate')} max="2100-12-31" />
        </FormField>
      </div>
      <FormField label="Description" error={errors.description}>
        <input type="text" value={values.description} onChange={update('description')} maxLength={255} placeholder="e.g. Groceries" />
      </FormField>
      <FormField label="Category" error={errors.categoryId}>
        <select value={values.categoryId} onChange={update('categoryId')}>
          {categories.length === 0 && <option value="">No categories yet</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes (optional)" error={errors.notes}>
        <textarea rows={2} value={values.notes} onChange={update('notes')} maxLength={1000} />
      </FormField>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
