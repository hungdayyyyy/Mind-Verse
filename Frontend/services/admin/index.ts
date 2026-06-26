import { baseQuery } from '@/lib/api/baseQuery'
import { AdminStats, AdminUserListItem, AdminUpdateUserInput, AdminContentItem } from '@/types/admin'
import { PaginatedResponse } from '@/types/shared'

export const adminService = {
  getStats: () => baseQuery.get<AdminStats>('/admin/stats'),

  getUsers: (page = 1, limit = 20, search?: string, plan?: string) =>
    baseQuery.get<PaginatedResponse<AdminUserListItem>>('/admin/users', {
      params: { page, limit, search, plan },
    }),
  getUserById: (id: string) => baseQuery.get<AdminUserListItem>(`/admin/users/${id}`),
  updateUser: (id: string, data: AdminUpdateUserInput) =>
    baseQuery.patch<AdminUserListItem>(`/admin/users/${id}`, data),
  blockUser: (id: string) => baseQuery.post<void>(`/admin/users/${id}/block`),
  unblockUser: (id: string) => baseQuery.post<void>(`/admin/users/${id}/unblock`),
  deleteUser: (id: string) => baseQuery.delete<void>(`/admin/users/${id}`),

  getContent: (page = 1, limit = 20, search?: string) =>
    baseQuery.get<PaginatedResponse<AdminContentItem>>('/admin/content', {
      params: { page, limit, search },
    }),
  deleteContent: (id: string) => baseQuery.delete<void>(`/admin/content/${id}`),

  getPlanRevenue: () =>
    baseQuery.get<{ plan: string; count: number; revenue: number }[]>('/admin/revenue'),
}
