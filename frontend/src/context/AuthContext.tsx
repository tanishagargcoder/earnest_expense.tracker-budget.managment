import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client';
import { authApi } from '../api/endpoints';
import type { AuthResponse, User } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const applySession = useCallback((session: AuthResponse) => {
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Restore the session from the refresh cookie on page load (persistent login).
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((session) => active && applySession(session))
      .catch(() => active && clearSession());
    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  // If a refresh fails mid-session (token revoked or expired), sign out.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => applySession(await authApi.login(email, password)),
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => applySession(await authApi.register(name, email, password)),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
