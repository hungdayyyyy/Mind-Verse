import { NextFunction, Request, Response } from 'express';
import { AppError } from '@shared/errors';
import { logger } from '@config/logger';
import { config } from '@config/index';

/**
 * Global error handler — must be registered last in the Express middleware
 * chain. Distinguishes operational errors (instances of AppError, safe to
 * expose message/code/details to the client) from unexpected programmer
 * errors (logged with full detail, but only a generic message returned to
 * avoid leaking internals).
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
    });

    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unexpected error — log full stack, return a generic message.
  logger.error('Unhandled error', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: config.isProduction ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

/** Catches requests to undefined routes — registered just before errorHandler. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' });
}
