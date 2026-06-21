import { z } from 'zod';

export const noteBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['h1', 'h2', 'h3', 'bullet', 'numbered', 'callout', 'quote', 'keyterm', 'code', 'divider', 'summary']),
  content: z.string(),
  metadata: z
    .object({
      calloutType: z.enum(['info', 'warning', 'tip', 'danger']).optional(),
      language: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
});

export const updateNotesSchema = z.object({
  body: z.object({
    blocks: z.array(noteBlockSchema),
  }),
});

export type UpdateNotesBody = z.infer<typeof updateNotesSchema>['body'];
export type NoteBlockInput = z.infer<typeof noteBlockSchema>;
