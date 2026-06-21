import { Worker, Job } from 'bullmq';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { emitToUser } from '@config/socket';
import { ContentItem } from '@modules/content/content.model';
import { embeddingsService } from '@modules/chat/rag/embeddings.service';
import { GenerateEmbeddingsJobData } from './queue';

/**
 * Processes GenerateEmbeddingsJob: chunks the transcript/extracted text,
 * generates embedding vectors via OpenAI, and persists them for RAG
 * retrieval (chat.service.ts / retrieval.service.ts). This job is
 * independent of the notes/flashcards/quiz chain — it only depends on
 * TranscribeJob (or synchronous text extraction for documents) having
 * produced source text.
 */
export const embeddingsWorker = new Worker<GenerateEmbeddingsJobData>(
  QUEUE_NAMES.CONTENT_PROCESSING,
  async (job: Job<GenerateEmbeddingsJobData>) => {
    if (job.name !== JOB_NAMES.GENERATE_EMBEDDINGS) return;

    const { contentItemId, userId, sourceText, segments } = job.data;
    await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.embeddings': 'processing' });

    try {
      const chunkCount = await embeddingsService.generateAndStore(contentItemId, userId, sourceText, segments);
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.embeddings': 'completed' });

      emitToUser(userId, SOCKET_EVENTS.PROCESSING_UPDATE, { contentId: contentItemId, stage: 'embeddings', status: 'completed' });
      logger.info('Embeddings generated', { contentItemId, chunkCount });

      await maybeFinalizeProcessingStatus(contentItemId, userId);
    } catch (err) {
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.embeddings': 'failed' });
      emitToUser(userId, SOCKET_EVENTS.PROCESSING_ERROR, { contentId: contentItemId, stage: 'embeddings' });
      logger.error('Embeddings generation failed', { contentItemId, error: (err as Error).message });
      throw err;
    }
  },
  { connection: redisConnection, concurrency: env.QUEUE_CONCURRENCY }
);

embeddingsWorker.on('failed', async (job, err) => {
  logger.error('GenerateEmbeddingsJob failed after all retries', { jobId: job?.id, error: err.message });
  if (job?.data) {
    await maybeFinalizeProcessingStatus(job.data.contentItemId, job.data.userId);
  }
});

/**
 * UC-007 Stage 3: once all four downstream jobs (notes, flashcards, quiz,
 * embeddings) have reached a terminal state, computes the overall
 * `processingStatus` and notifies the user that their content is ready.
 * Each of the four worker files calls this after updating its own stage,
 * so whichever job finishes last performs the finalization.
 */
export async function maybeFinalizeProcessingStatus(contentItemId: string, userId: string): Promise<void> {
  const item = await ContentItem.findById(contentItemId);
  if (!item) return;

  const stages = [item.processingJobs.notes, item.processingJobs.flashcards, item.processingJobs.quiz, item.processingJobs.embeddings];
  const allTerminal = stages.every((s) => s === 'completed' || s === 'failed' || s === 'skipped');
  if (!allTerminal) return;

  const anyFailed = stages.some((s) => s === 'failed');
  const allCompleted = stages.every((s) => s === 'completed' || s === 'skipped');

  const finalStatus = allCompleted ? 'completed' : anyFailed ? 'partial' : item.processingStatus;
  if (item.processingStatus === finalStatus) return; // already finalized

  await ContentItem.updateOne({ _id: contentItemId }, { processingStatus: finalStatus });

  const { notificationService } = await import('@modules/notifications/notification.service');
  await notificationService.create(
    userId,
    finalStatus === 'completed' ? 'processing_done' : 'processing_failed',
    finalStatus === 'completed' ? `Your content "${item.title}" is ready!` : `Processing issues with "${item.title}"`,
    finalStatus === 'completed'
      ? 'All study materials have been generated and are ready to review.'
      : 'Some processing steps failed. You can retry them from the content page.',
    { contentItemId }
  );
}
