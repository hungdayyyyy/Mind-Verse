# Software Design Specification (SDS)
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0  
**Date:** 2025-01-01  
**Status:** Approved  

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Security Design](#6-security-design)

---

## 1. Architecture Overview

### 1.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 (App Router) — Web + PWA                     │   │
│  │  Zustand (UI State) + React Query (Server State)         │   │
│  │  Socket.io Client (WebSocket)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS / WSS
┌─────────────────────────────────▼───────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Node.js / Express — REST API                            │   │
│  │  Socket.io Server (WebSocket)                            │   │
│  │  Middleware: auth, rate-limit, validate, error-handler   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────┬───────────────────────────────┘
       │                          │
┌──────▼──────────┐   ┌──────────▼──────────────────────────────┐
│  Primary DB      │   │           Queue Layer                    │
│  MongoDB         │   │  Redis + BullMQ                         │
│  (Mongoose)      │   │  ┌─────────────────────────────────┐    │
│                  │   │  │  TranscribeJob                  │    │
│  Vector Store    │   │  │  GenerateNotesJob               │    │
│  Pinecone /      │   │  │  GenerateFlashcardsJob          │    │
│  pgvector        │   │  │  GenerateQuizJob                │    │
│                  │   │  │  GenerateEmbeddingsJob          │    │
│  Redis Cache     │   │  └─────────────────────────────────┘    │
└──────────────────┘   └──────────┬──────────────────────────────┘
                                  │
                       ┌──────────▼──────────────────────────────┐
                       │        Worker Processes                  │
                       │  ┌──────────────┐  ┌─────────────────┐  │
                       │  │  OpenAI API  │  │  Cloudinary API │  │
                       │  │  - Whisper   │  │  - Stream Audio │  │
                       │  │  - GPT-4o    │  │  - Transcode    │  │
                       │  │  - Embeddings│  └─────────────────┘  │
                       │  └──────────────┘                       │
                       └─────────────────────────────────────────┘

External Services:
  Google OAuth  │  Stripe  │  SendGrid  │  YouTube Data API
```

### 1.2 Monorepo Structure

```
learnwave/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/                # App Router pages and layouts
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities, API clients
│   │   ├── stores/             # Zustand stores
│   │   └── public/             # Static assets
│   │
│   ├── api/                    # Express.js REST API
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   ├── controllers/    # Controller functions
│   │   │   ├── services/       # Business logic
│   │   │   ├── repositories/   # DB access layer
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── queues/         # BullMQ job definitions
│   │   │   ├── workers/        # BullMQ worker processors
│   │   │   ├── sockets/        # Socket.io handlers
│   │   │   └── lib/            # Shared utilities
│   │   └── tests/              # API tests
│   │
│   └── workers/                # Standalone worker processes (optional separation)
│       ├── src/
│       │   ├── processors/     # Job processor implementations
│       │   └── lib/
│       └── Dockerfile
│
├── packages/
│   ├── shared/                 # Shared types, utils, constants
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Pure utility functions
│   │   └── package.json
│   │
│   ├── db/                     # Mongoose models and migrations
│   │   ├── src/
│   │   │   ├── models/         # Mongoose model definitions
│   │   │   └── seeds/          # DB seed data
│   │   └── package.json
│   │
│   └── config/                 # Shared configuration
│       └── src/
│           ├── env.ts          # Zod-validated env schema
│           └── logger.ts       # Winston logger config
│
├── docker-compose.yml          # Local dev environment
├── docker-compose.prod.yml     # Production stack
├── turbo.json                  # Turborepo configuration
├── package.json                # Root workspace config
└── tsconfig.base.json          # Shared TS config
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui |
| UI State | Zustand 4 |
| Server State | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod resolvers |
| Rich Text | Tiptap (block editor for notes) |
| Mind Map | React Flow (react-flow-renderer) |
| Charts | Recharts |
| Icons | Lucide React |
| Animations | Framer Motion |
| WebSocket | Socket.io-client |
| HTTP Client | Axios with interceptors |
| PWA | next-pwa |

### 2.2 Next.js App Router Structure

```
apps/web/app/
├── (auth)/                     # Route group — no main layout
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/[token]/page.tsx
│
├── (dashboard)/                # Route group — with sidebar layout
│   ├── layout.tsx              # Dashboard shell (sidebar + topbar)
│   ├── page.tsx                # Home / recent activity
│   ├── projects/
│   │   ├── page.tsx            # Projects list
│   │   └── [projectId]/
│   │       ├── layout.tsx      # Project layout (breadcrumbs)
│   │       ├── page.tsx        # Project overview
│   │       └── [...path]/      # Folder/content navigation
│   │           └── page.tsx
│   ├── content/
│   │   └── [contentId]/
│   │       ├── layout.tsx      # Content tabs layout
│   │       ├── notes/page.tsx
│   │       ├── mindmap/page.tsx
│   │       ├── flashcards/page.tsx
│   │       ├── quiz/page.tsx
│   │       └── chat/page.tsx
│   ├── analytics/page.tsx
│   ├── study-rooms/
│   │   ├── page.tsx
│   │   └── [roomId]/page.tsx
│   ├── notifications/page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── billing/page.tsx
│       └── profile/page.tsx
│
├── shared/
│   └── [token]/page.tsx        # Public shared content viewer
│
├── layout.tsx                  # Root layout (providers)
├── not-found.tsx
└── error.tsx
```

### 2.3 Server vs. Client Component Strategy

**Server Components (default):** Used for all data-fetching pages, static UI, and SEO-critical content.

```typescript
// app/(dashboard)/projects/page.tsx — Server Component
import { getProjects } from '@/lib/api/projects';

export default async function ProjectsPage() {
  const projects = await getProjects(); // Direct server-side fetch
  return <ProjectList projects={projects} />;
}
```

**Client Components:** Used for interactive UI, browser APIs, WebSocket connections, and real-time features.

```typescript
// components/content/NoteEditor.tsx — Client Component
'use client';
import { useEditor } from '@tiptap/react';
// Interactive Tiptap editor requires client-side rendering
```

**Hybrid Pattern:** Server Component wraps Client Components to pass server-fetched data as props.

### 2.4 State Management Architecture

#### Zustand Stores

```typescript
// stores/auth.store.ts
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// stores/ui.store.ts
interface UIStore {
  sidebarOpen: boolean;
  activeModal: ModalType | null;
  uploadProgress: Record<string, UploadProgress>;
  toggleSidebar: () => void;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;
  setUploadProgress: (id: string, progress: UploadProgress) => void;
}

// stores/chat.store.ts
interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  sendMessage: (content: string, contentItemId?: string) => Promise<void>;
}
```

#### React Query Configuration

```typescript
// lib/query-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,         // 10 minutes
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => toast.error(error.message),
    },
  },
});

// Key factory pattern
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  content: {
    all: ['content'] as const,
    byProject: (projectId: string) => [...queryKeys.content.all, projectId] as const,
    detail: (id: string) => [...queryKeys.content.all, 'detail', id] as const,
    notes: (id: string) => [...queryKeys.content.all, id, 'notes'] as const,
  },
};
```

### 2.5 Component Hierarchy

```
RootLayout
├── Providers (QueryClientProvider, AuthProvider, ToastProvider)
├── (auth) Layout — minimal chrome
│   └── AuthForm components
└── (dashboard) Layout
    ├── Sidebar
    │   ├── UserAvatar + ProjectsList
    │   ├── NavigationLinks
    │   └── UpgradePrompt (Free users)
    ├── Topbar
    │   ├── Breadcrumbs
    │   ├── SearchBar (command palette)
    │   └── NotificationBell + UserMenu
    └── Main Content Area
        ├── ProjectView → FolderTree + ContentGrid
        ├── ContentView → TabNav → [Notes|MindMap|Flashcards|Quiz|Chat]
        │   ├── NotesView → BlockEditor (Tiptap)
        │   ├── MindMapView → ReactFlow canvas
        │   ├── FlashcardView → DeckBrowser + StudySession
        │   ├── QuizView → QuizRunner + ResultsBreakdown
        │   └── ChatView → MessageList + InputBox
        ├── AnalyticsDashboard → StreakCard + ActivityHeatmap + MasteryChart
        └── StudyRoom → SharedNotes + LiveQuiz + ParticipantList + Chat
```

### 2.6 Axios Interceptor Pattern

```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Send httpOnly cookie
});

// Request: attach access token from memory
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: handle 401 with token refresh
let isRefreshing = false;
let failedQueue: AxiosRequestConfig[] = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        await refreshAccessToken(); // Calls /api/auth/refresh
        isRefreshing = false;
        failedQueue.forEach((req) => apiClient(req));
        failedQueue = [];
      }
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Backend Architecture

### 3.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4 |
| Language | TypeScript 5 |
| ORM | Mongoose 8 |
| Queue | BullMQ 5 + Redis |
| WebSocket | Socket.io 4 |
| Validation | Zod |
| Auth | jsonwebtoken + bcryptjs |
| Logging | Winston + Morgan |
| Testing | Jest + Supertest |
| Process Manager | PM2 (dev) / Kubernetes (prod) |

### 3.2 Express Application Structure

```typescript
// src/app.ts
const app = express();

// Global middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: winstonStream }));
app.use(requestIdMiddleware); // Attach correlation ID

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', authenticate, userRouter);
app.use('/api/projects', authenticate, projectRouter);
app.use('/api/folders', authenticate, folderRouter);
app.use('/api/content', authenticate, contentRouter);
app.use('/api/notes', authenticate, notesRouter);
app.use('/api/mindmaps', authenticate, mindmapRouter);
app.use('/api/flashcards', authenticate, flashcardRouter);
app.use('/api/decks', authenticate, deckRouter);
app.use('/api/quizzes', authenticate, quizRouter);
app.use('/api/chat', authenticate, chatRouter);
app.use('/api/analytics', authenticate, analyticsRouter);
app.use('/api/study-rooms', authenticate, studyRoomRouter);
app.use('/api/notifications', authenticate, notificationRouter);

// Health checks
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/ready', readinessCheck);

// Error handler (must be last)
app.use(errorHandler);
```

### 3.3 Service Layer Pattern

All business logic follows: **Route → Controller → Service → Repository**

```typescript
// routes/projects.route.ts
router.post('/', validate(createProjectSchema), createProject);

// controllers/projects.controller.ts
export const createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await projectService.createProject(req.user!.id, req.body);
  res.status(201).json({ data: project });
});

