import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types/auth'
import { setToken, setRefreshToken } from '@/lib/api/baseQuery'
import { isAdmin } from '@/lib/auth/rbac'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken?: string) => void
  clearAuth: () => void
  updateUser: (u: Partial<User>) => void
  isAdmin: () => boolean
  isPremium: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null, token: null, isAuthenticated: false,
      setAuth: (user, token, refreshToken) => {
        setToken(token)
        if (refreshToken) setRefreshToken(refreshToken)
        set({ user, token, isAuthenticated: true })
      },
      clearAuth: () => {
        setToken(null); setRefreshToken(null)
        set({ user: null, token: null, isAuthenticated: false })
      },
      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      isAdmin: () => {
        const role = get().user?.role
        return role ? isAdmin(role) : false
      },
      isPremium: () => {
        const plan = get().user?.plan
        return plan === 'premium' || plan === 'enterprise'
      },
    }),
    {
      name: 'lw-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
