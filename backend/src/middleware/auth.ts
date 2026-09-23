import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/tokens.js';

/** Requires a valid `Authorization: Bearer <access token>` header. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(AppError.unauthorized());

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    res.locals.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Access token is invalid or expired', 'TOKEN_EXPIRED'));
  }
};
