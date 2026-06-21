import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from '@config/index';
import { winstonStream } from '@config/logger';
import { requestIdMiddleware } from '@middleware/requestId.middleware';
import { apiRateLimit } from '@middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from '@middleware/error.middleware';

import { authRouter } from '@modules/auth/auth.router';
import { userRouter } from '@modules/users/user.router';
import { projectRouter } from '@modules/projects/project.router';
import { folderRouter } from '@modules/folders/folder.router';
import { contentRouter } from '@modules/content/content.router';
import { notesRouter } from '@modules/notes/notes.router';
import { mindmapRouter } from '@modules/mindmaps/mindmap.router';
import { deckRouter } from '@modules/decks/deck.router';
import { flashcardRouter } from '@modules/flashcards/flashcard.router';
import { quizRouter } from '@modules/quizzes/quiz.router';
import { chatRouter } from '@modules/chat/chat.router';
import { analyticsRouter } from '@modules/analytics/analytics.router';
import { studyRoomRouter } from '@modules/study-rooms/studyRoom.router';
import { notificationRouter } from '@modules/notifications/notification.router';
import { adminRouter } from '@modules/admin/admin.router';
import { billingRouter, stripeWebhook } from '@modules/billing/billing.router';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // required for correct req.ip behind a load balancer (rate limiting, audit logs)

  app.use(
    helmet({
      contentSecurityPolicy: false, // API-only server; CSP is enforced by the frontend, not relevant here
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(requestIdMiddleware);
  app.use(morgan('combined', { stream: winstonStream }));

  // Stripe webhook MUST receive the raw body for signature verification,
  // so it's mounted here — before express.json() — with express.raw().
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(apiRateLimit);

  // Health checks (unauthenticated, used by load balancer / orchestrator)
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/ready', async (_req, res) => {
    const mongoose = await import('mongoose');
    const isDbReady = mongoose.default.connection.readyState === 1;
    res.status(isDbReady ? 200 : 503).json({ status: isDbReady ? 'ready' : 'not_ready' });
  });

  // --- Feature module routers -----------------------------------------------
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/folders', folderRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/mindmaps', mindmapRouter);
  app.use('/api/decks', deckRouter);
  app.use('/api/flashcards', flashcardRouter);
  app.use('/api/quizzes', quizRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/study-rooms', studyRoomRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
