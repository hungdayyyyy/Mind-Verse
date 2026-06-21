import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Zod schema describing every environment variable the API requires.
 * Fails fast at boot if anything required is missing or malformed,
 * rather than surfacing cryptic errors deep in request handling.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // Database
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().optional(),

  // Redis / Queue
  REDIS_URL: z.string().min(1),
  QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),
  QUEUE_MAX_RETRIES: z.coerce.number().int().positive().default(3),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  COOKIE_SECRET: z.string().min(16),
  BCRYPT_COST_FACTOR: z.coerce.number().int().min(10).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().url(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_WEBHOOK_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('learnwave/content'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  OPENAI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),

  // Vector store
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().optional(),
  PGVECTOR_CONNECTION_STRING: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_ID_PRO_YEARLY: z.string().optional(),

  // SendGrid
  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_FROM_EMAIL: z.string().email(),
  SENDGRID_FROM_NAME: z.string().default('LearnWave'),
  SENDGRID_TEMPLATE_EMAIL_VERIFICATION: z.string().optional(),
  SENDGRID_TEMPLATE_PASSWORD_RESET: z.string().optional(),
  SENDGRID_TEMPLATE_PROJECT_INVITE: z.string().optional(),
  SENDGRID_TEMPLATE_SRS_REMINDER: z.string().optional(),
  SENDGRID_TEMPLATE_SHARE_NOTIFICATION: z.string().optional(),

  // YouTube
  YOUTUBE_API_KEY: z.string().min(1),

  // Socket.io
  SOCKET_IO_CORS_ORIGIN: z.string().min(1),
  SOCKET_IO_ADAPTER: z.enum(['memory', 'redis']).default('memory'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:');
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

/** Derived, computed configuration values used throughout the app. */
export const config = {
  env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  corsOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  plans: {
    free: {
      maxProjects: 5,
      maxUploadsPerMonth: 3,
      storageBytes: 500 * 1024 * 1024, // 500 MB
      aiQueuePriority: 0,
    },
    pro: {
      maxProjects: Infinity,
      maxUploadsPerMonth: Infinity,
      storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
      aiQueuePriority: 5,
    },
    premium: {
      maxProjects: Infinity,
      maxUploadsPerMonth: Infinity,
      storageBytes: 250 * 1024 * 1024 * 1024, // 250 GB
      aiQueuePriority: 10, // processed ahead of pro/free jobs in the queue
    },
  },
  /**
   * Numeric rank for system roles — used by admin RBAC checks to compare
   * "at least this role" (e.g., `support` can read, only `admin`+ can write,
   * only `super_admin` can manage other admins' roles).
   */
  systemRoleRank: {
    user: 0,
    support: 1,
    admin: 2,
    super_admin: 3,
  } as const,
  upload: {
    maxVideoSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
    maxAudioSizeBytes: 500 * 1024 * 1024, // 500MB
    maxPdfSizeBytes: 100 * 1024 * 1024, // 100MB
    maxDocSizeBytes: 50 * 1024 * 1024, // 50MB
    maxPptxSizeBytes: 100 * 1024 * 1024, // 100MB
    maxTxtSizeBytes: 10 * 1024 * 1024, // 10MB
    signedUrlTtlSeconds: 1800, // 30 minutes
  },
  rag: {
    chunkTokenSize: 500,
    chunkOverlapTokens: 100,
    topK: 5,
  },
  /** Numeric rank for plan tiers — free < pro < premium — for "at least this tier" checks. */
  planRank: { free: 0, pro: 1, premium: 2 } as const,
} as const;

/** Returns true if `plan` is at least `minPlan` in the free < pro < premium ordering. */
export function planAtLeast(plan: 'free' | 'pro' | 'premium', minPlan: 'pro' | 'premium'): boolean {
  return config.planRank[plan] >= config.planRank[minPlan];
}
