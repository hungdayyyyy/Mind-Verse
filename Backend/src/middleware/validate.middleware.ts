import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '@shared/errors';

/**
 * Validates `req.body`, `req.query`, and `req.params` against a zod schema
 * shaped as `{ body?, query?, params? }`. On success, the parsed (and
 * type-coerced) data is attached to `req.validated` so controllers read
 * trusted, typed data rather than re-parsing `req.body` themselves.
 *
 * @example
 * router.post('/projects', validate(createProjectSchema), createProject);
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.validated = result as { body?: unknown; query?: unknown; params?: unknown };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError(err));
      } else {
        next(err);
      }
    }
  };
}
