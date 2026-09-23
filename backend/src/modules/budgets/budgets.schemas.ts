import { z } from 'zod';
import { isoMonth, money, uuid } from '../../utils/schemas.js';

export const budgetSchema = z.object({
  categoryId: uuid,
  month: isoMonth,
  amount: money,
});

export const updateBudgetSchema = z.object({ amount: money });

export const listBudgetsQuerySchema = z.object({ month: isoMonth.optional() });

export const copyBudgetsSchema = z
  .object({ fromMonth: isoMonth, toMonth: isoMonth, overwrite: z.boolean().default(false) })
  .refine((v) => v.fromMonth !== v.toMonth, { message: 'Source and target month must differ', path: ['toMonth'] });

export type BudgetInput = z.infer<typeof budgetSchema>;
export type CopyBudgetsInput = z.infer<typeof copyBudgetsSchema>;
