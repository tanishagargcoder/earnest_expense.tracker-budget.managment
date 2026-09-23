import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../utils/schemas.js';
import { expenseSchema, listExpensesQuerySchema, updateExpenseSchema } from './expenses.schemas.js';
import * as service from './expenses.service.js';

export const expensesRouter = Router();

expensesRouter.get('/', validate(listExpensesQuerySchema, 'query'), async (_req, res) => {
  res.json(await service.list(res.locals.userId, res.locals.query));
});

expensesRouter.get('/:id', validate(idParamSchema, 'params'), async (_req, res) => {
  res.json({ data: await service.getById(res.locals.userId, res.locals.params.id) });
});

expensesRouter.post('/', validate(expenseSchema), async (_req, res) => {
  res.status(201).json({ data: await service.create(res.locals.userId, res.locals.body) });
});

expensesRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateExpenseSchema), async (_req, res) => {
  res.json({ data: await service.update(res.locals.userId, res.locals.params.id, res.locals.body) });
});

expensesRouter.delete('/:id', validate(idParamSchema, 'params'), async (_req, res) => {
  await service.remove(res.locals.userId, res.locals.params.id);
  res.status(204).end();
});
