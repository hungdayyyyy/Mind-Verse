import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
  }
}
