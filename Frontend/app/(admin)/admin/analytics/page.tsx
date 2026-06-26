'use client'
import { useAdminStats } from '@/hooks/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminAnalyticsPage() {
  const { data: stats } = useAdminStats()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">Usage trends and growth metrics</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Content Uploads (7 days)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {stats?.contentUploadsThisWeek?.map((d) => (
              <div key={d.date} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${Math.max(d.count * 8, 4)}px` }} title={`${d.date}: ${d.count}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
