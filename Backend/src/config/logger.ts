import winston from 'winston';
import { env } from './index';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

/**
 * Application-wide structured logger.
 * - Production: JSON logs (machine-parseable, ship to log aggregator)
 * - Development: colorized human-readable logs
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(timestamp(), errors({ stack: true })),
  defaultMeta: { service: 'learnwave-api' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? json()
          : combine(colorize(), devFormat),
    }),
  ],
  exitOnError: false,
});

/** Stream adapter so morgan HTTP logs route through winston. */
export const winstonStream = {
  write: (message: string) => logger.http(message.trim()),
};
