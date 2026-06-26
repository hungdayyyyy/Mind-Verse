'use client'
import { StatsOverview } from '@/components/admin/StatsOverview'
import { useAdminStats } from '@/hooks/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminOverviewPage() {
  const { data: stats } = useAdminStats()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide metrics and health</p>
      </div>

      <StatsOverview />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats?.planBreakdown && Object.entries(stats.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{plan}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Signups This Week</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {stats?.signupsThisWeek?.map((d) => (
                <div key={d.date} className="flex-1 bg-violet-200 rounded-t" style={{ height: `${Math.max(d.count * 10, 4)}px` }} title={`${d.date}: ${d.count}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
