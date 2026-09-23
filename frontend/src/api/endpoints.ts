import type {
  AuthResponse,
  Budget,
  BudgetInput,
  Category,
  Dashboard,
  Expense,
  ExpenseFilters,
  ExpenseInput,
  ExpensePage,
  ExportFormat,
  Report,
  ReportParams,
  User,
} from '../types';
import { api } from './client';

/** Drops empty values so they are not sent as `?from=&to=`. */
function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }, { skipAuthRefresh: true }).then((r) => r.data),
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { name, email, password }, { skipAuthRefresh: true }).then((r) => r.data),
  demo: () => api.post<AuthResponse>('/auth/demo', undefined, { skipAuthRefresh: true }).then((r) => r.data),
  logout: () => api.post('/auth/logout', undefined, { skipAuthRefresh: true }),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
};

export const categoriesApi = {
  list: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data.data),
  create: (input: { name: string; color: string }) =>
    api.post<{ data: Category }>('/categories', input).then((r) => r.data.data),
  update: (id: string, input: { name?: string; color?: string }) =>
    api.put<{ data: Category }>(`/categories/${id}`, input).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const expensesApi = {
  list: (filters: ExpenseFilters) =>
    api.get<ExpensePage>('/expenses', { params: cleanParams(filters) }).then((r) => r.data),
  create: (input: ExpenseInput) => api.post<{ data: Expense }>('/expenses', input).then((r) => r.data.data),
  update: (id: string, input: Partial<ExpenseInput>) =>
    api.put<{ data: Expense }>(`/expenses/${id}`, input).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};

export const budgetsApi = {
  list: (month?: string) => api.get<{ data: Budget[] }>('/budgets', { params: cleanParams({ month }) }).then((r) => r.data.data),
  create: (input: BudgetInput) => api.post<{ data: Budget }>('/budgets', input).then((r) => r.data.data),
  update: (id: string, amount: number) => api.put<{ data: Budget }>(`/budgets/${id}`, { amount }).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/budgets/${id}`),
  copy: (fromMonth: string, toMonth: string, overwrite = false) =>
    api.post<{ copied: number }>('/budgets/copy', { fromMonth, toMonth, overwrite }).then((r) => r.data),
};

export const dashboardApi = {
  get: (month: string) => api.get<{ data: Dashboard }>('/dashboard', { params: { month } }).then((r) => r.data.data),
};

export const reportsApi = {
  get: (params: ReportParams) => api.get<{ data: Report }>('/reports', { params: cleanParams(params) }).then((r) => r.data.data),
  /** Downloads the report file through the authenticated client. */
  export: async (params: ReportParams, format: ExportFormat) => {
    const res = await api.get<Blob>('/reports/export', {
      params: cleanParams({ ...params, format }),
      responseType: 'blob',
    });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? `expense-report.${format}`;
    return { blob: res.data, filename };
  },
};
