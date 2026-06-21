import { AdminUserView } from '@modules/users/user.types';
import { SystemRole, Plan, AccountStatus } from '@shared/types';

export interface AdminUserListFilters {
  search?: string; // matches name/email (case-insensitive, partial)
  plan?: Plan;
  systemRole?: SystemRole;
  accountStatus?: AccountStatus;
  cursor?: string;
  limit?: number;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  usersByPlan: Record<Plan, number>;
  usersByStatus: Record<AccountStatus, number>;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalContentItems: number;
  contentProcessingFailuresLast24h: number;
  totalProjects: number;
  activeStudyRoomsNow: number;
}

export interface AdminAuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetUserId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

export type { AdminUserView };
