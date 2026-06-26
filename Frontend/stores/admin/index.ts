import { create } from 'zustand'

interface AdminStore {
  selectedUserIds: string[]
  userFilter: { plan?: string; role?: string; search?: string }
  toggleSelectUser: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setFilter: (f: Partial<AdminStore['userFilter']>) => void
}

export const useAdminStore = create<AdminStore>((set) => ({
  selectedUserIds: [], userFilter: {},
  toggleSelectUser: (id) =>
    set((s) => ({
      selectedUserIds: s.selectedUserIds.includes(id)
        ? s.selectedUserIds.filter((x) => x !== id)
        : [...s.selectedUserIds, id],
    })),
  selectAll: (ids) => set({ selectedUserIds: ids }),
  clearSelection: () => set({ selectedUserIds: [] }),
  setFilter: (f) => set((s) => ({ userFilter: { ...s.userFilter, ...f } })),
}))
