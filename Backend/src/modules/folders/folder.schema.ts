import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    projectId: z.string().regex(objectIdRegex),
    parentFolderId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const updateFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    order: z.number().int().optional(),
  }),
});

export const moveFolderSchema = z.object({
  body: z.object({
    newParentFolderId: z.string().regex(objectIdRegex).nullable(),
  }),
});

export const listFoldersQuerySchema = z.object({
  query: z.object({
    projectId: z.string().regex(objectIdRegex),
  }),
});

export type CreateFolderBody = z.infer<typeof createFolderSchema>['body'];
export type UpdateFolderBody = z.infer<typeof updateFolderSchema>['body'];
export type MoveFolderBody = z.infer<typeof moveFolderSchema>['body'];
