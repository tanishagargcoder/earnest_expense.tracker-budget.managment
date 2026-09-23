import { describe, expect, it } from 'vitest';
import { buildExpenseFilter } from '../../src/modules/expenses/expenses.service.js';
import { csvCell, toCsv } from '../../src/modules/reports/reports.export.js';
import { reportRange, type Report } from '../../src/modules/reports/reports.service.js';
import { addMonths, currentMonth, monthRange, monthToDate } from '../../src/utils/dates.js';
import { generateRefreshToken, hashToken, signAccessToken, verifyAccessToken } from '../../src/utils/tokens.js';

describe('date helpers', () => {
  it('computes month ranges including leap years', () => {
    expect(monthRange(2024, 2)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthRange(2025, 2)).toEqual({ from: '2025-02-01', to: '2025-02-28' });
    expect(monthRange(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('shifts months across year boundaries', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(monthToDate('2026-09')).toBe('2026-09-01');
    expect(currentMonth(new Date('2026-09-23T10:00:00Z'))).toBe('2026-09');
  });

  it('builds report ranges', () => {
    expect(reportRange({ period: 'monthly', year: 2026, month: 2 })).toMatchObject({
      from: '2026-02-01', to: '2026-02-28', label: 'February 2026', days: 28,
    });
    expect(reportRange({ period: 'yearly', year: 2028 })).toMatchObject({ from: '2028-01-01', to: '2028-12-31', days: 366 });
  });
});

describe('tokens', () => {
  it('signs and verifies access tokens', () => {
    const token = signAccessToken('user-1');
    expect(verifyAccessToken(token).sub).toBe('user-1');
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
  });

  it('generates unique refresh tokens and hashes them deterministically', () => {
    const a = generateRefreshToken();
    expect(a).not.toBe(generateRefreshToken());
    expect(a.length).toBeGreaterThanOrEqual(64);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('buildExpenseFilter', () => {
  it('only adds conditions for provided filters, fully parameterised', () => {
    const { where, params } = buildExpenseFilter('u1', { from: '2026-01-01', maxAmount: 0, search: '50%_off' });
    expect(where).toBe('e.user_id = $1 AND e.expense_date >= $2 AND e.amount <= $3 AND e.description ILIKE $4');
    expect(params).toEqual(['u1', '2026-01-01', 0, '%50\\%\\_off%']);
  });
});

describe('CSV export', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(12.5)).toBe('12.5');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+cmd')).toBe("'+cmd");
  });

  it('renders a report', () => {
    const report: Report = {
      period: 'monthly', label: 'March 2026', from: '2026-03-01', to: '2026-03-31', total: 150, expenseCount: 2,
      averagePerDay: 4.84, totalBudget: 0, breakdown: [],
      byCategory: [{ categoryId: 'c', categoryName: 'Food', color: '#000000', total: 150, expenseCount: 2, percent: 100 }],
      expenses: [
        { expenseDate: '2026-03-02', description: 'Lunch, with team', categoryName: 'Food', amount: 100, notes: null },
        { expenseDate: '2026-03-05', description: 'Tea', categoryName: 'Food', amount: 50, notes: 'note' },
      ],
    };
    const lines = toCsv(report).replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Expense Report,March 2026');
    expect(lines).toContain('2026-03-02,"Lunch, with team",Food,100.00,');
    expect(lines).toContain('Food,150.00,100,2');
  });
});
