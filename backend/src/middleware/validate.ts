import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validates (and coerces) one part of the request against a zod schema.
 * The parsed value is stored on `res.locals[source]` so handlers get typed,
 * sanitised data rather than the raw input.
 */
export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(AppError.badRequest('Validation failed', details));
    }
    res.locals[source] = result.data;
    next();
  };
}
