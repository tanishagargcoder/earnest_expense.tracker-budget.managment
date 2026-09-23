import { z } from 'zod';

const year = z.coerce.number().int().min(2000).max(2100);

export const reportQuerySchema = z
  .object({
    period: z.enum(['monthly', 'yearly']),
    year,
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine((q) => q.period === 'yearly' || q.month !== undefined, {
    message: 'month is required for a monthly report',
    path: ['month'],
  });

export const exportQuerySchema = reportQuerySchema.and(z.object({ format: z.enum(['csv', 'xlsx']).default('csv') }));

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
