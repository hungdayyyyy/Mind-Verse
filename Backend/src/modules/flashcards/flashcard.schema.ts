import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createFlashcardSchema = z.object({
  body: z.object({
    deckId: z.string().regex(objectIdRegex),
    contentItemId: z.string().regex(objectIdRegex),
    front: z.object({ text: z.string().min(1).max(2000) }),
    back: z.object({ text: z.string().min(1).max(5000) }),
    tags: z.array(z.string()).max(20).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  }),
});

export const updateFlashcardSchema = z.object({
  body: z.object({
    front: z.object({ text: z.string().min(1).max(2000) }).optional(),
    back: z.object({ text: z.string().min(1).max(5000) }).optional(),
    tags: z.array(z.string()).max(20).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  }),
});

export const reviewFlashcardSchema = z.object({
  body: z.object({
    rating: z.number().int().min(0).max(3),
  }),
});

export const listFlashcardsQuerySchema = z.object({
  query: z.object({
    deckId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const dueFlashcardsQuerySchema = z.object({
  query: z.object({
    deckId: z.string().regex(objectIdRegex).optional(),
  }),
});

export type CreateFlashcardBody = z.infer<typeof createFlashcardSchema>['body'];
export type UpdateFlashcardBody = z.infer<typeof updateFlashcardSchema>['body'];
export type ReviewFlashcardBody = z.infer<typeof reviewFlashcardSchema>['body'];
