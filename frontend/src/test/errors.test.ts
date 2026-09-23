import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage, getFieldErrors } from '../utils/errors';

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', data, headers: {}, config });
}

describe('error helpers', () => {
  it('reads the API error message and field details', () => {
    const err = apiError(400, {
      error: { code: 'BAD_REQUEST', message: 'Validation failed', details: [{ field: 'amount', message: 'Too small' }] },
    });
    expect(getErrorMessage(err)).toBe('Validation failed');
    expect(getFieldErrors(err)).toEqual({ amount: 'Too small' });
  });

  it('explains network failures', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getErrorMessage(err)).toMatch(/cannot reach the server/i);
  });

  it('falls back for unknown errors', () => {
    expect(getErrorMessage('boom')).toMatch(/something went wrong/i);
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});
