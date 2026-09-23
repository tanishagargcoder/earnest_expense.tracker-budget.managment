import { z } from 'zod';
import { isoDate, money, uuid } from '../../utils/schemas.js';

export const expenseSchema = z.object({
  amount: money,
  description: z.string().trim().min(1, 'Description is required').max(255),
  categoryId: uuid,
  expenseDate: isoDate,
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export const updateExpenseSchema = expenseSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Nothing to update',
});

const optionalAmount = z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().nonnegative().optional());

export const listExpensesQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    categoryId: uuid.optional(),
    minAmount: optionalAmount,
    maxAmount: optionalAmount,
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" must be on or before "to"', path: ['from'] })
  .refine((q) => q.minAmount === undefined || q.maxAmount === undefined || q.minAmount <= q.maxAmount, {
    message: '"minAmount" must be less than or equal to "maxAmount"',
    path: ['minAmount'],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
