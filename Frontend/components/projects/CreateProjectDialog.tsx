'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjects } from '@/hooks/projects'
import { useAuthStore } from '@/stores/auth'
import { canCreateProject } from '@/lib/auth/rbac'
import { Loader2, Lock } from 'lucide-react'

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']

export function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { createProject, isCreating, projects } = useProjects()
  const { user } = useAuthStore()
  const [name, setName] = useState(''); const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0]); const [error, setError] = useState('')

  const allowed = user ? canCreateProject(user.plan, projects.length) : true

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!allowed) { setError('Project limit reached for your plan'); return }
    try {
      await createProject({ name: name.trim(), description: description.trim() || undefined, color })
      setName(''); setDescription(''); setColor(COLORS[0]); setError(''); onOpenChange(false)
    } catch { setError('Failed to create project') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
        {!allowed && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <Lock className="h-4 w-4 shrink-0" />
            You've reached the project limit for your plan. <a href="/settings/billing" className="underline font-medium">Upgrade</a>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">Project Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. React Fundamentals" className="text-sm" autoFocus />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isCreating || !name.trim() || !allowed}>
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
