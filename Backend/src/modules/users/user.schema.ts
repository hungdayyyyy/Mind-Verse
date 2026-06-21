import { z } from 'zod';

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    avatar: z.string().url().optional(),
    settings: z
      .object({
        language: z.string().optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        timezone: z.string().optional(),
        notifications: z
          .object({
            srsReminders: z.boolean().optional(),
            emailNotifications: z.boolean().optional(),
            shareInvites: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>['body'];
