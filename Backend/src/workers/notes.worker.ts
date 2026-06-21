import { Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { openai, openaiModels } from '@config/openai';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { emitToUser } from '@config/socket';
import { ContentItem } from '@modules/content/content.model';
import { notesService } from '@modules/notes/notes.service';
import { NoteBlock, NoteBlockType } from '@modules/notes/notes.model';
import { contentProcessingQueue, GenerateNotesJobData } from './queue';

const SYSTEM_PROMPT = `You are a study notes expert. Convert the following transcript into highly structured study notes.
Use these block types: H1 (main topic), H2 (subtopic), BULLET (key point), CALLOUT (important concept), KEYTERM (term:definition), SUMMARY (one paragraph at the top).
Return ONLY a JSON object of shape { "blocks": [...] }, no other text, where each block is:
{ "type": "h1" | "h2" | "h3" | "bullet" | "numbered" | "callout" | "keyterm" | "summary", "content": "string", "calloutType"?: "info" | "warning" | "tip" }
Start with one "summary" block, then organize the rest hierarchically with h1/h2 sections.`;

/**
 * Processes GenerateNotesJob: calls GPT-4o with the transcript (truncated if
 * very long), parses the JSON block array response, and saves/upserts the
 * `notes` document. Triggers downstream flashcard + quiz generation once
 * notes exist, since both depend on having structured notes as their source
 * material rather than the raw transcript (cleaner signal for Q&A extraction).
 */
export const notesWorker = new Worker<GenerateNotesJobData>(
  QUEUE_NAMES.CONTENT_PROCESSING,
  async (job: Job<GenerateNotesJobData>) => {
    if (job.name !== JOB_NAMES.GENERATE_NOTES) return;

    const { contentItemId, userId, sourceText } = job.data;
    await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.notes': 'processing' });

    try {
      const blocks = await generateNoteBlocks(sourceText);
      await notesService.upsertGenerated(contentItemId, userId, blocks);
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.notes': 'completed' });

      emitToUser(userId, SOCKET_EVENTS.PROCESSING_UPDATE, { contentId: contentItemId, stage: 'notes', status: 'completed' });

      // Flashcards and quiz are generated from the structured notes, not the
      // raw transcript — queue them now that notes exist.
      await Promise.all([
        contentProcessingQueue.add(JOB_NAMES.GENERATE_FLASHCARDS, { contentItemId, userId }),
        contentProcessingQueue.add(JOB_NAMES.GENERATE_QUIZ, { contentItemId, userId }),
      ]);

      logger.info('Notes generated', { contentItemId, blockCount: blocks.length });
    } catch (err) {
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.notes': 'failed' });
      emitToUser(userId, SOCKET_EVENTS.PROCESSING_ERROR, { contentId: contentItemId, stage: 'notes' });
      logger.error('Notes generation failed', { contentItemId, error: (err as Error).message });
      throw err;
    }
  },
  { connection: redisConnection, concurrency: env.QUEUE_CONCURRENCY }
);

notesWorker.on('failed', (job, err) => {
  logger.error('GenerateNotesJob failed after all retries', { jobId: job?.id, error: err.message });
});

const MAX_INPUT_CHARS = 24000; // ~6000 tokens, leaves headroom for the system prompt + response

async function generateNoteBlocks(sourceText: string): Promise<NoteBlock[]> {
  const truncated = sourceText.length > MAX_INPUT_CHARS ? sourceText.slice(0, MAX_INPUT_CHARS) : sourceText;

  const completion = await openai.chat.completions.create({
    model: openaiModels.chat,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: truncated },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{"blocks":[]}';
  return parseBlocks(raw);
}

interface RawBlock {
  type: string;
  content: string;
  calloutType?: string;
}

/**
 * Parses GPT-4o's JSON response into typed NoteBlock objects. Since
 * `response_format: json_object` requires a JSON *object* (not a bare
 * array) at the top level, the prompt asks for `{ "blocks": [...] }`; this
 * also defensively handles the model returning a bare array anyway.
 */
function parseBlocks(raw: string): NoteBlock[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn('Failed to parse GPT-4o notes response as JSON; returning empty block set');
    return [];
  }

  const arr: RawBlock[] = Array.isArray(parsed)
    ? parsed
    : (parsed as { blocks?: RawBlock[] })?.blocks ?? [];

  const validTypes: NoteBlockType[] = ['h1', 'h2', 'h3', 'bullet', 'numbered', 'callout', 'quote', 'keyterm', 'code', 'divider', 'summary'];

  return arr
    .filter((b) => b && typeof b.content === 'string' && validTypes.includes(b.type as NoteBlockType))
    .map((b) => ({
      id: uuidv4(),
      type: b.type as NoteBlockType,
      content: b.content,
      metadata: b.calloutType ? { calloutType: b.calloutType as 'info' | 'warning' | 'tip' | 'danger' } : undefined,
    }));
}