// services/projects.service.ts
export const projectService = {
  async createProject(ownerId: string, data: CreateProjectInput): Promise<Project> {
    await this.validateProjectLimit(ownerId); // Check plan limits
    const project = await projectRepository.create({ ...data, ownerId });
    await analyticsService.trackEvent(ownerId, 'project_created');
    return project;
  }
};

// repositories/projects.repository.ts
export const projectRepository = {
  async create(data: CreateProjectData): Promise<Project> {
    return await ProjectModel.create(data);
  },
  async findByUser(userId: string): Promise<Project[]> {
    return await ProjectModel.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
      deletedAt: null,
    }).sort({ updatedAt: -1 });
  }
};
```

### 3.4 Middleware Stack

```typescript
// middleware/authenticate.ts
export const authenticate = asyncHandler(async (req: AuthRequest, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new UnauthorizedError('No token provided');
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
  req.user = await userRepository.findById(payload.sub);
  if (!req.user) throw new UnauthorizedError('User not found');
  next();
});

// middleware/validate.ts
export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  req.validated = result.data;
  next();
};

// middleware/rateLimit.ts
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip!,
  handler: (req, res) => res.status(429).json({ error: 'Too many attempts' }),
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: AuthRequest) => req.user?.id ?? req.ip!,
});

