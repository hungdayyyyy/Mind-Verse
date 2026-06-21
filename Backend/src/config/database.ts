import mongoose from 'mongoose';
import { env } from './index';
import { logger } from './logger';

mongoose.set('strictQuery', true);

/**
 * Establishes the Mongoose connection to MongoDB.
 * Retries are handled by the MongoDB driver itself (serverSelectionTimeoutMS);
 * this wraps connect() with logging and fail-fast behavior on initial connect.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: (err as Error).message });
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}
