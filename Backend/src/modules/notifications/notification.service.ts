import { Notification, NotificationDocument, NotificationType } from './notification.model';
import { User } from '@modules/users/user.model';
import { paginate, PaginatedResult } from '@shared/utils/paginate';
import { emitToUser } from '@config/socket';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { NotFoundError } from '@shared/errors';

export const notificationService = {
  async list(userId: string, opts: { cursor?: string; limit?: number; unreadOnly?: boolean }): Promise<
    PaginatedResult<NotificationDocument> & { unreadCount: number }
  > {
    const filter: Record<string, unknown> = { userId };
    if (opts.unreadOnly) filter.isRead = false;

    const [result, unreadCount] = await Promise.all([
      paginate(Notification, filter, { cursor: opts.cursor, limit: opts.limit }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return { ...result, unreadCount };
  },

  /**
   * Creates a notification and pushes it over Socket.io to any connected
   * clients for the user, so the notification bell badge updates instantly
   * without a page refresh.
   */
  async create(userId: string, type: NotificationType, title: string, body: string, data: Record<string, unknown> = {}): Promise<NotificationDocument> {
    const notification = await Notification.create({ userId, type, title, body, data });
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, {
      id: notification._id.toString(),
      type,
      title,
      body,
      data,
      createdAt: notification.createdAt,
    });
    return notification;
  },

  async markRead(notificationId: string, userId: string): Promise<NotificationDocument> {
    const notification = await Notification.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true }, { new: true });
    if (!notification) throw new NotFoundError('Notification');
    return notification;
  },

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  },

  async delete(notificationId: string, userId: string): Promise<void> {
    await Notification.deleteOne({ _id: notificationId, userId });
  },

  /** FR-079: updates a user's notification channel preferences. */
  async updatePreferences(
    userId: string,
    prefs: Partial<{ srsReminders: boolean; emailNotifications: boolean; shareInvites: boolean }>
  ): Promise<void> {
    const updates: Record<string, boolean> = {};
    if (prefs.srsReminders !== undefined) updates['settings.notifications.srsReminders'] = prefs.srsReminders;
    if (prefs.emailNotifications !== undefined) updates['settings.notifications.emailNotifications'] = prefs.emailNotifications;
    if (prefs.shareInvites !== undefined) updates['settings.notifications.shareInvites'] = prefs.shareInvites;

    await User.updateOne({ _id: userId }, { $set: updates });
  },
};
