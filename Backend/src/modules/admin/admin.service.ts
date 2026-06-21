import { Types, FilterQuery } from 'mongoose';
import { User } from '@modules/users/user.model';
import { UserDocument, AdminUserView } from '@modules/users/user.types';
import { AdminAuditLog } from './adminAuditLog.model';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { config } from '@config/index';
import { logger } from '@config/logger';
import { paginate, PaginatedResult } from '@shared/utils/paginate';
import { AdminUserListFilters, AdminDashboardMetrics } from './admin.types';
import { SystemRole, Plan } from '@shared/types';

function toAdminView(user: UserDocument): AdminUserView {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    plan: user.plan,
    systemRole: user.systemRole,
    settings: user.settings,
    stats: user.stats,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    accountStatus: user.accountStatus,
    moderationNote: user.moderationNote,
    stripeCustomerId: user.stripeCustomerId,
    subscriptionStatus: user.subscriptionStatus,
    lastLoginAt: user.lastLoginAt,
    deletedAt: user.deletedAt,
  };
}

async function writeAuditLog(
  actor: UserDocument,
  action: 'user.plan_changed' | 'user.role_changed' | 'user.suspended' | 'user.banned' | 'user.reactivated' | 'user.password_reset_forced' | 'user.deleted',
  targetUserId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  await AdminAuditLog.create({
    actorId: actor._id,
    actorEmail: actor.email,
    action,
    targetUserId: targetUserId ? new Types.ObjectId(targetUserId) : null,
    details,
  });
}

