# API Reference
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0
**Base URL:** `https://api.learnwave.app/api`
**Date:** 2025-01-01

---

## Conventions

- All requests/responses use `Content-Type: application/json` unless uploading binary data.
- Authenticated endpoints require `Authorization: Bearer <access_token>`.
- All IDs are MongoDB ObjectId strings (24 hex chars).
- Timestamps are ISO 8601 UTC strings.
- Pagination uses `?cursor=<id>&limit=<n>` (default limit 20, max 100); responses include `nextCursor`.
- Standard error shape:
```json
{ "error": "Human readable message", "code": "ERROR_CODE", "details": {} }
```

### Common Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | VALIDATION_ERROR | Request body/query failed schema validation |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Authenticated but lacks permission |
| 404 | NOT_FOUND | Resource does not exist or is soft-deleted |
| 409 | CONFLICT | Duplicate resource (e.g., email exists) |
| 410 | GONE | Share link expired/revoked |
| 422 | PLAN_LIMIT_EXCEEDED | Free plan limit reached |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |

---

## 1. Authentication

### POST /auth/register
**Auth:** No

**Request body (zod):**
```typescript
z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
})
```

**Response (201):**
```typescript
z.object({
  data: z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.string(), email: z.string(), name: z.string(),
      plan: z.enum(['free', 'pro']), emailVerified: z.boolean(),
    }),
  }),
})
```

**Errors:** 400 VALIDATION_ERROR, 409 CONFLICT (email exists)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Johnson","email":"alice@example.com","password":"SecurePass1!"}'
```

**Example response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "user": { "id": "64f1a2b3c4d5e6f7a8b9c0d1", "email": "alice@example.com", "name": "Alice Johnson", "plan": "free", "emailVerified": false }
  }
}
```

---

### POST /auth/login
**Auth:** No

**Request body:**
```typescript
z.object({ email: z.string().email(), password: z.string().min(1) })
```

**Response (200):** Same shape as register.

**Errors:** 401 UNAUTHORIZED (bad credentials), 429 RATE_LIMITED

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"SecurePass1!"}'
```

---

### POST /auth/refresh
**Auth:** No (uses httpOnly refresh cookie)

**Request body:** none

**Response (200):**
```typescript
z.object({ data: z.object({ accessToken: z.string() }) })
```

**Errors:** 401 UNAUTHORIZED (refresh token invalid/expired)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/auth/refresh --cookie "refreshToken=<cookie_value>"
```

---

### POST /auth/logout
**Auth:** Yes (any role)

**Response (200):** `{ "data": { "success": true } }`

---

### GET /auth/google
**Auth:** No — redirects to Google OAuth consent screen.

### GET /auth/google/callback
**Auth:** No — handles OAuth callback, redirects to frontend with session established.

---

### POST /auth/forgot-password
**Auth:** No

**Request body:** `z.object({ email: z.string().email() })`

**Response (200):** `{ "data": { "message": "If that email exists, a reset link has been sent." } }`  
*(Always returns success to avoid email enumeration.)*

---

### POST /auth/reset-password
**Auth:** No

**Request body:**
```typescript
z.object({ token: z.string(), newPassword: z.string().min(8) })
```

**Response (200):** `{ "data": { "success": true } }`  
**Errors:** 400 VALIDATION_ERROR (token expired/invalid)

---

## 2. Users

### GET /users/me
**Auth:** Yes (any role)

**Response (200):**
```typescript
z.object({ data: UserSchema }) // full user object minus passwordHash
```

**curl:**
```bash
curl https://api.learnwave.app/api/users/me -H "Authorization: Bearer <token>"
```

---

### PATCH /users/me
**Auth:** Yes

**Request body:**
```typescript
z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
  settings: z.object({
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    timezone: z.string().optional(),
    notifications: z.object({
      srsReminders: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      shareInvites: z.boolean().optional(),
    }).optional(),
  }).optional(),
}).partial()
```

**Response (200):** `{ "data": UserSchema }`

---

### GET /users/me/stats
**Auth:** Yes

