import { ApiError } from '@/types/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('lw_token')
}
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  token ? localStorage.setItem('lw_token', token) : localStorage.removeItem('lw_token')
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('lw_refresh')
}
export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return
  token ? localStorage.setItem('lw_refresh', token) : localStorage.removeItem('lw_refresh')
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setToken(data.data?.token || data.token)
    return true
  } catch { return false }
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions,
  retry = true
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`)
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url.toString(), {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  })

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(method, endpoint, body, options, false)
    setToken(null); setRefreshToken(null)
    if (typeof window !== 'undefined') window.location.href = '/sign-in'
    throw { message: 'Session expired', code: 'UNAUTHORIZED', status: 401 } as ApiError
  }

  const json = await res.json()
  if (!res.ok) {
    throw { message: json.message || 'Something went wrong', code: json.code || `HTTP_${res.status}`, status: res.status } as ApiError
  }
  return (json.data ?? json) as T
}

export async function uploadRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: formData })
  const json = await res.json()
  if (!res.ok) throw { message: json.message, code: json.code, status: res.status } as ApiError
  return (json.data ?? json) as T
}

export const baseQuery = {
  get: <T>(ep: string, opts?: RequestOptions) => request<T>('GET', ep, undefined, opts),
  post: <T>(ep: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', ep, body, opts),
  put: <T>(ep: string, body?: unknown) => request<T>('PUT', ep, body),
  patch: <T>(ep: string, body?: unknown) => request<T>('PATCH', ep, body),
  delete: <T>(ep: string) => request<T>('DELETE', ep),
  upload: uploadRequest,
}
