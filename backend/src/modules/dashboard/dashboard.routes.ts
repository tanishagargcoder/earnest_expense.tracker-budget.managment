import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { currentMonth } from '../../utils/dates.js';
import { isoMonth } from '../../utils/schemas.js';
import { getDashboard } from './dashboard.service.js';

const querySchema = z.object({ month: isoMonth.optional() });

export const dashboardRouter = Router();

dashboardRouter.get('/', validate(querySchema, 'query'), async (_req, res) => {
  res.json({ data: await getDashboard(res.locals.userId, res.locals.query.month ?? currentMonth()) });
});
