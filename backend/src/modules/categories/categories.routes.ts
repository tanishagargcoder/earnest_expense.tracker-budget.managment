import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../utils/schemas.js';
import { categorySchema, updateCategorySchema } from './categories.schemas.js';
import * as service from './categories.service.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  res.json({ data: await service.list(res.locals.userId) });
});

categoriesRouter.post('/', validate(categorySchema), async (_req, res) => {
  res.status(201).json({ data: await service.create(res.locals.userId, res.locals.body) });
});

categoriesRouter.put('/:id', validate(idParamSchema, 'params'), validate(updateCategorySchema), async (_req, res) => {
  res.json({ data: await service.update(res.locals.userId, res.locals.params.id, res.locals.body) });
});

categoriesRouter.delete('/:id', validate(idParamSchema, 'params'), async (_req, res) => {
  await service.remove(res.locals.userId, res.locals.params.id);
  res.status(204).end();
});
