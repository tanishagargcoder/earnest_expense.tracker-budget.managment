import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { budgetsRouter } from './modules/budgets/budgets.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { expensesRouter } from './modules/expenses/expenses.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs behind Render/Heroku for rate limiting
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // allow the refresh-token cookie
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);

  // Everything below requires a valid access token.
  const protectedApi = Router();
  protectedApi.use(requireAuth);
  protectedApi.use('/categories', categoriesRouter);
  protectedApi.use('/expenses', expensesRouter);
  protectedApi.use('/budgets', budgetsRouter);
  protectedApi.use('/dashboard', dashboardRouter);
  protectedApi.use('/reports', reportsRouter);
  app.use('/api', protectedApi);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
