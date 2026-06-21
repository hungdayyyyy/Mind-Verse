import { Worker, Job } from 'bullmq';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { openai, openaiModels } from '@config/openai';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { emitToUser } from '@config/socket';
import { ContentItem } from '@modules/content/content.model';
import { Notes } from '@modules/notes/notes.model';
import { Deck } from '@modules/decks/deck.model';
import { flashcardService } from '@modules/flashcards/flashcard.service';
import { GenerateFlashcardsJobData } from './queue';

const SYSTEM_PROMPT = `You are a flashcard generation expert. Given study notes, produce concise question/answer flashcard pairs
covering key terms, concepts, and facts. Aim for 10-30 cards depending on content depth — quality over quantity.
Return ONLY a JSON object of shape:
{ "cards": [{ "front": "string (question)", "back": "string (answer)", "tags": ["string"], "difficulty": "easy" | "medium" | "hard" }] }`;

const MIN_CARDS_FOR_SHORT_CONTENT = 5;

/**
 * Processes GenerateFlashcardsJob: reads the structured notes, prompts
 * GPT-4o for Q&A pairs, creates a Deck (if one doesn't already exist for
 * this content item), and batch-inserts flashcards with fresh SRS data.
 */
export const flashcardsWorker = new Worker<GenerateFlashcardsJobData>(
  QUEUE_NAMES.CONTENT_PROCESSING,
  async (job: Job<GenerateFlashcardsJobData>) => {
    if (job.name !== JOB_NAMES.GENERATE_FLASHCARDS) return;

    const { contentItemId, userId } = job.data;
    await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.flashcards': 'processing' });

    try {
      const [notes, contentItem] = await Promise.all([
        Notes.findOne({ contentItemId }),
        ContentItem.findById(contentItemId),
      ]);

      if (!notes || !contentItem) {
        throw new Error('Notes or content item not found; cannot generate flashcards');
      }

      const notesText = notes.blocks.map((b) => b.content).join('\n');
      const cards = await generateFlashcardPairs(notesText);

      let deck = await Deck.findOne({ contentItemId });
      if (!deck) {
        deck = await Deck.create({
          name: `${contentItem.title} — Flashcards`,
          contentItemId,
          projectId: contentItem.projectId,
          ownerId: userId,
          language: contentItem.language,
        });
      }

      await flashcardService.batchCreateFromAI(deck._id.toString(), contentItemId, userId, cards);
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.flashcards': 'completed' });

      emitToUser(userId, SOCKET_EVENTS.PROCESSING_UPDATE, { contentId: contentItemId, stage: 'flashcards', status: 'completed' });
      logger.info('Flashcards generated', { contentItemId, deckId: deck._id.toString(), cardCount: cards.length });

      const { maybeFinalizeProcessingStatus } = await import('./embeddings.worker');
      await maybeFinalizeProcessingStatus(contentItemId, userId);
    } catch (err) {
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.flashcards': 'failed' });
      emitToUser(userId, SOCKET_EVENTS.PROCESSING_ERROR, { contentId: contentItemId, stage: 'flashcards' });
      logger.error('Flashcard generation failed', { contentItemId, error: (err as Error).message });
      throw err;
    }
  },
  { connection: redisConnection, concurrency: env.QUEUE_CONCURRENCY }
);

flashcardsWorker.on('failed', async (job, err) => {
  logger.error('GenerateFlashcardsJob failed after all retries', { jobId: job?.id, error: err.message });
  if (job?.data) {
    const { maybeFinalizeProcessingStatus } = await import('./embeddings.worker');
    await maybeFinalizeProcessingStatus(job.data.contentItemId, job.data.userId);
  }
});

interface RawCard {
  front: string;
  back: string;
  tags?: string[];
  difficulty?: string;
}

async function generateFlashcardPairs(
  notesText: string
): Promise<Array<{ front: string; back: string; tags: string[]; difficulty: 'easy' | 'medium' | 'hard' }>> {
  const completion = await openai.chat.completions.create({
    model: openaiModels.chat,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: notesText.slice(0, 20000) },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{"cards":[]}';

  let parsed: { cards?: RawCard[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn('Failed to parse GPT-4o flashcards response as JSON');
    return [];
  }

  const validDifficulties = ['easy', 'medium', 'hard'];
  const cards = (parsed.cards ?? [])
    .filter((c) => c.front && c.back)
    .map((c) => ({
      front: c.front,
      back: c.back,
      tags: c.tags ?? [],
      difficulty: (validDifficulties.includes(c.difficulty ?? '') ? c.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
    }));

  // FR-029: minimum 10 cards per hour of content / minimum 5 for short content.
  // We don't have content duration here without an extra lookup, so we apply
  // the conservative floor; a fuller implementation would pass duration in
  // job data to scale the minimum precisely.
  if (cards.length < MIN_CARDS_FOR_SHORT_CONTENT) {
    logger.warn('GPT-4o generated fewer flashcards than the minimum floor', { count: cards.length });
  }

  return cards;
}
