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
});
afterAll(() => pool.end());

const add = (body: Record<string, unknown>, who = user) => request(app).post('/api/expenses').set(who.auth).send(body);

describe('expenses CRUD', () => {
  let expenseId: string;

  it('creates an expense', async () => {
    const res = await add({ amount: 450.75, description: 'Groceries', categoryId: food, expenseDate: '2026-03-10' }).expect(201);
    expect(res.body.data).toMatchObject({
      amount: 450.75,
      description: 'Groceries',
      categoryName: 'Food & Dining',
      expenseDate: '2026-03-10',
      notes: null,
    });
    expenseId = res.body.data.id;
  });

  it('reads it back', async () => {
    const res = await request(app).get(`/api/expenses/${expenseId}`).set(user.auth).expect(200);
    expect(res.body.data.id).toBe(expenseId);
  });

  it('partially updates it', async () => {
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set(user.auth)
      .send({ amount: 500, categoryId: transport, notes: 'moved' })
      .expect(200);
    expect(res.body.data).toMatchObject({ amount: 500, categoryName: 'Transport', description: 'Groceries', notes: 'moved' });
  });

  it('deletes it', async () => {
    await request(app).delete(`/api/expenses/${expenseId}`).set(user.auth).expect(204);
    await request(app).get(`/api/expenses/${expenseId}`).set(user.auth).expect(404);
    await request(app).delete(`/api/expenses/${expenseId}`).set(user.auth).expect(404);
  });

  it('validates ids and bodies', async () => {
    await request(app).get('/api/expenses/not-a-uuid').set(user.auth).expect(400);
    await add({ amount: 0, description: 'x', categoryId: food, expenseDate: '2026-01-01' }).expect(400);
  });
});

describe('expense filters', () => {
  beforeAll(async () => {
    await pool.query('DELETE FROM expenses WHERE user_id = $1', [user.id]);
    await add({ amount: 100, description: 'Coffee beans', categoryId: food, expenseDate: '2026-01-05' }).expect(201);
    await add({ amount: 2500, description: 'Train ticket', categoryId: transport, expenseDate: '2026-01-20' }).expect(201);
    await add({ amount: 800, description: 'Dinner', categoryId: food, expenseDate: '2026-02-14' }).expect(201);
    await add({ amount: 60, description: 'Bus', categoryId: transport, expenseDate: '2026-03-01' }).expect(201);
  });

  const list = (query: Record<string, string | number>) => request(app).get('/api/expenses').query(query).set(user.auth).expect(200);

  it('lists newest first with totals', async () => {
    const res = await list({});
    expect(res.body.data.map((e: { description: string }) => e.description)).toEqual(['Bus', 'Dinner', 'Train ticket', 'Coffee beans']);
    expect(res.body.totalAmount).toBe(3460);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
  });

  it('filters by date range', async () => {
    const res = await list({ from: '2026-01-01', to: '2026-01-31' });
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters by category', async () => {
    const res = await list({ categoryId: food });
    expect(res.body.data.every((e: { categoryId: string }) => e.categoryId === food)).toBe(true);
    expect(res.body.totalAmount).toBe(900);
  });

  it('filters by amount range and sorts by amount', async () => {
    const res = await list({ minAmount: 80, maxAmount: 1000, sortBy: 'amount', order: 'asc' });
    expect(res.body.data.map((e: { amount: number }) => e.amount)).toEqual([100, 800]);
  });

  it('searches descriptions and paginates', async () => {
    expect((await list({ search: 'din' })).body.data).toHaveLength(1);
    const page2 = await list({ limit: 3, page: 2 });
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.pagination.totalPages).toBe(2);
  });

  it('rejects inverted ranges', async () => {
    await request(app).get('/api/expenses').query({ minAmount: 10, maxAmount: 1 }).set(user.auth).expect(400);
  });
});

describe('data isolation between users', () => {
  it("cannot read, change or use another user's data", async () => {
    const other = await createUser('Other');
    const mine = await add({ amount: 10, description: 'Private', categoryId: food, expenseDate: '2026-04-01' }).expect(201);

    await request(app).get(`/api/expenses/${mine.body.data.id}`).set(other.auth).expect(404);
    await request(app).put(`/api/expenses/${mine.body.data.id}`).set(other.auth).send({ amount: 1 }).expect(404);
    await request(app).delete(`/api/expenses/${mine.body.data.id}`).set(other.auth).expect(404);
    expect((await request(app).get('/api/expenses').set(other.auth)).body.data).toHaveLength(0);

    // Using my category id from the other account is rejected by the composite FK.
    await add({ amount: 10, description: 'Sneaky', categoryId: food, expenseDate: '2026-04-01' }, other).expect(400);
  });
});

describe('categories', () => {
  it('creates, renames and deletes a category, but not one in use', async () => {
    const created = await request(app).post('/api/categories').set(user.auth).send({ name: 'Pets', color: '#123ABC' }).expect(201);
    await request(app).post('/api/categories').set(user.auth).send({ name: 'pets' }).expect(409);
    const id = created.body.data.id;
    const renamed = await request(app).put(`/api/categories/${id}`).set(user.auth).send({ name: 'Pet care' }).expect(200);
    expect(renamed.body.data).toMatchObject({ name: 'Pet care', color: '#123ABC' });

    await add({ amount: 99, description: 'Food', categoryId: id, expenseDate: '2026-04-02' }).expect(201);
    const blocked = await request(app).delete(`/api/categories/${id}`).set(user.auth).expect(409);
    expect(blocked.body.error.message).toMatch(/still has expenses/);

    await pool.query('DELETE FROM expenses WHERE category_id = $1', [id]);
    await request(app).delete(`/api/categories/${id}`).set(user.auth).expect(204);
  });
});
