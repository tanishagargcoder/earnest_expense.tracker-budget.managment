import { describe, expect, it } from 'vitest';
import { registerSchema } from '../../src/modules/auth/auth.schemas.js';
import { copyBudgetsSchema } from '../../src/modules/budgets/budgets.schemas.js';
import { expenseSchema, listExpensesQuerySchema, updateExpenseSchema } from '../../src/modules/expenses/expenses.schemas.js';
import { reportQuerySchema } from '../../src/modules/reports/reports.schemas.js';
import { isoDate, isoMonth, money } from '../../src/utils/schemas.js';

const validExpense = {
  amount: '249.50',
  description: '  Lunch  ',
  categoryId: '6f1c1f0e-6a39-4e0a-9a53-0c4bdb3b8f11',
  expenseDate: '2026-02-28',
};

describe('primitive schemas', () => {
  it('accepts real calendar dates only', () => {
    expect(isoDate.safeParse('2024-02-29').success).toBe(true);
    expect(isoDate.safeParse('2025-02-29').success).toBe(false);
    expect(isoDate.safeParse('2025-13-01').success).toBe(false);
    expect(isoDate.safeParse('01-01-2025').success).toBe(false);
  });

  it('validates months', () => {
    expect(isoMonth.safeParse('2026-09').success).toBe(true);
    expect(isoMonth.safeParse('2026-9').success).toBe(false);
    expect(isoMonth.safeParse('2026-00').success).toBe(false);
  });

  it('coerces money and rejects bad amounts', () => {
    expect(money.parse('10.5')).toBe(10.5);
    expect(money.parse(0.1 + 0.2)).toBeCloseTo(0.3);
    expect(money.safeParse(0).success).toBe(false);
    expect(money.safeParse(-5).success).toBe(false);
    expect(money.safeParse('1.234').success).toBe(false);
    expect(money.safeParse('abc').success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('normalises the e-mail and trims the name', () => {
    const parsed = registerSchema.parse({ name: ' Asha ', email: ' Asha@Example.COM ', password: 'secret123' });
    expect(parsed).toEqual({ name: 'Asha', email: 'asha@example.com', password: 'secret123' });
  });

  it.each([
    ['too short', 'ab1'],
    ['no number', 'abcdefgh'],
    ['no letter', '12345678'],
  ])('rejects a password that is %s', (_label, password) => {
    expect(registerSchema.safeParse({ name: 'Asha', email: 'a@b.co', password }).success).toBe(false);
  });
});

describe('expense schemas', () => {
  it('parses a valid expense', () => {
    expect(expenseSchema.parse(validExpense)).toEqual({ ...validExpense, amount: 249.5, description: 'Lunch', notes: null });
  });

  it('reports every invalid field', () => {
    const result = expenseSchema.safeParse({ amount: -1, description: '', categoryId: 'nope', expenseDate: 'x' });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['amount', 'description', 'categoryId', 'expenseDate']));
  });

  it('requires at least one field on update and omits missing fields', () => {
    expect(updateExpenseSchema.safeParse({}).success).toBe(false);
    const parsed = updateExpenseSchema.parse({ amount: 5 });
    expect(parsed).toEqual({ amount: 5 });
    expect('notes' in parsed).toBe(false);
  });

  it('applies list defaults and validates ranges', () => {
    expect(listExpensesQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20, sortBy: 'date', order: 'desc' });
    expect(listExpensesQuerySchema.parse({ minAmount: '', maxAmount: '50' })).toMatchObject({ maxAmount: 50 });
    expect(listExpensesQuerySchema.safeParse({ from: '2026-05-01', to: '2026-04-01' }).success).toBe(false);
    expect(listExpensesQuerySchema.safeParse({ minAmount: 100, maxAmount: 10 }).success).toBe(false);
    expect(listExpensesQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

describe('budget and report schemas', () => {
  it('rejects copying a month onto itself', () => {
    expect(copyBudgetsSchema.safeParse({ fromMonth: '2026-01', toMonth: '2026-01' }).success).toBe(false);
    expect(copyBudgetsSchema.parse({ fromMonth: '2026-01', toMonth: '2026-02' }).overwrite).toBe(false);
  });

  it('requires a month for monthly reports only', () => {
    expect(reportQuerySchema.safeParse({ period: 'monthly', year: '2026' }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ period: 'yearly', year: '2026' }).success).toBe(true);
  });
});
