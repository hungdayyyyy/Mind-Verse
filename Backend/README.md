# LearnWave API

Production-ready Node.js/Express backend for LearnWave, implementing the SRS, SDS, USE_CASES, DATABASE, API_REFERENCE, and ENVIRONMENT specs in `/docs`.

## Stack

Node.js 20 · Express 4 · MongoDB/Mongoose · BullMQ/Redis · Cloudinary · OpenAI (Whisper, GPT-4o, embeddings) · Socket.io · JWT · Zod · Stripe

## Getting started

```bash
cp .env.example .env   # fill in real credentials
npm install
npm run dev             # API + Socket.io server, http://localhost:4000
npm run dev:worker       # separate process — BullMQ workers (run alongside dev)
```

## Project layout

```
src/
  config/        env validation, DB/Redis/Cloudinary/OpenAI/Stripe/Socket.io clients
  modules/       one folder per domain (auth, users, projects, content, notes, ...)
  workers/       BullMQ job processors (transcribe, notes, flashcards, quiz, embeddings)
  middleware/    auth, RBAC, validation, rate limiting, error handling
  shared/        errors, types, utils (SRS algorithm, pagination, chunking, etc.)
  app.ts         Express app assembly
  server.ts      API process entry point
  worker-server.ts  worker process entry point (scales independently of the API)
```

## Authorization model

Two **independent** RBAC layers exist — don't confuse them:

1. **Project-level (`ProjectRole`)**: `owner | editor | viewer`, scoped to a single project. Enforced by `middleware/rbac.middleware.ts` (`checkProjectAccess`, `requireOwner`, `requireEditor`, `requireViewer`). Governs who can edit/delete *within* a project.

2. **System-level (`SystemRole`)**: `user | support | admin | super_admin`, global to the platform. Enforced by `middleware/auth.middleware.ts` (`requireSystemRole`). Governs the **admin module** (`/api/admin/*`) — user management, moderation (suspend/ban), plan overrides, and role changes. See `modules/admin/admin.service.ts` for the full guardrails:
   - `support` can read user data and force password resets, but cannot mutate plans/roles/status.
   - `admin` can change plans and suspend/ban — but **cannot** moderate other `admin`/`super_admin` accounts (prevents privilege abuse).
   - `super_admin` is the only role that can promote/demote other admins, and cannot change its own role (lockout protection).
   - Every admin action is written to an immutable `AdminAuditLog` collection.

**Plan tiers (`Plan`)** are a third, separate axis: `free | pro | premium`, gating feature access (e.g., `requirePlan('pro')` for Study Room hosting) and quota limits (`config.plans`). A user's `Plan` and `SystemRole` are fully independent — a `free`-plan user can be an `admin`, and a `premium`-plan user is still an ordinary `user` unless explicitly promoted.

## Testing

```bash
npm test               # all tests (unit + integration, in-memory MongoDB)
npm run test:unit
npm run test:integration
```

## Key implementation notes

- **Content pipeline**: `content.service.ts#initiateUpload` issues a signed Cloudinary upload URL; the client uploads directly to Cloudinary (bytes never pass through the API). A webhook (`POST /api/content/webhook/cloudinary`) confirms completion and triggers `startProcessingPipeline`, which enqueues `TranscribeJob` (AV content) or extracts text synchronously (documents) before fanning out to notes/flashcards/quiz/embeddings.
- **SRS scheduling**: `shared/utils/srs.ts` implements SM-2; flashcard reviews call `calculateNextReview` and persist the result on `flashcard.srsData`.
- **RAG chat**: `modules/chat/rag/embeddings.service.ts` chunks + embeds content; `retrieval.service.ts` does cosine-similarity top-K search (swap for Pinecone at scale — see `PINECONE_*` env vars); `chat.service.ts` streams GPT-4o responses via SSE.
- **Study Room**: REST endpoints manage room lifecycle; live quiz gameplay runs entirely over Socket.io (`modules/study-rooms/studyRoom.socket.ts`), including the question-by-question timer loop and leaderboard broadcast.

## Plugin architecture

Each feature module is self-contained under `src/modules/<feature>/`. To add a new feature:

```ts
// src/modules/my-feature/index.ts
export const myFeatureModule = {
  router: myFeatureRouter,
  workers: [myFeatureWorker],       // optional
  socketHandlers: registerSockets,  // optional
};
```

Then add one line in `app.ts` (`app.use('/api/my-feature', myFeatureRouter)`) and, if it has workers, one line in `workers/index.ts`. See `modules/admin/index.ts` for a reference module barrel.
