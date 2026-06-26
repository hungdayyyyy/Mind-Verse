'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link2, Users } from 'lucide-react'
import { projectsService } from '@/services/projects'
import { generateShareUrl } from '@/lib/utils'

export function ShareProjectDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const [permissions, setPermissions] = useState<'view' | 'fork'>('view')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerateLink = async () => {
    setLoading(true)
    try {
      const res = await projectsService.share(projectId, permissions)
      setShareUrl(res.shareUrl || generateShareUrl(res.token))
    } finally { setLoading(false) }
  }

  const handleCopy = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const handleInvite = async () => {
    if (!email.trim()) return
    await projectsService.addMember(projectId, email.trim(), 'editor')
    setEmail('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Share Project</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(['view', 'fork'] as const).map((p) => (
              <button key={p} onClick={() => setPermissions(p)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${permissions === p ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                {p === 'view' ? 'View only' : 'Allow fork'}
              </button>
            ))}
          </div>

          {shareUrl ? (
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs" />
              <Button size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleGenerateLink} disabled={loading} className="w-full gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Generate Share Link
            </Button>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Invite by email</p>
            <div className="flex gap-2">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@email.com" className="text-xs" />
              <Button size="sm" onClick={handleInvite} className="shrink-0">Invite</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
