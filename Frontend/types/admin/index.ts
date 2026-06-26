import { User, UserPlan } from '../auth'

export interface AdminUserListItem extends User {
  totalStorage: number
  lastActiveAt: string
  isBlocked: boolean
}

export interface AdminStats {
  totalUsers: number
  activeUsersToday: number
  activeUsersWeek: number
  totalContent: number
  totalStorageGB: number
  revenueMonthly: number
  planBreakdown: Record<UserPlan, number>
  signupsThisWeek: { date: string; count: number }[]
  contentUploadsThisWeek: { date: string; count: number }[]
}

export interface AdminUpdateUserInput {
  role?: string
  plan?: UserPlan
  planExpiresAt?: string
  isBlocked?: boolean
}

export interface AdminContentItem {
  id: string
  title: string
  type: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  fileSize?: number
  processingStatus: string
  createdAt: string
  isPublic: boolean
}