// middleware/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, requestId: req.id, path: req.path });
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  return res.status(500).json({ error: 'Internal server error' });
};
```

### 3.5 Queue System (BullMQ)

#### Queue Architecture

```typescript
// queues/index.ts
import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis';

export const contentProcessingQueue = new Queue('content-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// Job types
export type JobName =
  | 'TranscribeJob'
  | 'GenerateNotesJob'
  | 'GenerateFlashcardsJob'
  | 'GenerateQuizJob'
  | 'GenerateEmbeddingsJob';
```

#### Job Orchestration (Pipeline Pattern)

```
Content Upload Completed
        │
        ▼
  TranscribeJob ──────────────────────────────────────────────┐
  (Whisper API)                                               │
        │ on complete: emit progress(transcribe: done)         │
        │                                                      │
        ├──────────────────┬──────────────────┐               │
        ▼                  ▼                  ▼               │
GenerateNotesJob  GenerateFlashcardsJob GenerateQuizJob        │
  (GPT-4o)           (GPT-4o)            (GPT-4o)             │
        │                  │                  │               │
        └──────────────────┴──────────────────┘               │
                           │                                  │
                           ▼                                  │
                 GenerateEmbeddingsJob ◄───────────────────────┘
                   (Embeddings API)
                           │
                           ▼
                    All Complete → Notify User
```

#### Worker Implementation

```typescript
// workers/transcribe.worker.ts
import { Worker, Job } from 'bullmq';

const transcribeWorker = new Worker(
  'content-processing',
  async (job: Job<TranscribeJobData>) => {
    if (job.name !== 'TranscribeJob') return;
    
    const { contentItemId } = job.data;
    await contentRepository.updateStatus(contentItemId, 'processing');
    
    try {
      // Download audio from Cloudinary
      const audioBuffer = await cloudinaryService.downloadAudio(job.data.cloudinaryUrl);
      
      // Send to Whisper
      const transcript = await openaiService.transcribe(audioBuffer, {
        language: job.data.language,
        response_format: 'verbose_json', // Include segments
      });
      
      // Save transcript
      await contentRepository.updateTranscript(contentItemId, transcript);
      
      // Emit WebSocket event
      socketService.emitToUser(job.data.userId, 'processing:progress', {
        contentItemId, stage: 'transcribe', status: 'completed',
      });
      
      // Enqueue downstream jobs
      await Promise.all([
        contentProcessingQueue.add('GenerateNotesJob', { contentItemId, transcript: transcript.text }),
        contentProcessingQueue.add('GenerateFlashcardsJob', { contentItemId, transcript: transcript.text }),
        contentProcessingQueue.add('GenerateQuizJob', { contentItemId, transcript: transcript.text }),
        contentProcessingQueue.add('GenerateEmbeddingsJob', { contentItemId, transcript }),
      ]);
      
    } catch (err) {
      await contentRepository.updateStatus(contentItemId, 'failed');
      socketService.emitToUser(job.data.userId, 'processing:error', { contentItemId, stage: 'transcribe' });
      throw err; // BullMQ will retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs in parallel
  }
);
```

### 3.6 WebSocket (Socket.io)

```typescript
// sockets/index.ts
export const initializeSocketServer = (server: HTTPServer) => {
  const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    
    // Join user's personal room for targeted events
    socket.join(`user:${userId}`);
    
    // Study Room handlers
    socket.on('room:join', handleRoomJoin(io, socket));
    socket.on('room:leave', handleRoomLeave(io, socket));
    socket.on('room:answer', handleQuizAnswer(io, socket));
    socket.on('room:note-update', handleNoteUpdate(io, socket));
    
    socket.on('disconnect', handleDisconnect(io, socket));
  });
  
  return io;
};

