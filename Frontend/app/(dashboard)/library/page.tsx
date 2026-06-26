'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useContent } from '@/hooks/content'
import { useProjects } from '@/hooks/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUploadDialog } from '@/components/content/FileUploadDialog'
import { ContentCard } from '@/components/content/ContentCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Upload, Grid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

export default function LibraryPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? ''
  const { projects } = useProjects()
  const activeProjectId = projectId || projects[0]?.id || ''
  const { items, isLoading, deleteContent } = useContent(activeProjectId)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const qc = useQueryClient()

  const filtered = items.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || item.type === filterType
    return matchSearch && matchType
  })

  const filters = [
    { value: 'all', label: 'All' }, { value: 'video', label: 'Video' }, { value: 'audio', label: 'Audio' },
    { value: 'pdf', label: 'PDF' }, { value: 'youtube', label: 'YouTube' }, { value: 'note', label: 'Notes' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-xl font-semibold">Library</h1><p className="text-sm text-muted-foreground">{items.length} items</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('grid')} className={cn('p-2 rounded-md transition-colors', view === 'grid' ? 'bg-accent' : 'hover:bg-accent/50')}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setView('list')} className={cn('p-2 rounded-md transition-colors', view === 'list' ? 'bg-accent' : 'hover:bg-accent/50')}><List className="h-4 w-4" /></button>
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-8 text-sm" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {filters.map((f) => (
              <button key={f.value} onClick={() => setFilterType(f.value)}
                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors', filterType === f.value ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className={view === 'grid' ? 'h-48 rounded-xl' : 'h-16 rounded-lg'} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Upload className="h-10 w-10 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">{search || filterType !== 'all' ? 'No matching content' : 'Upload your first piece of content'}</p>
            {!search && filterType === 'all' && <Button size="sm" onClick={() => setUploadOpen(true)}>Upload Content</Button>}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => <ContentCard key={item.id} item={item} layout="grid" onDelete={() => deleteContent(item.id)} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => <ContentCard key={item.id} item={item} layout="list" onDelete={() => deleteContent(item.id)} />)}
          </div>
        )}
      </div>

      <FileUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={activeProjectId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['content'] })} />
    </div>
  )
}
