import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async Express handler so that any rejected promise is forwarded
 * to `next()`, landing in the global error middleware instead of crashing
 * the process or hanging the request.
 *
 * @example
 * router.get('/me', asyncHandler(async (req, res) => {
 *   const user = await userService.findById(req.user!.id);
 *   res.json({ data: user });
 * }));
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
