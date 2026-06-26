'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, updateUser, isAdmin, isPremium } = useAuthStore()
  const router = useRouter(); const qc = useQueryClient()

  const sessionQ = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authService.getSession,
    enabled: !isAuthenticated,
    retry: false, staleTime: 5 * 60_000,
  })

  const signInM = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signIn(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken)
      router.push(data.user.role === 'admin' || data.user.role === 'superadmin' ? '/admin' : '/dashboard')
    },
  })

  const signUpM = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authService.signUp(email, password, name),
    onSuccess: (data) => { setAuth(data.user, data.token, data.refreshToken); router.push('/dashboard') },
  })

  const logoutM = useMutation({
    mutationFn: authService.logout,
    onSettled: () => { clearAuth(); qc.clear(); router.push('/sign-in') },
  })

  const updateProfileM = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data) => updateUser(data),
  })

  return {
    user: user ?? sessionQ.data?.user ?? null,
    isAuthenticated, isLoading: sessionQ.isLoading,
    isAdmin: isAdmin(), isPremium: isPremium(),
    signIn: signInM.mutateAsync, signUp: signUpM.mutateAsync,
    logout: logoutM.mutate, updateProfile: updateProfileM.mutateAsync,
    signInError: signInM.error, isPending: signInM.isPending || signUpM.isPending,
  }
}
