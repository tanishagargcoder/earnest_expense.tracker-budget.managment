import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types';

export const API_URL: string = import.meta.env.VITE_API_URL || '/api';

/**
 * The access token lives only in memory (never localStorage) so XSS cannot
 * persist it. The long-lived refresh token is an httpOnly cookie that the
 * browser sends to /api/auth/refresh automatically.
 */
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers
 * share one request: the server rotates the refresh token on every call, so
 * two parallel refreshes would look like token theft and end the session.
 */
export function refreshSession(): Promise<AuthResponse> {
  refreshPromise ??= api
    .post<AuthResponse>('/auth/refresh', undefined, { skipAuthRefresh: true })
    .then((res) => {
      tokenStore.set(res.data.accessToken);
      return res.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retry || original.skipAuthRefresh) {
      throw error;
    }

    // Access token expired: refresh once, then replay the original request.
    original._retry = true;
    try {
      await refreshSession();
    } catch {
      tokenStore.set(null);
      onSessionExpired?.();
      throw error;
    }
    return api(original);
  },
);

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not try to refresh the session when this request returns 401. */
    skipAuthRefresh?: boolean;
  }
}
