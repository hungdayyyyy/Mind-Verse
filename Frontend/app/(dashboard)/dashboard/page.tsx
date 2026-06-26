'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAnalytics } from '@/hooks/learning'
import { useProjects } from '@/hooks/projects'
import { useDueCards } from '@/hooks/learning'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Flame, Clock, BrainCircuit, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics()
  const { projects, isLoading: projectsLoading } = useProjects()
  const { data: dueCards } = useDueCards()
  const [createOpen, setCreateOpen] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Total Items', value: analytics?.totalItems ?? 0, icon: BookOpen, color: 'text-blue-500' },
    { label: 'Study Streak', value: `${analytics?.streak ?? 0}d`, icon: Flame, color: 'text-orange-500' },
    { label: 'Time Studied', value: `${Math.round((analytics?.totalStudyTimeMinutes ?? 0) / 60)}h`, icon: Clock, color: 'text-green-500' },
    { label: 'Mastery', value: `${analytics?.masteryPercent ?? 0}%`, icon: BrainCircuit, color: 'text-violet-500' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-semibold">{greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border shadow-none">
            <CardContent className="p-4">
              {analyticsLoading ? <Skeleton className="h-12 w-full" /> : (
                <><Icon className={`h-4 w-4 ${color} mb-2`} /><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {dueCards && dueCards.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-900">{dueCards.length} flashcard{dueCards.length !== 1 ? 's' : ''} due for review</p>
              <p className="text-xs text-violet-700 mt-0.5">Keep your streak going!</p>
            </div>
            <Button size="sm" asChild><Link href={`/study/flashcards/${dueCards[0]?.deckId}`}>Review Now</Link></Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)} className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> New</Button>
        </div>
        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-border shadow-none">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">No projects yet. Create one to start learning.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>Create Project</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="border-border shadow-none hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="font-medium text-sm group-hover:text-violet-600 transition-colors truncate">{project.name}</span>
                    </div>
                    {project.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.itemCount} items</span>
                      <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