// Emit to specific user (from worker/service context)
export const socketService = {
  emitToUser: (userId: string, event: string, data: unknown) => {
    io.to(`user:${userId}`).emit(event, data);
  },
  emitToRoom: (roomId: string, event: string, data: unknown) => {
    io.to(`room:${roomId}`).emit(event, data);
  },
};
```

---

## 4. Database Design (MongoDB with Mongoose)

### 4.1 Users Collection

**Purpose:** Stores user account information, settings, and aggregate stats.

```typescript
// packages/db/src/models/user.model.ts
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  avatar: { type: String, default: null }, // URL
  googleId: { type: String, sparse: true, unique: true, default: null },
  passwordHash: { type: String, default: null }, // null for OAuth-only users
  plan: { type: String, enum: ['free', 'pro'], default: 'free', required: true },
  stripeCustomerId: { type: String, sparse: true, default: null },
  stripeSubscriptionId: { type: String, sparse: true, default: null },
  subscriptionStatus: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: null },
  settings: {
    language: { type: String, default: 'en' },
    notifications: {
      srsReminders: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      shareInvites: { type: Boolean, default: true },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    timezone: { type: String, default: 'UTC' },
  },
  stats: {
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 }, // seconds
    lastStudyDate: { type: Date, default: null },
    totalContentProcessed: { type: Number, default: 0 },
  },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }, // Soft delete
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ deletedAt: 1 });
```

**Example Document:**
```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "email": "user@example.com",
  "name": "Alice Johnson",
  "avatar": "https://lh3.googleusercontent.com/...",
  "googleId": "116234567890123456789",
  "passwordHash": null,
  "plan": "pro",
  "stripeCustomerId": "cus_Abc123XYZ",
  "stripeSubscriptionId": "sub_Def456UVW",
  "subscriptionStatus": "active",
  "settings": {
    "language": "en",
    "notifications": { "srsReminders": true, "emailNotifications": true, "shareInvites": true },
    "theme": "dark",
    "timezone": "America/New_York"
  },
  "stats": {
    "streak": 14,
    "longestStreak": 30,
    "totalStudyTime": 86400,
    "lastStudyDate": "2025-01-01T10:00:00.000Z",
    "totalContentProcessed": 47
  },
  "emailVerified": true,
  "createdAt": "2024-09-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z",
  "deletedAt": null
}
```

---

### 4.2 Projects Collection

**Purpose:** Organizes content into workspaces with access control.

```typescript
const projectSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  color: { type: String, default: '#6366f1' }, // Hex color
  icon: { type: String, default: '📚' }, // Emoji or icon name
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
    joinedAt: { type: Date, default: Date.now },
  }],
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, default: null, sparse: true },
  itemCount: { type: Number, default: 0 }, // Denormalized for performance
  lastActivityAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

projectSchema.index({ ownerId: 1, deletedAt: 1 });
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ shareToken: 1 }, { sparse: true });
```

---

### 4.3 Folders Collection

**Purpose:** Hierarchical organization of content within projects (max 2 levels).

```typescript
const folderSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  parentFolderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 }, // For manual ordering
  depth: { type: Number, default: 0, max: 1 }, // 0 = top-level, 1 = nested
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

