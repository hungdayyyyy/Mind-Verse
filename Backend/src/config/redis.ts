import IORedis, { Redis } from 'ioredis';
import { env } from './index';
import { logger } from './logger';

/**
 * Shared Redis connection used by BullMQ, the rate limiter, and ad-hoc caching.
 * BullMQ requires `maxRetriesPerRequest: null` on the connection it's given.
 */
export const redisConnection: Redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  ...(env.NODE_ENV === 'production' ? { tls: {} } : {}),
});

redisConnection.on('connect', () => logger.info('Redis connected'));
redisConnection.on('error', (err) => logger.error('Redis connection error', { error: err.message }));

/**
 * Separate connection for general-purpose caching/rate-limiting so that
 * BullMQ's blocking commands never contend with simple GET/SET traffic.
 */
export const cacheRedis: Redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  ...(env.NODE_ENV === 'production' ? { tls: {} } : {}),
});
