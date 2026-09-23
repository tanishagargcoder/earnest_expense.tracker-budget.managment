import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

/** Maps PostgreSQL constraint violations to meaningful HTTP errors. */
function fromDatabaseError(error: PgError): AppError | null {
  switch (error.code) {
    case '23505': // unique_violation
      if (error.constraint === 'users_email_lower_uidx') return AppError.conflict('An account with this email already exists');
      if (error.constraint === 'categories_user_name_uidx') return AppError.conflict('A category with this name already exists');
      if (error.constraint === 'budgets_user_month_category_uk')
        return AppError.conflict('A budget for this category and month already exists');
      return AppError.conflict('Duplicate value');
    case '23503': // foreign_key_violation
      if (error.constraint === 'expenses_category_fk' && /update or delete/i.test(error.message))
        return AppError.conflict('This category still has expenses. Move or delete them first.');
      return AppError.badRequest('Referenced category does not exist');
    case '23514': // check_violation
      return AppError.badRequest('Value violates a data constraint');
    case '22P02': // invalid_text_representation (e.g. malformed uuid)
      return AppError.badRequest('Invalid identifier');
    default:
      return null;
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: AppError | null = err instanceof AppError ? err : fromDatabaseError(err as PgError);

  if (!error && (err as { type?: string }).type === 'entity.parse.failed') {
    error = AppError.badRequest('Malformed JSON body');
  }

  if (!error) {
    if (!env.isTest) console.error(err);
    error = new AppError(500, 'Something went wrong', 'INTERNAL_ERROR');
  }

  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  });
};
