import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

export const app = createApp();

/** Migrates the test database and removes all data. */
export async function resetDatabase(): Promise<void> {
  await runMigrations(() => undefined);
  await pool.query('TRUNCATE users, refresh_tokens, categories, expenses, budgets RESTART IDENTITY CASCADE');
}

let counter = 0;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  cookie: string;
  auth: { Authorization: string };
}

export async function createUser(name = 'Test User'): Promise<TestUser> {
  const email = `user${++counter}-${Date.now()}@example.com`;
  const password = 'Password123';
  const res = await request(app).post('/api/auth/register').send({ name, email, password }).expect(201);
  return {
    id: res.body.user.id,
    email,
    password,
    accessToken: res.body.accessToken,
    cookie: refreshCookie(res.headers['set-cookie']),
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
  };
}

/** Extracts the "refresh_token=..." pair from a Set-Cookie header. */
export function refreshCookie(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = list.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('No refresh_token cookie was set');
  return cookie.split(';')[0];
}

export async function firstCategoryId(user: TestUser, name?: string): Promise<string> {
  const res = await request(app).get('/api/categories').set(user.auth).expect(200);
  const category = name ? res.body.data.find((c: { name: string }) => c.name === name) : res.body.data[0];
  return category.id;
}

export { pool, request };
