import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { toCsv, toXlsx } from './reports.export.js';
import { exportQuerySchema, reportQuerySchema, type ExportQuery } from './reports.schemas.js';
import { buildReport } from './reports.service.js';

export const reportsRouter = Router();

reportsRouter.get('/', validate(reportQuerySchema, 'query'), async (_req, res) => {
  res.json({ data: await buildReport(res.locals.userId, res.locals.query) });
});

reportsRouter.get('/export', validate(exportQuerySchema, 'query'), async (_req, res) => {
  const query: ExportQuery = res.locals.query;
  const report = await buildReport(res.locals.userId, query);
  const suffix = query.period === 'monthly' ? `${query.year}-${String(query.month).padStart(2, '0')}` : `${query.year}`;
  const filename = `expense-report-${suffix}.${query.format}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (query.format === 'xlsx') {
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(await toXlsx(report));
  } else {
    res.type('text/csv; charset=utf-8').send(toCsv(report));
  }
});
