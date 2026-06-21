import { Router } from 'express';
import { authenticate, requireSystemRole } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  listUsersQuerySchema,
  changePlanSchema,
  changeSystemRoleSchema,
  suspendUserSchema,
  banUserSchema,
  adminAuditLogQuerySchema,
} from './admin.schema';
import {
  listUsers,
  getUser,
  getDashboardMetrics,
  changePlan,
  changeSystemRole,
  suspendUser,
  banUser,
  reactivateUser,
  forcePasswordReset,
  getAuditLog,
} from './admin.controller';

const router = Router();

router.use(authenticate);

// --- Read-only: support role and above -------------------------------------
router.get('/users', requireSystemRole('support'), validate(listUsersQuerySchema), listUsers);
router.get('/users/:id', requireSystemRole('support'), getUser);
router.get('/dashboard', requireSystemRole('support'), getDashboardMetrics);
router.get('/audit-log', requireSystemRole('support'), validate(adminAuditLogQuerySchema), getAuditLog);
router.post('/users/:id/force-password-reset', requireSystemRole('support'), forcePasswordReset);

// --- Moderation + billing overrides: admin role and above ------------------
router.patch('/users/:id/plan', requireSystemRole('admin'), validate(changePlanSchema), changePlan);
router.post('/users/:id/suspend', requireSystemRole('admin'), validate(suspendUserSchema), suspendUser);
router.post('/users/:id/ban', requireSystemRole('admin'), validate(banUserSchema), banUser);
router.post('/users/:id/reactivate', requireSystemRole('admin'), reactivateUser);

// --- Role management: super_admin only --------------------------------------
// Changing a user's system role is the most sensitive admin action (it can
// grant or revoke admin access itself), so it's restricted one level above
// ordinary moderation. See admin.service.ts#changeSystemRole for the
// additional self-modification guard.
router.patch('/users/:id/system-role', requireSystemRole('super_admin'), validate(changeSystemRoleSchema), changeSystemRole);

export { router as adminRouter };
