'use client'
import { useAdminStats } from '@/hooks/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, FileStack, HardDrive, DollarSign } from 'lucide-react'

export function StatsOverview() {
  const { data: stats, isLoading } = useAdminStats()

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Active Today', value: stats?.activeUsersToday ?? 0, icon: Users, color: 'text-green-500' },
    { label: 'Total Content', value: stats?.totalContent ?? 0, icon: FileStack, color: 'text-violet-500' },
    { label: 'Storage Used', value: `${stats?.totalStorageGB ?? 0} GB`, icon: HardDrive, color: 'text-amber-500' },
    { label: 'Monthly Revenue', value: `$${stats?.revenueMonthly ?? 0}`, icon: DollarSign, color: 'text-emerald-500' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border-border shadow-none">
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-12 w-full" /> : (
              <>
                <Icon className={`h-4 w-4 ${color} mb-2`} />
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
