import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, createUser, pool, refreshCookie, request, resetDatabase } from '../helpers.js';

beforeAll(resetDatabase);
afterAll(() => pool.end());

describe('auth', () => {
  it('registers a user, sets an httpOnly refresh cookie and seeds default categories', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya', email: 'Riya@Example.com', password: 'Password123' })
      .expect(201);

    expect(res.body.user).toMatchObject({ name: 'Riya', email: 'riya@example.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookie = [res.headers['set-cookie']].flat().find((c) => c?.startsWith('refresh_token='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const categories = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(categories.body.data.length).toBe(8);
  });

  it('rejects duplicate e-mails case-insensitively', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Riya 2', email: 'RIYA@example.com', password: 'Password123' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns field errors for invalid registration data', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'R', email: 'nope', password: 'short' }).expect(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('logs in with correct credentials only', async () => {
    const user = await createUser();
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password1' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'whatever1' }).expect(401);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password }).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('protects routes and returns the current user', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/expenses').set('Authorization', 'Bearer garbage').expect(401);
    const user = await createUser('Me Myself');
    const res = await request(app).get('/api/auth/me').set(user.auth).expect(200);
    expect(res.body.user.name).toBe('Me Myself');
  });

  it('rotates refresh tokens and detects re-use of an old token', async () => {
    const user = await createUser();

    const first = await request(app).post('/api/auth/refresh').set('Cookie', user.cookie).expect(200);
    const rotated = refreshCookie(first.headers['set-cookie']);
    expect(rotated).not.toBe(user.cookie);
    expect(first.body.user.id).toBe(user.id);

    // Re-using the original (already rotated) token revokes the whole family...
    await request(app).post('/api/auth/refresh').set('Cookie', user.cookie).expect(401);
    // ...including the newest token.
    await request(app).post('/api/auth/refresh').set('Cookie', rotated).expect(401);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await request(app).post('/api/auth/refresh').expect(401);
    expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
  });

  it('revokes the refresh token on logout', async () => {
    const user = await createUser();
    await request(app).post('/api/auth/logout').set('Cookie', user.cookie).expect(204);
    await request(app).post('/api/auth/refresh').set('Cookie', user.cookie).expect(401);
  });
});
