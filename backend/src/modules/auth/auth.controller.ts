import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE = 'refresh_token';

const cookieOptions: CookieOptions = {
  httpOnly: true, // not readable from JavaScript -> safe from XSS token theft
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/auth', // only sent to the auth endpoints that need it
};

function sendAuth(res: Response, status: number, result: authService.AuthResult) {
  res.cookie(REFRESH_COOKIE, result.refreshToken, {
    ...cookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  res.status(status).json({ user: result.user, accessToken: result.accessToken });
}

export async function register(req: Request, res: Response) {
  sendAuth(res, 201, await authService.register(res.locals.body, req.get('user-agent')));
}

export async function demo(req: Request, res: Response) {
  sendAuth(res, 201, await authService.createDemo(req.get('user-agent')));
}

export async function login(req: Request, res: Response) {
  sendAuth(res, 200, await authService.login(res.locals.body, req.get('user-agent')));
}

export async function refresh(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No active session' } });
    return;
  }
  try {
    sendAuth(res, 200, await authService.refresh(token, req.get('user-agent')));
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw error;
  }
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
}

export async function me(_req: Request, res: Response) {
  res.json({ user: await authService.getUser(res.locals.userId) });
}