**Response (200):**
```json
{
  "data": {
    "streak": 14, "longestStreak": 30, "totalStudyTime": 86400,
    "lastStudyDate": "2025-01-01T00:00:00.000Z", "totalContentProcessed": 47
  }
}
```

---

### DELETE /users/me
**Auth:** Yes — requests full account deletion (processed within 30 days per GDPR).

**Response (202):** `{ "data": { "message": "Account deletion scheduled." } }`

---

## 3. Projects

### GET /projects
**Auth:** Yes

**Query:** `?cursor=&limit=`

**Response (200):**
```typescript
z.object({ data: z.array(ProjectSchema), nextCursor: z.string().nullable() })
```

**curl:**
```bash
curl https://api.learnwave.app/api/projects?limit=20 -H "Authorization: Bearer <token>"
```

---

### POST /projects
**Auth:** Yes — Free plan limited to 5 projects.

**Request body:**
```typescript
z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
})
```

**Response (201):** `{ "data": ProjectSchema }`

**Errors:** 422 PLAN_LIMIT_EXCEEDED

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/projects \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Machine Learning Fundamentals","color":"#6366f1","icon":"🤖"}'
```

**Example response:**
```json
{
  "data": {
    "id": "65a1b2c3d4e5f6a7b8c9d0e1", "name": "Machine Learning Fundamentals",
    "color": "#6366f1", "icon": "🤖", "ownerId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "members": [{ "userId": "64f1a2b3c4d5e6f7a8b9c0d1", "role": "owner" }],
    "itemCount": 0, "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### GET /projects/:id
**Auth:** Yes — owner/member only

**Response (200):** `{ "data": ProjectSchema }`  
**Errors:** 403 FORBIDDEN, 404 NOT_FOUND

---

### PATCH /projects/:id
**Auth:** Yes — owner/editor

**Request body:** Same fields as POST, all optional.

**Response (200):** `{ "data": ProjectSchema }`

---

### DELETE /projects/:id
**Auth:** Yes — owner only

**Response (200):** `{ "data": { "success": true } }`

---

### GET /projects/:id/members
**Auth:** Yes — owner/member

**Response (200):** `{ "data": [{ "userId": "...", "name": "...", "email": "...", "role": "editor", "joinedAt": "..." }] }`

---

### POST /projects/:id/members
**Auth:** Yes — owner only

**Request body:**
```typescript
z.object({ email: z.string().email(), role: z.enum(['editor', 'viewer']) })
```

**Response (201):** `{ "data": { "success": true, "invited": true } }`

---

### PATCH /projects/:id/members/:userId
**Auth:** Yes — owner only

**Request body:** `z.object({ role: z.enum(['editor', 'viewer']) })`

**Response (200):** `{ "data": { "success": true } }`

---

### DELETE /projects/:id/members/:userId
**Auth:** Yes — owner only

**Response (200):** `{ "data": { "success": true } }`

---

### POST /projects/:id/share
**Auth:** Yes — owner/editor

**Request body:**
```typescript
z.object({ permissions: z.enum(['view', 'fork']), expiresAt: z.string().datetime().nullable().optional() })
```

**Response (201):** `{ "data": { "url": "https://learnwave.app/shared/<token>", "token": "<token>" } }`

---

## 4. Folders

### GET /folders?projectId=
**Auth:** Yes

**Response (200):** `{ "data": [FolderSchema] }`

---

### POST /folders
**Auth:** Yes — owner/editor

**Request body:**
```typescript
z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().regex(/^[a-f\d]{24}$/i),
  parentFolderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
})
```

**Response (201):** `{ "data": FolderSchema }`  
**Errors:** 422 (max nesting depth exceeded)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/folders \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Week 1","projectId":"65a1b2c3d4e5f6a7b8c9d0e1"}'
```

---

### GET /folders/:id
**Auth:** Yes — owner/member

**Response (200):** `{ "data": FolderSchema }`

---

### PATCH /folders/:id
**Auth:** Yes — owner/editor

**Request body:** `z.object({ name: z.string().min(1).max(100).optional(), order: z.number().optional() })`

**Response (200):** `{ "data": FolderSchema }`

---

### DELETE /folders/:id
**Auth:** Yes — owner/editor

**Response (200):** `{ "data": { "success": true } }`

---

### POST /folders/:id/move
**Auth:** Yes — owner/editor

**Request body:** `z.object({ newParentFolderId: z.string().nullable() })`

**Response (200):** `{ "data": FolderSchema }`  
**Errors:** 422 (would exceed max depth)

---

## 5. Content

### GET /content?projectId=&folderId=
**Auth:** Yes

**Response (200):** `{ "data": [ContentItemSchema], "nextCursor": "..." }`

---

### POST /content/upload
**Auth:** Yes — owner/editor; Free plan limited to 3 uploads/month

**Request body:**
```typescript
z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['video', 'audio', 'pdf', 'doc', 'pptx', 'txt']),
  projectId: z.string().regex(/^[a-f\d]{24}$/i),
  folderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  fileSize: z.number().max(2_147_483_648), // 2GB max
  mimeType: z.string(),
})
```

**Response (201):**
```typescript
z.object({
  data: z.object({
    contentItemId: z.string(),
    signedUploadUrl: z.string().url(),
    uploadParams: z.record(z.string()), // Cloudinary signature params
  }),
})
```

**Errors:** 422 PLAN_LIMIT_EXCEEDED, 400 (unsupported file type/size)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/content/upload \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Lecture 4.mp4","type":"video","projectId":"65a1b2c3d4e5f6a7b8c9d0e1","fileSize":524288000,"mimeType":"video/mp4"}'
```

