import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { pool, withTransaction, type Queryable } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/tokens.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Categories every new account starts with. */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: 'Food & Dining', color: '#F97316' },
  { name: 'Transport', color: '#0EA5E9' },
  { name: 'Shopping', color: '#EC4899' },
  { name: 'Bills & Utilities', color: '#8B5CF6' },
  { name: 'Entertainment', color: '#EAB308' },
  { name: 'Health', color: '#10B981' },
  { name: 'Education', color: '#6366F1' },
  { name: 'Other', color: '#64748B' },
];

const USER_COLUMNS = `id, name, email, currency, created_at AS "createdAt"`;

// Compared against when the e-mail is unknown, so login takes the same time
// whether or not the account exists (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

async function issueRefreshToken(
  db: Queryable,
  userId: string,
  familyId: string,
  userAgent?: string,
): Promise<{ id: string; token: string }> {
  const token = generateRefreshToken();
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent)
     VALUES ($1, $2, $3, now() + make_interval(days => $4), $5)
     RETURNING id`,
    [userId, hashToken(token), familyId, env.REFRESH_TOKEN_TTL_DAYS, userAgent?.slice(0, 255) ?? null],
  );
  return { id: rows[0].id, token };
}

export async function register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  // User, default categories and the first session are created atomically.
  return withTransaction(async (client) => {
    const { rows } = await client.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
      [input.name, input.email, passwordHash],
    );
    const user = rows[0];

    await client.query(
      `INSERT INTO categories (user_id, name, color)
       SELECT $1, c.name, c.color FROM jsonb_to_recordset($2::jsonb) AS c(name text, color text)`,
      [user.id, JSON.stringify(DEFAULT_CATEGORIES)],
    );

    const refresh = await issueRefreshToken(client, user.id, crypto.randomUUID(), userAgent);
    return { user, accessToken: signAccessToken(user.id), refreshToken: refresh.token };
  });
}

export async function login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
  const { rows } = await pool.query<PublicUser & { passwordHash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE lower(email) = $1`,
    [input.email],
  );
  const found = rows[0];
  const valid = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !valid) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  const { passwordHash: _omit, ...user } = found;
  const refresh = await issueRefreshToken(pool, user.id, crypto.randomUUID(), userAgent);
  return { user, accessToken: signAccessToken(user.id), refreshToken: refresh.token };
}

/**
 * Exchanges a refresh token for a new access token + rotated refresh token.
 * Presenting an already-rotated token is treated as theft: every token in
 * that login's family is revoked, forcing the user to sign in again.
 */
export async function refresh(presentedToken: string, userAgent?: string): Promise<AuthResult> {
  const invalid = new AppError(401, 'Session expired, please sign in again', 'INVALID_REFRESH_TOKEN');

  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      userId: string;
      familyId: string;
      revokedAt: string | null;
      expired: boolean;
    }>(
      `SELECT id, user_id AS "userId", family_id AS "familyId", revoked_at AS "revokedAt",
              expires_at <= now() AS expired
       FROM refresh_tokens WHERE token_hash = $1
       FOR UPDATE`,
      [hashToken(presentedToken)],
    );
    const stored = rows[0];
    if (!stored) return null;

    if (stored.revokedAt) {
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
        [stored.familyId],
      );
      return 'reused' as const;
    }
    if (stored.expired) return null;

    const next = await issueRefreshToken(client, stored.userId, stored.familyId, userAgent);
    await client.query('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1', [
      stored.id,
      next.id,
    ]);

    const userResult = await client.query<PublicUser>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
      stored.userId,
    ]);
    return { user: userResult.rows[0], accessToken: signAccessToken(stored.userId), refreshToken: next.token };
  });

  // Thrown outside the transaction so the family revocation above is committed.
  if (outcome === null || outcome === 'reused') throw invalid;
  return outcome;
}

export async function logout(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
    hashToken(presentedToken),
  ]);
}

export async function getUser(userId: string): Promise<PublicUser> {
  const { rows } = await pool.query<PublicUser>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw AppError.unauthorized('Account no longer exists');
  return rows[0];
}
