import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { ExpenseForm, validateExpense } from '../components/expenses/ExpenseForm';
import type { Category, Expense } from '../types';

const categories: Category[] = [
  { id: 'c1', name: 'Food', color: '#2A78D6', expenseCount: 0 },
  { id: 'c2', name: 'Travel', color: '#EB6834', expenseCount: 0 },
];

describe('validateExpense', () => {
  const valid = { amount: '10.50', description: 'Tea', categoryId: 'c1', expenseDate: '2026-01-01', notes: '' };

  it('accepts valid input', () => {
    expect(validateExpense(valid)).toEqual({});
  });

  it.each([
    [{ amount: '' }, 'amount'],
    [{ amount: '-4' }, 'amount'],
    [{ amount: '1.999' }, 'amount'],
    [{ description: '   ' }, 'description'],
    [{ categoryId: '' }, 'categoryId'],
    [{ expenseDate: '' }, 'expenseDate'],
  ])('rejects %o', (patch, field) => {
    expect(validateExpense({ ...valid, ...patch })).toHaveProperty(field);
  });
});

describe('<ExpenseForm />', () => {
  it('shows validation errors and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (₹)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a typed payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ExpenseForm categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Amount (₹)'), '249.5');
    await userEvent.type(screen.getByLabelText('Description'), '  Dinner  ');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'c2');
    await userEvent.clear(screen.getByLabelText('Date'));
    await userEvent.type(screen.getByLabelText('Date'), '2026-03-15');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(onSubmit).toHaveBeenCalledWith({
      amount: 249.5,
      description: 'Dinner',
      categoryId: 'c2',
      expenseDate: '2026-03-15',
      notes: null,
    });
  });

  it('pre-fills when editing and shows server-side errors', async () => {
    const expense: Expense = {
      id: 'e1', amount: 99, description: 'Taxi', notes: 'Airport', expenseDate: '2026-02-02', categoryId: 'c2',
      categoryName: 'Travel', categoryColor: '#EB6834', createdAt: '', updatedAt: '',
    };
    const config = { headers: new AxiosHeaders() };
    const serverError = new AxiosError('Bad', 'ERR_BAD_REQUEST', config, {}, {
      status: 400, statusText: '', headers: {}, config,
      data: { error: { code: 'BAD_REQUEST', message: 'Validation failed', details: [{ field: 'amount', message: 'Amount is too large' }] } },
    });
    const onSubmit = vi.fn().mockRejectedValue(serverError);
    render(<ExpenseForm categories={categories} initial={expense} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Description')).toHaveValue('Taxi');
    expect(screen.getByLabelText('Category')).toHaveValue('c2');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('Amount is too large')).toBeInTheDocument();
  });
});
