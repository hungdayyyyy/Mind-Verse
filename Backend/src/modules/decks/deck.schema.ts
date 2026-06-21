import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createDeckSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    description: z.string().max(500).optional(),
    contentItemId: z.string().regex(objectIdRegex),
    projectId: z.string().regex(objectIdRegex),
  }),
});

export const updateDeckSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
  }),
});

export const shareDeckSchema = z.object({
  body: z.object({
    permissions: z.enum(['view', 'fork']),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
});

export const forkDeckSchema = z.object({
  body: z.object({
    targetProjectId: z.string().regex(objectIdRegex),
  }),
});

export const listDecksQuerySchema = z.object({
  query: z.object({
    projectId: z.string().regex(objectIdRegex).optional(),
    contentId: z.string().regex(objectIdRegex).optional(),
  }),
});

export type CreateDeckBody = z.infer<typeof createDeckSchema>['body'];
export type UpdateDeckBody = z.infer<typeof updateDeckSchema>['body'];
export type ShareDeckBody = z.infer<typeof shareDeckSchema>['body'];
export type ForkDeckBody = z.infer<typeof forkDeckSchema>['body'];
