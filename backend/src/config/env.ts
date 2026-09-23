import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env', quiet: true });

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: booleanString,
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  // Defaults to true in production / on Vercel (HTTPS), false locally.
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail fast: the server must not start with an invalid configuration.
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  COOKIE_SECURE:
    parsed.data.COOKIE_SECURE !== undefined
      ? parsed.data.COOKIE_SECURE === 'true'
      : parsed.data.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
};

export type Env = typeof env;
