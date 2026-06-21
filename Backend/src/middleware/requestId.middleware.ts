import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/** Attaches a unique request id (or reuses an incoming X-Request-Id) for log correlation. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.requestId = typeof incoming === 'string' ? incoming : uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
