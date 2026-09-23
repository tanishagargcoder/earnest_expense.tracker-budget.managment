import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { api, setSessionExpiredHandler, tokenStore } from '../api/client';

/** Fake server: /auth/refresh issues "fresh-token"; other routes require it. */
function installAdapter(refreshOk = true) {
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(config.url ?? '');
    const respond = (status: number, data: unknown) => {
      const response = { status, statusText: '', data, headers: {}, config };
      if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, {}, response);
      return response;
    };
    if (config.url === '/auth/refresh') {
      await new Promise((r) => setTimeout(r, 10));
      return refreshOk ? respond(200, { accessToken: 'fresh-token', user: { id: 'u1' } }) : respond(401, {});
    }
    const auth = AxiosHeaders.from(config.headers).get('Authorization');
    return auth === 'Bearer fresh-token' ? respond(200, { ok: true }) : respond(401, {});
  };
  api.defaults.adapter = adapter;
  return calls;
}

describe('api client token refresh', () => {
  beforeEach(() => tokenStore.set('expired-token'));

  it('refreshes once for concurrent 401s and replays every request', async () => {
    const calls = installAdapter();
    const results = await Promise.all([api.get('/expenses'), api.get('/budgets'), api.get('/dashboard')]);
    expect(results.map((r) => r.data)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(calls.filter((c) => c === '/auth/refresh')).toHaveLength(1);
    expect(tokenStore.get()).toBe('fresh-token');
  });

  it('signals session expiry when the refresh fails', async () => {
    installAdapter(false);
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    await expect(api.get('/expenses')).rejects.toBeInstanceOf(AxiosError);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
    setSessionExpiredHandler(null);
  });

  it('does not try to refresh for auth endpoints', async () => {
    const calls = installAdapter();
    await expect(api.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toBeInstanceOf(AxiosError);
    expect(calls).toEqual(['/auth/login']);
  });
});
