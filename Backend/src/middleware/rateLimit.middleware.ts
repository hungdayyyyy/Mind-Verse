import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request } from 'express';
import { cacheRedis } from '@config/redis';
import { env } from '@config/index';

/**
 * Strict rate limit for unauthenticated auth endpoints (login, register,
 * forgot-password) — keyed by IP since there's no user yet. Prevents
 * credential-stuffing / brute-force attacks.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => cacheRedis.call(...args) as Promise<unknown> as ReturnType<typeof cacheRedis.call>,
    prefix: 'rl:auth:',
  }),
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' });
  },
});

/**
 * General API rate limit, keyed by authenticated user id when available
 * (falls back to IP for unauthenticated routes). Applied globally in app.ts.
 */
export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => cacheRedis.call(...args) as Promise<unknown> as ReturnType<typeof cacheRedis.call>,
    prefix: 'rl:api:',
  }),
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' });
  },
});

/** Tighter limit for expensive AI-backed endpoints (chat, reprocess). */
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => cacheRedis.call(...args) as Promise<unknown> as ReturnType<typeof cacheRedis.call>,
    prefix: 'rl:ai:',
  }),
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many AI requests. Please slow down.', code: 'RATE_LIMITED' });
  },
});
