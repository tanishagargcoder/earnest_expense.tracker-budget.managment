import { z } from 'zod';

export const uuid = z.uuid('Must be a valid id');

export const idParamSchema = z.object({ id: uuid });

/** Calendar date 'YYYY-MM-DD' that actually exists (rejects 2025-02-30). */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }, 'Not a valid calendar date');

/** Month 'YYYY-MM'. */
export const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');

/** Positive money amount with at most two decimals. Accepts numbers or numeric strings. */
export const money = z.coerce
  .number({ error: 'Amount must be a number' })
  .positive('Amount must be greater than 0')
  .max(9_999_999_999.99, 'Amount is too large')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Amount can have at most 2 decimals');

export const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value like #1A2B3C');
