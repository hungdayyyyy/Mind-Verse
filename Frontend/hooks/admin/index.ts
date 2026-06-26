'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import { AdminUpdateUserInput } from '@/types/admin'

export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: adminService.getStats, staleTime: 60_000 })
}

export function useAdminUsers(page = 1, search?: string, plan?: string) {
  return useQuery({
    queryKey: ['admin', 'users', page, search, plan],
    queryFn: () => adminService.getUsers(page, 20, search, plan),
    staleTime: 30_000,
  })
}

export function useAdminUserActions() {
  const qc = useQueryClient()
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  const updateM = useMutation({ mutationFn: ({ id, data }: { id: string; data: AdminUpdateUserInput }) => adminService.updateUser(id, data), onSuccess: inv })
  const blockM = useMutation({ mutationFn: adminService.blockUser, onSuccess: inv })
  const unblockM = useMutation({ mutationFn: adminService.unblockUser, onSuccess: inv })
  const deleteM = useMutation({ mutationFn: adminService.deleteUser, onSuccess: inv })
  return { updateUser: updateM.mutateAsync, blockUser: blockM.mutate, unblockUser: unblockM.mutate, deleteUser: deleteM.mutate }
}

export function useAdminContent(page = 1, search?: string) {
  return useQuery({ queryKey: ['admin', 'content', page, search], queryFn: () => adminService.getContent(page, 20, search) })
}
