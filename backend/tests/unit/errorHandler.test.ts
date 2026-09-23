import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { AppError } from '../../src/utils/AppError.js';

function run(error: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  errorHandler(error, {} as Request, res, vi.fn());
  const status = (res.status as ReturnType<typeof vi.fn>).mock.calls[0][0];
  const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
  return { status, body };
}

describe('errorHandler', () => {
  it('passes AppError through with details', () => {
    const { status, body } = run(AppError.badRequest('Validation failed', [{ field: 'amount', message: 'bad' }]));
    expect(status).toBe(400);
    expect(body.error).toEqual({ code: 'BAD_REQUEST', message: 'Validation failed', details: [{ field: 'amount', message: 'bad' }] });
  });

  it('maps unique violations to 409', () => {
    const { status, body } = run(Object.assign(new Error('dup'), { code: '23505', constraint: 'users_email_lower_uidx' }));
    expect(status).toBe(409);
    expect(body.error.message).toMatch(/already exists/);
  });

  it('maps a blocked category delete to 409', () => {
    const err = Object.assign(new Error('update or delete on table "categories" violates foreign key'), {
      code: '23503',
      constraint: 'expenses_category_fk',
    });
    expect(run(err).status).toBe(409);
  });

  it('maps an unknown foreign key on insert to 400', () => {
    const err = Object.assign(new Error('insert or update on table "expenses"'), { code: '23503', constraint: 'expenses_category_fk' });
    expect(run(err).status).toBe(400);
  });

  it('hides internal errors', () => {
    const { status, body } = run(new Error('database password is hunter2'));
    expect(status).toBe(500);
    expect(body.error.message).toBe('Something went wrong');
  });
});
