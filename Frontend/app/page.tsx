'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/sign-in'); return }
    if (user?.role === 'admin' || user?.role === 'superadmin') router.replace('/admin')
    else router.replace('/dashboard')
  }, [isAuthenticated, user, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}
