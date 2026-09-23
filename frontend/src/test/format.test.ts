import { currentMonth, formatCurrency, formatDate, formatMonth, percentChange, shiftMonth, todayIso } from '../utils/format';

describe('formatCurrency', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatCurrency(1234567.5)).toBe('₹12,34,567.50');
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('uses thousand / lakh / crore in compact mode', () => {
    expect(formatCurrency(950, 'INR', true)).toBe('₹950');
    expect(formatCurrency(36000, 'INR', true)).toBe('₹36K');
    expect(formatCurrency(250000, 'INR', true)).toBe('₹2.5L');
    expect(formatCurrency(12000000, 'INR', true)).toBe('₹1.2Cr');
    expect(formatCurrency(-4500, 'INR', true)).toBe('-₹4.5K');
  });
});

describe('date helpers', () => {
  it('formats calendar dates without timezone drift', () => {
    expect(formatDate('2026-03-01')).toBe('1 Mar 2026');
  });

  it('formats and shifts months', () => {
    expect(formatMonth('2026-09')).toBe('September 2026');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('returns local today / month', () => {
    const d = new Date(2026, 8, 5, 23, 30);
    expect(todayIso(d)).toBe('2026-09-05');
    expect(currentMonth(d)).toBe('2026-09');
  });

  it('computes percentage change', () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(50, 0)).toBeNull();
  });
});