---

### POST /content/youtube
**Auth:** Yes — owner/editor

**Request body:**
```typescript
z.object({
  url: z.string().url().refine(u => /youtube\.com|youtu\.be/.test(u)),
  projectId: z.string().regex(/^[a-f\d]{24}$/i),
  folderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
})
```

**Response (201):** `{ "data": ContentItemSchema }` (processingStatus: "pending")

**Errors:** 400 (invalid URL), 404 (video not found/private)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/content/youtube \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=abc123XYZ","projectId":"65a1b2c3d4e5f6a7b8c9d0e1"}'
```

---

### GET /content/:id
**Auth:** Yes — owner/member, or public if `isPublic: true`

**Response (200):** `{ "data": ContentItemSchema }`

---

### PATCH /content/:id
**Auth:** Yes — owner/editor

**Request body:** `z.object({ title: z.string().max(255).optional(), tags: z.array(z.string()).optional(), folderId: z.string().nullable().optional() })`

**Response (200):** `{ "data": ContentItemSchema }`

---

### DELETE /content/:id
**Auth:** Yes — owner only

**Response (200):** `{ "data": { "success": true } }`

---

### POST /content/:id/reprocess
**Auth:** Yes — owner/editor

**Request body:** `z.object({ stage: z.enum(['transcribe', 'notes', 'flashcards', 'quiz', 'embeddings', 'all']) })`

**Response (202):** `{ "data": { "jobId": "...", "status": "queued" } }`

---

### POST /content/:id/share
**Auth:** Yes — owner/editor

**Request body:** Same as projects/:id/share

**Response (201):** `{ "data": { "url": "...", "token": "..." } }`

---

## 6. Notes

### GET /notes/:contentId
**Auth:** Yes — owner/member or public

**Response (200):** `{ "data": NotesSchema }`

---

### PUT /notes/:contentId
**Auth:** Yes — owner/editor; Pro plan only for manual edits

**Request body:**
```typescript
z.object({
  blocks: z.array(z.object({
    id: z.string(),
    type: z.enum(['h1','h2','h3','bullet','numbered','callout','quote','keyterm','code','divider','summary']),
    content: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
})
```

**Response (200):** `{ "data": NotesSchema }`  
**Errors:** 403 (Free plan attempting edit)

---

### GET /notes/:contentId/history
**Auth:** Yes — owner/member

**Response (200):** `{ "data": [{ "version": 2, "savedAt": "...", "savedBy": "..." }] }`

---

## 7. Mind Maps

### GET /mindmaps/:contentId
**Auth:** Yes — owner/member or public

**Response (200):** `{ "data": MindMapSchema }`

---

### PUT /mindmaps/:contentId
**Auth:** Yes — owner/editor, Pro plan only

**Request body:**
```typescript
z.object({
  nodes: z.array(z.object({
    id: z.string(), label: z.string().max(200),
    type: z.enum(['root','branch','leaf']), x: z.number(), y: z.number(),
  })),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), label: z.string().optional() })),
})
```

**Response (200):** `{ "data": MindMapSchema }`

---

## 8. Decks

### GET /decks?projectId=&contentId=
**Auth:** Yes

**Response (200):** `{ "data": [DeckSchema] }`

---

### POST /decks
**Auth:** Yes — owner/editor

**Request body:** `z.object({ name: z.string().max(150), contentItemId: z.string(), projectId: z.string() })`

**Response (201):** `{ "data": DeckSchema }`

---

### GET /decks/:id
**Auth:** Yes — owner/member or public

**Response (200):** `{ "data": DeckSchema }`

---

### PATCH /decks/:id
**Auth:** Yes — owner/editor

**Request body:** `z.object({ name: z.string().max(150).optional(), description: z.string().max(500).optional() })`

**Response (200):** `{ "data": DeckSchema }`

---

### DELETE /decks/:id
**Auth:** Yes — owner

**Response (200):** `{ "data": { "success": true } }`

---

### POST /decks/:id/share
**Auth:** Yes — owner/editor — same shape as content share

---

### POST /decks/:id/fork
**Auth:** Yes (any plan) — copies deck + flashcards into requesting user's library

**Request body:** `z.object({ targetProjectId: z.string() })`

**Response (201):** `{ "data": DeckSchema }` (new deck, new ownerId)

---

## 9. Flashcards

### GET /flashcards?deckId=
**Auth:** Yes

**Response (200):** `{ "data": [FlashcardSchema] }`

---

### POST /flashcards
**Auth:** Yes — owner/editor

**Request body:**
```typescript
z.object({
  deckId: z.string(), contentItemId: z.string(),
  front: z.object({ text: z.string().max(2000) }),
  back: z.object({ text: z.string().max(5000) }),
  tags: z.array(z.string()).max(20).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
})
```

**Response (201):** `{ "data": FlashcardSchema }`

---

### GET /flashcards/:id
**Auth:** Yes — owner/member

**Response (200):** `{ "data": FlashcardSchema }`

---

### PATCH /flashcards/:id
**Auth:** Yes — owner/editor

**Request body:** Partial of POST body

**Response (200):** `{ "data": FlashcardSchema }`

---

### DELETE /flashcards/:id
**Auth:** Yes — owner/editor

**Response (200):** `{ "data": { "success": true } }`

---

### GET /flashcards/due
**Auth:** Yes — returns cards due today for current user, optionally filtered by `?deckId=`

**Response (200):** `{ "data": [FlashcardSchema], "totalDue": 15 }`

**curl:**
```bash
curl https://api.learnwave.app/api/flashcards/due -H "Authorization: Bearer <token>"
```

---

### POST /flashcards/:id/review
**Auth:** Yes — owner

**Request body:** `z.object({ rating: z.number().int().min(0).max(3) })`

**Response (200):**
```json
{ "data": { "id": "65f1a2b3c4d5e6f7a8b9c0d1", "srsData": { "dueDate": "2025-01-08T00:00:00.000Z", "interval": 7, "easeFactor": 2.3, "repetitions": 4 } } }
```

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/flashcards/65f1a2b3c4d5e6f7a8b9c0d1/review \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"rating":2}'
```

