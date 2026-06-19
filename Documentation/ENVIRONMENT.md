# Environment Variables Reference
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0
**Date:** 2025-01-01

---

This document lists all environment variables required to run LearnWave in development and production. Never commit actual secret values to source control — use `.env.local` / `.env` files (gitignored) or a secrets manager (e.g., AWS Secrets Manager, Doppler, Vault) in production.

---

## 1. Frontend — `apps/web/.env.local`

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend REST API | `http://localhost:4000/api` | Yes |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL for Socket.io | `http://localhost:4000` | Yes |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL of the frontend app | `http://localhost:3000` | Yes |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (public, used for client-side widget) | `learnwave-prod` | Yes |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset name (if used for client widget) | `learnwave_uploads` | No |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (public) | `123456789-abc.apps.googleusercontent.com` | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side Checkout | `pk_test_51AbCdEfGhIjKlMn...` | Yes |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics project API key | `phc_AbCdEfGhIjKlMnOpQrStUv` | No |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingestion host | `https://app.posthog.com` | No |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend error tracking | `https://abc123@o123456.ingest.sentry.io/123456` | No |
| `NEXT_PUBLIC_ENABLE_VOICE_QA` | Feature flag to enable Voice Q&A UI | `true` | No |
| `NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB` | Client-side file size validation limit (MB) | `2048` | No |

---

## 2. Backend — `apps/api/.env`

### 2.1 Core Server Configuration

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `PORT` | Port the Express server listens on | `4000` | Yes |
| `API_BASE_URL` | Publicly accessible base URL of the API | `https://api.learnwave.app` | Yes |
| `FRONTEND_URL` | URL of the frontend app (used for CORS and redirect targets) | `https://learnwave.app` | Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `https://learnwave.app,https://www.learnwave.app` | Yes |
| `LOG_LEVEL` | Winston log level | `info` | No |

### 2.2 Database

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster0.mongodb.net/learnwave?retryWrites=true&w=majority` | Yes |
| `MONGODB_DB_NAME` | Database name (if not embedded in URI) | `learnwave_production` | No |
| `SUPABASE_URL` | Supabase project URL (alternative to MongoDB) | `https://abcdefghijk.supabase.co` | Conditional |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Conditional |

### 2.3 Redis & Queue (BullMQ)

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `REDIS_URL` | Redis connection string (used by BullMQ and caching) | `redis://default:password@redis-12345.upstash.io:6379` | Yes |
| `REDIS_TLS_ENABLED` | Whether to use TLS for Redis connection | `true` | No |
| `QUEUE_CONCURRENCY` | Default worker concurrency per queue | `5` | No |
| `QUEUE_MAX_RETRIES` | Max retry attempts for failed jobs | `3` | No |

### 2.4 Authentication & Security

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `JWT_ACCESS_SECRET` | Secret/private key for signing access tokens (RS256 private key or HS256 secret) | `-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----` | Yes |
| `JWT_ACCESS_PUBLIC_KEY` | Public key for verifying access tokens (RS256 only) | `-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----` | Conditional |
| `JWT_ACCESS_EXPIRY` | Access token expiry duration | `15m` | Yes |
| `JWT_REFRESH_SECRET` | Secret for hashing/signing refresh tokens | `a3f8e9c2b1d4567890abcdef1234567890abcdef1234567890abcdef123456` | Yes |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry duration | `30d` | Yes |
| `COOKIE_SECRET` | Secret for signing cookies | `f1e2d3c4b5a6978685746352413f2e1d0c9b8a7` | Yes |
| `BCRYPT_COST_FACTOR` | bcrypt hashing cost factor | `12` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `60000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per user | `100` | No |

### 2.5 Google OAuth

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | `123456789-abc.apps.googleusercontent.com` | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | `GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx` | Yes |
| `GOOGLE_OAUTH_CALLBACK_URL` | Registered OAuth redirect URI | `https://api.learnwave.app/api/auth/google/callback` | Yes |

### 2.6 Cloudinary

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name | `learnwave-prod` | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server-side only) | `AbCdEfGhIjKlMnOpQrStUvWxYz12` | Yes |
| `CLOUDINARY_WEBHOOK_SECRET` | Secret used to verify Cloudinary webhook signatures | `whsec_cld_AbCdEfGhIjKlMnOpQrSt` | Yes |
| `CLOUDINARY_UPLOAD_FOLDER` | Default folder prefix for uploads | `learnwave/content` | No |

### 2.7 OpenAI

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `OPENAI_API_KEY` | OpenAI API key (server-side only) | `sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890` | Yes |
| `OPENAI_ORG_ID` | OpenAI organization ID (optional, for billing segregation) | `org-AbCdEfGhIjKlMnOpQrSt` | No |
| `OPENAI_WHISPER_MODEL` | Whisper model identifier | `whisper-1` | No |
| `OPENAI_CHAT_MODEL` | GPT model used for generation/RAG | `gpt-4o` | No |
| `OPENAI_EMBEDDING_MODEL` | Embedding model identifier | `text-embedding-3-small` | No |
| `OPENAI_MAX_RETRIES` | Max retry attempts on rate limit/transient errors | `3` | No |
| `OPENAI_REQUEST_TIMEOUT_MS` | Per-request timeout in milliseconds | `60000` | No |

