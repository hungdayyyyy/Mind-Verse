'use client'
import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Film, Music, FileText, File, Youtube, X, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useContent } from '@/hooks/content'
import { useAuthStore } from '@/stores/auth'
import { canUpload } from '@/lib/auth/rbac'
import { cn } from '@/lib/utils'

interface Props { open: boolean; onOpenChange: (v: boolean) => void; projectId: string; folderId?: string; onSuccess?: () => void }
interface UploadItem { file: File; name: string; status: 'pending' | 'uploading' | 'done' | 'error'; progress: number }

export function FileUploadDialog({ open, onOpenChange, projectId, folderId, onSuccess }: Props) {
  const [tab, setTab] = useState<'file' | 'youtube'>('file')
  const [ytUrl, setYtUrl] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [queue, setQueue] = useState<UploadItem[]>([])
  const { upload, addYoutube, isUploading } = useContent(projectId, folderId)
  const { user } = useAuthStore()

  const monthlyUploads = user?.stats?.totalItemsCreated ?? 0
  const uploadAllowed = user ? canUpload(user.plan, monthlyUploads) : true

  const handleFiles = useCallback((files: FileList) => {
    setQueue(Array.from(files).map((f) => ({ file: f, name: f.name, status: 'pending' as const, progress: 0 })))
  }, [])

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }

  const handleUploadAll = async () => {
    for (let i = 0; i < queue.length; i++) {
      setQueue((q) => q.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it))
      try {
        await upload({ file: queue[i].file, meta: { projectId, folderId } })
        setQueue((q) => q.map((it, idx) => idx === i ? { ...it, status: 'done', progress: 100 } : it))
      } catch { setQueue((q) => q.map((it, idx) => idx === i ? { ...it, status: 'error' } : it)) }
    }
    onSuccess?.(); setTimeout(() => { onOpenChange(false); setQueue([]) }, 800)
  }

  const handleYouTube = async () => {
    if (!ytUrl.trim()) return
    await addYoutube({ url: ytUrl, fId: folderId })
    setYtUrl(''); onSuccess?.(); onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Upload Content</DialogTitle></DialogHeader>

        {!uploadAllowed && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <Lock className="h-4 w-4 shrink-0" />
            You've reached your monthly upload limit. <a href="/settings/billing" className="underline font-medium">Upgrade plan</a>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['file', 'youtube'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'file' ? 'File Upload' : 'YouTube URL'}
            </button>
          ))}
        </div>

        {tab === 'file' ? (
          <div className="space-y-3">
            <div onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
              className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                dragActive ? 'border-violet-500 bg-violet-50/50' : 'border-border hover:border-violet-300')}
              onClick={() => document.getElementById('lw-file-input')?.click()}>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MP3, WAV, PDF, DOCX, PPTX, TXT</p>
              <input id="lw-file-input" type="file" multiple hidden accept=".mp4,.mp3,.wav,.pdf,.docx,.pptx,.txt,.doc"
                onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {[{ icon: Film, label: 'Video' }, { icon: Music, label: 'Audio' }, { icon: FileText, label: 'PDF/Doc' }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 bg-muted rounded-lg"><Icon className="h-3.5 w-3.5" />{label}</div>
              ))}
            </div>
            {queue.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {queue.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs truncate flex-1">{item.name}</span>
                    {item.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500 shrink-0" />}
                    {item.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    {item.status === 'error' && <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    {item.status === 'pending' && <button onClick={() => setQueue((q) => q.filter((_, idx) => idx !== i))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleUploadAll} disabled={queue.length === 0 || isUploading || !uploadAllowed}>
                {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : `Upload ${queue.length || ''} File${queue.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <Youtube className="h-8 w-8 text-red-500 shrink-0" />
              <div><p className="text-sm font-medium">Paste a YouTube URL</p><p className="text-xs text-muted-foreground">We'll auto-transcribe and generate notes</p></div>
            </div>
            <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleYouTube()}
              placeholder="https://youtube.com/watch?v=..." className="text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleYouTube} disabled={!ytUrl.trim() || isUploading || !uploadAllowed}>
                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Process Video
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