---

## 10. Quizzes

### GET /quizzes?contentId=
**Auth:** Yes

**Response (200):** `{ "data": [QuizSchema] }`

---

### POST /quizzes
**Auth:** Yes — owner/editor (manual quiz creation)

**Request body:**
```typescript
z.object({
  contentItemId: z.string(), title: z.string().max(200),
  questions: z.array(z.object({
    type: z.enum(['mcq', 'truefalse', 'short']),
    question: z.string().max(1000),
    options: z.array(z.object({ text: z.string() })).optional(),
    correctAnswer: z.string(),
    explanation: z.string().max(1000).optional(),
  })),
})
```

**Response (201):** `{ "data": QuizSchema }`

---

### GET /quizzes/:id
**Auth:** Yes — owner/member or public

**Response (200):** `{ "data": QuizSchema }` (correctAnswer omitted unless attempt is completed)

---

### PATCH /quizzes/:id
**Auth:** Yes — owner/editor

**Response (200):** `{ "data": QuizSchema }`

---

### DELETE /quizzes/:id
**Auth:** Yes — owner

**Response (200):** `{ "data": { "success": true } }`

---

### POST /quizzes/:id/attempt
**Auth:** Yes — owner/member

**Request body:**
```typescript
z.object({
  answers: z.array(z.object({ questionId: z.string(), selectedAnswer: z.string().nullable(), timeTaken: z.number() })),
  timeTaken: z.number(),
  studyRoomId: z.string().optional(),
})
```

