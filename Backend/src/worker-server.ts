import { connectDatabase, disconnectDatabase } from '@config/database';
import { redisConnection, cacheRedis } from '@config/redis';
import { logger } from '@config/logger';
import { registerAllWorkers, startScheduledJobs, shutdownAllWorkers } from '@workers/index';

/**
 * Standalone entry point for the BullMQ worker process (SDS.md §3.5 —
 * `apps/workers` runs as a separate container/process from the API server,
 * scaling independently via WORKER_CONCURRENCY_* env vars).
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();

  registerAllWorkers();
  await startScheduledJobs();

  logger.info('Worker process started and listening for jobs');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Worker received ${signal}, shutting down gracefully...`);
    await shutdownAllWorkers();
    await disconnectDatabase();
    await redisConnection.quit();
    await cacheRedis.quit();
    logger.info('Worker shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection in worker process', { reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception in worker process', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during worker bootstrap:', err);
  process.exit(1);
});
