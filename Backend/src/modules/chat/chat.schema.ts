import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(5000),
    sessionId: z.string().regex(objectIdRegex).optional(),
    contentItemId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const renameSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
  }),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>['body'];
export type RenameSessionBody = z.infer<typeof renameSessionSchema>['body'];
