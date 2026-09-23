export interface ErrorDetail {
  field: string;
  message: string;
}

/** An error that is safe to expose to API clients with the given HTTP status. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static notFound(resource = 'Resource') {
    return new AppError(404, `${resource} not found`, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }
}
