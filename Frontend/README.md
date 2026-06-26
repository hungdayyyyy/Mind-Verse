# LearnWave — Frontend

AI-powered learning platform. Upload video/audio/PDF/docs/YouTube → get structured notes, mind maps, flashcards, and quizzes. Includes RBAC (user/premium/enterprise/admin) and an admin dashboard.

## Stack
Next.js 15 (App Router) · TailwindCSS v4 · @base-ui/react (shadcn-style primitives) · TanStack React Query · Zustand

## Folder structure (domain-organized)

```
app/
  (auth)/             sign-in, sign-up, forgot-password — public routes
  (dashboard)/        main app shell — dashboard, library, projects, viewer, study, analytics, settings
  (admin)/            admin-only routes, gated by AdminGuard
  share/[token]/      public read-only shared content view

components/
  ui/                 base-ui primitives (button, dialog, dropdown-menu, command, badge, skeleton...)
  layout/             Sidebar (projects/folders tree, collapse, nav)
  auth/                AuthForm (sign-in/sign-up)
  admin/               AdminGuard, AdminSidebar, UserTable, StatsOverview
  ai/                  AIChatPanel (RAG chat, streaming)
  content/             FileUploadDialog (Cloudinary + YouTube), ContentCard
  projects/            CreateProjectDialog, ShareProjectDialog
  learning/
    notes/             StructuredNotes
    mindmap/           MindMapView (interactive SVG canvas, zoom/pan)
    flashcards/        FlashcardDeck (SM-2 SRS), DeckList
    quiz/               QuizRunner (MCQ/true-false/short, timed, scored)
  shared/              CommandPalette (Cmd+K)

hooks/                 one folder per domain, all built on React Query
  auth/ projects/ content/ learning/ admin/

services/               one folder per domain, all API calls go through lib/api/baseQuery
  auth/ projects/ content/ learning/ admin/ shares.ts

stores/                 Zustand, one store per concern
  auth/                 user, token, isAdmin()/isPremium() helpers
  ui/                   sidebar/chat panel/command palette open state
  learning/              quiz answers, flashcard flip state, chat messages
  admin/                 admin table selection/filters

types/                  one folder per domain, barrel-exported from types/index.ts

lib/
  api/baseQuery.ts       fetch wrapper: auth header injection, 401 auto-refresh, typed errors
  auth/rbac.ts            role hierarchy + plan limit helpers (canUpload, canCreateProject, canAccess)
  utils/index.ts          cn(), formatBytes, formatDuration, SM-2 calculateNextReview()
  providers/index.tsx     React Query provider
```

## RBAC model

Roles: `user → premium → enterprise → admin → superadmin` (hierarchical, see `lib/auth/rbac.ts`)
Plans: `free | premium | enterprise`, each with upload/project limits in `types/auth/index.ts` → `PLAN_LIMITS`

- `useAuthStore().isAdmin()` gates `/admin/*` routes via `<AdminGuard>`
- `canUpload()` / `canCreateProject()` gate upload dialogs and project creation client-side (server must also enforce)
- Admin dashboard: user table (block/unblock/change plan/delete), content moderation, platform stats

## Features implemented

- Upload: drag-drop file (video/audio/pdf/docx/pptx/txt) + YouTube URL, via Cloudinary
- Notes: AI-structured blocks (h1/h2/bullet/callout/keyterm), regenerate
- Mind Map: interactive SVG canvas, zoom/pan, regenerate
- Flashcards: SM-2 spaced repetition, deck list, due-today queue, rate Again/Good/Easy
- Quiz: MCQ/true-false/short-answer, timed mode, per-question review, weak-area gap finder
- AI Chat: streaming RAG chat scoped to a content item or global, suggested prompts
- Projects & Folders: nested 2-level tree in sidebar, drag-friendly structure, color-coded
- Sharing: generate link (view/fork permissions), invite by email, public read-only viewer, fork-to-library
- Analytics: streak, study time, mastery %, weekly activity chart, weak-area gap finder
- Admin: user management (role/plan/block/delete), content moderation, platform stats, revenue breakdown

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL etc.
pnpm dev
```

## Backend contract

This frontend expects a Node.js REST API matching the endpoints called in `services/*`. See the `PROMPT_CLAUDE_CODE_BACKEND.md` / `PROMPT_CLAUDE_CODE_DOCS.md` artifacts from project planning for the full database schema, SRS doc, and use cases used to generate it.
