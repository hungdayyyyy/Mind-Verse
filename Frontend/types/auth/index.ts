export type UserRole = 'user' | 'premium' | 'enterprise' | 'admin' | 'superadmin'
export type UserPlan = 'free' | 'premium' | 'enterprise'
export type PlanStatus = 'active' | 'expired' | 'cancelled' | 'trial'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  plan: UserPlan
  planStatus: PlanStatus
  planExpiresAt?: string
  stats?: UserStats
  settings?: UserSettings
  createdAt: string
  updatedAt: string
}

export interface UserStats {
  streak: number
  totalStudyTimeMinutes: number
  lastStudyDate?: string
  totalItemsCreated: number
  flashcardsReviewed: number
  quizzesCompleted: number
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    srsReminder: boolean
    weeklyReport: boolean
    sharedContent: boolean
  }
  dailyGoalMinutes: number
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface Session {
  user: User
  token: string
}

export const PLAN_LIMITS: Record<UserPlan, { maxProjects: number; maxStorage: number; maxMonthlyUploads: number; features: string[] }> = {
  free:       { maxProjects: 3, maxStorage: 500,    maxMonthlyUploads: 10,  features: ['notes', 'flashcards'] },
  premium:    { maxProjects: 20, maxStorage: 10000, maxMonthlyUploads: 100, features: ['notes', 'flashcards', 'quiz', 'mindmap', 'ai_chat', 'analytics'] },
  enterprise: { maxProjects: -1, maxStorage: -1,    maxMonthlyUploads: -1,  features: ['all'] },
}
