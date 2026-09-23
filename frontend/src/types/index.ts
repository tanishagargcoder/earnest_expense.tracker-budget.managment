export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  expenseCount: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  notes: string | null;
  expenseDate: string; // YYYY-MM-DD
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  amount: number;
  description: string;
  categoryId: string;
  expenseDate: string;
  notes?: string | null;
}

export type SortField = 'date' | 'amount' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  minAmount?: string;
  maxAmount?: string;
  search?: string;
  sortBy: SortField;
  order: SortOrder;
  page: number;
  limit: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpensePage {
  data: Expense[];
  pagination: Pagination;
  totalAmount: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month: string; // YYYY-MM
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export interface BudgetInput {
  categoryId: string;
  month: string;
  amount: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  color: string;
  budgetId: string | null;
  budgetAmount: number | null;
  spent: number;
  remaining: number | null;
  expenseCount: number;
}

export interface Dashboard {
  month: string;
  totalSpent: number;
  totalBudget: number;
  remainingBudget: number;
  budgetUsedPercent: number;
  expenseCount: number;
  previousMonthSpent: number;
  overBudgetCategories: number;
  categories: CategorySummary[];
  trend: { month: string; total: number }[];
  recentExpenses: Expense[];
}

export type ReportPeriod = 'monthly' | 'yearly';
export type ExportFormat = 'csv' | 'xlsx';

export interface ReportParams {
  period: ReportPeriod;
  year: number;
  month?: number;
}

export interface Report {
  period: ReportPeriod;
  label: string;
  from: string;
  to: string;
  total: number;
  expenseCount: number;
  averagePerDay: number;
  totalBudget: number;
  byCategory: { categoryId: string; categoryName: string; color: string; total: number; expenseCount: number; percent: number }[];
  breakdown: { label: string; total: number }[];
  expenses: { expenseDate: string; description: string; categoryName: string; amount: number; notes: string | null }[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
