import { logger } from '@config/logger';
import { transcribeWorker } from './transcribe.worker';
import { notesWorker } from './notes.worker';
import { flashcardsWorker } from './flashcards.worker';
import { quizWorker } from './quiz.worker';
import { embeddingsWorker } from './embeddings.worker';
import { srsReminderWorker, scheduleSrsReminderSweep } from './srsReminder.worker';

/**
 * Imports every worker module (which registers its BullMQ `Worker` as a
 * side effect of import) and starts the recurring SRS reminder sweep.
 * Call this once from worker-server.ts. Keeping registration centralized
 * here means new workers only need a one-line addition, consistent with
 * the plugin-style module pattern described in the architecture doc.
 */
export function registerAllWorkers(): void {
  const workers = [transcribeWorker, notesWorker, flashcardsWorker, quizWorker, embeddingsWorker, srsReminderWorker];

  workers.forEach((worker) => {
    worker.on('error', (err) => logger.error('Worker-level error', { worker: worker.name, error: err.message }));
  });

  logger.info(`Registered ${workers.length} BullMQ workers`, {
    workers: workers.map((w) => w.name),
  });
}

export async function startScheduledJobs(): Promise<void> {
  await scheduleSrsReminderSweep();
}

export async function shutdownAllWorkers(): Promise<void> {
  await Promise.all([
    transcribeWorker.close(),
    notesWorker.close(),
    flashcardsWorker.close(),
    quizWorker.close(),
    embeddingsWorker.close(),
    srsReminderWorker.close(),
  ]);
  logger.info('All workers shut down gracefully');
}
