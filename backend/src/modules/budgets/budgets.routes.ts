import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../utils/schemas.js';
import { budgetSchema, copyBudgetsSchema, listBudgetsQuerySchema, updateBudgetSchema } from './budgets.schemas.js';
import * as service from './budgets.service.js';

export const budgetsRouter = Router();

budgetsRouter.get('/', validate(listBudgetsQuerySchema, 'query'), async (_req, res) => {
  res.json({ data: await service.list(res.locals.userId, res.locals.query.month) });
});

budgetsRouter.post('/', validate(budgetSchema), async (_req, res) => {
  res.status(201).json({ data: await service.create(res.locals.userId, res.locals.body) });
});

budgetsRouter.post('/copy', validate(copyBudgetsSchema), async (_req, res) => {
  res.json(await service.copy(res.locals.userId, res.locals.body));
});

budgetsRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateBudgetSchema), async (_req, res) => {
  res.json({ data: await service.update(res.locals.userId, res.locals.params.id, res.locals.body.amount) });
});

budgetsRouter.delete('/:id', validate(idParamSchema, 'params'), async (_req, res) => {
  await service.remove(res.locals.userId, res.locals.params.id);
  res.status(204).end();
});
