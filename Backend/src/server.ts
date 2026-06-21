import { createServer } from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { initializeSocketServer } from '@config/socket';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { redisConnection, cacheRedis } from '@config/redis';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);

  initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`LearnWave API listening on port ${env.PORT}`, { env: env.NODE_ENV, apiBaseUrl: env.API_BASE_URL });
  });

  // --- Graceful shutdown ----------------------------------------------------
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      await redisConnection.quit();
      await cacheRedis.quit();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force-exit if graceful shutdown hangs.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
