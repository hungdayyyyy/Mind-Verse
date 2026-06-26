import { baseQuery, setToken, setRefreshToken } from '@/lib/api/baseQuery'
import { AuthResponse, Session, User } from '@/types/auth'

export const authService = {
  signUp: (email: string, password: string, name: string) =>
    baseQuery.post<AuthResponse>('/auth/register', { email, password, name }),

  signIn: (email: string, password: string) =>
    baseQuery.post<AuthResponse>('/auth/login', { email, password }),

  googleAuth: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`
  },

  logout: () => baseQuery.post<void>('/auth/logout'),

  getSession: () => baseQuery.get<Session>('/auth/session'),

  refreshToken: () => baseQuery.post<{ token: string }>('/auth/refresh'),

  forgotPassword: (email: string) =>
    baseQuery.post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    baseQuery.post<void>('/auth/reset-password', { token, password }),

  updateProfile: (data: Partial<Pick<User, 'name' | 'avatar' | 'settings'>>) =>
    baseQuery.patch<User>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    baseQuery.post<void>('/auth/change-password', { currentPassword, newPassword }),
}