**Response (201):** `{ "data": QuizAttemptSchema }`

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/quizzes/66b1c2d3e4f5a6b7c8d9e0f1/attempt \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":"q-001","selectedAnswer":"opt-c","timeTaken":12}],"timeTaken":423}'
```

---

### GET /quizzes/:id/attempts
**Auth:** Yes — owner

**Response (200):** `{ "data": [QuizAttemptSchema] }`

---

### GET /quizzes/:id/results
**Auth:** Yes — owner — returns most recent attempt with full breakdown

**Response (200):** `{ "data": QuizAttemptSchema }`

---

## 11. Chat

### POST /chat/message
**Auth:** Yes

**Request body:**
```typescript
z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(), // omit to create new session
  contentItemId: z.string().optional(), // omit for global tutor
})
```

**Response (200):** Server-Sent Events stream; final aggregated shape:
```typescript
z.object({
  data: z.object({
    sessionId: z.string(),
    message: z.object({
      id: z.string(), role: z.literal('assistant'), content: z.string(),
      sources: z.array(z.object({ contentItemId: z.string(), excerpt: z.string(), relevanceScore: z.number() })),
    }),
  }),
})
```

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/chat/message \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"message":"Why does vanishing gradient occur?","contentItemId":"65c1d2e3f4a5b6c7d8e9f0a1"}'
```

---

### GET /chat/sessions
**Auth:** Yes

**Response (200):** `{ "data": [{ "id": "...", "title": "...", "contentItemId": "...", "updatedAt": "..." }] }`

---

### GET /chat/sessions/:id
**Auth:** Yes — owner

**Response (200):** `{ "data": ChatSessionSchema }`

---

### PATCH /chat/sessions/:id
**Auth:** Yes — owner

**Request body:** `z.object({ title: z.string().max(200) })`

**Response (200):** `{ "data": ChatSessionSchema }`

---

### DELETE /chat/sessions/:id
**Auth:** Yes — owner

**Response (200):** `{ "data": { "success": true } }`

---

## 12. Analytics

### GET /analytics/dashboard
**Auth:** Yes

**Query:** `?projectId=&from=&to=`

**Response (200):**
```json
{
  "data": {
    "streak": 14, "longestStreak": 30, "totalStudyTime": 86400,
    "contentProcessed": 47, "averageQuizScore": 78.4,
    "masteryByContent": [{ "contentItemId": "...", "title": "...", "masteryScore": 68 }],
    "weeklyStudyTime": [{ "week": "2024-W52", "minutes": 320, "byType": {} }],
    "dueThisWeek": [{ "date": "2025-01-02", "count": 12 }]
  }
}
```

---

### GET /analytics/streak
**Auth:** Yes

