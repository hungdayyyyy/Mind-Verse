import { UserRole, UserPlan, PLAN_LIMITS } from '@/types/auth'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0, premium: 1, enterprise: 2, admin: 3, superadmin: 4,
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function isAdmin(role: UserRole): boolean {
  return hasRole(role, 'admin')
}

export function canAccess(plan: UserPlan, feature: string): boolean {
  const limits = PLAN_LIMITS[plan]
  return limits.features.includes('all') || limits.features.includes(feature)
}

export function canUpload(plan: UserPlan, currentMonthlyUploads: number): boolean {
  const limit = PLAN_LIMITS[plan].maxMonthlyUploads
  return limit === -1 || currentMonthlyUploads < limit
}

export function canCreateProject(plan: UserPlan, currentProjectCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxProjects
  return limit === -1 || currentProjectCount < limit
}
