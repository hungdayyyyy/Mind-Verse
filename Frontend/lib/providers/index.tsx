'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (count, err: unknown) => {
          const e = err as { status?: number }
          if (e?.status === 401 || e?.status === 403 || e?.status === 404) return false
          return count < 2
        },
      },
    },
  }))
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