**Response (200):** `{ "data": { "current": 14, "longest": 30, "lastStudyDate": "2025-01-01" } }`

---

### GET /analytics/weak-areas
**Auth:** Yes

**Query:** `?contentId=` (optional, defaults to all content)

**Response (200):** `{ "data": [{ "tag": "gradient descent", "incorrectRate": 0.45, "totalQuestions": 9 }] }`

---

### GET /analytics/heatmap
**Auth:** Yes

**Query:** `?year=2025`

**Response (200):** `{ "data": [{ "date": "2025-01-01", "minutes": 45 }] }`

---

## 13. Study Rooms

### GET /study-rooms?projectId=
**Auth:** Yes — Pro plan to host; any plan to view

**Response (200):** `{ "data": [StudyRoomSchema] }`

---

### POST /study-rooms
**Auth:** Yes — Pro plan only

**Request body:** `z.object({ name: z.string().max(100), projectId: z.string(), maxParticipants: z.number().min(2).max(20).optional() })`

**Response (201):** `{ "data": StudyRoomSchema }` (includes `inviteCode`)

---

### GET /study-rooms/:id
**Auth:** Yes — participant or host

**Response (200):** `{ "data": StudyRoomSchema }`

---

### PATCH /study-rooms/:id
**Auth:** Yes — host only

**Request body:** `z.object({ name: z.string().optional(), maxParticipants: z.number().optional() })`

**Response (200):** `{ "data": StudyRoomSchema }`

---

### DELETE /study-rooms/:id
**Auth:** Yes — host only

**Response (200):** `{ "data": { "success": true } }`

---

### POST /study-rooms/join
**Auth:** Yes

**Request body:** `z.object({ inviteCode: z.string().length(6) })`

**Response (200):** `{ "data": StudyRoomSchema }`  
**Errors:** 404 (invalid code), 422 (room full)

**curl:**
```bash
curl -X POST https://api.learnwave.app/api/study-rooms/join \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"inviteCode":"NX7K2P"}'
```

---

### POST /study-rooms/:id/leave
**Auth:** Yes — participant

**Response (200):** `{ "data": { "success": true } }`

---

### POST /study-rooms/:id/start-quiz
**Auth:** Yes — host only

**Request body:** `z.object({ quizId: z.string(), timePerQuestion: z.number().min(5).max(120) })`

**Response (200):** `{ "data": { "started": true } }` — actual quiz flow proceeds via Socket.io

---

### POST /study-rooms/:id/kick/:userId
**Auth:** Yes — host only

**Response (200):** `{ "data": { "success": true } }`

---

## 14. Notifications

### GET /notifications
**Auth:** Yes

**Query:** `?cursor=&limit=&unreadOnly=`

**Response (200):** `{ "data": [NotificationSchema], "unreadCount": 3, "nextCursor": null }`

---

### PATCH /notifications/read-all
**Auth:** Yes

**Response (200):** `{ "data": { "success": true } }`

---

### PATCH /notifications/:id/read
**Auth:** Yes — owner

**Response (200):** `{ "data": NotificationSchema }`

---

### DELETE /notifications/:id
**Auth:** Yes — owner

**Response (200):** `{ "data": { "success": true } }`

---

### PATCH /users/me/notification-preferences
**Auth:** Yes

**Request body:**
```typescript
z.object({
  srsReminders: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  shareInvites: z.boolean().optional(),
})
```

**Response (200):** `{ "data": { "success": true } }`

---

## 15. Billing

### POST /billing/checkout
**Auth:** Yes — Free plan users

**Request body:** `z.object({ priceId: z.string() })`

**Response (200):** `{ "data": { "checkoutUrl": "https://checkout.stripe.com/..." } }`

---

### POST /billing/portal
**Auth:** Yes — Pro plan users

**Response (200):** `{ "data": { "portalUrl": "https://billing.stripe.com/..." } }`

---

### POST /billing/webhook
**Auth:** No (Stripe signature verification instead)

**Headers:** `Stripe-Signature: <signature>`

**Response (200):** `{ "received": true }`
