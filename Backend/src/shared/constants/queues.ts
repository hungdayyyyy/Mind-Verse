/**
 * Centralized BullMQ queue and job name constants.
 * All content-processing jobs share a single queue (`content-processing`) so
 * that overall worker concurrency is easy to reason about and scale as one
 * unit; job `name` differentiates the processor logic within the queue.
 */
export const QUEUE_NAMES = {
  CONTENT_PROCESSING: 'content-processing',
  NOTIFICATIONS: 'notifications',
} as const;

export const JOB_NAMES = {
  TRANSCRIBE: 'TranscribeJob',
  GENERATE_NOTES: 'GenerateNotesJob',
  GENERATE_FLASHCARDS: 'GenerateFlashcardsJob',
  GENERATE_QUIZ: 'GenerateQuizJob',
  GENERATE_EMBEDDINGS: 'GenerateEmbeddingsJob',
  SEND_EMAIL: 'SendEmailJob',
  SRS_REMINDER_SWEEP: 'SrsReminderSweepJob',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
