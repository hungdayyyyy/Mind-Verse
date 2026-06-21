import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Stub required env vars BEFORE any module that reads `process.env` via
// config/index.ts is imported by a test file. Jest's moduleNameMapper +
// per-file imports mean this file must run first (see setupFilesAfterEnv).
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:4000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_OAUTH_CALLBACK_URL = 'http://localhost:4000/api/auth/google/callback';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.CLOUDINARY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_PRICE_ID_PRO_MONTHLY = 'price_test';
process.env.SENDGRID_API_KEY = 'SG.test';
process.env.SENDGRID_FROM_EMAIL = 'test@learnwave.app';
process.env.YOUTUBE_API_KEY = 'test-youtube-key';
process.env.SOCKET_IO_CORS_ORIGIN = 'http://localhost:3000';

let mongo: MongoMemoryServer;

// Mock SendGrid at the module level so no test ever makes a real network
// call for email delivery (registration, password reset, invites, etc. all
// route through @sendgrid/mail under the hood).
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]),
}));

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
