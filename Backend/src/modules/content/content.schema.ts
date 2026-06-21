import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const uploadContentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    type: z.enum(['video', 'audio', 'pdf', 'doc', 'pptx', 'txt']),
    projectId: z.string().regex(objectIdRegex),
    folderId: z.string().regex(objectIdRegex).optional(),
    fileSize: z.number().positive().max(2_147_483_648), // 2GB hard ceiling; per-type limits enforced in service
    mimeType: z.string().min(1),
  }),
});

export const youtubeIngestSchema = z.object({
  body: z.object({
    url: z
      .string()
      .url()
      .refine((u) => /(?:youtube\.com|youtu\.be)/.test(u), { message: 'Must be a valid YouTube URL' }),
    projectId: z.string().regex(objectIdRegex),
    folderId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const updateContentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    folderId: z.string().regex(objectIdRegex).nullable().optional(),
  }),
});

export const reprocessContentSchema = z.object({
  body: z.object({
    stage: z.enum(['transcribe', 'notes', 'flashcards', 'quiz', 'embeddings', 'all']),
  }),
});

export const shareContentSchema = z.object({
  body: z.object({
    permissions: z.enum(['view', 'fork']),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
});

export const listContentQuerySchema = z.object({
  query: z.object({
    projectId: z.string().regex(objectIdRegex).optional(),
    folderId: z.string().regex(objectIdRegex).optional(),
    cursor: z.string().regex(objectIdRegex).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type UploadContentBody = z.infer<typeof uploadContentSchema>['body'];
export type YoutubeIngestBody = z.infer<typeof youtubeIngestSchema>['body'];
export type UpdateContentBody = z.infer<typeof updateContentSchema>['body'];
export type ReprocessContentBody = z.infer<typeof reprocessContentSchema>['body'];
export type ShareContentBody = z.infer<typeof shareContentSchema>['body'];
