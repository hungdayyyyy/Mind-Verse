'use client'
import { useRouter } from 'next/navigation'
import { Film, Music, FileText, File, Youtube, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ContentItem, ContentType } from '@/types/content'
import { contentService } from '@/services/content'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS: Record<ContentType, React.ElementType> = { video: Film, audio: Music, pdf: FileText, doc: FileText, youtube: Youtube, note: File }
const TYPE_COLORS: Record<ContentType, string> = {
  video: 'bg-blue-100 text-blue-700', audio: 'bg-purple-100 text-purple-700',
  pdf: 'bg-red-100 text-red-700', doc: 'bg-orange-100 text-orange-700',
  youtube: 'bg-red-100 text-red-700', note: 'bg-green-100 text-green-700',
}
const STATUS_MAP = {
  pending: { label: 'Queued', cls: 'bg-muted text-muted-foreground' },
  processing: { label: 'Processing...', cls: 'bg-blue-100 text-blue-700 animate-pulse' },
  completed: { label: 'Ready', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
}

export function ContentCard({ item, layout, onDelete }: { item: ContentItem; layout: 'grid' | 'list'; onDelete: () => void }) {
  const router = useRouter()
  const Icon = TYPE_ICONS[item.type]
  const status = STATUS_MAP[item.processingStatus]

  if (layout === 'list') return (
    <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:border-violet-200 hover:bg-accent/20 transition-all cursor-pointer group"
      onClick={() => router.push(`/viewer/${item.id}`)}>
      <div className={cn('p-2 rounded-lg', TYPE_COLORS[item.type])}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
      </div>
      <Badge className={cn('text-xs', status.cls)}>{status.label}</Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"><MoreHorizontal className="h-4 w-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); contentService.reprocess(item.id) }}><RefreshCw className="h-3.5 w-3.5 mr-2" />Reprocess</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div className="border border-border rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => router.push(`/viewer/${item.id}`)}>
      <div className={cn('w-full h-24 rounded-lg flex items-center justify-center mb-3', TYPE_COLORS[item.type])}><Icon className="h-8 w-8 opacity-70" /></div>
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium line-clamp-2 flex-1">{item.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between mt-2">
        <Badge className={cn('text-xs', status.cls)}>{status.label}</Badge>
        <span className="text-xs text-muted-foreground">
          {item.source.duration ? `${Math.round(item.source.duration / 60)}m` : item.source.pageCount ? `${item.source.pageCount}p` : ''}
        </span>
      </div>
    </div>
  )
}
