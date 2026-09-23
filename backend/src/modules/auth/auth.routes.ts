import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

// Slows down credential stuffing / brute force on the public endpoints.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later' } },
});

export const authRouter = Router();

authRouter.post('/register', credentialLimiter, validate(registerSchema), controller.register);
authRouter.post('/login', credentialLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', requireAuth, controller.me);
