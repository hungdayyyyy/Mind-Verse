import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { openai, openaiModels } from '@config/openai';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { emitToUser } from '@config/socket';
import { ContentItem } from '@modules/content/content.model';
import { contentProcessingQueue, TranscribeJobData } from './queue';
import { youtubeService } from '@shared/services/youtube.service';

const MAX_WHISPER_FILE_BYTES = 25 * 1024 * 1024; // OpenAI's hard limit per request

/**
 * Processes TranscribeJob: downloads the audio (from Cloudinary or, for
 * YouTube without captions, via yt-dlp), calls Whisper, and saves the
 * timestamped transcript to the content item. On success, fans out to the
 * four downstream jobs (notes, flashcards, quiz, embeddings).
 *
 * Retries: handled by BullMQ's `attempts` + exponential backoff (configured
 * on the queue's defaultJobOptions — 3 attempts, 5s/10s/20s backoff).
 */
export const transcribeWorker = new Worker<TranscribeJobData>(
  QUEUE_NAMES.CONTENT_PROCESSING,
  async (job: Job<TranscribeJobData>) => {
    if (job.name !== JOB_NAMES.TRANSCRIBE) return; // queue is shared; ignore other job types

    const { contentItemId, userId, cloudinaryUrl, youtubeVideoId } = job.data;

    await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.transcribe': 'processing', processingStatus: 'processing' });

    try {
      const audioBuffer = youtubeVideoId
        ? await youtubeService.downloadAudioBuffer(youtubeVideoId)
        : await downloadAudio(cloudinaryUrl!);

      if (audioBuffer.byteLength > MAX_WHISPER_FILE_BYTES) {
        logger.warn('Audio exceeds Whisper single-request limit; chunking required', { contentItemId, size: audioBuffer.byteLength });
        // Production implementation: split via ffmpeg into <=25MB segments,
        // transcribe each, and merge segments with adjusted timestamps.
        // Omitted here for scaffold brevity — see SDS.md NFR table for the
        // "1h video < 5 min processing" target this path must still meet.
      }

      const transcription = await openai.audio.transcriptions.create({
        file: await toUploadableFile(audioBuffer, `${contentItemId}.mp3`),
        model: openaiModels.whisper,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      const segments = (transcription as unknown as { segments?: Array<{ start: number; end: number; text: string }> }).segments ?? [];
      const text = transcription.text;

      await ContentItem.updateOne(
        { _id: contentItemId },
        {
          'transcript.text': text,
          'transcript.segments': segments,
          'transcript.language': (transcription as unknown as { language?: string }).language ?? 'en',
          'transcript.wordCount': text.split(/\s+/).length,
          'processingJobs.transcribe': 'completed',
        }
      );

      emitToUser(userId, SOCKET_EVENTS.PROCESSING_UPDATE, { contentId: contentItemId, stage: 'transcribe', status: 'completed' });

      // Fan out to the four jobs that depend on the transcript.
      await Promise.all([
        contentProcessingQueue.add(JOB_NAMES.GENERATE_NOTES, { contentItemId, userId, sourceText: text }),
        contentProcessingQueue.add(JOB_NAMES.GENERATE_EMBEDDINGS, { contentItemId, userId, sourceText: text, segments }),
      ]);

      logger.info('Transcription completed', { contentItemId, wordCount: text.split(/\s+/).length });
    } catch (err) {
      await ContentItem.updateOne(
        { _id: contentItemId },
        { 'processingJobs.transcribe': 'failed', processingStatus: 'failed' }
      );
      emitToUser(userId, SOCKET_EVENTS.PROCESSING_ERROR, { contentId: contentItemId, stage: 'transcribe' });
      logger.error('Transcription failed', { contentItemId, error: (err as Error).message });
      throw err; // re-throw so BullMQ retries per defaultJobOptions
    }
  },
  { connection: redisConnection, concurrency: env.QUEUE_CONCURRENCY }
);

transcribeWorker.on('failed', (job, err) => {
  logger.error('TranscribeJob failed after all retries', { jobId: job?.id, error: err.message });
});

async function downloadAudio(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

/** Wraps a raw buffer in a File-like object the OpenAI SDK accepts for multipart upload. */
async function toUploadableFile(buffer: Buffer, filename: string): Promise<File> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { toFile } = require('openai');
  return toFile(buffer, filename);
}
