'use client'
import { useAnalytics } from '@/hooks/learning'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Flame, Clock, BrainCircuit, AlertCircle } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics()

  if (isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto">
      <div><h1 className="text-xl font-semibold">Learning Analytics</h1><p className="text-sm text-muted-foreground">Track your progress and find areas to improve</p></div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><Flame className="h-4 w-4 text-orange-500 mb-2" /><p className="text-2xl font-bold">{analytics?.streak ?? 0} days</p><p className="text-xs text-muted-foreground">Current streak</p></CardContent></Card>
        <Card><CardContent className="p-4"><Clock className="h-4 w-4 text-green-500 mb-2" /><p className="text-2xl font-bold">{Math.round((analytics?.totalStudyTimeMinutes ?? 0) / 60)}h</p><p className="text-xs text-muted-foreground">Total study time</p></CardContent></Card>
        <Card><CardContent className="p-4"><BrainCircuit className="h-4 w-4 text-violet-500 mb-2" /><p className="text-2xl font-bold">{analytics?.masteryPercent ?? 0}%</p><p className="text-xs text-muted-foreground">Overall mastery</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Weekly Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {analytics?.weeklyActivity?.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-violet-200 rounded-t" style={{ height: `${Math.max(d.minutes, 4)}px` }} />
                <span className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {analytics?.weakAreas && analytics.weakAreas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Gap Finder — Weak Areas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analytics.weakAreas.map((w) => (
              <div key={w.tag} className="flex items-center justify-between text-sm p-2 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-amber-900">{w.tag}</span>
                <span className="text-xs text-amber-700">{w.correctRate}% correct ({w.count} attempts)</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
