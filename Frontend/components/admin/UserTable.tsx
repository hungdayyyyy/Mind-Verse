'use client'
import { useState } from 'react'
import { useAdminUsers, useAdminUserActions } from '@/hooks/admin'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, MoreHorizontal, Shield, Ban, CheckCircle, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { UserPlan } from '@/types/auth'
import { formatDistanceToNow } from 'date-fns'

const PLAN_BADGE: Record<UserPlan, string> = {
  free: 'bg-muted text-muted-foreground',
  premium: 'bg-violet-100 text-violet-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

export function UserTable() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminUsers(page, search)
  const { updateUser, blockUser, unblockUser, deleteUser } = useAdminUserActions()

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9 text-sm" />
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">User</th>
              <th className="text-left px-4 py-2.5 font-medium">Role</th>
              <th className="text-left px-4 py-2.5 font-medium">Plan</th>
              <th className="text-left px-4 py-2.5 font-medium">Joined</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
              ))
            ) : data?.data.map((u) => (
              <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-medium">{u.name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge className={cn('text-xs capitalize', u.role === 'admin' || u.role === 'superadmin' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground')}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-2.5"><Badge className={cn('text-xs capitalize', PLAN_BADGE[u.plan])}>{u.plan}</Badge></td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</td>
                <td className="px-4 py-2.5">
                  <Badge className={cn('text-xs', u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="p-1 hover:bg-accent rounded"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateUser({ id: u.id, data: { plan: 'premium' } })}><Shield className="h-3.5 w-3.5 mr-2" />Upgrade to Premium</DropdownMenuItem>
                      {u.isBlocked
                        ? <DropdownMenuItem onClick={() => unblockUser(u.id)}><CheckCircle className="h-3.5 w-3.5 mr-2" />Unblock</DropdownMenuItem>
                        : <DropdownMenuItem onClick={() => blockUser(u.id)}><Ban className="h-3.5 w-3.5 mr-2" />Block</DropdownMenuItem>}
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(u.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.hasMore && (
        <button onClick={() => setPage((p) => p + 1)} className="text-xs text-violet-600 hover:underline">Load more</button>
      )}
    </div>
  )
}
