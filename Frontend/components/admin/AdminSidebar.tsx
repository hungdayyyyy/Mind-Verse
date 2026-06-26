'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileStack, BarChart3, Settings, ArrowLeft, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/content', label: 'Content', icon: FileStack },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 border-r border-border bg-background flex flex-col shrink-0 h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Shield className="h-4 w-4 text-red-600" />
        <span className="font-semibold text-sm">Admin Panel</span>
      </div>
      <div className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
              pathname === href ? 'bg-red-50 text-red-700 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
            <Icon className="h-4 w-4 shrink-0" />{label}
          </Link>
        ))}
      </div>
      <div className="p-2 border-t border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back to App
        </Link>
      </div>
    </aside>
  )
}
