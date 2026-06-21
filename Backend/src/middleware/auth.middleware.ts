import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, config } from '@config/index';
import { User } from '@modules/users/user.model';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { asyncHandler } from '@shared/utils/asyncHandler';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  plan: 'free' | 'pro' | 'premium';
  systemRole: 'user' | 'support' | 'admin' | 'super_admin';
  iat: number;
  exp: number;
}

/**
 * Verifies the `Authorization: Bearer <token>` header, loads the corresponding
 * (non-deleted) user, and attaches it to `req.user`. Downstream handlers can
 * assume `req.user` is present after this middleware runs.
 *
 * @throws UnauthorizedError if the token is missing, invalid, expired, or the
 *   user no longer exists.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new UnauthorizedError('No access token provided');
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token expired', { code: 'TOKEN_EXPIRED' });
    }
    throw new UnauthorizedError('Invalid access token');
  }

  const user = await User.findOne({ _id: payload.sub, deletedAt: null });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (user.accountStatus === 'banned') {
    throw new UnauthorizedError('This account has been banned.', { code: 'ACCOUNT_BANNED' });
  }
  if (user.accountStatus === 'suspended') {
    throw new UnauthorizedError('This account has been suspended. Contact support for assistance.', {
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  req.user = user;
  next();
});

/**
 * Optional authentication: attaches `req.user` if a valid token is present,
 * but does not reject the request if it's missing or invalid. Used for
 * endpoints that behave differently for logged-in vs. anonymous users
 * (e.g., viewing a public share link).
 */
export const authenticateOptional = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    const user = await User.findOne({ _id: payload.sub, deletedAt: null });
    if (user) req.user = user;
  } catch {
    // Silently ignore invalid tokens for optional auth.
  }

  next();
});

/**
 * Restricts a route to users on at least the given plan tier.
 * Tiers are ranked free < pro < premium, so `requirePlan('pro')` also admits
 * premium users, matching the "at least this tier" semantics used for
 * Pro-gated features (e.g., editing notes, Study Rooms).
 */
const PLAN_RANK: Record<'free' | 'pro' | 'premium', number> = { free: 0, pro: 1, premium: 2 };

export function requirePlan(minPlan: 'pro' | 'premium') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userPlan = req.user?.plan ?? 'free';
    if (PLAN_RANK[userPlan] < PLAN_RANK[minPlan]) {
      next(
        new UnauthorizedError(`This feature requires a ${minPlan} plan or higher`, {
          code: 'PLAN_REQUIRED',
          requiredPlan: minPlan,
          currentPlan: userPlan,
        })
      );
      return;
    }
    next();
  };
}

/**
 * Restricts a route to users holding at least the given system role.
 * Ranked user < support < admin < super_admin (see config.systemRoleRank).
 * Use this — not project-level RBAC — for platform-wide admin endpoints.
 *
 * @example
 * router.get('/admin/users', authenticate, requireSystemRole('support'), listUsers);
 * router.post('/admin/users/:id/ban', authenticate, requireSystemRole('admin'), banUser);
 * router.patch('/admin/users/:id/system-role', authenticate, requireSystemRole('super_admin'), changeRole);
 */
export function requireSystemRole(minRole: 'support' | 'admin' | 'super_admin') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.systemRole ?? 'user';
    if (config.systemRoleRank[userRole] < config.systemRoleRank[minRole]) {
      next(new ForbiddenError(`This action requires the ${minRole} role or higher`, { code: 'INSUFFICIENT_SYSTEM_ROLE' }));
      return;
    }
    next();
  };
}