folderSchema.index({ projectId: 1, parentFolderId: 1, deletedAt: 1 });
folderSchema.index({ ownerId: 1 });
```

---

### 4.4 Content Items Collection

**Purpose:** Central collection for all uploaded/linked learning content.

```typescript
const contentItemSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 255 },
  type: {
    type: String,
    enum: ['video', 'audio', 'pdf', 'doc', 'pptx', 'txt', 'youtube', 'note'],
    required: true,
  },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: {
    url: { type: String, default: null }, // Original URL (YouTube) or Cloudinary URL
    cloudinaryId: { type: String, default: null },
    cloudinaryUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    duration: { type: Number, default: null }, // Seconds (video/audio)
    pageCount: { type: Number, default: null }, // PDF
    fileSize: { type: Number, default: null }, // Bytes
    mimeType: { type: String, default: null },
    youtubeVideoId: { type: String, default: null },
  },
  transcript: {
    text: { type: String, default: null },
    segments: [{
      start: Number,
      end: Number,
      text: String,
    }],
    language: { type: String, default: null },
    wordCount: { type: Number, default: null },
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending',
    index: true,
  },
  processingJobs: {
    transcribe: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    notes: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    flashcards: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    quiz: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    embeddings: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
  },
  tags: [{ type: String, trim: true, maxlength: 50 }],
  language: { type: String, default: 'en' },
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, default: null, sparse: true },
  viewCount: { type: Number, default: 0 },
  masteryScore: { type: Number, default: 0, min: 0, max: 100 }, // Computed
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

