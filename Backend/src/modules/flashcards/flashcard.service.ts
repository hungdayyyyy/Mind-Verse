import { Flashcard, FlashcardDocument } from './flashcard.model';
import { NotFoundError } from '@shared/errors';
import { calculateNextReview, createInitialSRSData, SRSRating } from '@shared/utils/srs';
import { deckService } from '@modules/decks/deck.service';
import { logger } from '@config/logger';
import { CreateFlashcardBody, UpdateFlashcardBody } from './flashcard.schema';

export const flashcardService = {
  async listByDeck(deckId: string): Promise<FlashcardDocument[]> {
    return Flashcard.find({ deckId }).sort({ createdAt: 1 });
  },

  async getById(flashcardId: string): Promise<FlashcardDocument> {
    const card = await Flashcard.findOne({ _id: flashcardId });
    if (!card) throw new NotFoundError('Flashcard');
    return card;
  },

  async createFlashcard(ownerId: string, input: CreateFlashcardBody): Promise<FlashcardDocument> {
    const card = await Flashcard.create({
      deckId: input.deckId,
      contentItemId: input.contentItemId,
      ownerId,
      front: input.front,
      back: input.back,
      tags: input.tags ?? [],
      difficulty: input.difficulty ?? 'medium',
      srsData: createInitialSRSData(),
      isAiGenerated: false,
    });
    await deckService.refreshCounts(input.deckId);
    return card;
  },

  async updateFlashcard(flashcardId: string, input: UpdateFlashcardBody): Promise<FlashcardDocument> {
    const card = await this.getById(flashcardId);
    if (input.front) card.front.text = input.front.text;
    if (input.back) card.back.text = input.back.text;
    if (input.tags) card.tags = input.tags;
    if (input.difficulty) card.difficulty = input.difficulty;
    await card.save();
    return card;
  },

  async deleteFlashcard(flashcardId: string): Promise<void> {
    const card = await this.getById(flashcardId);
    await card.deleteOne();
    await deckService.refreshCounts(card.deckId.toString());
  },

  /** FR-044: returns all cards due today for a user, optionally scoped to one deck. */
  async getDueCards(ownerId: string, deckId?: string): Promise<{ cards: FlashcardDocument[]; totalDue: number }> {
    const filter: Record<string, unknown> = { ownerId, 'srsData.dueDate': { $lte: new Date() } };
    if (deckId) filter.deckId = deckId;

    const cards = await Flashcard.find(filter).sort({ 'srsData.dueDate': 1 });
    return { cards, totalDue: cards.length };
  },

  /**
   * UC-010 / FR-042 / FR-043: applies the SM-2 algorithm to a card based on
   * the user's self-reported recall rating, persisting the new schedule.
   */
  async reviewFlashcard(flashcardId: string, rating: SRSRating): Promise<FlashcardDocument> {
    const card = await this.getById(flashcardId);

    const next = calculateNextReview(
      {
        interval: card.srsData.interval,
        easeFactor: card.srsData.easeFactor,
        repetitions: card.srsData.repetitions,
        lapses: card.srsData.lapses,
      },
      rating
    );

    card.srsData.interval = next.interval;
    card.srsData.easeFactor = next.easeFactor;
    card.srsData.repetitions = next.repetitions;
    card.srsData.lapses = next.lapses;
    card.srsData.dueDate = next.dueDate;
    card.srsData.lastReviewedAt = new Date();
    card.srsData.lastRating = rating;

    await card.save();
    await deckService.refreshCounts(card.deckId.toString());

    logger.debug('Flashcard reviewed', { flashcardId, rating, nextDueDate: next.dueDate });
    return card;
  },

  /**
   * Batch-creates flashcards from AI-generated Q&A pairs (called by the
   * flashcards worker). Each card starts with fresh SRS data.
   */
  async batchCreateFromAI(
    deckId: string,
    contentItemId: string,
    ownerId: string,
    cards: Array<{ front: string; back: string; tags: string[]; difficulty: 'easy' | 'medium' | 'hard' }>
  ): Promise<void> {
    if (cards.length === 0) return;

    await Flashcard.insertMany(
      cards.map((c) => ({
        deckId,
        contentItemId,
        ownerId,
        front: { text: c.front },
        back: { text: c.back },
        tags: c.tags,
        difficulty: c.difficulty,
        srsData: createInitialSRSData(),
        isAiGenerated: true,
      }))
    );

    await deckService.refreshCounts(deckId);
  },
};
