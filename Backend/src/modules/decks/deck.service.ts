import { Deck, DeckDocument } from './deck.model';
import { Flashcard } from '@modules/flashcards/flashcard.model';
import { NotFoundError } from '@shared/errors';
import { generateShareToken } from '@shared/utils/generateToken';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { CreateDeckBody, UpdateDeckBody, ShareDeckBody } from './deck.schema';

export const deckService = {
  async listByFilter(projectId?: string, contentId?: string): Promise<DeckDocument[]> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (projectId) filter.projectId = projectId;
    if (contentId) filter.contentItemId = contentId;
    return Deck.find(filter).sort({ createdAt: -1 });
  },

  async getById(deckId: string): Promise<DeckDocument> {
    const deck = await Deck.findOne({ _id: deckId, deletedAt: null });
    if (!deck) throw new NotFoundError('Deck');
    return deck;
  },

  async createDeck(ownerId: string, input: CreateDeckBody): Promise<DeckDocument> {
    return Deck.create({
      name: input.name,
      description: input.description ?? '',
      contentItemId: input.contentItemId,
      projectId: input.projectId,
      ownerId,
    });
  },

  /** Called by the flashcards worker after batch-creating AI flashcards, to recompute denormalized counts. */
  async refreshCounts(deckId: string): Promise<void> {
    const [cardCount, masteredCount, newCount, dueCount] = await Promise.all([
      Flashcard.countDocuments({ deckId }),
      Flashcard.countDocuments({ deckId, 'srsData.repetitions': { $gte: 3 } }),
      Flashcard.countDocuments({ deckId, 'srsData.repetitions': 0 }),
      Flashcard.countDocuments({ deckId, 'srsData.dueDate': { $lte: new Date() } }),
    ]);
    await Deck.updateOne({ _id: deckId }, { cardCount, masteredCount, newCount, dueCount });
  },

  async updateDeck(deckId: string, input: UpdateDeckBody): Promise<DeckDocument> {
    const deck = await this.getById(deckId);
    if (input.name !== undefined) deck.name = input.name;
    if (input.description !== undefined) deck.description = input.description;
    await deck.save();
    return deck;
  },

  async deleteDeck(deckId: string): Promise<void> {
    const deck = await this.getById(deckId);
    deck.deletedAt = new Date();
    await deck.save();
    await Flashcard.deleteMany({ deckId }); // Cards are owned exclusively by their deck; hard-delete is acceptable here.
  },

  async createShareLink(deckId: string, ownerId: string, input: ShareDeckBody): Promise<{ url: string; token: string }> {
    const deck = await this.getById(deckId);
    const token = generateShareToken();
    deck.shareToken = token;
    deck.isPublic = true;
    await deck.save();

    const { ShareLink } = await import('@modules/content/shareLink.model');
    await ShareLink.create({
      resourceType: 'deck',
      resourceId: deck._id,
      token,
      ownerId,
      permissions: input.permissions,
      expiresAt: input.expiresAt ?? null,
    });

    return { url: `${env.FRONTEND_URL}/shared/${token}`, token };
  },

  /**
   * UC-015: Deep-copies a deck and all its flashcards into the requesting
   * user's library. SRS progress is reset on the fork (the forking user
   * hasn't studied these cards yet).
   */
  async forkDeck(deckId: string, newOwnerId: string, targetProjectId: string): Promise<DeckDocument> {
    const original = await this.getById(deckId);
    const originalCards = await Flashcard.find({ deckId });

    const forked = await Deck.create({
      name: original.name,
      description: original.description,
      contentItemId: original.contentItemId, // Points at the original content item (read-only reference)
      projectId: targetProjectId,
      ownerId: newOwnerId,
      language: original.language,
    });

    if (originalCards.length > 0) {
      await Flashcard.insertMany(
        originalCards.map((card) => ({
          contentItemId: card.contentItemId,
          deckId: forked._id,
          ownerId: newOwnerId,
          front: card.front,
          back: card.back,
          tags: card.tags,
          difficulty: card.difficulty,
          srsData: { dueDate: new Date(), interval: 1, easeFactor: 2.5, repetitions: 0, lapses: 0, lastReviewedAt: null, lastRating: null },
          isAiGenerated: card.isAiGenerated,
        }))
      );
    }

    await this.refreshCounts(forked._id.toString());
    logger.info('Deck forked', { originalDeckId: deckId, forkedDeckId: forked._id.toString(), newOwnerId });

    return forked;
  },
};
