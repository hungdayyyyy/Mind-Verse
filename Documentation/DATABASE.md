# Database Schema Reference
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0  
**Database:** MongoDB 7.0 (Mongoose 8 ODM)  
**Date:** 2025-01-01  

---

## Table of Contents
1. [Architecture Decisions](#1-architecture-decisions)
2. [Soft Delete Pattern](#2-soft-delete-pattern)
3. [Index Strategy](#3-index-strategy)
4. [Collection Schemas](#4-collection-schemas)
   - [users](#41-users)
   - [projects](#42-projects)
   - [folders](#43-folders)
   - [content_items](#44-content_items)
   - [notes](#45-notes)
   - [mind_maps](#46-mind_maps)
   - [flashcards](#47-flashcards)
   - [decks](#48-decks)
   - [quizzes](#49-quizzes)
   - [quiz_attempts](#410-quiz_attempts)
   - [chat_sessions](#411-chat_sessions)
   - [embeddings](#412-embeddings)
   - [share_links](#413-share_links)
   - [study_sessions](#414-study_sessions)
   - [notifications](#415-notifications)
   - [study_rooms](#416-study_rooms)
5. [Relationships Diagram](#5-relationships-diagram)

---

## 1. Architecture Decisions

### Why MongoDB?
- **Flexible schema:** Content blocks (notes, flashcard fronts/backs, quiz questions) have variable structures that map naturally to documents
- **Embedded documents:** SRS data embedded in flashcards avoids joins on the hot path (daily review query)
- **Array operations:** Member arrays on projects, participant arrays on study rooms support atomic updates
- **Atlas Search:** Full-text search across content items and notes is available natively

### Denormalization Strategy
Some fields are denormalized for read performance:
- `projects.itemCount` — avoids counting `content_items` on every project load
- `decks.cardCount`, `decks.masteredCount` — avoids counting `flashcards` per deck
- `quizzes.attemptCount`, `quizzes.averageScore` — avoids aggregating `quiz_attempts`
- `study_sessions.date` (string) — enables daily aggregation without date truncation at query time

Denormalized fields must be kept in sync via application-layer hooks or Mongoose `post` middleware.

### Embedding vs. Referencing
| Data | Approach | Rationale |
|------|----------|-----------|
| Notes blocks | Embedded in `notes` | Always accessed together; max ~200 blocks |
| Flashcard SRS data | Embedded in `flashcards` | Always accessed together; updated atomically |
| Quiz questions | Embedded in `quizzes` | Always returned together; max 50 questions |
| Chat messages | Embedded in `chat_sessions` | Sequential access; capped at last 200 messages |
| Project members | Embedded array in `projects` | Small set; queried together |
| Embeddings | Separate collection / Pinecone | Large vectors; needs vector search, not document retrieval |

---

## 2. Soft Delete Pattern

All user-facing collections include a `deletedAt` field (nullable Date). This enables:
- **Trash/recovery:** Users can restore deleted items within 30 days
- **Audit trail:** We know when items were deleted
- **Referential integrity:** Related documents still reference the deleted item without hard-delete cascades

**Implementation:**
```typescript
// All queries must include deletedAt filter
const findActive = <T>(model: Model<T>, filter: FilterQuery<T>) =>
  model.find({ ...filter, deletedAt: null });

// Soft delete helper
const softDelete = async <T>(model: Model<T>, id: string, userId: string) =>
  model.findOneAndUpdate(
    { _id: id, ownerId: userId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );

// Hard delete cron: runs nightly, deletes items where deletedAt < 30 days ago
const hardDeleteExpired = async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Promise.all([
    ContentItem.deleteMany({ deletedAt: { $lt: cutoff } }),
    Project.deleteMany({ deletedAt: { $lt: cutoff } }),
    // ... other collections
  ]);
};
```

**Collections with soft delete:** `users`, `projects`, `folders`, `content_items`, `decks`, `quizzes`  
**Collections without soft delete:** `notifications` (TTL index), `study_sessions` (immutable), `embeddings` (deleted with content item)

---

## 3. Index Strategy

### Index Types Used

| Type | Use Case |
|------|----------|
| Single field | Equality lookups (ownerId, projectId) |
| Compound | Multi-field queries (ownerId + dueDate, userId + date) |
| Sparse | Optional unique fields (googleId, shareToken — null values excluded) |
| TTL | Auto-expiring documents (notifications after 90 days) |
| Text | Full-text search (content titles, notes content) |

### Critical Performance Indexes

```javascript
// 1. User authentication — most frequent operation
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });

// 2. Project listing — dashboard home page
db.projects.createIndex({ ownerId: 1, deletedAt: 1 });
db.projects.createIndex({ "members.userId": 1, deletedAt: 1 });

// 3. Content listing — inside project view
db.content_items.createIndex({ projectId: 1, deletedAt: 1 });
db.content_items.createIndex({ folderId: 1, deletedAt: 1 });

// 4. SRS due cards — most frequent study query
db.flashcards.createIndex({ ownerId: 1, "srsData.dueDate": 1 });
db.flashcards.createIndex({ deckId: 1 });

// 5. Quiz attempt history
db.quiz_attempts.createIndex({ quizId: 1, userId: 1 });
db.quiz_attempts.createIndex({ userId: 1, completedAt: -1 });

// 6. Chat sessions — user's session list
db.chat_sessions.createIndex({ userId: 1, updatedAt: -1 });

// 7. Analytics — streak calculation
db.study_sessions.createIndex({ userId: 1, date: 1 });

// 8. Notifications — unread badge count
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// 9. Share links
db.share_links.createIndex({ token: 1 }, { unique: true });

// 10. Embeddings
db.embeddings.createIndex({ contentItemId: 1, chunkIndex: 1 });
```

---

## 4. Collection Schemas

### 4.1 users

**Purpose:** Core user identity, settings, subscription status, and aggregate learning statistics.

**Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| _id | ObjectId | auto | — | MongoDB default |
| email | String | yes | — | Unique, lowercase |
| name | String | yes | — | Display name, max 100 |
| avatar | String | no | null | URL to avatar image |
| googleId | String | no | null | Google OAuth sub, sparse unique |
| passwordHash | String | no | null | bcrypt hash, null for OAuth users |
| plan | String | yes | 'free' | Enum: free, pro |
| stripeCustomerId | String | no | null | Stripe cus_xxx |
| stripeSubscriptionId | String | no | null | Stripe sub_xxx |
| subscriptionStatus | String | no | null | active/canceled/past_due/trialing |
| settings.language | String | no | 'en' | BCP-47 language code |
| settings.notifications.srsReminders | Boolean | no | true | SRS email reminders |
| settings.notifications.emailNotifications | Boolean | no | true | All email |
| settings.notifications.shareInvites | Boolean | no | true | Share invite emails |
| settings.theme | String | no | 'system' | light/dark/system |
| settings.timezone | String | no | 'UTC' | IANA timezone |
| stats.streak | Number | no | 0 | Current daily streak |
| stats.longestStreak | Number | no | 0 | All-time best streak |
| stats.totalStudyTime | Number | no | 0 | Seconds total |
| stats.lastStudyDate | Date | no | null | Last day studied |
| emailVerified | Boolean | no | false | Email confirmed |
| emailVerificationToken | String | no | null | Token for verification link |
| passwordResetToken | String | no | null | Hashed reset token |
| passwordResetExpires | Date | no | null | Reset token expiry |
| lastLoginAt | Date | no | null | Last successful login |
| createdAt | Date | auto | now | Mongoose timestamps |
| updatedAt | Date | auto | now | Mongoose timestamps |
| deletedAt | Date | no | null | Soft delete |

**Indexes:** `{ email: 1 }` unique, `{ googleId: 1 }` sparse unique, `{ stripeCustomerId: 1 }` sparse, `{ deletedAt: 1 }`

**Example Document:**
```json
{
  "_id": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "avatar": "https://lh3.googleusercontent.com/a/abc123",
  "googleId": "116234567890123456789",
  "passwordHash": null,
  "plan": "pro",
  "stripeCustomerId": "cus_Abc123XYZ456",
  "stripeSubscriptionId": "sub_Def456UVW789",
  "subscriptionStatus": "active",
  "settings": {
    "language": "en",
    "notifications": {
      "srsReminders": true,
      "emailNotifications": true,
      "shareInvites": true
    },
    "theme": "dark",
    "timezone": "America/New_York"
  },
  "stats": {
    "streak": 14,
    "longestStreak": 30,
    "totalStudyTime": 86400,
    "lastStudyDate": { "$date": "2025-01-01T00:00:00.000Z" }
  },
  "emailVerified": true,
  "lastLoginAt": { "$date": "2025-01-01T10:23:00.000Z" },
  "createdAt": { "$date": "2024-09-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T10:23:00.000Z" },
  "deletedAt": null
}
```

**Mongoose Schema:**
```typescript
import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  avatar: { type: String, default: null },
  googleId: { type: String, sparse: true, unique: true, default: null },
  passwordHash: { type: String, default: null },
  plan: { type: String, enum: ['free', 'pro'], default: 'free', required: true },
  stripeCustomerId: { type: String, sparse: true, default: null },
  stripeSubscriptionId: { type: String, sparse: true, default: null },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', null],
    default: null,
  },
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
    totalStudyTime: { type: Number, default: 0 },
    lastStudyDate: { type: Date, default: null },
  },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

export const User = model('User', userSchema);
```

---

### 4.2 projects

**Purpose:** Workspace container for organizing content, folders, and collaborators.

**Key Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | ObjectId | auto | — |
| name | String | yes | max 100 |
| description | String | no | max 500 |
| color | String | no | Hex (#rrggbb) |
| icon | String | no | Emoji character |
| ownerId | ObjectId | yes | ref: User |
| members | Array | no | [{userId, role, joinedAt}] |
| isPublic | Boolean | no | default false |
| shareToken | String | no | UUID, sparse unique |
| itemCount | Number | no | Denormalized |
| lastActivityAt | Date | no | Updated on any change |
| deletedAt | Date | no | Soft delete |

**Member roles:** `owner`, `editor`, `viewer`

**Example Document:**
```json
{
  "_id": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "name": "Machine Learning Fundamentals",
  "description": "All ML course materials and study resources",
  "color": "#6366f1",
  "icon": "🤖",
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "members": [
    { "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" }, "role": "owner", "joinedAt": { "$date": "2024-10-01T00:00:00.000Z" } },
    { "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d2" }, "role": "editor", "joinedAt": { "$date": "2024-10-15T00:00:00.000Z" } }
  ],
  "isPublic": false,
  "shareToken": null,
  "itemCount": 12,
  "lastActivityAt": { "$date": "2025-01-01T09:00:00.000Z" },
  "createdAt": { "$date": "2024-10-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T09:00:00.000Z" },
  "deletedAt": null
}
```

**Mongoose Schema:**
```typescript
const projectSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  color: { type: String, default: '#6366f1', match: /^#[0-9a-fA-F]{6}$/ },
  icon: { type: String, default: '📚', maxlength: 10 },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
    joinedAt: { type: Date, default: Date.now },
  }],
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, sparse: true, default: null },
  itemCount: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

projectSchema.index({ ownerId: 1, deletedAt: 1 });
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ shareToken: 1 }, { sparse: true });

export const Project = model('Project', projectSchema);
```

---

### 4.3 folders

**Purpose:** Hierarchical content organization within projects (max depth: 2).

**Example Document:**
```json
{
  "_id": { "$oid": "65b1c2d3e4f5a6b7c8d9e0f1" },
  "name": "Week 1 — Supervised Learning",
  "projectId": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "parentFolderId": null,
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "itemCount": 5,
  "order": 0,
  "depth": 0,
  "createdAt": { "$date": "2024-10-05T00:00:00.000Z" },
  "updatedAt": { "$date": "2024-10-05T00:00:00.000Z" },
  "deletedAt": null
}
```

**Mongoose Schema:**
```typescript
const folderSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  parentFolderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  depth: { type: Number, default: 0, max: 1 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

folderSchema.index({ projectId: 1, parentFolderId: 1, deletedAt: 1 });
folderSchema.pre('save', async function () {
  if (this.parentFolderId) {
    const parent = await this.constructor.findById(this.parentFolderId);
    if (parent && parent.depth >= 1) throw new Error('Maximum folder nesting depth (2) exceeded');
    this.depth = parent ? parent.depth + 1 : 0;
  }
});

export const Folder = model('Folder', folderSchema);
```

---

### 4.4 content_items

**Purpose:** Central record for each piece of learning content (uploaded file or YouTube link).

**Example Document:**
```json
{
  "_id": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "title": "Introduction to Neural Networks - CS229 Lecture 4",
  "type": "youtube",
  "projectId": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "folderId": { "$oid": "65b1c2d3e4f5a6b7c8d9e0f1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "source": {
    "url": "https://www.youtube.com/watch?v=abc123XYZ",
    "cloudinaryId": null,
    "cloudinaryUrl": null,
    "thumbnailUrl": "https://i.ytimg.com/vi/abc123XYZ/hqdefault.jpg",
    "duration": 4823,
    "pageCount": null,
    "fileSize": null,
    "mimeType": null,
    "youtubeVideoId": "abc123XYZ"
  },
  "transcript": {
    "text": "Welcome to lecture four on neural networks...",
    "segments": [
      { "start": 0, "end": 4.2, "text": "Welcome to lecture four" },
      { "start": 4.2, "end": 8.1, "text": "on neural networks." }
    ],
    "language": "en",
    "wordCount": 12847
  },
  "processingStatus": "completed",
  "processingJobs": {
    "transcribe": "completed",
    "notes": "completed",
    "flashcards": "completed",
    "quiz": "completed",
    "embeddings": "completed"
  },
  "tags": ["neural networks", "deep learning", "cs229"],
  "language": "en",
  "isPublic": false,
  "shareToken": null,
  "viewCount": 7,
  "masteryScore": 68,
  "createdAt": { "$date": "2024-10-10T12:00:00.000Z" },
  "updatedAt": { "$date": "2024-10-10T12:14:32.000Z" },
  "deletedAt": null
}
```

**Mongoose Schema:**
```typescript
const contentItemSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 255 },
  type: {
    type: String,
    enum: ['video', 'audio', 'pdf', 'doc', 'pptx', 'txt', 'youtube', 'note'],
    required: true,
  },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: {
    url: String, cloudinaryId: String, cloudinaryUrl: String,
    thumbnailUrl: String, duration: Number, pageCount: Number,
    fileSize: Number, mimeType: String, youtubeVideoId: String,
  },
  transcript: {
    text: String,
    segments: [{ start: Number, end: Number, text: String }],
    language: String,
    wordCount: Number,
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending',
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
  shareToken: { type: String, sparse: true, default: null },
  viewCount: { type: Number, default: 0 },
  masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

contentItemSchema.index({ projectId: 1, deletedAt: 1 });
contentItemSchema.index({ ownerId: 1, deletedAt: 1 });
contentItemSchema.index({ folderId: 1, deletedAt: 1 });
contentItemSchema.index({ shareToken: 1 }, { sparse: true });
contentItemSchema.index({ processingStatus: 1 });
contentItemSchema.index({ tags: 1 });

export const ContentItem = model('ContentItem', contentItemSchema);
```

---

### 4.5 notes

**Purpose:** Structured notes (block-based) AI-generated or manually edited for a content item.

**Relationships:** `contentItemId → content_items._id` (1:1)

**Example Document:**
```json
{
  "_id": { "$oid": "65d1e2f3a4b5c6d7e8f9a0b1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "blocks": [
    { "id": "block-001", "type": "summary", "content": "This lecture covers neural networks, backpropagation, and gradient descent.", "metadata": {} },
    { "id": "block-002", "type": "h1", "content": "Neural Networks", "metadata": {} },
    { "id": "block-003", "type": "h2", "content": "The Perceptron Model", "metadata": {} },
    { "id": "block-004", "type": "bullet", "content": "A perceptron takes weighted inputs and applies an activation function", "metadata": {} },
    { "id": "block-005", "type": "keyterm", "content": "**Activation Function**: A mathematical function applied to the weighted sum of inputs to introduce non-linearity.", "metadata": {} },
    { "id": "block-006", "type": "callout", "content": "ReLU (Rectified Linear Unit) is the most commonly used activation function in modern deep learning.", "metadata": { "calloutType": "tip" } }
  ],
  "version": 3,
  "versionHistory": [
    { "version": 1, "blocks": [...], "savedAt": "2024-10-10T12:14:32.000Z", "savedBy": null },
    { "version": 2, "blocks": [...], "savedAt": "2024-10-10T15:00:00.000Z", "savedBy": "64f1a2b3c4d5e6f7a8b9c0d1" }
  ],
  "isAiGenerated": true,
  "lastEditedAt": { "$date": "2024-10-10T15:00:00.000Z" },
  "createdAt": { "$date": "2024-10-10T12:14:32.000Z" },
  "updatedAt": { "$date": "2024-10-10T15:00:00.000Z" }
}
```

---

### 4.6 mind_maps

**Purpose:** React Flow-compatible node/edge graph representing content knowledge structure.

**Relationships:** `contentItemId → content_items._id` (1:1)

**Example Document:**
```json
{
  "_id": { "$oid": "65e1f2a3b4c5d6e7f8a9b0c1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "nodes": [
    { "id": "node-root", "label": "Neural Networks", "type": "root", "x": 400, "y": 300, "style": { "backgroundColor": "#6366f1", "fontSize": 16 }, "metadata": {} },
    { "id": "node-1", "label": "Perceptron", "type": "branch", "x": 200, "y": 150, "style": {}, "metadata": { "contentTimestamp": 120 } },
    { "id": "node-2", "label": "Backpropagation", "type": "branch", "x": 600, "y": 150, "style": {}, "metadata": {} },
    { "id": "node-1-1", "label": "Activation Functions", "type": "leaf", "x": 100, "y": 50, "style": {}, "metadata": {} }
  ],
  "edges": [
    { "id": "e-root-1", "source": "node-root", "target": "node-1", "label": "includes", "type": "default" },
    { "id": "e-root-2", "source": "node-root", "target": "node-2", "label": "trains via", "type": "default" },
    { "id": "e-1-1-1", "source": "node-1", "target": "node-1-1", "label": "uses", "type": "default" }
  ],
  "version": 1,
  "isAiGenerated": true,
  "createdAt": { "$date": "2024-10-10T12:15:00.000Z" },
  "updatedAt": { "$date": "2024-10-10T12:15:00.000Z" }
}
```

---

### 4.7 flashcards

**Purpose:** Individual flashcard with SRS scheduling data for spaced repetition study.

**Relationships:** `contentItemId → content_items._id`, `deckId → decks._id`, `ownerId → users._id`

**Example Document:**
```json
{
  "_id": { "$oid": "65f1a2b3c4d5e6f7a8b9c0d1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "deckId": { "$oid": "66a1b2c3d4e5f6a7b8c9d0e1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "front": {
    "text": "What is the vanishing gradient problem?",
    "richText": null,
    "imageUrl": null
  },
  "back": {
    "text": "In deep networks, gradients become extremely small during backpropagation, causing early layers to learn very slowly or stop learning altogether. Common in sigmoid/tanh activations.",
    "richText": null,
    "imageUrl": null
  },
  "tags": ["neural networks", "backpropagation", "deep learning"],
  "difficulty": "hard",
  "srsData": {
    "dueDate": { "$date": "2025-01-08T00:00:00.000Z" },
    "interval": 7,
    "easeFactor": 2.3,
    "repetitions": 4,
    "lapses": 1,
    "lastReviewedAt": { "$date": "2025-01-01T10:30:00.000Z" },
    "lastRating": 2
  },
  "isAiGenerated": true,
  "createdAt": { "$date": "2024-10-10T12:15:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T10:30:00.000Z" }
}
```

**SM-2 Algorithm Implementation:**
```typescript
interface SRSData {
  interval: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

function calculateNextSRS(current: SRSData, rating: 0 | 1 | 2 | 3): SRSData & { dueDate: Date } {
  let { interval, easeFactor, repetitions, lapses } = current;

  if (rating === 0) { // Again
    interval = 1;
    repetitions = 0;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    // Adjust ease factor
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02)));
    repetitions += 1;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return { interval, easeFactor, repetitions, lapses, dueDate };
}
```

---

### 4.8 decks

**Purpose:** Container for a set of flashcards, linked to a content item.

**Example Document:**
```json
{
  "_id": { "$oid": "66a1b2c3d4e5f6a7b8c9d0e1" },
  "name": "Neural Networks — Key Concepts",
  "description": "AI-generated flashcards from CS229 Lecture 4",
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "projectId": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "cardCount": 42,
  "masteredCount": 18,
  "newCount": 10,
  "dueCount": 7,
  "language": "en",
  "isPublic": false,
  "shareToken": null,
  "coverImageUrl": null,
  "createdAt": { "$date": "2024-10-10T12:15:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" },
  "deletedAt": null
}
```

---

### 4.9 quizzes

**Purpose:** Quiz with questions of multiple types, generated from content.

**Example Document:**
```json
{
  "_id": { "$oid": "66b1c2d3e4f5a6b7c8d9e0f1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "title": "Neural Networks Quiz",
  "description": "Test your understanding of CS229 Lecture 4",
  "questions": [
    {
      "id": "q-001",
      "type": "mcq",
      "question": "Which activation function is most commonly used in hidden layers of modern deep networks?",
      "options": [
        { "id": "opt-a", "text": "Sigmoid" },
        { "id": "opt-b", "text": "Tanh" },
        { "id": "opt-c", "text": "ReLU" },
        { "id": "opt-d", "text": "Linear" }
      ],
      "correctAnswer": "opt-c",
      "explanation": "ReLU (Rectified Linear Unit) avoids the vanishing gradient problem and is computationally efficient.",
      "difficulty": "medium",
      "tags": ["activation functions", "deep learning"],
      "points": 1
    },
    {
      "id": "q-002",
      "type": "truefalse",
      "question": "Backpropagation uses the chain rule to compute gradients.",
      "options": [],
      "correctAnswer": "true",
      "explanation": "Backpropagation is an application of the chain rule from calculus to efficiently compute partial derivatives.",
      "difficulty": "easy",
      "tags": ["backpropagation"],
      "points": 1
    }
  ],
  "settings": {
    "timeLimit": null,
    "timeLimitPerQuestion": null,
    "shuffleQuestions": false,
    "shuffleOptions": true,
    "showExplanations": true,
    "passingScore": 70
  },
  "totalPoints": 15,
  "attemptCount": 3,
  "averageScore": 74.5,
  "isAiGenerated": true,
  "createdAt": { "$date": "2024-10-10T12:16:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" },
  "deletedAt": null
}
```

---

### 4.10 quiz_attempts

**Purpose:** Individual attempt record for a quiz, including per-question answers and analytics.

**Example Document:**
```json
{
  "_id": { "$oid": "66c1d2e3f4a5b6c7d8e9f0a1" },
  "quizId": { "$oid": "66b1c2d3e4f5a6b7c8d9e0f1" },
  "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "answers": [
    { "questionId": "q-001", "selectedAnswer": "opt-c", "isCorrect": true, "timeTaken": 12, "pointsEarned": 1 },
    { "questionId": "q-002", "selectedAnswer": "true", "isCorrect": true, "timeTaken": 5, "pointsEarned": 1 },
    { "questionId": "q-003", "selectedAnswer": "opt-b", "isCorrect": false, "timeTaken": 28, "pointsEarned": 0 }
  ],
  "score": 86.7,
  "totalPoints": 15,
  "earnedPoints": 13,
  "totalQuestions": 15,
  "correctCount": 13,
  "skippedCount": 0,
  "timeTaken": 423,
  "passed": true,
  "weakAreas": [
    { "tag": "gradient descent", "incorrectCount": 1, "totalCount": 3 },
    { "tag": "regularization", "incorrectCount": 1, "totalCount": 2 }
  ],
  "studyRoomId": null,
  "completedAt": { "$date": "2025-01-01T11:00:00.000Z" },
  "createdAt": { "$date": "2025-01-01T11:00:00.000Z" }
}
```

---

### 4.11 chat_sessions

**Purpose:** Conversation history for RAG-based chat with content or global AI tutor.

**Example Document:**
```json
{
  "_id": { "$oid": "66d1e2f3a4b5c6d7e8f9a0b1" },
  "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "title": "Why does vanishing gradient occur?",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "Why does vanishing gradient occur in deep networks?",
      "sources": [],
      "tokenCount": 12,
      "createdAt": { "$date": "2025-01-01T11:10:00.000Z" }
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "Based on the lecture content, the vanishing gradient problem occurs because...",
      "sources": [
        { "contentItemId": "65c1d2e3f4a5b6c7d8e9f0a1", "excerpt": "In deep networks, gradients shrink exponentially...", "relevanceScore": 0.92, "timestamp": 1823, "pageNumber": null }
      ],
      "tokenCount": 187,
      "createdAt": { "$date": "2025-01-01T11:10:05.000Z" }
    }
  ],
  "totalTokens": 199,
  "isActive": true,
  "createdAt": { "$date": "2025-01-01T11:10:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T11:10:05.000Z" }
}
```

---

### 4.12 embeddings

**Purpose:** Vector embeddings of content chunks for RAG similarity search. (Use Pinecone in production for performance at scale.)

**Example Document:**
```json
{
  "_id": { "$oid": "66e1f2a3b4c5d6e7f8a9b0c1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "chunkIndex": 14,
  "chunkText": "The vanishing gradient problem occurs when gradients become extremely small during backpropagation through many layers, causing weights in early layers to update very slowly.",
  "embedding": [0.0234, -0.1823, 0.0567, "...1536 values total..."],
  "metadata": {
    "startChar": 6720,
    "endChar": 7180,
    "startTime": 1820,
    "endTime": 1950,
    "pageNumber": null
  },
  "model": "text-embedding-3-small",
  "createdAt": { "$date": "2024-10-10T12:20:00.000Z" }
}
```

---

### 4.13 share_links

**Purpose:** Tracks generated share tokens for resources shared publicly.

**Example Document:**
```json
{
  "_id": { "$oid": "66f1a2b3c4d5e6f7a8b9c0d1" },
  "resourceType": "content",
  "resourceId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "ownerId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "permissions": "fork",
  "expiresAt": null,
  "accessCount": 12,
  "isActive": true,
  "createdAt": { "$date": "2024-11-01T00:00:00.000Z" }
}
```

---

### 4.14 study_sessions

**Purpose:** Immutable record of each study session for analytics and streak tracking.

**Example Document:**
```json
{
  "_id": { "$oid": "67a1b2c3d4e5f6a7b8c9d0e1" },
  "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "contentItemId": { "$oid": "65c1d2e3f4a5b6c7d8e9f0a1" },
  "projectId": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "sessionType": "flashcard",
  "startedAt": { "$date": "2025-01-01T10:00:00.000Z" },
  "endedAt": { "$date": "2025-01-01T10:25:00.000Z" },
  "durationSeconds": 1500,
  "itemsReviewed": 30,
  "itemsMastered": 22,
  "date": "2025-01-01",
  "createdAt": { "$date": "2025-01-01T10:25:00.000Z" }
}
```

---

### 4.15 notifications

**Purpose:** In-app notifications with 90-day TTL auto-expiry.

**Example Document:**
```json
{
  "_id": { "$oid": "67b1c2d3e4f5a6b7c8d9e0f1" },
  "userId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "type": "srs_reminder",
  "title": "15 flashcards due for review!",
  "body": "Keep your streak going! You have 15 cards due today.",
  "data": {
    "dueCount": 15,
    "deckIds": ["66a1b2c3d4e5f6a7b8c9d0e1"]
  },
  "isRead": false,
  "createdAt": { "$date": "2025-01-01T08:00:00.000Z" }
}
```

---

### 4.16 study_rooms

**Purpose:** Real-time collaborative study session with shared notes and live quizzes.

**Example Document:**
```json
{
  "_id": { "$oid": "67c1d2e3f4a5b6c7d8e9f0a1" },
  "name": "Neural Networks Study Group",
  "projectId": { "$oid": "65a1b2c3d4e5f6a7b8c9d0e1" },
  "hostId": { "$oid": "64f1a2b3c4d5e6f7a8b9c0d1" },
  "participants": [
    { "userId": "64f1a2b3c4d5e6f7a8b9c0d1", "displayName": "Alice", "joinedAt": "2025-01-01T18:00:00.000Z", "role": "host", "isActive": true, "score": 0 },
    { "userId": "64f1a2b3c4d5e6f7a8b9c0d2", "displayName": "Bob", "joinedAt": "2025-01-01T18:01:00.000Z", "role": "participant", "isActive": true, "score": 0 }
  ],
  "maxParticipants": 10,
  "currentActivity": {
    "type": "idle",
    "resourceId": null,
    "startedAt": null,
    "currentQuestion": 0
  },
  "sharedNotes": "# Today's Focus\n- Backpropagation\n- Gradient Descent",
  "chatMessages": [
    { "userId": "64f1a2b3c4d5e6f7a8b9c0d2", "displayName": "Bob", "content": "Ready to start!", "createdAt": "2025-01-01T18:01:30.000Z" }
  ],
  "isActive": true,
  "inviteCode": "NX7K2P",
  "scheduledFor": null,
  "endedAt": null,
  "createdAt": { "$date": "2025-01-01T18:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T18:01:30.000Z" }
}
```

---

## 5. Relationships Diagram

```
users (1) ──────────────────────── (N) projects
  │                                      │
  │                                (N) folders
  │                                      │
  └──────────────── (N) content_items ───┘
                          │
              ┌───────────┼───────────┬──────────────┐
              │           │           │              │
           notes      mind_maps     decks         quizzes
                                     │               │
                                 flashcards    quiz_attempts
                                     
users ─── (N) chat_sessions ──── (1) content_items
users ─── (N) study_sessions ── (1) content_items
users ─── (N) notifications
users ─── (N) study_rooms (as host or participant)
content_items ─── (N) embeddings
content_items ─── (N) share_links (via resourceId)
decks ─── (N) share_links
quizzes ─── (N) share_links
```