### 2.8 Vector Store (Pinecone or pgvector)

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `PINECONE_API_KEY` | Pinecone API key | `12345678-abcd-1234-abcd-1234567890ab` | Conditional |
| `PINECONE_ENVIRONMENT` | Pinecone environment/region | `us-east-1-aws` | Conditional |
| `PINECONE_INDEX_NAME` | Pinecone index name | `learnwave-embeddings` | Conditional |
| `PGVECTOR_CONNECTION_STRING` | PostgreSQL connection string for pgvector (alternative to Pinecone) | `postgresql://user:pass@localhost:5432/learnwave_vectors` | Conditional |

### 2.9 Stripe

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side only) | `sk_test_51AbCdEfGhIjKlMn...` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Secret used to verify Stripe webhook signatures | `whsec_AbCdEfGhIjKlMnOpQrStUvWxYz` | Yes |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | Stripe Price ID for Pro monthly plan | `price_1AbCdEfGhIjKlMnOpQr` | Yes |
| `STRIPE_PRICE_ID_PRO_YEARLY` | Stripe Price ID for Pro yearly plan | `price_1AbCdEfGhIjKlMnOpQs` | No |

### 2.10 SendGrid (Email)

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `SENDGRID_API_KEY` | SendGrid API key | `SG.AbCdEfGhIjKlMnOpQrStUv.WxYz1234567890AbCdEfGhIjKlMnOpQrStUv` | Yes |
| `SENDGRID_FROM_EMAIL` | Verified sender email address | `noreply@learnwave.app` | Yes |
| `SENDGRID_FROM_NAME` | Sender display name | `LearnWave` | No |
| `SENDGRID_TEMPLATE_EMAIL_VERIFICATION` | Dynamic template ID for email verification | `d-abc123def456ghi789jkl012` | Yes |
| `SENDGRID_TEMPLATE_PASSWORD_RESET` | Dynamic template ID for password reset | `d-def456ghi789jkl012abc123` | Yes |
| `SENDGRID_TEMPLATE_PROJECT_INVITE` | Dynamic template ID for project invitations | `d-ghi789jkl012abc123def456` | Yes |
| `SENDGRID_TEMPLATE_SRS_REMINDER` | Dynamic template ID for SRS review reminders | `d-jkl012abc123def456ghi789` | Yes |
| `SENDGRID_TEMPLATE_SHARE_NOTIFICATION` | Dynamic template ID for share notifications | `d-mno345pqr678stu901vwx234` | Yes |

### 2.11 YouTube Data API

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567` | Yes |

### 2.12 WebSocket / Socket.io

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `SOCKET_IO_ADAPTER` | Adapter type for multi-instance scaling | `redis` | No |
| `SOCKET_IO_CORS_ORIGIN` | Allowed origin(s) for Socket.io connections | `https://learnwave.app` | Yes |

### 2.13 Monitoring & Observability

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `SENTRY_DSN` | Sentry DSN for backend error tracking | `https://def456@o123456.ingest.sentry.io/789012` | No |
| `DATADOG_API_KEY` | Datadog API key for metrics/APM | `abc123def456ghi789jkl012mno345pqr678` | No |

---

## 3. Worker Process — `apps/workers/.env`

*(Workers typically share most of the backend variables above — Redis, MongoDB, OpenAI, Cloudinary — plus the following worker-specific settings.)*

| Variable | Description | Example Value | Required |
|----------|-------------|----------------|----------|
| `WORKER_CONCURRENCY_TRANSCRIBE` | Concurrency for transcription jobs | `3` | No |
| `WORKER_CONCURRENCY_GENERATION` | Concurrency for notes/flashcard/quiz generation jobs | `5` | No |
| `WORKER_CONCURRENCY_EMBEDDINGS` | Concurrency for embedding generation jobs | `10` | No |
| `YT_DLP_BINARY_PATH` | Path to yt-dlp binary for YouTube audio fallback download | `/usr/local/bin/yt-dlp` | Yes |

---

## 4. Example `.env` Files

### `apps/web/.env.local.example`
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=learnwave-dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_
NEXT_PUBLIC_ENABLE_VOICE_QA=true
```

### `apps/api/.env.example`
```bash
NODE_ENV=development
PORT=4000
API_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/learnwave_dev

REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY=30d
COOKIE_SECRET=
BCRYPT_COST_FACTOR=12

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_WEBHOOK_SECRET=

OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=learnwave-dev

STRIPE_SECRET_KEY=sk_test_
STRIPE_WEBHOOK_SECRET=whsec_
STRIPE_PRICE_ID_PRO_MONTHLY=

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@learnwave.app

YOUTUBE_API_KEY=

SOCKET_IO_CORS_ORIGIN=http://localhost:3000
```

---

## 5. Notes on Secrets Management

- **Never** commit `.env` or `.env.local` files to version control; ensure they are listed in `.gitignore`.
- In production, use a secrets manager (AWS Secrets Manager, GCP Secret Manager, Doppler, HashiCorp Vault) and inject variables at deploy time.
- Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` periodically; rotating these invalidates all existing sessions.
- `CLOUDINARY_API_SECRET`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, and `SENDGRID_API_KEY` must only ever be used server-side — never expose them to the frontend bundle.
- Use distinct API keys/projects for development, staging, and production environments to avoid cross-environment data contamination (especially for Stripe and OpenAI billing).
