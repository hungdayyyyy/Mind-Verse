# Software Requirements Specification (SRS)
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0  
**Date:** 2025-01-01  
**Status:** Approved  

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [External Interface Requirements](#5-external-interface-requirements)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for **LearnWave**, an AI-powered learning platform. This document is intended for use by developers, architects, QA engineers, product managers, and stakeholders involved in the design, development, and maintenance of the LearnWave system.

### 1.2 Scope
LearnWave is a cloud-based SaaS application that enables users to transform any learning content — including videos, audio recordings, PDFs, Word documents, PowerPoint presentations, and YouTube URLs — into structured study materials such as notes, mind maps, flashcards, and quizzes. The platform incorporates artificial intelligence to automate content processing, enable conversational learning, and provide adaptive study scheduling.

**In Scope:**
- Web application (Next.js 14) accessible via modern browsers
- Mobile Progressive Web App (PWA)
- RESTful API backend (Node.js/Express)
- AI-driven content processing pipeline
- Collaborative study features (Study Room)
- Analytics and learning progress tracking
- Subscription billing integration

**Out of Scope:**
- Native mobile applications (iOS/Android)
- Offline mode with full sync
- LMS integrations (Canvas, Moodle) in v1.0

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| GDPR | General Data Protection Regulation |
| JWT | JSON Web Token |
| MCQ | Multiple Choice Question |
| OAuth | Open Authorization |
| PWA | Progressive Web App |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| SaaS | Software as a Service |
| SRS | Spaced Repetition System |
| STT | Speech-to-Text |
| UI | User Interface |
| UX | User Experience |
| Vector Store | Database optimized for high-dimensional vector embeddings |
| BullMQ | Redis-based queue library for Node.js |
| Whisper | OpenAI's speech recognition model |
| GPT-4o | OpenAI's multimodal large language model |

### 1.4 Overview
This document is organized into five sections: (1) Introduction provides context and scope; (2) Overall Description covers product perspective, user classes, and constraints; (3) Functional Requirements details every feature as numbered requirements; (4) Non-Functional Requirements covers performance, security, and compliance; (5) External Interface Requirements lists all third-party integrations.

---

## 2. Overall Description

### 2.1 Product Perspective
LearnWave is a standalone SaaS product with no dependencies on existing proprietary systems. It integrates with third-party services (OpenAI, Cloudinary, Stripe, Google OAuth, Pinecone) via well-defined APIs. The system operates as a multi-tenant platform where users' data is logically isolated.

**System Context Diagram (Textual):**
```
[User Browser / PWA]
       ↕ HTTPS
[LearnWave Frontend — Next.js 14]
       ↕ REST/WebSocket
[LearnWave API — Node.js/Express]
   ↕          ↕          ↕
[MongoDB]  [Redis/BullMQ]  [Vector Store]
               ↕
         [Worker Processes]
           ↕        ↕
      [Cloudinary]  [OpenAI API]
```

### 2.2 Product Functions Summary
- **Content Ingestion:** Upload or link any supported media/document type
- **AI Processing Pipeline:** Transcription → Notes → Flashcards → Quiz → Embeddings
- **Structured Notes:** Hierarchical, block-based notes with key terms and callouts
- **Mind Maps:** Visual, interactive knowledge graph from content
- **Flashcards & SRS:** AI-generated Q&A cards with spaced repetition scheduling
- **Quizzes:** MCQ, true/false, and short-answer assessments
- **RAG Chat:** Conversational AI grounded in specific content
- **Global AI Tutor:** Cross-content knowledge synthesis
- **Collaboration:** Study Rooms with shared notes and live quizzes
- **Analytics:** Streak tracking, mastery scoring, gap analysis
- **Learning Paths:** AI-generated curriculum sequences from user goals

### 2.3 User Classes

#### 2.3.1 Free User
- Access to core features with monthly limits
- Up to 5 projects, 3 content uploads per month
- Basic flashcards and quizzes
- No Study Room hosting, no advanced analytics
- Storage: 500 MB

#### 2.3.2 Pro User
- Unlimited projects and content uploads
- All AI features including RAG Chat and Learning Paths
- Study Room hosting and participation
- Advanced analytics and gap analysis
- Storage: 50 GB
- Priority processing queue

#### 2.3.3 Admin
- Access to admin dashboard (not end-user UI)
- User management (ban, suspend, reset)
- System metrics and monitoring
- Feature flag management
- No standard user content access (separation of concerns)

### 2.4 Operating Environment
- **Web Browsers:** Chrome 110+, Safari 16+, Firefox 110+, Edge 110+
- **Mobile:** PWA via Chrome/Safari on iOS 16+ and Android 12+
- **Screen Sizes:** Responsive from 320px to 2560px width
- **Network:** Minimum 1 Mbps for core features; 10 Mbps recommended for video uploads
- **Server:** Node.js 20 LTS on Linux (Ubuntu 22.04)
- **Containerization:** Docker + Docker Compose (dev), Kubernetes (prod)

### 2.5 Design and Implementation Constraints
| Constraint | Rationale |
|------------|-----------|
| Cloudinary for all media storage | CDN, transformation, and streaming capabilities |
| MongoDB or Supabase (PostgreSQL) for primary DB | Flexible document model for content structures |
| Redis for caching and queue backend | BullMQ requires Redis; session caching |
| OpenAI API for all AI features | Whisper (STT), GPT-4o (generation), text-embedding-3-small |
| Pinecone or pgvector for vector storage | RAG retrieval performance at scale |
| Stripe for billing | PCI compliance, subscription management |
| All secrets must be in environment variables | Security requirement |
| GDPR compliance required for EU users | Legal requirement |

### 2.6 Assumptions and Dependencies
- Users have a stable internet connection for AI-dependent features
- OpenAI API availability meets 99.5% uptime
- Cloudinary provides sufficient bandwidth and storage as contracted
- Payment processing via Stripe requires users to have a valid payment method

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

**FR-001: User Registration via Email**  
The system shall allow new users to register with a valid email address and password. Email addresses must be unique. Passwords must be minimum 8 characters, include at least one uppercase letter, one number, and one special character. A verification email must be sent upon registration.

**FR-002: User Login via Email**  
The system shall authenticate registered users with email and password. Failed login attempts shall be rate-limited to 5 per 15 minutes per IP. Successful login shall return a JWT access token (15-minute expiry) and set an httpOnly refresh token cookie (30-day expiry).

**FR-003: Google OAuth Login/Registration**  
The system shall support authentication via Google OAuth 2.0. If a Google account email matches an existing email-registered account, the accounts shall be linked. New users via Google OAuth shall have accounts auto-created.

**FR-004: Token Refresh**  
The system shall automatically issue a new access token when the refresh token cookie is valid and not expired. Refresh token rotation shall be implemented (one-time use).

**FR-005: Logout**  
The system shall invalidate the refresh token on logout, preventing further token refresh. The httpOnly cookie shall be cleared.

**FR-006: Password Reset**  
The system shall send a password reset email with a time-limited (1 hour) reset link when requested.

---

### 3.2 Project Management

**FR-007: Create Project**  
Users shall be able to create projects with a name (required, max 100 chars), description (optional, max 500 chars), color label, and icon. Each user is limited to 5 projects (Free) or unlimited (Pro).

**FR-008: List Projects**  
Users shall see all projects they own or are a member of, sorted by last activity date.

**FR-009: Update Project**  
Project owners and editors shall be able to rename, change color/icon, or update the description of a project.

**FR-010: Delete Project**  
Project owners shall be able to soft-delete a project. Deletion shall cascade soft-delete to all folders and content items within. Deleted items shall be recoverable for 30 days.

**FR-011: Share Project with Members**  
Project owners shall be able to invite other users by email, assigning them owner, editor, or viewer roles. Invited users shall receive an email notification.

**FR-012: Update Member Roles**  
Project owners shall be able to change member roles or remove members from a project.

---

### 3.3 Folder Management

**FR-013: Create Folder**  
Users shall be able to create folders within a project. Folders may optionally be nested inside another folder (max 2 levels of nesting). Folder names are required (max 100 chars) and must be unique within the same parent.

**FR-014: Rename Folder**  
Users with editor or owner role shall be able to rename folders.

**FR-015: Move Folder**  
Users shall be able to move a folder to a different parent folder or project root, respecting the 2-level nesting constraint.

**FR-016: Delete Folder**  
Users shall be able to soft-delete a folder. Content items inside shall also be soft-deleted.

---

### 3.4 Content Upload & Ingestion

**FR-017: Upload Video File**  
The system shall accept `.mp4`, `.mov`, and `.webm` video files up to 2 GB. Files shall be uploaded directly to Cloudinary via a signed upload URL. After upload, a processing job shall be enqueued.

**FR-018: Upload Audio File**  
The system shall accept `.mp3`, `.wav`, `.m4a`, and `.ogg` audio files up to 500 MB. Upload to Cloudinary, then enqueue processing job.

**FR-019: Upload PDF Document**  
The system shall accept `.pdf` files up to 100 MB. Files shall be stored in Cloudinary and processed for text extraction.

**FR-020: Upload Word Document**  
The system shall accept `.docx` and `.doc` files up to 50 MB. Files shall be converted and processed for text extraction.

**FR-021: Upload PowerPoint Presentation**  
The system shall accept `.pptx` and `.ppt` files up to 100 MB. Slide content and speaker notes shall be extracted for processing.

**FR-022: Upload Plain Text**  
The system shall accept `.txt` and `.md` files up to 10 MB for direct processing.

**FR-023: YouTube URL Ingestion**  
The system shall accept valid YouTube URLs (standard, short, and embed formats). The system shall extract transcript via YouTube's transcript API where available, or download audio for Whisper transcription. Video metadata (title, duration, thumbnail) shall be fetched via YouTube Data API.

**FR-024: Upload Progress Indicator**  
The UI shall display real-time upload progress (percentage and speed) for file uploads. Users shall be able to cancel in-progress uploads.

**FR-025: Async Processing Queue**  
All content processing tasks shall be executed asynchronously via BullMQ. The system shall support concurrent processing of multiple jobs. Job status shall be persisted and visible to users.

---

### 3.5 AI Processing Pipeline

**FR-026: AI Transcription**  
The system shall transcribe audio and video content using OpenAI Whisper API. Transcription shall include timestamped segments (start, end, text). Language shall be auto-detected. Supported languages: all languages supported by Whisper (99+). For YouTube with existing captions, captions shall be used preferentially.

**FR-027: AI Note Generation**  
The system shall generate structured notes from transcripts and text content using GPT-4o. Notes shall include: H1/H2/H3 headings, bullet points, numbered lists, callout blocks (info, warning, tip), key term definitions, and summary blocks. Notes shall be organized hierarchically reflecting content structure.

**FR-028: Mind Map Generation**  
The system shall generate a hierarchical mind map in JSON tree format from the content. The root node shall represent the main topic. Child nodes represent subtopics and key concepts. Edge labels describe relationships. The JSON shall be renderable by react-flow.

**FR-029: Flashcard Auto-Generation**  
The system shall generate flashcard pairs (question/answer) from content. Minimum 10 cards per hour of content, maximum 100. Cards shall cover key terms, concepts, and factual information. Each card shall have a difficulty rating (easy/medium/hard) and relevant tags.

**FR-030: Quiz Generation**  
The system shall generate quizzes from content with three question types: MCQ (4 options), True/False, and Short Answer. Each question shall have a correct answer, explanation, difficulty rating, and content tags. Minimum 5 questions per piece of content, maximum 50.

**FR-031: Embedding Generation**  
The system shall split content into chunks (max 500 tokens, 100-token overlap) and generate vector embeddings using OpenAI `text-embedding-3-small` (1536 dimensions). Embeddings shall be stored in the vector store (Pinecone or pgvector) for RAG retrieval.

**FR-032: Processing Status Updates**  
The system shall emit real-time WebSocket events to connected clients as each processing job (transcribe, notes, flashcards, quiz, embeddings) completes or fails. The UI shall update processing status indicators in real time.

**FR-033: Manual Reprocessing**  
Users shall be able to manually trigger reprocessing of any individual pipeline stage (e.g., regenerate notes without re-transcribing) via a "Reprocess" action.

---

### 3.6 Structured Notes

**FR-034: View Notes**  
Users shall be able to view AI-generated notes in a rich-text viewer supporting all block types: headings, bullets, callouts, key terms, code blocks, and quotes.

**FR-035: Edit Notes**  
Pro users shall be able to edit notes inline. Changes shall be version-tracked. The block editor shall support markdown shortcuts (e.g., `## ` for H2, `- ` for bullet).

**FR-036: Note Versioning**  
The system shall maintain a version history for notes, allowing users to view and restore previous versions (last 10 versions retained).

**FR-037: Export Notes**  
Users shall be able to export notes as Markdown, PDF, or plain text.

---

### 3.7 Mind Maps

**FR-038: View Mind Map**  
The system shall render mind maps interactively using react-flow. Users shall be able to pan, zoom, and collapse/expand subtrees.

**FR-039: Edit Mind Map**  
Pro users shall be able to add, remove, rename, and reposition nodes and edges in the mind map. Changes shall be auto-saved.

**FR-040: Export Mind Map**  
Users shall be able to export the mind map as PNG, SVG, or JSON.

---

### 3.8 Flashcards & Spaced Repetition

**FR-041: View Flashcard Deck**  
Users shall be able to browse all flashcards in a deck, view front and back, and filter by tag or difficulty.

**FR-042: Study Flashcards**  
Users shall be able to enter a study session where flashcards are presented one at a time. After viewing the back, users rate their recall: Again (0), Hard (1), Good (2), Easy (3). The SRS algorithm (SM-2) updates the next due date, interval, and ease factor based on the rating.

**FR-043: SRS Scheduling**  
The system shall implement SM-2 algorithm for spaced repetition scheduling:
- New card: interval = 1 day
- After first review: interval = 6 days (if rating ≥ 2)
- Subsequent reviews: interval × ease factor (default 2.5)
- Ease factor adjusts based on rating quality

**FR-044: Due Cards Filter**  
Users shall see a count and list of cards due for review today across all their decks.

**FR-045: Create Custom Flashcard**  
Users shall be able to manually create flashcards with rich text front/back content and optional image attachments.

**FR-046: Edit/Delete Flashcard**  
Users shall be able to edit card content or delete individual cards.

---

### 3.9 Quizzes

**FR-047: Take Quiz**  
Users shall be able to take a quiz with configurable settings: time limit (none/per question/total), shuffle questions, shuffle MCQ options.

**FR-048: Submit Quiz Attempt**  
Upon quiz completion, the system shall score the attempt, calculate percentage, and store the attempt with per-question results.

**FR-049: View Quiz Results**  
Users shall view a detailed results breakdown: score, time taken, correct/incorrect per question, correct answer revealed, and explanation shown for incorrect answers.

**FR-050: Quiz History**  
Users shall see their attempt history for any quiz with trend charts showing score improvement over time.

---

### 3.10 Knowledge Gap Finder

**FR-051: Analyze Quiz Results**  
After one or more quiz attempts, the system shall analyze incorrect answers to identify knowledge gaps. Gaps shall be grouped by topic/tag and scored by frequency of incorrectness.

**FR-052: Weak Area Dashboard**  
Users shall see a visual dashboard of their weakest topic areas with recommended actions (specific flashcards to review, content sections to re-read).

**FR-053: Auto-Generate Remediation**  
The system shall be able to generate additional flashcards or notes specifically targeting identified weak areas.

---

### 3.11 AI Chat (RAG)

**FR-054: Chat with Content**  
Users shall be able to open a chat session scoped to a specific content item. Messages shall be processed via RAG: user query is embedded, top-k relevant chunks are retrieved, and GPT-4o generates a response grounded in the content.

**FR-055: Source Citations in Chat**  
AI responses shall include citations linking to the specific content segments (with timestamps for video/audio, page numbers for PDF) that informed the response.

**FR-056: Chat Session Management**  
Users shall be able to view past chat sessions, resume them, rename them, or delete them.

**FR-057: Global AI Tutor**  
Users shall be able to open a global chat session (not scoped to specific content) that can draw from all their indexed content via cross-content RAG retrieval.

**FR-058: Voice Q&A**  
Pro users shall be able to speak a question via browser microphone (recorded, sent to Whisper STT), and receive a spoken (TTS) AI answer. Voice sessions shall also appear in the chat session history.

---

### 3.12 Sharing & Collaboration

**FR-059: Generate Public Share Link**  
Users shall be able to generate a public share link for any content item, deck, quiz, or project. Links may be set to read-only view or allow forking.

**FR-060: Set Link Expiry**  
Share links may optionally have an expiry date/time. Expired links shall return a 410 Gone response.

**FR-061: Revoke Share Link**  
Users shall be able to revoke (invalidate) any share link they generated.

**FR-062: Fork Shared Content**  
When viewing shared content (with fork permission), users shall be able to fork it into their own library as an independent copy.

**FR-063: Invite by Email to Project**  
Project owners shall be able to invite collaborators by email (see FR-011). Invitees who are not registered users shall receive a registration invitation email.

---

### 3.13 Study Room

**FR-064: Create Study Room**  
Pro users shall be able to create a Study Room within a project, generating a unique invite code. Room settings: name, max participants (2–20).

**FR-065: Join Study Room**  
Users may join a Study Room via invite code or direct link.

**FR-066: Shared Notes in Study Room**  
Study Room participants shall collaborate on a shared notes document (CRDT-based or last-write-wins) in real time via WebSocket.

**FR-067: Live Quiz in Study Room**  
The Study Room host shall be able to launch a quiz with a selected quiz resource. All participants receive questions simultaneously. A live leaderboard updates in real time as answers are submitted. Questions advance on a timer or when all participants answer.

**FR-068: Study Room Chat**  
Participants shall have access to a text chat sidebar within the Study Room.

**FR-069: Kick Participant**  
The Study Room host shall be able to remove any participant from the room.

---

### 3.14 Learning Analytics

**FR-070: Study Streak Tracking**  
The system shall track daily study activity and maintain a streak counter. A streak continues if the user studies at least once per calendar day. The longest streak and current streak shall both be displayed.

**FR-071: Time Studied Tracking**  
The system shall track time spent in each study session (video watch, flashcard review, quiz attempt, notes reading). Total time shall be aggregated daily, weekly, and monthly.

**FR-072: Mastery Percentage**  
Per content item, the system shall calculate a mastery percentage based on: flashcard ease factors, quiz scores, and SRS repetitions. Mastery is surfaced at project and content levels.

**FR-073: Analytics Dashboard**  
Users shall see an analytics dashboard with: current streak, total study time, content mastery breakdown, quiz score trends, flashcards due this week, and activity heatmap (GitHub-style).

**FR-074: Learning Path AI**  
Pro users shall be able to input a learning goal (e.g., "understand machine learning for software engineers"). The AI shall analyze the user's existing content library and supplemental suggestions, then generate an ordered curriculum (content items in recommended study order with estimated completion times).

---

### 3.15 Notifications

**FR-075: SRS Review Reminders**  
The system shall send in-app and email notifications when flashcard reviews are due. Notification frequency shall be configurable (daily digest or immediate). Users may opt out.

**FR-076: Processing Complete Notifications**  
The system shall notify users (in-app) when content processing jobs complete or fail.

**FR-077: Share Invite Notifications**  
Users shall receive in-app and email notifications when they are invited to a project or receive a shared content link.

**FR-078: Study Room Invitations**  
Users shall receive in-app notifications when a study room they participate in goes active.

**FR-079: Notification Preferences**  
Users shall be able to configure notification preferences (per type, per channel: in-app / email) in their settings.

**FR-080: Mark as Read / Clear All**  
Users shall be able to mark individual or all notifications as read, and delete notifications.

---

### 3.16 Billing

**FR-081: Subscription Plans**  
The system shall support Free and Pro subscription tiers managed via Stripe. Plan details shall be displayed on a pricing page.

**FR-082: Upgrade to Pro**  
Free users shall be able to upgrade to Pro via Stripe Checkout. Successful payment shall immediately activate Pro features.

**FR-083: Cancel Subscription**  
Pro users shall be able to cancel their subscription via the billing portal. Pro features shall remain active until the end of the billing period.

**FR-084: Billing Portal**  
Users shall have access to the Stripe Customer Portal for managing payment methods, viewing invoices, and updating billing information.

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Requirement |
|--------|-------------|
| Page load time (initial, cached) | < 2 seconds (LCP) |
| Page load time (cold) | < 4 seconds |
| API response time (p95) | < 500ms for read endpoints |
| API response time (p95) | < 2s for write/AI endpoints |
| File upload initiation | < 1 second to start upload |
| Audio/video processing (1h content) | < 5 minutes end-to-end |
| RAG chat response latency | < 5 seconds |
| WebSocket event delivery | < 100ms p95 |
| Search/filter operations | < 300ms |

### 4.2 Scalability

- The backend shall support horizontal scaling via stateless API servers behind a load balancer
- BullMQ workers shall scale independently of the API layer (separate processes/containers)
- MongoDB shall be deployed as a replica set; Supabase handles this automatically
- Redis shall be deployed in sentinel/cluster mode for HA
- Worker concurrency shall be configurable via environment variables
- The system shall handle 10,000 concurrent users without degradation
- File storage (Cloudinary) scales automatically with usage

### 4.3 Security

| Requirement | Implementation |
|-------------|---------------|
| Authentication | JWT (RS256 signed) with httpOnly refresh cookie |
| Authorization | RBAC — owner/editor/viewer per project |
| Input Validation | Zod schema validation on all API endpoints |
| Rate Limiting | 100 req/min per user; 20 req/min per IP (unauthenticated) |
| File Validation | MIME type + magic bytes checked before Cloudinary upload |
| XSS Prevention | DOMPurify on all markdown rendering; CSP headers |
| CSRF Prevention | SameSite=Strict cookie; double-submit token for mutations |
| SQL/NoSQL Injection | Mongoose parameterized queries; no dynamic query building |
| Secrets Management | All credentials in environment variables; never in source code |
| TLS | All connections over HTTPS; HSTS enabled |
| CORS | Strict allowlist for frontend origin(s) |
| Audit Logging | All auth events and data mutations logged |

### 4.4 Availability and Reliability

- Target uptime: **99.9%** (< 8.7 hours/year downtime)
- Deployment: Blue-green or rolling deployments with zero downtime
- Database: Automated backups every 6 hours; point-in-time recovery for 30 days
- Queue: Failed jobs shall retry up to 3 times with exponential backoff
- Circuit breakers on all external API calls (OpenAI, Cloudinary, Stripe)
- Health check endpoints: `/health` (liveness) and `/ready` (readiness)

### 4.5 Data Requirements

| Requirement | Detail |
|-------------|--------|
| GDPR Compliance | Data processing agreement available; EU data stored in EU regions |
| Data Export | Users can export all their data as a ZIP archive (JSON + media URLs) |
| Data Deletion | Users can request full account deletion; processed within 30 days |
| Soft Deletes | All user-facing data uses soft deletes (deletedAt); hard delete after 30 days |
| Retention | Inactive accounts: data retained 12 months, then deleted |
| Encryption at Rest | MongoDB/Supabase storage encryption; Cloudinary at-rest encryption |

### 4.6 Usability
- Responsive design: mobile-first, tested on 320px–2560px viewports
- WCAG 2.1 Level AA accessibility compliance
- Keyboard navigable throughout
- Error messages must be human-readable and actionable
- Empty states must provide clear CTAs

### 4.7 Maintainability
- Code coverage target: ≥ 80% for API layer
- All API endpoints documented in OpenAPI 3.0 spec
- Structured logging with correlation IDs for request tracing
- Environment-based configuration (no hardcoded values)
- Semantic versioning for all API changes

---

## 5. External Interface Requirements

### 5.1 Cloudinary API
- **Purpose:** Storage, CDN delivery, and transformation of video and audio files
- **Auth:** API Key + API Secret + Cloud Name
- **Key Operations:** Signed upload URL generation, resource management, adaptive streaming
- **Constraints:** Respect rate limits; handle webhook events for async upload notifications

### 5.2 OpenAI API
- **Purpose:** Whisper (transcription), GPT-4o (content generation, RAG), text-embedding-3-small (embeddings)
- **Auth:** API Key (Bearer token in header)
- **Key Operations:** `/v1/audio/transcriptions`, `/v1/chat/completions`, `/v1/embeddings`
- **Constraints:** Token limits per model; retry with exponential backoff on 429/503; cost tracking required

### 5.3 Pinecone (or pgvector)
- **Purpose:** Vector database for storing and querying content embeddings (RAG)
- **Auth:** API Key + Environment
- **Key Operations:** Upsert vectors, query top-k by similarity, delete namespace
- **Constraints:** 1536-dimensional vectors (text-embedding-3-small); namespace per user or per content item

### 5.4 Google OAuth 2.0
- **Purpose:** Social login/registration
- **Auth:** Client ID + Client Secret
- **Key Operations:** Authorization code flow; token exchange; userinfo retrieval
- **Scopes:** `openid email profile`

### 5.5 Stripe
- **Purpose:** Subscription billing and payment processing
- **Auth:** Secret Key (server-side); Publishable Key (client-side)
- **Key Operations:** Create customer, create subscription, manage Stripe Customer Portal, handle webhooks
- **Webhooks:** `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed`

### 5.6 Socket.io
- **Purpose:** Real-time WebSocket communication for Study Room and processing status updates
- **Transport:** WebSocket with HTTP long-polling fallback
- **Events (Server → Client):** `processing:progress`, `room:user-joined`, `room:quiz-question`, `room:leaderboard-update`
- **Events (Client → Server):** `room:join`, `room:answer`, `room:leave`

### 5.7 SendGrid
- **Purpose:** Transactional email delivery (verification, password reset, invitations, SRS reminders)
- **Auth:** API Key
- **Key Operations:** Send email via template ID with dynamic template data
- **Templates:** email_verification, password_reset, project_invite, srs_reminder, share_notification

### 5.8 YouTube Data API v3
- **Purpose:** Fetch video metadata (title, thumbnail, duration) and closed captions for YouTube content
- **Auth:** API Key
- **Key Operations:** `videos.list` (metadata), `captions.list` / `captions.download` (transcripts)
- **Fallback:** If captions unavailable, download audio and transcribe via Whisper
