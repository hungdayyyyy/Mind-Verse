import { User } from './user.model';
import { UserDocument, UserSettings } from './user.types';
import { NotFoundError } from '@shared/errors';
import { logger } from '@config/logger';

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  settings?: Partial<UserSettings>;
}

export const userService = {
  /**
   * Finds an active (non-deleted) user by id.
   * @throws NotFoundError if the user doesn't exist or has been soft-deleted.
   */
  async findById(userId: string): Promise<UserDocument> {
    const user = await User.findOne({ _id: userId, deletedAt: null });
    if (!user) throw new NotFoundError('User');
    return user;
  },

  /**
   * Updates a user's profile fields and/or settings. Settings are merged
   * shallowly at the top level and deep-merged for the nested `notifications` object.
   */
  async updateProfile(userId: string, input: UpdateUserInput): Promise<UserDocument> {
    const user = await this.findById(userId);

    if (input.name !== undefined) user.name = input.name;
    if (input.avatar !== undefined) user.avatar = input.avatar;

    if (input.settings) {
      user.settings = {
        ...user.settings,
        ...input.settings,
        notifications: {
          ...user.settings.notifications,
          ...(input.settings.notifications ?? {}),
        },
      };
    }

    await user.save();
    logger.info('User profile updated', { userId });
    return user;
  },

  /** Returns the lightweight stats object used by the dashboard header. */
  async getStats(userId: string): Promise<UserDocument['stats'] & { totalContentProcessed: number }> {
    const user = await this.findById(userId);
    // Lazy import to avoid a circular dependency between users <-> content modules.
    const { ContentItem } = await import('@modules/content/content.model');
    const totalContentProcessed = await ContentItem.countDocuments({
      ownerId: user._id,
      processingStatus: 'completed',
      deletedAt: null,
    });
    return { ...user.stats, totalContentProcessed };
  },

  /**
   * Marks a user's account for deletion. We soft-delete immediately so the
   * account becomes inaccessible right away; a nightly cron job performs the
   * actual GDPR-compliant data purge after the 30-day grace period.
   */
  async requestAccountDeletion(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.deletedAt = new Date();
    await user.save();
    logger.info('Account deletion requested', { userId });
  },
};
