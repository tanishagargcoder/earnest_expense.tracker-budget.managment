import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, createUser, firstCategoryId, pool, request, resetDatabase, type TestUser } from '../helpers.js';

let user: TestUser;
let food: string;
let transport: string;

beforeAll(async () => {
  await resetDatabase();
  user = await createUser();
  food = await firstCategoryId(user, 'Food & Dining');
  transport = await firstCategoryId(user, 'Transport');
  for (const [amount, categoryId, expenseDate] of [
    [300, food, '2026-05-03'],
    [450, food, '2026-05-28'],
    [999, food, '2026-06-01'], // next month, must not count
    [1200, transport, '2026-05-10'],
  ] as const) {
    await request(app).post('/api/expenses').set(user.auth).send({ amount, categoryId, expenseDate, description: 'x' }).expect(201);
  }
});
afterAll(() => pool.end());

describe('budgets CRUD', () => {
  let budgetId: string;

  it('creates a monthly budget and reports spending against it', async () => {
    const res = await request(app).post('/api/budgets').set(user.auth).send({ categoryId: food, month: '2026-05', amount: 1000 }).expect(201);
    expect(res.body.data).toMatchObject({ month: '2026-05', amount: 1000, spent: 750, remaining: 250, percentUsed: 75 });
    budgetId = res.body.data.id;
  });

  it('allows only one budget per category and month', async () => {
    await request(app).post('/api/budgets').set(user.auth).send({ categoryId: food, month: '2026-05', amount: 5 }).expect(409);
  });

  it('lists budgets by month', async () => {
    await request(app).post('/api/budgets').set(user.auth).send({ categoryId: transport, month: '2026-05', amount: 1000 }).expect(201);
    const res = await request(app).get('/api/budgets').query({ month: '2026-05' }).set(user.auth).expect(200);
    expect(res.body.data).toHaveLength(2);
    const over = res.body.data.find((b: { categoryId: string }) => b.categoryId === transport);
    expect(over.remaining).toBe(-200);
    expect((await request(app).get('/api/budgets').query({ month: '2026-07' }).set(user.auth)).body.data).toHaveLength(0);
  });

  it('updates the amount', async () => {
    const res = await request(app).put(`/api/budgets/${budgetId}`).set(user.auth).send({ amount: 1500 }).expect(200);
    expect(res.body.data).toMatchObject({ amount: 1500, remaining: 750 });
    await request(app).put(`/api/budgets/${budgetId}`).set(user.auth).send({ amount: -1 }).expect(400);
  });

  it('copies a month of budgets transactionally', async () => {
    const res = await request(app).post('/api/budgets/copy').set(user.auth).send({ fromMonth: '2026-05', toMonth: '2026-06' }).expect(200);
    expect(res.body.copied).toBe(2);
    const again = await request(app).post('/api/budgets/copy').set(user.auth).send({ fromMonth: '2026-05', toMonth: '2026-06' }).expect(200);
    expect(again.body.copied).toBe(0);
    await request(app).post('/api/budgets/copy').set(user.auth).send({ fromMonth: '2025-01', toMonth: '2026-06' }).expect(400);
  });

  it('deletes a budget', async () => {
    await request(app).delete(`/api/budgets/${budgetId}`).set(user.auth).expect(204);
    await request(app).delete(`/api/budgets/${budgetId}`).set(user.auth).expect(404);
  });
});

describe('dashboard and reports', () => {
  it('summarises a month', async () => {
    const res = await request(app).get('/api/dashboard').query({ month: '2026-05' }).set(user.auth).expect(200);
    const d = res.body.data;
    expect(d).toMatchObject({ month: '2026-05', totalSpent: 1950, totalBudget: 1000, remainingBudget: -950, expenseCount: 3 });
    expect(d.overBudgetCategories).toBe(1);
    expect(d.trend).toHaveLength(6);
    expect(d.trend.at(-1)).toEqual({ month: '2026-05', total: 1950 });
  });

  it('builds a yearly report with 12 zero-filled months', async () => {
    const res = await request(app).get('/api/reports').query({ period: 'yearly', year: 2026 }).set(user.auth).expect(200);
    expect(res.body.data.total).toBe(2949);
    expect(res.body.data.breakdown).toHaveLength(12);
    expect(res.body.data.breakdown[4]).toEqual({ label: 'May', total: 1950 });
    expect(res.body.data.byCategory[0]).toMatchObject({ categoryName: 'Food & Dining', total: 1749 });
  });

  it('exports CSV and Excel files', async () => {
    const csv = await request(app).get('/api/reports/export').query({ period: 'monthly', year: 2026, month: 5 }).set(user.auth).expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toContain('expense-report-2026-05.csv');
    expect(csv.text).toContain('Total spent,1950.00');

    const xlsx = await request(app)
      .get('/api/reports/export')
      .query({ period: 'yearly', year: 2026, format: 'xlsx' })
      .set(user.auth)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe('PK'); // zip container
  });

  it('validates report parameters', async () => {
    await request(app).get('/api/reports').query({ period: 'monthly', year: 2026 }).set(user.auth).expect(400);
  });
});
