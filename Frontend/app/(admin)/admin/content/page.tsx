'use client'
import { useState } from 'react'
import { useAdminContent } from '@/hooks/admin'
import { adminService } from '@/services/admin'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminContentPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminContent(1, search)
  const qc = useQueryClient()

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Content Moderation</h1>
        <p className="text-sm text-muted-foreground">Review and manage uploaded content across the platform</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search content..." className="pl-9 h-9 text-sm" />
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5">Owner</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>)
              : data?.data.map((item) => (
              <tr key={item.id} className="hover:bg-accent/30">
                <td className="px-4 py-2.5 font-medium truncate max-w-xs">{item.title}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.ownerEmail}</td>
                <td className="px-4 py-2.5"><Badge className="text-xs capitalize">{item.type}</Badge></td>
                <td className="px-4 py-2.5"><Badge className="text-xs capitalize">{item.processingStatus}</Badge></td>
                <td className="px-4 py-2.5">
                  <button onClick={() => { adminService.deleteContent(item.id); qc.invalidateQueries({ queryKey: ['admin', 'content'] }) }}
                    className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
