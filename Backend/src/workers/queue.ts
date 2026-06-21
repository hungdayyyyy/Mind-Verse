import { Queue } from 'bullmq';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { TranscriptSegment } from '@modules/content/content.types';

/**
 * Single shared queue for the entire content-processing pipeline.
 * All five job types (transcribe, notes, flashcards, quiz, embeddings) flow
 * through this one queue; differentiating logic happens by `job.name` in the
 * worker. This keeps overall concurrency easy to reason about/scale as one
 * unit (see SDS.md §3.5).
 */
export const contentProcessingQueue = new Queue(QUEUE_NAMES.CONTENT_PROCESSING, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: env.QUEUE_MAX_RETRIES,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

// --- Job payload contracts -------------------------------------------------

export interface TranscribeJobData {
  contentItemId: string;
  userId: string;
  cloudinaryUrl?: string;
  youtubeVideoId?: string;
  language?: string;
}

export interface GenerateNotesJobData {
  contentItemId: string;
  userId: string;
  sourceText: string; // transcript text or extracted document text
}

export interface GenerateFlashcardsJobData {
  contentItemId: string;
  userId: string;
}

export interface GenerateQuizJobData {
  contentItemId: string;
  userId: string;
}

export interface GenerateEmbeddingsJobData {
  contentItemId: string;
  userId: string;
  sourceText: string;
  segments: TranscriptSegment[];
}

export interface SendEmailJobData {
  to: string;
  type: 'srs_reminder';
  payload: Record<string, unknown>;
}

/**
 * Enqueues the initial pipeline stage(s) for a freshly-created content item.
 * Audio/video content starts with TranscribeJob; document content (which has
 * its text extracted synchronously at upload time) skips straight to the
 * notes/flashcards/quiz/embeddings fan-out.
 */
export async function enqueueInitialProcessing(opts: {
  contentItemId: string;
  userId: string;
  needsTranscription: boolean;
  cloudinaryUrl?: string;
  youtubeVideoId?: string;
  extractedText?: string;
}): Promise<void> {
  if (opts.needsTranscription) {
    await contentProcessingQueue.add(JOB_NAMES.TRANSCRIBE, {
      contentItemId: opts.contentItemId,
      userId: opts.userId,
      cloudinaryUrl: opts.cloudinaryUrl,
      youtubeVideoId: opts.youtubeVideoId,
    } satisfies TranscribeJobData);
    return;
  }

  // Non-AV content: text was already extracted synchronously; fan out directly.
  const sourceText = opts.extractedText ?? '';
  await Promise.all([
    contentProcessingQueue.add(JOB_NAMES.GENERATE_NOTES, {
      contentItemId: opts.contentItemId,
      userId: opts.userId,
      sourceText,
    } satisfies GenerateNotesJobData),
    contentProcessingQueue.add(JOB_NAMES.GENERATE_EMBEDDINGS, {
      contentItemId: opts.contentItemId,
      userId: opts.userId,
      sourceText,
      segments: [],
    } satisfies GenerateEmbeddingsJobData),
  ]);
}
