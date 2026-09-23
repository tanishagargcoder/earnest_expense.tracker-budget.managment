import { isAxiosError } from 'axios';
import type { ApiErrorBody } from '../types';

/** A user-friendly message for any error thrown by the API client. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Cannot reach the server. Check your connection.';
    return error.response.data?.error?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/** Field-level validation messages returned by the API, keyed by field name. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError<ApiErrorBody>(error)) return {};
  const details = error.response?.data?.error?.details ?? [];
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}
