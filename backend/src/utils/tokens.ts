import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || decoded.type !== 'access' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as AccessTokenPayload;
}

/** A cryptographically random, opaque refresh token (sent to the client only once). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/** Refresh tokens are stored hashed so a database leak does not leak live sessions. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
