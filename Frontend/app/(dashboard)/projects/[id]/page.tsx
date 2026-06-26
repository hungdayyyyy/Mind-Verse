'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProject, useFolders } from '@/hooks/projects'
import { useContent } from '@/hooks/content'
import { FileUploadDialog } from '@/components/content/FileUploadDialog'
import { ShareProjectDialog } from '@/components/projects/ShareProjectDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, FolderOpen, Share2 } from 'lucide-react'
import { Film, Music, FileText, File, Youtube } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { ContentItem } from '@/types/content'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const { data: project, isLoading: projLoading } = useProject(projectId)
  const { folders } = useFolders(projectId)
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>()
  const { items, isLoading: contentLoading } = useContent(projectId, selectedFolder)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const iconMap: Record<string, React.ElementType> = { video: Film, audio: Music, pdf: FileText, doc: FileText, youtube: Youtube, note: File }

  if (projLoading) return <div className="p-6 space-y-4"><Skeleton className="h-12 w-64" /><div className="grid grid-cols-3 gap-4 mt-6">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div></div>
  if (!project) return <div className="p-6 text-sm text-muted-foreground">Project not found</div>

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-48 border-r border-border p-3 shrink-0 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Folders</p>
        <button onClick={() => setSelectedFolder(undefined)}
          className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors', !selectedFolder ? 'bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
          <FolderOpen className="h-3.5 w-3.5 shrink-0" /> All content
        </button>
        {folders.map((f) => (
          <button key={f.id} onClick={() => setSelectedFolder(f.id)}
            className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors', selectedFolder === f.id ? 'bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
            <FolderOpen className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{f.name}</span><span className="ml-auto text-muted-foreground">{f.itemCount}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
              <h1 className="text-lg font-semibold">{project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload</Button>
            </div>
          </div>
          {project.description && <p className="text-sm text-muted-foreground mt-1 ml-6">{project.description}</p>}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {contentLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Upload className="h-8 w-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No content yet</p>
              <Button size="sm" onClick={() => setUploadOpen(true)}>Upload Content</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item: ContentItem) => {
                const Icon = iconMap[item.type] ?? File
                return (
                  <div key={item.id} onClick={() => router.push(`/viewer/${item.id}`)}
                    className="border border-border rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="h-24 rounded-lg bg-muted flex items-center justify-center mb-3"><Icon className="h-8 w-8 text-muted-foreground opacity-60" /></div>
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-violet-600 transition-colors">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <FileUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={projectId} folderId={selectedFolder} />
      <ShareProjectDialog open={shareOpen} onOpenChange={setShareOpen} projectId={projectId} />
    </div>
  )
}