contentItemSchema.index({ projectId: 1, deletedAt: 1 });
contentItemSchema.index({ ownerId: 1, deletedAt: 1 });
contentItemSchema.index({ shareToken: 1 }, { sparse: true });
contentItemSchema.index({ processingStatus: 1 });
contentItemSchema.index({ tags: 1 });
```

---

### 4.5 Notes Collection

```typescript
const notesSchema = new Schema({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocks: [{
    id: { type: String, required: true }, // UUID for react-key and tiptap
    type: {
      type: String,
      enum: ['h1', 'h2', 'h3', 'bullet', 'numbered', 'callout', 'quote', 'keyterm', 'code', 'divider', 'summary'],
      required: true,
    },
    content: { type: String, default: '' }, // Markdown or plain text
    metadata: {
      calloutType: { type: String, enum: ['info', 'warning', 'tip', 'danger'], default: null },
      language: { type: String, default: null }, // For code blocks
      url: { type: String, default: null }, // For embeds
    },
  }],
  version: { type: Number, default: 1 },
  versionHistory: [{ // Last 10 versions
    version: Number,
    blocks: Array, // Same structure as blocks
    savedAt: Date,
    savedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
  isAiGenerated: { type: Boolean, default: true },
  lastEditedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

notesSchema.index({ contentItemId: 1 });
notesSchema.index({ ownerId: 1 });
```

---

### 4.6 Mind Maps Collection

```typescript
const mindMapSchema = new Schema({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nodes: [{
    id: { type: String, required: true },
    label: { type: String, required: true, maxlength: 200 },
    type: { type: String, enum: ['root', 'branch', 'leaf'], default: 'leaf' },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    style: {
      backgroundColor: { type: String, default: null },
      fontSize: { type: Number, default: 14 },
    },
    metadata: {
      contentTimestamp: { type: Number, default: null }, // Link to video timestamp
      pageRef: { type: Number, default: null }, // Link to PDF page
    },
  }],
  edges: [{
    id: { type: String, required: true },
    source: { type: String, required: true }, // node id
    target: { type: String, required: true }, // node id
    label: { type: String, default: '' },
    type: { type: String, enum: ['default', 'straight', 'step'], default: 'default' },
  }],
  version: { type: Number, default: 1 },
  isAiGenerated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

mindMapSchema.index({ contentItemId: 1 });
```

---

### 4.7 Flashcards Collection

```typescript
const flashcardSchema = new Schema({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  deckId: { type: Schema.Types.ObjectId, ref: 'Deck', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  front: {
    text: { type: String, required: true, maxlength: 2000 },
    richText: { type: String, default: null }, // Tiptap JSON
    imageUrl: { type: String, default: null },
  },
  back: {
    text: { type: String, required: true, maxlength: 5000 },
    richText: { type: String, default: null },
    imageUrl: { type: String, default: null },
  },
  tags: [String],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  srsData: {
    dueDate: { type: Date, default: Date.now }, // When this card is next due for review
    interval: { type: Number, default: 1 }, // Days until next review
    easeFactor: { type: Number, default: 2.5 }, // SM-2 ease factor (1.3–2.5+)
    repetitions: { type: Number, default: 0 }, // Number of successful reviews
    lapses: { type: Number, default: 0 }, // Number of times rated 'Again'
    lastReviewedAt: { type: Date, default: null },
    lastRating: { type: Number, default: null }, // 0=Again, 1=Hard, 2=Good, 3=Easy
  },
  isAiGenerated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

flashcardSchema.index({ deckId: 1 });
flashcardSchema.index({ ownerId: 1, 'srsData.dueDate': 1 }); // For daily due query
flashcardSchema.index({ contentItemId: 1 });
```

---

### 4.8 Decks Collection

```typescript
const deckSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, default: '', maxlength: 500 },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cardCount: { type: Number, default: 0 }, // Denormalized
  masteredCount: { type: Number, default: 0 }, // Cards with repetitions >= 3
  newCount: { type: Number, default: 0 }, // Cards with repetitions === 0
  dueCount: { type: Number, default: 0 }, // Cards due today (refreshed daily)
  language: { type: String, default: 'en' },
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, default: null, sparse: true },
  coverImageUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

deckSchema.index({ ownerId: 1, deletedAt: 1 });
deckSchema.index({ contentItemId: 1 });
deckSchema.index({ shareToken: 1 }, { sparse: true });
```

---

### 4.9 Quizzes Collection

```typescript
const quizSchema = new Schema({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 500 },
  questions: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'truefalse', 'short'], required: true },
    question: { type: String, required: true, maxlength: 1000 },
    options: [{ // MCQ only
      id: String,
      text: String,
    }],
    correctAnswer: { type: String, required: true }, // Option id for MCQ, 'true'/'false', or text for short
    explanation: { type: String, default: '', maxlength: 1000 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    tags: [String],
    points: { type: Number, default: 1 },
  }],
  settings: {
    timeLimit: { type: Number, default: null }, // Seconds per quiz, null = no limit
    timeLimitPerQuestion: { type: Number, default: null }, // Seconds per question
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: true },
    showExplanations: { type: Boolean, default: true },
    passingScore: { type: Number, default: 70 }, // Percentage
  },
  totalPoints: { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 }, // Denormalized
  averageScore: { type: Number, default: null }, // Denormalized
  isAiGenerated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

quizSchema.index({ contentItemId: 1 });
quizSchema.index({ ownerId: 1 });
```

---

### 4.10 Quiz Attempts Collection

```typescript
const quizAttemptSchema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  answers: [{
    questionId: { type: String, required: true },
    selectedAnswer: { type: String, default: null }, // null if skipped
    isCorrect: { type: Boolean, required: true },
    timeTaken: { type: Number, default: 0 }, // Seconds
    pointsEarned: { type: Number, default: 0 },
  }],
  score: { type: Number, required: true }, // Percentage 0-100
  totalPoints: { type: Number, default: 0 },
  earnedPoints: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  skippedCount: { type: Number, default: 0 },
  timeTaken: { type: Number, required: true }, // Total seconds
  passed: { type: Boolean, required: true },
  weakAreas: [{ // Computed from incorrect answers
    tag: String,
    incorrectCount: Number,
    totalCount: Number,
  }],
  studyRoomId: { type: Schema.Types.ObjectId, ref: 'StudyRoom', default: null }, // If in study room
  completedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

quizAttemptSchema.index({ quizId: 1, userId: 1 });
quizAttemptSchema.index({ userId: 1, completedAt: -1 });
quizAttemptSchema.index({ contentItemId: 1 });
```

---

### 4.11 Chat Sessions Collection

```typescript
const chatSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', default: null }, // null = global tutor
  title: { type: String, default: 'New Chat', maxlength: 200 },
  messages: [{
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 50000 },
    sources: [{ // RAG citations
      contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem' },
      excerpt: String,
      relevanceScore: Number,
      timestamp: Number, // For video/audio
      pageNumber: Number, // For PDF
    }],
    tokenCount: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
  }],
  totalTokens: { type: Number, default: 0 }, // Running total for cost tracking
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ contentItemId: 1 });
```

---

### 4.12 Embeddings Collection

```typescript
// Used if storing embeddings in MongoDB; replace with Pinecone for production scale
const embeddingSchema = new Schema({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chunkIndex: { type: Number, required: true }, // Order within document
  chunkText: { type: String, required: true }, // The actual text chunk
  embedding: { type: [Number], required: true }, // 1536-dimensional vector
  metadata: {
    startChar: { type: Number, default: null },
    endChar: { type: Number, default: null },
    startTime: { type: Number, default: null }, // For audio/video
    endTime: { type: Number, default: null },
    pageNumber: { type: Number, default: null }, // For PDF
  },
  model: { type: String, default: 'text-embedding-3-small' },
  createdAt: { type: Date, default: Date.now },
});

embeddingSchema.index({ contentItemId: 1, chunkIndex: 1 });
// Note: For vector search in MongoDB, use Atlas Vector Search
// For Pinecone: store contentItemId + chunkIndex as vector metadata
```

---

### 4.13 Share Links Collection

```typescript
const shareLinkSchema = new Schema({
  resourceType: {
    type: String,
    enum: ['project', 'content', 'deck', 'quiz'],
    required: true,
  },
  resourceId: { type: Schema.Types.ObjectId, required: true },
  token: { type: String, required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  permissions: { type: String, enum: ['view', 'fork'], default: 'view' },
  expiresAt: { type: Date, default: null }, // null = never expires
  accessCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

shareLinkSchema.index({ token: 1 }, { unique: true });
shareLinkSchema.index({ resourceId: 1, resourceType: 1 });
shareLinkSchema.index({ ownerId: 1 });
```

---

### 4.14 Study Sessions Collection

```typescript
const studySessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sessionType: {
    type: String,
    enum: ['video', 'audio', 'flashcard', 'quiz', 'notes', 'mindmap', 'chat'],
    required: true,
  },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
  itemsReviewed: { type: Number, default: 0 }, // Cards reviewed, questions answered
  itemsMastered: { type: Number, default: 0 },
  date: { type: String, required: true }, // 'YYYY-MM-DD' for daily aggregation
  createdAt: { type: Date, default: Date.now },
});

studySessionSchema.index({ userId: 1, date: 1 }); // Daily streak/stats queries
studySessionSchema.index({ userId: 1, contentItemId: 1 });
studySessionSchema.index({ userId: 1, startedAt: -1 });
```

---

### 4.15 Notifications Collection

```typescript
const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['srs_reminder', 'share_invite', 'processing_done', 'processing_failed',
           'study_room_invite', 'project_invite', 'quiz_challenge'],
    required: true,
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 500 },
  data: { type: Schema.Types.Mixed, default: {} }, // Type-specific payload
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, expires: '90d' }, // Auto-delete after 90 days
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
```

---

### 4.16 Study Rooms Collection

```typescript
const studyRoomSchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    displayName: String,
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    isActive: { type: Boolean, default: true },
    score: { type: Number, default: 0 }, // Live quiz score
  }],
  maxParticipants: { type: Number, default: 10, min: 2, max: 20 },
  currentActivity: {
    type: { type: String, enum: ['idle', 'notes', 'quiz', 'discussion'], default: 'idle' },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    startedAt: { type: Date, default: null },
    currentQuestion: { type: Number, default: 0 }, // Quiz question index
  },
  sharedNotes: { type: String, default: '' }, // Collaborative notes content
  chatMessages: [{ // Last 200 messages stored in room
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    displayName: String,
    content: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
  inviteCode: { type: String, required: true, unique: true }, // 6-char alphanumeric
  scheduledFor: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

studyRoomSchema.index({ inviteCode: 1 }, { unique: true });
studyRoomSchema.index({ projectId: 1 });
studyRoomSchema.index({ hostId: 1 });
studyRoomSchema.index({ isActive: 1 });
```

---

### 4.17 Index Strategy Summary

| Collection | Key Indexes | Rationale |
|------------|-------------|-----------|
| users | email, googleId | Auth lookups |
| projects | ownerId + deletedAt, members.userId | Dashboard queries |
| content_items | projectId + deletedAt, shareToken | Content listing, sharing |
| flashcards | ownerId + srsData.dueDate | Daily due cards query |
| quiz_attempts | quizId + userId, userId + completedAt | History and analytics |
| chat_sessions | userId + updatedAt | Session list |
| study_sessions | userId + date | Streak calculation |
| notifications | userId + isRead + createdAt | Unread count, list |
| embeddings | contentItemId + chunkIndex | RAG retrieval |

---

## 5. API Design

### 5.1 Base Configuration
- **Base URL:** `https://api.learnwave.app/api`
- **Version:** v1 (embedded in base URL implicitly; explicit versioning in v2)
- **Format:** JSON request and response bodies
- **Auth:** `Authorization: Bearer <access_token>` header
- **Pagination:** Cursor-based using `?cursor=<id>&limit=<n>` (default limit: 20, max: 100)

### 5.2 Route Groups

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/google
GET    /auth/google/callback
POST   /auth/forgot-password
POST   /auth/reset-password

GET    /users/me
PATCH  /users/me
GET    /users/me/stats
DELETE /users/me             # Account deletion request

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/members
POST   /projects/:id/members
PATCH  /projects/:id/members/:userId
DELETE /projects/:id/members/:userId
POST   /projects/:id/share

GET    /folders?projectId=
POST   /folders
GET    /folders/:id
PATCH  /folders/:id
DELETE /folders/:id
POST   /folders/:id/move

GET    /content?projectId=&folderId=
POST   /content/upload       # Returns signed Cloudinary URL + creates item
POST   /content/youtube      # YouTube URL ingestion
GET    /content/:id
PATCH  /content/:id
DELETE /content/:id
POST   /content/:id/reprocess
POST   /content/:id/share

GET    /notes/:contentId
PUT    /notes/:contentId
GET    /notes/:contentId/history

GET    /mindmaps/:contentId
PUT    /mindmaps/:contentId

GET    /decks?projectId=&contentId=
POST   /decks
GET    /decks/:id
PATCH  /decks/:id
DELETE /decks/:id
POST   /decks/:id/share
POST   /decks/:id/fork

GET    /flashcards?deckId=
POST   /flashcards
GET    /flashcards/:id
PATCH  /flashcards/:id
DELETE /flashcards/:id
GET    /flashcards/due        # Due today for current user
POST   /flashcards/:id/review # Submit SRS rating

GET    /quizzes?contentId=
POST   /quizzes
GET    /quizzes/:id
PATCH  /quizzes/:id
DELETE /quizzes/:id
POST   /quizzes/:id/attempt   # Submit full attempt
GET    /quizzes/:id/attempts  # Attempt history
GET    /quizzes/:id/results   # Latest attempt results

POST   /chat/message
GET    /chat/sessions
GET    /chat/sessions/:id
DELETE /chat/sessions/:id
PATCH  /chat/sessions/:id     # Rename

GET    /analytics/dashboard
GET    /analytics/streak
GET    /analytics/weak-areas
GET    /analytics/heatmap
GET    /analytics/mastery?contentId=

GET    /study-rooms?projectId=
POST   /study-rooms
GET    /study-rooms/:id
PATCH  /study-rooms/:id
DELETE /study-rooms/:id
POST   /study-rooms/join      # Join by invite code
POST   /study-rooms/:id/leave
POST   /study-rooms/:id/start-quiz
POST   /study-rooms/:id/kick/:userId

GET    /notifications
PATCH  /notifications/read-all
PATCH  /notifications/:id/read
DELETE /notifications/:id
PATCH  /users/me/notification-preferences
```

---

## 6. Security Design

### 6.1 Authentication Flow

```
Registration:
  Client → POST /auth/register → Validate → Hash password (bcrypt, cost 12) 
  → Create user → Send verification email → Return 201

Login:
  Client → POST /auth/login → Find user → Compare hash 
  → Generate access token (RS256, 15m) + refresh token (random 256-bit, SHA-256 hashed in DB, 30d)
  → Set refresh token in httpOnly, Secure, SameSite=Strict cookie
  → Return { accessToken, user }

Token Refresh:
  Client → POST /auth/refresh (cookie auto-sent)
  → Validate refresh token (hash comparison)
  → Rotate: delete old, issue new refresh token
  → Return new accessToken

Google OAuth:
  Client → GET /auth/google → Redirect to Google consent
  → Google → GET /auth/google/callback?code=...
  → Exchange code → Get userinfo
  → Find/create user → Issue tokens → Redirect to dashboard
```

### 6.2 RBAC Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View content | ✅ | ✅ | ✅ |
| Upload content | ✅ | ✅ | ❌ |
| Edit notes/mindmap | ✅ | ✅ | ❌ |
| Create folders | ✅ | ✅ | ❌ |
| Delete content | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Share resources | ✅ | ✅ | ❌ |

### 6.3 Input Validation (Zod Example)

```typescript
// schemas/content.schema.ts
export const uploadContentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).trim(),
    projectId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid project ID'),
    folderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    type: z.enum(['video', 'audio', 'pdf', 'doc', 'pptx', 'txt']),
    cloudinaryId: z.string().min(1).max(500),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }),
});

export const youtubeIngestSchema = z.object({
  body: z.object({
    url: z.string().url().refine(
      (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url),
      { message: 'Must be a valid YouTube URL' }
    ),
    projectId: z.string().regex(/^[a-f\d]{24}$/i),
    folderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  }),
});
```

### 6.4 File Type Validation

```typescript
// middleware/fileValidation.ts
const ALLOWED_TYPES: Record<string, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'],
  pdf: ['application/pdf'],
  doc: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain', 'text/markdown'],
};

// Always check magic bytes, not just Content-Type header
const validateMagicBytes = async (buffer: Buffer, expectedType: string): Promise<boolean> => {
  const { fileTypeFromBuffer } = await import('file-type');
  const fileType = await fileTypeFromBuffer(buffer);
  return ALLOWED_TYPES[expectedType]?.includes(fileType?.mime ?? '') ?? false;
};
```

### 6.5 Security Headers

```typescript
// Applied via Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{nonce}'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'", "https://api.learnwave.app", "wss://api.learnwave.app"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```
