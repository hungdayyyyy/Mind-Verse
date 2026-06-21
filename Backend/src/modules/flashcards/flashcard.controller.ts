import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { flashcardService } from './flashcard.service';
import { CreateFlashcardBody, UpdateFlashcardBody, ReviewFlashcardBody } from './flashcard.schema';
import { SRSRating } from '@shared/utils/srs';

export const listFlashcards = asyncHandler(async (req: Request, res: Response) => {
  const { deckId } = req.query as { deckId?: string };
  const cards = deckId ? await flashcardService.listByDeck(deckId) : [];
  res.json({ data: cards });
});

export const createFlashcard = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateFlashcardBody;
  const card = await flashcardService.createFlashcard(req.user!.id, body);
  res.status(201).json({ data: card });
});

export const getFlashcard = asyncHandler(async (req: Request, res: Response) => {
  const card = await flashcardService.getById(req.params.id);
  res.json({ data: card });
});

export const updateFlashcard = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateFlashcardBody;
  const card = await flashcardService.updateFlashcard(req.params.id, body);
  res.json({ data: card });
});

export const deleteFlashcard = asyncHandler(async (req: Request, res: Response) => {
  await flashcardService.deleteFlashcard(req.params.id);
  res.json({ data: { success: true } });
});

export const getDueFlashcards = asyncHandler(async (req: Request, res: Response) => {
  const { deckId } = req.query as { deckId?: string };
  const result = await flashcardService.getDueCards(req.user!.id, deckId);
  res.json({ data: result.cards, totalDue: result.totalDue });
});

export const reviewFlashcard = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ReviewFlashcardBody;
  const card = await flashcardService.reviewFlashcard(req.params.id, body.rating as SRSRating);
  res.json({ data: { id: card._id, srsData: card.srsData } });
});
