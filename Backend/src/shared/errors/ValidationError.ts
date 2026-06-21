import { ZodError } from 'zod';
import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(zodError: ZodError | Record<string, unknown>) {
    const details = zodError instanceof ZodError ? zodError.flatten() : zodError;
    super('Validation failed', 400, 'VALIDATION_ERROR', details as Record<string, unknown>);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class PlanLimitError extends AppError {
  constructor(message = 'You have reached your plan limit', details?: Record<string, unknown>) {
    super(message, 422, 'PLAN_LIMIT_EXCEEDED', details);
  }
}

export class GoneError extends AppError {
  constructor(message = 'This resource is no longer available', details?: Record<string, unknown>) {
    super(message, 410, 'GONE', details);
  }
}