export const adminService = {
  /**
   * Lists users for the admin dashboard with optional search/filter and
   * cursor pagination. Available to `support` role and above (read-only).
   *
   * Note: unlike self-service queries elsewhere in the app, admin lookups
   * deliberately do NOT filter out soft-deleted users (`deletedAt`) by
   * default — admins need visibility into deleted accounts for support
   * investigations and compliance. Pass `accountStatus`/other filters
   * explicitly if a narrower view is needed.
   */
  async listUsers(filters: AdminUserListFilters): Promise<PaginatedResult<UserDocument>> {
    const filter: FilterQuery<UserDocument> = {};

    if (filters.search) {
      const regex = new RegExp(filters.search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (filters.plan) filter.plan = filters.plan;
    if (filters.systemRole) filter.systemRole = filters.systemRole;
    if (filters.accountStatus) filter.accountStatus = filters.accountStatus;

    return paginate(User, filter, { cursor: filters.cursor, limit: filters.limit });
  },

  async getUserById(userId: string): Promise<AdminUserView> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');
    return toAdminView(user);
  },

  /**
   * Changes a user's subscription plan tier (free/pro/premium). This is an
   * administrative override distinct from the Stripe-driven billing flow —
   * useful for comping accounts, support remediation, or enterprise deals
   * handled outside self-serve checkout.
   *
   * @throws ForbiddenError if the actor is below the `admin` system role.
   */
  async changePlan(actor: UserDocument, targetUserId: string, newPlan: Plan, reason?: string): Promise<AdminUserView> {
    this.requireAtLeast(actor, 'admin');

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    const previousPlan = target.plan;
    target.plan = newPlan;
    await target.save();

    await writeAuditLog(actor, 'user.plan_changed', targetUserId, { previousPlan, newPlan, reason });
    logger.info('Admin changed user plan', { actorId: actor.id, targetUserId, previousPlan, newPlan });

    return toAdminView(target);
  },

  /**
   * Changes a user's system-wide role (user/support/admin/super_admin).
   * This is the most sensitive admin action and is restricted to
   * `super_admin` accounts only — `admin` accounts cannot promote or demote
   * other admins, preventing privilege escalation by a compromised admin
   * account.
   *
   * @throws ForbiddenError if the actor is not a super_admin, or if the
   *   actor attempts to modify their own role (prevents accidental or
   *   malicious self-demotion/lockout).
   */
  async changeSystemRole(actor: UserDocument, targetUserId: string, newRole: SystemRole, reason?: string): Promise<AdminUserView> {
    this.requireAtLeast(actor, 'super_admin');

    if (actor._id.toString() === targetUserId) {
      throw new ForbiddenError('You cannot change your own system role.');
    }

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    const previousRole = target.systemRole;
    target.systemRole = newRole;
    await target.save();

    await writeAuditLog(actor, 'user.role_changed', targetUserId, { previousRole, newRole, reason });
    logger.warn('Admin changed user system role', { actorId: actor.id, targetUserId, previousRole, newRole });

    return toAdminView(target);
  },

  /**
   * Suspends a user account (UC-style moderation action). Suspended users
   * are blocked at the auth middleware layer (see auth.middleware.ts) but
   * their data is preserved — distinct from a ban, which is intended to be
   * more permanent.
   *
   * @throws ForbiddenError if the actor is below `admin`, or if the target
   *   is an admin/super_admin (admins cannot be suspended by other admins —
   *   only a super_admin can demote them first, then suspend).
   */
  async suspendUser(actor: UserDocument, targetUserId: string, reason: string, durationDays?: number): Promise<AdminUserView> {
    this.requireAtLeast(actor, 'admin');

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    this.assertActorOutranksTarget(actor, target);

    target.accountStatus = 'suspended';
    target.moderationNote = reason;
    await target.save();

    await writeAuditLog(actor, 'user.suspended', targetUserId, { reason, durationDays });
    logger.warn('Admin suspended user', { actorId: actor.id, targetUserId, reason });

    return toAdminView(target);
  },

  /**
   * Permanently bans a user account. More severe than suspension — intended
   * for ToS violations, abuse, or fraud. Also restricted to `admin`+ and
   * subject to the same outranking rule as suspension.
   */
  async banUser(actor: UserDocument, targetUserId: string, reason: string): Promise<AdminUserView> {
    this.requireAtLeast(actor, 'admin');

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    this.assertActorOutranksTarget(actor, target);

    target.accountStatus = 'banned';
    target.moderationNote = reason;
    await target.save();

    // Invalidate any active session immediately.
    await User.updateOne({ _id: targetUserId }, { $unset: { refreshTokenHash: '', refreshTokenExpires: '' } });

    await writeAuditLog(actor, 'user.banned', targetUserId, { reason });
    logger.warn('Admin banned user', { actorId: actor.id, targetUserId, reason });

    return toAdminView(target);
  },

  /** Lifts a suspension or ban, restoring the account to active status. */
  async reactivateUser(actor: UserDocument, targetUserId: string): Promise<AdminUserView> {
    this.requireAtLeast(actor, 'admin');

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    const previousStatus = target.accountStatus;
    target.accountStatus = 'active';
    target.moderationNote = null;
    await target.save();

    await writeAuditLog(actor, 'user.reactivated', targetUserId, { previousStatus });
    logger.info('Admin reactivated user', { actorId: actor.id, targetUserId });

    return toAdminView(target);
  },

  /**
   * Forces a password reset for a user (support remediation flow — e.g.,
   * the user reports their email is compromised). Invalidates all existing
   * sessions and triggers the standard forgot-password email flow.
   */
  async forcePasswordReset(actor: UserDocument, targetUserId: string): Promise<void> {
    this.requireAtLeast(actor, 'support');

    const target = await User.findById(targetUserId);
    if (!target) throw new NotFoundError('User');

    await User.updateOne({ _id: targetUserId }, { $unset: { refreshTokenHash: '', refreshTokenExpires: '' } });

    const { authService } = await import('@modules/auth/auth.service');
    await authService.forgotPassword(target.email);

    await writeAuditLog(actor, 'user.password_reset_forced', targetUserId, {});
    logger.info('Admin forced password reset', { actorId: actor.id, targetUserId });
  },

  /** Platform-wide metrics for the admin dashboard overview. */
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const [
      totalUsers,
      freeCount,
      proCount,
      premiumCount,
      activeCount,
      suspendedCount,
      bannedCount,
      newLast7,
      newLast30,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ plan: 'free', deletedAt: null }),
      User.countDocuments({ plan: 'pro', deletedAt: null }),
      User.countDocuments({ plan: 'premium', deletedAt: null }),
      User.countDocuments({ accountStatus: 'active', deletedAt: null }),
      User.countDocuments({ accountStatus: 'suspended', deletedAt: null }),
      User.countDocuments({ accountStatus: 'banned', deletedAt: null }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    ]);

    // Lazy imports to avoid circular module dependencies at load time.
    const { ContentItem } = await import('@modules/content/content.model');
    const { Project } = await import('@modules/projects/project.model');
    const { StudyRoom } = await import('@modules/study-rooms/studyRoom.model');

    const [totalContentItems, processingFailures24h, totalProjects, activeStudyRooms] = await Promise.all([
      ContentItem.countDocuments({ deletedAt: null }),
      ContentItem.countDocuments({
        processingStatus: 'failed',
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Project.countDocuments({ deletedAt: null }),
      StudyRoom.countDocuments({ isActive: true }),
    ]);

    return {
      totalUsers,
      usersByPlan: { free: freeCount, pro: proCount, premium: premiumCount },
      usersByStatus: { active: activeCount, suspended: suspendedCount, banned: bannedCount },
      newUsersLast7Days: newLast7,
      newUsersLast30Days: newLast30,
      totalContentItems,
      contentProcessingFailuresLast24h: processingFailures24h,
      totalProjects,
      activeStudyRoomsNow: activeStudyRooms,
    };
  },

  async getAuditLog(filters: {
    targetUserId?: string;
    actorId?: string;
    action?: string;
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResult<InstanceType<typeof AdminAuditLog>>> {
    const filter: Record<string, unknown> = {};
    if (filters.targetUserId) filter.targetUserId = filters.targetUserId;
    if (filters.actorId) filter.actorId = filters.actorId;
    if (filters.action) filter.action = filters.action;

    return paginate(AdminAuditLog, filter, { cursor: filters.cursor, limit: filters.limit });
  },

  /** Throws ForbiddenError unless the actor's system role meets or exceeds minRole. */
  requireAtLeast(actor: UserDocument, minRole: SystemRole): void {
    if (config.systemRoleRank[actor.systemRole] < config.systemRoleRank[minRole]) {
      throw new ForbiddenError(`This action requires the ${minRole} role or higher`);
    }
  },

  /**
   * Prevents an `admin` from moderating (suspend/ban) another `admin` or a
   * `super_admin`. Only a `super_admin` may act on admin-tier accounts,
   * and even then, self-action is blocked separately where relevant.
   */
  assertActorOutranksTarget(actor: UserDocument, target: UserDocument): void {
    if (config.systemRoleRank[target.systemRole] >= config.systemRoleRank.admin) {
      if (config.systemRoleRank[actor.systemRole] <= config.systemRoleRank[target.systemRole]) {
        throw new ForbiddenError('You do not have sufficient privileges to moderate this account.');
      }
    }
  },
};

export { toAdminView };
