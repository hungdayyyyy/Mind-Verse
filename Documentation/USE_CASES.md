# Use Case Specifications
# LearnWave — AI-Powered Learning Platform
**Version:** 1.0.0  
**Date:** 2025-01-01  

---

## Table of Contents
- [UC-001: User Registration](#uc-001-user-registration)
- [UC-002: Google OAuth Login](#uc-002-google-oauth-login)
- [UC-003: Create Project](#uc-003-create-project)
- [UC-004: Create Folder inside Project](#uc-004-create-folder-inside-project)
- [UC-005: Upload Video Content](#uc-005-upload-video-content)
- [UC-006: Upload YouTube URL](#uc-006-upload-youtube-url)
- [UC-007: AI Processes Content](#uc-007-ai-processes-content)
- [UC-008: View Structured Notes](#uc-008-view-structured-notes)
- [UC-009: Edit Mind Map](#uc-009-edit-mind-map)
- [UC-010: Study Flashcards with SRS](#uc-010-study-flashcards-with-srs)
- [UC-011: Take Quiz](#uc-011-take-quiz)
- [UC-012: View Gap Analysis after Quiz](#uc-012-view-gap-analysis-after-quiz)
- [UC-013: Chat with Content (RAG)](#uc-013-chat-with-content-rag)
- [UC-014: Share Content via Public Link](#uc-014-share-content-via-public-link)
- [UC-015: Fork Shared Content to Library](#uc-015-fork-shared-content-to-library)
- [UC-016: Join Study Room](#uc-016-join-study-room)
- [UC-017: Host Live Quiz in Study Room](#uc-017-host-live-quiz-in-study-room)
- [UC-018: View Learning Analytics Dashboard](#uc-018-view-learning-analytics-dashboard)
- [UC-019: Set Learning Goal and Get AI Path](#uc-019-set-learning-goal-and-get-ai-path)
- [UC-020: Receive SRS Review Reminder](#uc-020-receive-srs-review-reminder)

---

## UC-001: User Registration

**Actor:** Unauthenticated Visitor  
**Goal:** Create a new LearnWave account using email and password  
**Preconditions:**
- User has a valid email address not previously registered
- User is on the registration page (`/register`)

**Main Flow:**
1. User navigates to `/register`
2. User enters full name, email address, and password
3. User clicks "Create Account"
4. System validates:
   - Name: 1–100 characters, non-empty
   - Email: valid format, unique in system
   - Password: min 8 chars, at least 1 uppercase, 1 number, 1 special character
5. System hashes password with bcrypt (cost factor 12)
6. System creates user record with `plan: 'free'`, `emailVerified: false`
7. System generates JWT access token (15m) and refresh token (30d)
8. System sends verification email via SendGrid with a unique token link
9. System sets refresh token in httpOnly cookie
10. System returns access token and user object
11. Client redirects user to `/projects` (dashboard)
12. A banner is shown: "Please verify your email address"

**Alternative Flows:**
- **A1 — Email already registered:** Step 4 returns a 409 error "An account with this email already exists. Try signing in."
- **A2 — Weak password:** Step 4 shows inline field-level error listing unmet requirements
- **A3 — User already has an account:** Registration page shows "Already have an account? Sign in"

**Postconditions:**
- A new user document is created in the `users` collection
- Verification email is dispatched
- User is authenticated and redirected to the dashboard
- User has access to Free plan features

**Exception Flows:**
- **E1 — Email service failure:** Registration succeeds but verification email is queued for retry; user can request re-send from settings
- **E2 — Database write failure:** System returns 500; user sees "Something went wrong. Please try again."

---

## UC-002: Google OAuth Login

**Actor:** Unauthenticated Visitor  
**Goal:** Authenticate (or register) using Google account  
**Preconditions:**
- User has a Google account
- User is on the login or registration page

**Main Flow:**
1. User clicks "Continue with Google"
2. System generates a CSRF state token and redirects user to Google OAuth consent screen
3. User reviews requested permissions (`openid email profile`) and clicks "Allow"
4. Google redirects to `/api/auth/google/callback?code=...&state=...`
5. System validates the state token (CSRF protection)
6. System exchanges the authorization code for Google access token
7. System calls Google userinfo endpoint to fetch `sub`, `email`, `name`, `picture`
8. System checks if a user with this `googleId` exists:
   - **If yes:** Update `lastLoginAt`, issue tokens, return user
   - **If no, email exists:** Link Google account to existing email account
   - **If no, email new:** Create new user document with `googleId`, `emailVerified: true` (Google-verified), `plan: 'free'`
9. System issues JWT access token and refresh token cookie
10. System redirects to `/projects`

**Alternative Flows:**
- **A1 — User denies consent:** Google redirects back with `error=access_denied`; system redirects to `/login?error=google_denied`
- **A2 — Account linking (email exists):** System links Google ID to existing account; user is notified via a toast "Google account linked to your existing account"

**Postconditions:**
- User is authenticated
- If new user: account created with Free plan, email pre-verified
- User is on the dashboard

**Exception Flows:**
- **E1 — Google API unavailable:** System shows "Google sign-in is temporarily unavailable. Please use email and password."
- **E2 — Invalid state token (CSRF):** Session is rejected; user redirected to `/login?error=invalid_state`

---

## UC-003: Create Project

**Actor:** Authenticated User (Free or Pro)  
**Goal:** Create a new project workspace to organize learning content  
**Preconditions:**
- User is authenticated
- Free users: current project count < 5
- Pro users: no limit

**Main Flow:**
1. User clicks "New Project" button (sidebar or projects page)
2. System opens a "Create Project" modal/panel
3. User enters:
   - Name (required, max 100 chars)
   - Description (optional, max 500 chars)
   - Color label (color picker, default: indigo)
   - Icon (emoji picker, default: 📚)
4. User clicks "Create"
5. System validates inputs
6. System creates project document with `ownerId`, `members: [{userId, role: 'owner'}]`
7. System increments user's project count
8. Modal closes; new project card appears in the projects grid
9. User is redirected to the new project's page

**Alternative Flows:**
- **A1 — Free user at limit:** "New Project" button shows tooltip "Upgrade to Pro for unlimited projects." Clicking opens upgrade modal instead of create modal.
- **A2 — Name conflict:** System warns if a project with the same name already exists but allows creation (names need not be unique).

**Postconditions:**
- New project document created in `projects` collection
- User is the owner with full permissions

**Exception Flows:**
- **E1 — Network failure during save:** Toast "Failed to create project. Please try again." Modal stays open with inputs preserved.

---

## UC-004: Create Folder inside Project

**Actor:** Authenticated User with Owner or Editor role  
**Goal:** Organize content within a project using a folder structure  
**Preconditions:**
- User is viewing a project they own or can edit
- Target parent does not already have 2 levels of nesting

**Main Flow:**
1. User clicks "New Folder" in the project file tree or toolbar
2. System shows an inline name input
3. User types folder name and presses Enter (or clicks a confirm icon)
4. System validates:
   - Name: 1–100 chars, non-empty
   - Nesting constraint: target depth ≤ 1 (parent must be depth 0 or root)
5. System creates folder document with `projectId`, `parentFolderId` (null if root level), `depth`
6. Folder appears in the file tree immediately (optimistic UI update)

**Alternative Flows:**
- **A1 — User tries to nest 3 levels deep:** "New Folder" action is disabled for folders already at depth 1; tooltip: "Maximum folder depth reached (2 levels)."
- **A2 — Duplicate name in same parent:** System warns but does not block; folders can share names within the same parent.

**Postconditions:**
- Folder document created in `folders` collection
- Folder visible in project file tree

**Exception Flows:**
- **E1 — Save failure:** Optimistic update is rolled back; folder disappears; toast shows error.

---

## UC-005: Upload Video Content

**Actor:** Authenticated User (Owner or Editor in a project)  
**Goal:** Upload a video file to process into study materials  
**Preconditions:**
- User is authenticated with Owner/Editor role
- File is .mp4, .mov, or .webm; size ≤ 2 GB
- Free users have remaining monthly upload quota

**Main Flow:**
1. User clicks "Upload Content" and selects a video file via file picker (or drags and drops)
2. Client validates file type and size client-side before upload
3. System calls `POST /api/content/upload` with metadata (title derived from filename, type, projectId, folderId)
4. System validates the request, checks plan limits, verifies project membership
5. System generates a Cloudinary signed upload URL with a TTL of 30 minutes
6. System creates a `content_items` document with `processingStatus: 'pending'`
7. API returns `{ contentItemId, signedUploadUrl }`
8. Client uploads the file directly to Cloudinary using the signed URL, displaying progress (% and speed)
9. Cloudinary triggers a webhook to the API upon successful upload
10. Webhook handler updates `source.cloudinaryId`, `source.cloudinaryUrl`, `source.duration`, `source.fileSize` on the content item
11. Webhook handler enqueues `TranscribeJob` in BullMQ
12. User sees the content item card in the project with a "Processing..." badge
13. WebSocket events update the processing status in real time as each pipeline stage completes

**Alternative Flows:**
- **A1 — File too large:** Client-side validation shows "File exceeds 2 GB limit." before upload begins.
- **A2 — Wrong file type:** Client shows "Only .mp4, .mov, .webm files are supported for video."
- **A3 — Cloudinary upload fails:** After 3 failed upload attempts, content item is marked `processingStatus: 'failed'`; user notified.
- **A4 — User cancels mid-upload:** Client cancels the Cloudinary upload request; system deletes the pending content item.

**Postconditions:**
- `content_items` document created and linked to Cloudinary resource
- Processing jobs queued in BullMQ
- User can navigate away and return; status updates via WebSocket

**Exception Flows:**
- **E1 — Signed URL expires:** If user doesn't upload within 30 minutes, they must restart; system deletes the pending item.
- **E2 — Cloudinary webhook fails to fire:** A cron job checks for content items stuck in 'pending' for > 10 minutes and attempts recovery.

---

## UC-006: Upload YouTube URL

**Actor:** Authenticated User (Owner or Editor)  
**Goal:** Import a YouTube video as learning content without manual download  
**Preconditions:**
- User has a valid YouTube URL
- YouTube video is publicly accessible (not private or age-restricted)

**Main Flow:**
1. User clicks "Add YouTube Video" and pastes a YouTube URL into the input field
2. Client validates the URL format (youtube.com or youtu.be)
3. System calls `POST /api/content/youtube` with `{ url, projectId, folderId }`
4. System extracts the YouTube video ID from the URL
5. System calls YouTube Data API v3 `videos.list` to fetch: title, thumbnail, duration, description
6. System creates a `content_items` document with `type: 'youtube'`, `source.youtubeVideoId`, `source.thumbnailUrl`, `processingStatus: 'pending'`
7. System attempts to fetch transcript via YouTube Captions API:
   - **If captions available:** Download and parse as transcript → skip `TranscribeJob`
   - **If no captions:** Mark for Whisper transcription; download audio via yt-dlp in worker
8. System enqueues appropriate processing jobs
9. Content item appears in project with YouTube thumbnail and "Processing..." badge
10. WebSocket events stream processing progress to client

**Alternative Flows:**
- **A1 — Invalid YouTube URL:** System returns 400 "Invalid YouTube URL. Please check and try again."
- **A2 — Video unavailable/private:** YouTube API returns 404/403; system returns "This video is not publicly accessible."
- **A3 — Video too long (> 4 hours):** System warns "Very long videos may take up to 10 minutes to process. Continue?"

**Postconditions:**
- YouTube content item created with metadata and thumbnail
- Processing pipeline running asynchronously

**Exception Flows:**
- **E1 — YouTube API quota exceeded:** System falls back to yt-dlp for metadata; if that fails, returns 503 with retry message.
- **E2 — Captions corrupted or malformed:** System falls back to Whisper transcription.

---

## UC-007: AI Processes Content

**Actor:** System (Background Worker)  
**Goal:** Transform raw content into structured study materials via AI pipeline  
**Preconditions:**
- `content_items` document exists with `processingStatus: 'pending'`
- Cloudinary upload (or YouTube audio download) completed
- BullMQ `TranscribeJob` has been enqueued

**Main Flow (Pipeline):**

**Stage 1: TranscribeJob**
1. Worker picks up `TranscribeJob` from BullMQ queue
2. Worker updates `processingJobs.transcribe: 'processing'`
3. Worker downloads audio stream from Cloudinary (or uses YouTube captions)
4. Worker sends audio to OpenAI Whisper API with language detection
5. Whisper returns `{ text, segments: [{start, end, text}], language }`
6. Worker saves transcript to `content_items.transcript`
7. Worker updates `processingJobs.transcribe: 'completed'`
8. Worker emits WebSocket event `processing:progress { stage: 'transcribe', status: 'completed' }`
9. Worker enqueues `GenerateNotesJob`, `GenerateFlashcardsJob`, `GenerateQuizJob`, `GenerateEmbeddingsJob` in parallel

**Stage 2a: GenerateNotesJob**
1. Worker constructs a GPT-4o prompt with the transcript and a structured output schema
2. GPT-4o returns a JSON array of note blocks (h1, h2, bullets, callouts, key terms)
3. Worker creates/updates `notes` document for the content item
4. Worker updates `processingJobs.notes: 'completed'`; emits WebSocket event

**Stage 2b: GenerateFlashcardsJob**
1. Worker prompts GPT-4o to generate Q&A pairs with difficulty ratings and tags
2. Worker creates `decks` document and `flashcards` documents
3. Updates job status; emits WebSocket event

**Stage 2c: GenerateQuizJob**
1. Worker prompts GPT-4o to generate MCQ, true/false, and short-answer questions
2. Worker creates `quizzes` document with all questions
3. Updates job status; emits WebSocket event

**Stage 2d: GenerateEmbeddingsJob**
1. Worker chunks the transcript text (500 tokens, 100-token overlap)
2. Worker calls OpenAI Embeddings API (`text-embedding-3-small`) for each chunk in batches
3. Worker stores embedding vectors in Pinecone (or pgvector) with metadata
4. Creates `embeddings` documents (or Pinecone records)
5. Updates job status; emits WebSocket event

**Stage 3: Pipeline Complete**
1. All 4 Stage 2 jobs complete (or fail individually)
2. Worker computes `processingStatus`:
   - All completed → `'completed'`
   - Any failed but others succeeded → `'partial'`
   - All failed → `'failed'`
3. Worker updates `content_items.processingStatus`
4. Worker creates in-app notification: "Your content '[title]' is ready!"
5. Worker sends email notification (if user preference allows)

**Alternative Flows:**
- **A1 — Non-audio/video content (PDF, DOCX):** TranscribeJob is skipped; text is extracted directly using pdf-parse/mammoth; remaining jobs run as normal
- **A2 — Short content (< 1 min / < 500 words):** System generates fewer flashcards (min 5) and quiz questions (min 3)
- **A3 — Language other than English:** Whisper detects language; GPT-4o generates notes/flashcards in detected language

**Postconditions:**
- `notes`, `mind_maps` (v2), `flashcards`, `decks`, `quizzes`, `embeddings` documents all created
- `content_items.processingStatus = 'completed'`
- User notified; content tabs in UI are accessible

**Exception Flows:**
- **E1 — OpenAI API rate limit:** Job retries with exponential backoff (3 attempts); if all fail, stage marked 'failed', user notified
- **E2 — Whisper audio too long:** Audio is split into 25 MB chunks and processed sequentially; segments merged
- **E3 — GPT-4o returns malformed JSON:** Worker retries once with a corrected prompt; if second failure, falls back to a simplified prompt

---

## UC-008: View Structured Notes

**Actor:** Authenticated User (with project access)  
**Goal:** Read AI-generated structured notes for a content item  
**Preconditions:**
- Content item processing is completed
- User has viewer, editor, or owner access to the project

**Main Flow:**
1. User navigates to a content item and clicks the "Notes" tab
2. System fetches the `notes` document for the content item
3. System renders each block according to its type:
   - `h1/h2/h3` → Heading elements with hierarchy
   - `bullet/numbered` → List items
   - `callout` → Highlighted box with icon (info/tip/warning)
   - `keyterm` → Definition card with term highlighted
   - `summary` → Special summary block at top
4. Table of contents generated from h1/h2 headings, shown in a sticky sidebar
5. User reads notes; can click heading in TOC to jump to section
6. User can search within notes (Ctrl+F / Cmd+F activates in-page search)

**Alternative Flows:**
- **A1 — Notes still processing:** Tab shows a loading skeleton with "Generating your notes... this takes about 1 minute"
- **A2 — Notes generation failed:** Tab shows error state with "Failed to generate notes" and a "Retry" button
- **A3 — Pro user edits note:** If user is Pro and has editor+ role, an "Edit" button activates the block editor (Tiptap)

**Postconditions:**
- Study session is tracked (`study_sessions` entry created/updated)
- Time-on-page contributes to daily study stats

**Exception Flows:**
- **E1 — Notes document not found:** System attempts to regenerate notes via `POST /api/content/:id/reprocess?stage=notes`

---

## UC-009: Edit Mind Map

**Actor:** Authenticated Pro User (Owner or Editor)  
**Goal:** Modify the AI-generated mind map to add personal understanding  
**Preconditions:**
- User has Pro plan
- User has Owner or Editor role in the project
- Content processing is completed (mind_maps document exists)

**Main Flow:**
1. User navigates to the "Mind Map" tab on a content item
2. System fetches and renders the `mind_maps` document using react-flow
3. Mind map is displayed in an interactive canvas (pan/zoom controls visible)
4. User clicks a node to select it; node toolbar appears (rename, change color, delete, add child)
5. User double-clicks a node to rename it inline
6. User drags a node to reposition it
7. User clicks "+ Add Node" to create a new sibling or child node
8. User clicks an edge to add/edit an edge label
9. Changes are debounced and auto-saved (every 2 seconds of inactivity) via `PUT /api/mindmaps/:contentId`
10. Save indicator shows "Saving..." → "Saved" in the toolbar

**Alternative Flows:**
- **A1 — Free user views mind map:** Mind map is visible in read-only mode. "Edit" button is locked with "Pro feature" tooltip.
- **A2 — Collapse subtree:** User clicks the collapse icon on a branch node; all children collapse visually.
- **A3 — Export mind map:** User clicks "Export" → chooses PNG, SVG, or JSON → file downloads.
- **A4 — Reset to AI version:** User clicks "Reset to AI version" → confirmation dialog → mind map reverts to latest AI-generated version.

**Postconditions:**
- `mind_maps` document updated with new node/edge positions and labels
- Version counter incremented

**Exception Flows:**
- **E1 — Auto-save fails:** Toast "Failed to save changes. Retrying..." — retry 3 times; if all fail, user prompted to manually save or copy JSON.

---

## UC-010: Study Flashcards with SRS

**Actor:** Authenticated User  
**Goal:** Review flashcards due today using spaced repetition  
**Preconditions:**
- User has at least one deck with cards due today (`srsData.dueDate <= now`)
- User is on the flashcards study view

**Main Flow:**
1. User opens a deck and clicks "Study Due Cards" (or "Study All")
2. System fetches due cards sorted by `srsData.dueDate ASC`
3. Study session begins; first card is shown (front side only)
4. User reads the front of the card, thinks about the answer
5. User clicks "Show Answer"
6. Back of card is revealed; audio pronunciation (if available) plays automatically
7. User selects their recall quality:
   - **Again (0):** Didn't remember at all
   - **Hard (1):** Remembered with significant difficulty
   - **Good (2):** Remembered with effort
   - **Easy (3):** Remembered instantly
8. System calls `POST /api/flashcards/:id/review` with `{ rating: 0–3 }`
9. System runs SM-2 algorithm to compute new `interval`, `easeFactor`, `dueDate`
10. Next card is shown; steps 4–9 repeat
11. When all due cards are reviewed, session summary shown:
    - Cards reviewed, % rated Good/Easy, estimated next due date
12. Study session document created with session stats
13. User's streak is updated if first study of the day

**Alternative Flows:**
- **A1 — No due cards:** Screen shows "No cards due today! 🎉 Your next review is in N days."
- **A2 — User skips a card:** Card is moved to end of the current session queue (not rescheduled yet)
- **A3 — User marks "Again":** Card is re-shown in the same session after 10 minutes (or at end of session if time is insufficient)

**Postconditions:**
- All reviewed flashcards have updated `srsData` (`dueDate`, `interval`, `easeFactor`, `repetitions`)
- `study_sessions` record created
- User stats updated (streak, totalStudyTime, lastStudyDate)

**Exception Flows:**
- **E1 — API save fails for a rating:** Rating is buffered locally and retried; study session continues uninterrupted

---

## UC-011: Take Quiz

**Actor:** Authenticated User  
**Goal:** Test knowledge from content via a structured quiz  
**Preconditions:**
- Content item has a generated quiz (`processingStatus: 'completed'`)
- User has access to the content item

**Main Flow:**
1. User opens the "Quiz" tab on a content item
2. System displays quiz overview: title, question count, estimated time, previous best score (if any)
3. User configures settings (if not using defaults): shuffle questions, time limit
4. User clicks "Start Quiz"
5. System creates a quiz attempt session (client-side state, not persisted until submit)
6. Questions are displayed one at a time (or all at once, per settings)
7. For each question:
   a. **MCQ:** User selects one of 4 options
   b. **True/False:** User selects True or False
   c. **Short Answer:** User types a free-text response
8. Timer counts down if time limit is set; a warning appears at 30 seconds remaining
9. User navigates questions using Next/Previous buttons
10. User clicks "Submit Quiz"
11. System calls `POST /api/quizzes/:id/attempt` with all answers and time taken
12. Backend grades all answers (for short answer, uses GPT-4o semantic matching)
13. System creates `quiz_attempts` document and identifies weak areas from incorrect answers
14. Results page is shown immediately

**Alternative Flows:**
- **A1 — Time runs out:** Quiz auto-submits with unanswered questions marked as incorrect
- **A2 — User leaves/navigates away:** Quiz state is saved in localStorage; "Resume Quiz" prompt on return
- **A3 — Multiple correct attempts:** User can retake the quiz; history shows all attempts

**Postconditions:**
- `quiz_attempts` document created with full attempt data
- `weakAreas` computed and stored
- Quiz `attemptCount` and `averageScore` denormalized fields updated
- Analytics updated

**Exception Flows:**
- **E1 — Short answer grading API fails:** System falls back to exact string match with normalization (lowercase, trim)

---

## UC-012: View Gap Analysis after Quiz

**Actor:** Authenticated User  
**Goal:** Understand knowledge weaknesses identified from quiz results  
**Preconditions:**
- User has at least one completed `quiz_attempts` document

**Main Flow:**
1. After submitting a quiz (UC-011), results page shows a "Knowledge Gaps" section below the score
2. System aggregates incorrect answers by question `tags` across the attempt
3. Gap analysis displays as a visual breakdown:
   - Horizontal bar chart: topic area → % incorrect
   - Color-coded: red (> 50% incorrect), yellow (25–50%), green (< 25%)
4. Each weak topic area has expandable details:
   - Which questions were missed
   - Link to the specific section in the notes
   - Recommended flashcards to review
5. User clicks "Practice Weak Areas" → system filters flashcard study session to cards tagged with weak topics
6. System optionally offers "Generate Extra Flashcards for Weak Areas" (Pro feature)

**Alternative Flows:**
- **A1 — First attempt (no history):** Only current attempt analyzed.
- **A2 — Multiple attempts (cumulative view):** Toggle "View All Attempts" to see gaps across attempt history, weighted by recency
- **A3 — No gaps identified (perfect score):** Shows "Excellent! No weak areas detected. 🏆"

**Postconditions:**
- `weakAreas` field on `quiz_attempts` is populated
- User has actionable next steps for studying

---

## UC-013: Chat with Content (RAG)

**Actor:** Authenticated User  
**Goal:** Ask questions about specific content and receive grounded AI answers  
**Preconditions:**
- Content item has `processingJobs.embeddings: 'completed'` (vectors stored)
- User has access to the content item

**Main Flow:**
1. User opens the "Chat" tab on a content item
2. System creates or resumes a `chat_sessions` document for this user + content item
3. User types a question in the input box and presses Enter or clicks Send
4. Client calls `POST /api/chat/message` with `{ message, sessionId, contentItemId }`
5. System embeds the user's message using OpenAI Embeddings API
6. System queries Pinecone/pgvector: top-5 chunks by cosine similarity, filtered by `contentItemId`
7. System constructs a GPT-4o prompt:
   - System: "You are a tutor helping a student learn from the following content. Answer only based on the provided context. If you don't know, say so."
   - Context: Top-5 retrieved chunks with timestamps/page numbers
   - Conversation history (last 10 messages)
   - User message
8. GPT-4o streams a response back
9. Response is streamed to the client in real time (typing effect)
10. Response is displayed with source citations (expandable excerpts with timestamp links for video)
11. User's message and AI response are appended to `chat_sessions.messages`

**Alternative Flows:**
- **A1 — No relevant chunks found:** GPT-4o responds: "I couldn't find relevant information in this content. Could you rephrase your question?"
- **A2 — Global Tutor mode (no contentItemId):** System searches across all user's content embeddings; response cites multiple sources
- **A3 — Voice Q&A (Pro):** User clicks microphone; browser records audio; audio sent to Whisper STT; transcribed text auto-fills input; system processes normally

**Postconditions:**
- New messages appended to `chat_sessions`
- `totalTokens` updated for cost tracking
- If first message in session, session title auto-generated from first question (truncated to 50 chars)

**Exception Flows:**
- **E1 — GPT-4o streaming error:** Client shows "Response interrupted. Please try again." Partial response is preserved.
- **E2 — Embeddings not yet ready:** Chat tab shows "Embeddings are still processing. Chat will be available shortly."

---

## UC-014: Share Content via Public Link

**Actor:** Authenticated User (Owner or Editor)  
**Goal:** Share a content item, deck, or quiz with someone who doesn't have a LearnWave account  
**Preconditions:**
- User has Owner or Editor role on the resource's project

**Main Flow:**
1. User opens the "..." context menu on a content item and selects "Share"
2. System opens the Share modal
3. User configures:
   - Permission: "View only" or "Allow forking"
   - Expiry: "Never" or a specific date
4. User clicks "Generate Link"
5. System calls `POST /api/content/:id/share` with settings
6. System creates a `share_links` document with a unique token (UUID v4, URL-safe base64)
7. System returns the shareable URL: `https://learnwave.app/shared/{token}`
8. URL is displayed in the modal with a "Copy" button
9. User copies and shares the link externally

**Alternative Flows:**
- **A1 — Link already exists:** System shows the existing link with option to revoke and regenerate
- **A2 — Set expiry:** System sets `expiresAt` on the `share_links` document
- **A3 — Revoke link:** User clicks "Revoke" → `isActive: false`; link returns 410 Gone when accessed

**Postconditions:**
- `share_links` document created with unique token
- Resource is accessible anonymously via the share URL

**Exception Flows:**
- **E1 — Token collision (extremely rare):** System generates a new token and retries.

---

## UC-015: Fork Shared Content to Library

**Actor:** Authenticated User (accessing a shared link with fork permission)  
**Goal:** Copy someone else's shared content into your own library  
**Preconditions:**
- User has a valid share link URL with `permissions: 'fork'`
- User is authenticated (must log in/register to fork)
- Share link has not expired

**Main Flow:**
1. User opens shared link `https://learnwave.app/shared/{token}`
2. System validates the token: exists, `isActive: true`, not expired
3. System renders the shared content in read-only view with a "Fork to My Library" button (if fork allowed)
4. User clicks "Fork to My Library"
5. System opens a project selector: "Which project should this go into?"
6. User selects a destination project (or creates a new one)
7. System calls `POST /api/decks/:id/fork` (or equivalent for content type)
8. System creates deep copies:
   - New `content_items` document (with `ownerId: user.id`)
   - New `notes`, `flashcards`, `decks`, `quizzes` documents linked to the new content item
   - Cloudinary resources are not re-uploaded; original Cloudinary URLs are referenced (embeddings not forked — re-generated)
9. System increments `share_links.accessCount`
10. User is redirected to the newly forked content item in their project
11. Toast: "Content forked to '[Project Name]' successfully!"

**Alternative Flows:**
- **A1 — User not logged in:** System redirects to login with `?redirect=/shared/{token}`; after login, fork flow continues
- **A2 — Link is view-only:** "Fork" button is not shown; only "View" content is possible
- **A3 — Link expired:** System shows "This link has expired. Please contact the owner for a new link."

**Postconditions:**
- Deep copy of all related documents in user's project
- `share_links.accessCount` incremented
- Embeddings re-generation job enqueued for the forked content

---

## UC-016: Join Study Room

**Actor:** Authenticated User  
**Goal:** Join a collaborative Study Room session using an invite code  
**Preconditions:**
- User has an invite code (6-character alphanumeric)
- The Study Room is active (`isActive: true`)
- Room is not at max participant capacity

**Main Flow:**
1. User navigates to "Study Rooms" in the sidebar
2. User clicks "Join Room" and enters the 6-character invite code
3. System calls `POST /api/study-rooms/join` with `{ inviteCode }`
4. System validates:
   - Invite code exists and room is active
   - Room is not full (`participants.length < maxParticipants`)
   - User is not already in the room
5. System adds user to `room.participants` array
6. System returns room details and the current room state
7. Client connects to Socket.io room channel: `socket.emit('room:join', { roomId })`
8. WebSocket server joins socket to the room channel: `socket.join(\`room:${roomId}\`)`
9. System emits `room:user-joined` to all participants with the new participant's name and avatar
10. User sees the Study Room UI: shared notes, participant list, host controls (if host), chat sidebar

**Alternative Flows:**
- **A1 — Invalid invite code:** System returns "Invalid or expired invite code. Please check and try again."
- **A2 — Room is full:** System returns "This room is currently full (max [N] participants)."
- **A3 — Room has ended:** System returns "This study room has ended."

**Postconditions:**
- User is a participant in the room
- Socket.io connection established
- All participants see the new user in the participant list

**Exception Flows:**
- **E1 — WebSocket connection fails:** Client falls back to polling; user can still participate but with higher latency; banner warns "Real-time sync degraded — check your connection."

---

## UC-017: Host Live Quiz in Study Room

**Actor:** Study Room Host (Pro User)  
**Goal:** Run a synchronous quiz session in the Study Room with live scoring  
**Preconditions:**
- User is the host of an active Study Room
- At least one other participant is in the room
- A quiz resource has been selected from the project

**Main Flow:**
1. Host opens the Study Room and clicks "Start Quiz"
2. Host selects a quiz from the project's available quizzes
3. Host configures: time per question (10s / 20s / 30s / 60s), shuffle questions
4. Host clicks "Launch Quiz"
5. System sends `room:quiz-start` WebSocket event to all participants with quiz metadata (title, question count, rules)
6. Participants see a countdown (5 seconds) before first question
7. For each question:
   a. System sends `room:quiz-question` event with question text and options (no correct answer revealed)
   b. Timer visible to all participants simultaneously
   c. Each participant submits their answer via `socket.emit('room:answer', { questionId, selectedAnswer })`
   d. As answers come in, host sees anonymous answer count (e.g., "3 of 5 answered")
   e. When timer expires OR all participants answer, system sends `room:quiz-reveal` with correct answer and explanation
   f. System emits `room:leaderboard-update` with running scores (points for correct + speed bonus)
8. After all questions, system sends `room:quiz-end` with final leaderboard
9. `quiz_attempts` documents are created for each participant
10. Results displayed in-room; host can view per-participant breakdown

**Alternative Flows:**
- **A1 — Participant drops mid-quiz:** Their unanswered questions are marked incorrect; they rejoin and see the current question
- **A2 — Host disconnects:** System pauses quiz for 60 seconds; if host reconnects, quiz resumes; if not, quiz ends and partial results saved
- **A3 — Only host in room:** System warns "You need at least 1 other participant to start a quiz."

**Postconditions:**
- `quiz_attempts` documents created for all participants who answered at least one question
- Leaderboard stored in room document
- Study sessions tracked for all participants

---

## UC-018: View Learning Analytics Dashboard

**Actor:** Authenticated User  
**Goal:** Review learning progress, streaks, mastery, and study patterns  
**Preconditions:**
- User is authenticated
- User has at least some study activity recorded

**Main Flow:**
1. User navigates to "Analytics" in the sidebar
2. System calls `GET /api/analytics/dashboard`
3. System aggregates data from `study_sessions`, `quiz_attempts`, `flashcards`, `notifications`
4. Dashboard renders with the following sections:

   **Section 1 — Overview Cards:**
   - Current streak (days) with fire icon
   - Total study time (formatted: Xh Ym)
   - Content items processed
   - Average quiz score

   **Section 2 — Activity Heatmap:**
   - GitHub-style contribution graph (52 weeks × 7 days)
   - Color intensity = total study minutes that day
   - Clicking a day shows session breakdown

   **Section 3 — Mastery by Content:**
   - Horizontal bar chart: content item → mastery % (from SRS ease factors + quiz scores)
   - Color-coded green/yellow/red

   **Section 4 — Weekly Study Time:**
   - Area chart: last 4 weeks, broken down by session type (video, flashcard, quiz, notes)

   **Section 5 — Flashcards Due This Week:**
   - Calendar view: how many cards due each day

   **Section 6 — Weak Areas (if quiz data exists):**
   - Top 5 weakest topic tags across all content

5. User can filter by date range or project

**Alternative Flows:**
- **A1 — New user with no activity:** Dashboard shows empty states for each section with CTA "Start studying to see your analytics!"
- **A2 — Filter by project:** All metrics filtered to selected project's content only

**Postconditions:**
- No data is modified; analytics are read-only

---

## UC-019: Set Learning Goal and Get AI Path

**Actor:** Authenticated Pro User  
**Goal:** Define a learning objective and receive an AI-generated curriculum  
**Preconditions:**
- User has Pro plan
- User has at least some content in their library

**Main Flow:**
1. User clicks "Learning Path" in the sidebar
2. System shows an onboarding form:
   - **Goal:** Free-text input (e.g., "Master machine learning for software engineers")
   - **Timeline:** Target completion date or "No deadline"
   - **Daily study time:** 15 min / 30 min / 1 hour / 2 hours+
3. User fills in the form and clicks "Generate Path"
4. System calls `POST /api/analytics/learning-path` with goal, timeline, and daily time
5. System sends a request to GPT-4o with:
   - User's goal
   - List of user's content items (titles, types, tags, processing status, mastery %)
   - User's quiz weak areas
   - Available time per day
6. GPT-4o returns a structured curriculum: ordered list of content items with:
   - Study order (1, 2, 3...)
   - Recommended focus (notes, flashcards, quiz, or all)
   - Estimated time to complete
   - Why this item is in this position (rationale)
7. System displays the Learning Path as an ordered checklist/timeline
8. User can reorder items by dragging or mark items as "Done"
9. System persists the learning path for future reference

**Alternative Flows:**
- **A1 — Not enough content in library:** System suggests importing additional content and shows a "Add More Content" CTA alongside a partial plan
- **A2 — User modifies goal:** User can edit the goal and regenerate the path; previous path is archived

**Postconditions:**
- Learning path document saved
- User has a clear, prioritized study plan

---

## UC-020: Receive SRS Review Reminder

**Actor:** Authenticated User  
**Goal:** Be reminded to review due flashcards to maintain the SRS schedule  
**Preconditions:**
- User has notification preferences with `srsReminders: true`
- User has flashcards with `srsData.dueDate <= today`

**Main Flow (System-Initiated):**
1. A cron job runs daily at 08:00 in the user's timezone
2. System queries all users with `settings.notifications.srsReminders: true` and `lastStudyDate != today`
3. For each user, system queries `flashcards` where `ownerId = user._id AND srsData.dueDate <= today`
4. If due card count > 0:
   a. System creates a `notifications` document: `type: 'srs_reminder'`, `title: 'X flashcards due for review!'`, `body: 'Keep your streak going! Review your flashcards today.'`
   b. System increments unread badge in the UI via WebSocket (if user is online)
   c. System sends email via SendGrid if `emailNotifications: true` (once per day max, using daily digest template)
5. User sees notification bell badge in the UI
6. User clicks the bell → notification panel opens
7. User clicks the notification → redirected to flashcard review session

**Alternative Flows:**
- **A1 — User is offline:** Notification created in DB; badge shown on next login
- **A2 — Email bounces:** SendGrid webhook logs the bounce; system disables email for that user after 3 bounces
- **A3 — User has opted out:** `srsReminders: false` — cron job skips this user entirely

**Postconditions:**
- `notifications` document created and marked unread
- Email sent (if preference allows)
- User session (if studied afterward) updates streak

**Exception Flows:**
- **E1 — Cron job fails:** Alert sent to ops team; job retried at next interval (1 hour); duplicate notifications prevented by checking if notification already sent today (`createdAt >= startOfDay`)
