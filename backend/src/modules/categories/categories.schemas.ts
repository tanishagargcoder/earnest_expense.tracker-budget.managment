import { z } from 'zod';
import { hexColor } from '../../utils/schemas.js';

const name = z.string().trim().min(1, 'Name is required').max(50);

export const categorySchema = z.object({
  name,
  color: hexColor.default('#6366F1'),
});

// Declared separately: `.partial()` would keep the color default and reset it on every rename.
export const updateCategorySchema = z
  .object({ name: name.optional(), color: hexColor.optional() })
  .refine((v) => v.name !== undefined || v.color !== undefined, { message: 'Nothing to update' });

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
