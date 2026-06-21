import { adminService } from '@modules/admin/admin.service';
import { AdminAuditLog } from '@modules/admin/adminAuditLog.model';
import { User } from '@modules/users/user.model';
import { createTestUser, createAdmin, createSuperAdmin } from '../fixtures/userFactory';

describe('adminService — system role hierarchy and moderation guardrails', () => {
  describe('changePlan', () => {
    it('allows an admin to change a user plan to premium', async () => {
      const admin = await createAdmin();
      const target = await createTestUser({ plan: 'free' });

      const result = await adminService.changePlan(admin, target._id.toString(), 'premium', 'comped account');

      expect(result.plan).toBe('premium');

      const log = await AdminAuditLog.findOne({ targetUserId: target._id });
      expect(log?.action).toBe('user.plan_changed');
      expect(log?.details.newPlan).toBe('premium');
    });

    it('rejects a plain user attempting to change plans', async () => {
      const regularUser = await createTestUser({ systemRole: 'user' });
      const target = await createTestUser();

      await expect(adminService.changePlan(regularUser, target._id.toString(), 'pro')).rejects.toThrow(/admin role or higher/);
    });

    it('rejects a support-role user attempting to change plans (read-only tier)', async () => {
      const support = await createTestUser({ systemRole: 'support' });
      const target = await createTestUser();

      await expect(adminService.changePlan(support, target._id.toString(), 'pro')).rejects.toThrow(/admin role or higher/);
    });
  });

  describe('changeSystemRole', () => {
    it('allows a super_admin to promote a user to admin', async () => {
      const superAdmin = await createSuperAdmin();
      const target = await createTestUser();

      const result = await adminService.changeSystemRole(superAdmin, target._id.toString(), 'admin', 'new hire');

      expect(result.systemRole).toBe('admin');
    });

    it('rejects an admin (not super_admin) attempting to change roles', async () => {
      const admin = await createAdmin();
      const target = await createTestUser();

      await expect(adminService.changeSystemRole(admin, target._id.toString(), 'admin')).rejects.toThrow(/super_admin role or higher/);
    });

    it('prevents a super_admin from changing their own role (lockout protection)', async () => {
      const superAdmin = await createSuperAdmin();

      await expect(adminService.changeSystemRole(superAdmin, superAdmin._id.toString(), 'user')).rejects.toThrow(
        /cannot change your own system role/
      );
    });
  });

  describe('suspendUser / banUser — outranking guardrail', () => {
    it('allows an admin to suspend a regular user', async () => {
      const admin = await createAdmin();
      const target = await createTestUser();

      const result = await adminService.suspendUser(admin, target._id.toString(), 'ToS violation');

      expect(result.accountStatus).toBe('suspended');
      expect(result.moderationNote).toBe('ToS violation');
    });

    it('prevents one admin from suspending another admin', async () => {
      const adminA = await createAdmin();
      const adminB = await createAdmin();

      await expect(adminService.suspendUser(adminA, adminB._id.toString(), 'test')).rejects.toThrow(
        /sufficient privileges/
      );
    });

    it('allows a super_admin to suspend a regular admin', async () => {
      const superAdmin = await createSuperAdmin();
      const admin = await createAdmin();

      const result = await adminService.suspendUser(superAdmin, admin._id.toString(), 'policy violation');
      expect(result.accountStatus).toBe('suspended');
    });

    it('bans a user and clears their refresh token for immediate logout', async () => {
      const admin = await createAdmin();
      const target = await createTestUser();
      await User.updateOne(
        { _id: target._id },
        // @ts-expect-error dynamic field not in strict type, same pattern as auth.service.ts
        { refreshTokenHash: 'somehash', refreshTokenExpires: new Date(Date.now() + 100000) }
      );

      const result = await adminService.banUser(admin, target._id.toString(), 'fraud');
      expect(result.accountStatus).toBe('banned');

      const refreshed = await User.findById(target._id);
      // @ts-expect-error same as above
      expect(refreshed?.refreshTokenHash).toBeUndefined();
    });
  });

  describe('reactivateUser', () => {
    it('restores a suspended account to active and clears the moderation note', async () => {
      const admin = await createAdmin();
      const target = await createTestUser();
      await adminService.suspendUser(admin, target._id.toString(), 'temp suspension');

      const result = await adminService.reactivateUser(admin, target._id.toString());

      expect(result.accountStatus).toBe('active');
      expect(result.moderationNote).toBeNull();
    });
  });

  describe('getDashboardMetrics', () => {
    it('returns accurate counts broken down by plan and status', async () => {
      await createTestUser({ plan: 'free' });
      await createTestUser({ plan: 'pro' });
      await createTestUser({ plan: 'premium' });

      const metrics = await adminService.getDashboardMetrics();

      expect(metrics.totalUsers).toBe(3);
      expect(metrics.usersByPlan.free).toBe(1);
      expect(metrics.usersByPlan.pro).toBe(1);
      expect(metrics.usersByPlan.premium).toBe(1);
      expect(metrics.usersByStatus.active).toBe(3);
    });
  });
});
