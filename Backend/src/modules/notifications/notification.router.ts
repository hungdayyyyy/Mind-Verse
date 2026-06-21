import { z } from 'zod';
import { Router, Request, Response } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { notificationService } from './notification.service';

const objectIdRegex = /^[a-f\d]{24}$/i;

const listNotificationsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().regex(objectIdRegex).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    unreadOnly: z.coerce.boolean().optional(),
  }),
});

const updatePreferencesSchema = z.object({
  body: z.object({
    srsReminders: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    shareInvites: z.boolean().optional(),
  }),
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { cursor, limit, unreadOnly } = req.query as { cursor?: string; limit?: string; unreadOnly?: string };
  const result = await notificationService.list(req.user!.id, {
    cursor,
    limit: limit ? Number(limit) : undefined,
    unreadOnly: unreadOnly === 'true',
  });
  res.json({ data: result.data, unreadCount: result.unreadCount, nextCursor: result.nextCursor });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.json({ data: { success: true } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markRead(req.params.id, req.user!.id);
  res.json({ data: notification });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.delete(req.params.id, req.user!.id);
  res.json({ data: { success: true } });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.updatePreferences(req.user!.id, req.body);
  res.json({ data: { success: true } });
});

const router = Router();
router.use(authenticate);

router.get('/', validate(listNotificationsQuerySchema), listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);
router.patch('/preferences', validate(updatePreferencesSchema), updatePreferences);

export { router as notificationRouter };
