import { Types } from 'mongoose';

/** A MongoDB ObjectId, represented as a hex string at the API boundary. */
export type ObjectIdString = string;

/** Standard envelope for successful API responses. */
export interface ApiResponse<T> {
  data: T;
  nextCursor?: string | null;
}

/** Standard envelope for error responses (see error.middleware.ts). */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/** Project member roles, used throughout RBAC checks. */
export type ProjectRole = 'owner' | 'editor' | 'viewer';

/**
 * System-wide account role — distinct from `ProjectRole` (which only scopes
 * permissions *within a single project*). `SystemRole` controls access to
 * platform-wide capabilities: the admin dashboard, user management,
 * moderation, feature flags, and billing overrides.
 *
 *   - user:        normal end user (default for everyone on signup)
 *   - support:     can view (but not destructively modify) user accounts and
 *                  content for customer-support purposes; cannot change roles,
 *                  issue refunds, or access system metrics
 *   - admin:       full administrative access — user management (ban/suspend/
 *                  reset/change plan), content moderation, system metrics,
 *                  feature flags. Cannot manage other admins' roles.
 *   - super_admin: everything admin can do, plus managing other admins'
 *                  system roles. Reserved for founder/ops accounts.
 */
export type SystemRole = 'user' | 'support' | 'admin' | 'super_admin';

/**
 * Subscription plan tiers.
 *   - free:    default tier, subject to plan limits in config.plans.free
 *   - pro:     individual paid tier (Stripe-billed), see config.plans.pro
 *   - premium: top-tier plan with the highest limits/earliest feature access
 *              (e.g., team seats, priority AI processing queue). Distinct
 *              from `pro` so pricing/marketing can introduce a premium tier
 *              without restructuring the free/pro boundary already encoded
 *              throughout the codebase.
 */
export type Plan = 'free' | 'pro' | 'premium';

/** Account status — used by admin moderation actions (ban/suspend/reactivate). */
export type AccountStatus = 'active' | 'suspended' | 'banned';

/** Generic processing stage status used across the content pipeline. */
export type JobStageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/** Helper to safely cast a string to a Mongoose ObjectId. */
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
