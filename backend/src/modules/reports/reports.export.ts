import ExcelJS from 'exceljs';
import type { Report } from './reports.service.js';

/** Escapes a value for CSV (RFC 4180) and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(report: Report): string {
  const rows: unknown[][] = [
    ['Expense Report', report.label],
    ['Period', `${report.from} to ${report.to}`],
    ['Total spent', report.total.toFixed(2)],
    ['Number of expenses', report.expenseCount],
    [],
    ['Date', 'Description', 'Category', 'Amount', 'Notes'],
    ...report.expenses.map((e) => [e.expenseDate, e.description, e.categoryName, e.amount.toFixed(2), e.notes]),
    [],
    ['Category', 'Total', 'Share %', 'Count'],
    ...report.byCategory.map((c) => [c.categoryName, c.total.toFixed(2), c.percent, c.expenseCount]),
  ];
  // BOM so Excel opens UTF-8 (e.g. the ₹ sign) correctly.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export async function toXlsx(report: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Expense Tracker';
  wb.created = new Date();
  const moneyFmt = '#,##0.00';
  const styleHeader = (sheet: ExcelJS.Worksheet) => {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'k', width: 28 },
    { header: 'Value', key: 'v', width: 28 },
  ];
  summary.addRows([
    { k: 'Report', v: report.label },
    { k: 'From', v: report.from },
    { k: 'To', v: report.to },
    { k: 'Total spent', v: report.total },
    { k: 'Total budget', v: report.totalBudget },
    { k: 'Number of expenses', v: report.expenseCount },
    { k: 'Average per day', v: report.averagePerDay },
  ]);
  [5, 6, 8].forEach((r) => (summary.getCell(`B${r}`).numFmt = moneyFmt));
  styleHeader(summary);

  const categories = wb.addWorksheet('By Category');
  categories.columns = [
    { header: 'Category', key: 'categoryName', width: 24 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: moneyFmt } },
    { header: 'Share %', key: 'percent', width: 10 },
    { header: 'Expenses', key: 'expenseCount', width: 10 },
  ];
  categories.addRows(report.byCategory);
  styleHeader(categories);

  const breakdown = wb.addWorksheet(report.period === 'yearly' ? 'By Month' : 'By Day');
  breakdown.columns = [
    { header: report.period === 'yearly' ? 'Month' : 'Day', key: 'label', width: 12 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: moneyFmt } },
  ];
  breakdown.addRows(report.breakdown);
  styleHeader(breakdown);

  const expenses = wb.addWorksheet('Expenses');
  expenses.columns = [
    { header: 'Date', key: 'expenseDate', width: 12 },
    { header: 'Description', key: 'description', width: 36 },
    { header: 'Category', key: 'categoryName', width: 20 },
    { header: 'Amount', key: 'amount', width: 14, style: { numFmt: moneyFmt } },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  expenses.addRows(report.expenses);
  if (report.expenses.length > 0) {
    const totalRow = expenses.addRow({ description: 'Total', amount: report.total });
    totalRow.font = { bold: true };
  }
  styleHeader(expenses);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
