'use client'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/hooks/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check } from 'lucide-react'
import { PLAN_LIMITS, UserPlan } from '@/types/auth'
import { cn } from '@/lib/utils'

const PLAN_INFO: Record<UserPlan, { name: string; price: string; color: string }> = {
  free: { name: 'Free', price: '$0/mo', color: 'border-border' },
  premium: { name: 'Premium', price: '$12/mo', color: 'border-violet-300 ring-1 ring-violet-200' },
  enterprise: { name: 'Enterprise', price: 'Custom', color: 'border-amber-300' },
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await updateProfile({ name }) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto">
      <div><h1 className="text-xl font-semibold">Settings</h1><p className="text-sm text-muted-foreground">Manage your account and preferences</p></div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm max-w-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Email</Label>
            <Input value={user?.email ?? ''} disabled className="text-sm max-w-sm bg-muted" />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}Save Changes</Button>
        </CardContent>
      </Card>

      <Card id="billing">
        <CardHeader><CardTitle className="text-sm">Plan & Billing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(PLAN_INFO) as UserPlan[]).map((plan) => {
              const info = PLAN_INFO[plan]
              const limits = PLAN_LIMITS[plan]
              const isCurrent = user?.plan === plan
              return (
                <div key={plan} className={cn('border rounded-xl p-4 relative', info.color)}>
                  {isCurrent && <Badge className="absolute top-3 right-3 bg-violet-100 text-violet-700 text-xs">Current</Badge>}
                  <p className="font-semibold text-sm">{info.name}</p>
                  <p className="text-xl font-bold mt-1">{info.price}</p>
                  <ul className="mt-3 space-y-1.5">
                    <li className="text-xs text-muted-foreground flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500" />{limits.maxProjects === -1 ? 'Unlimited' : limits.maxProjects} projects</li>
                    <li className="text-xs text-muted-foreground flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500" />{limits.maxMonthlyUploads === -1 ? 'Unlimited' : limits.maxMonthlyUploads} uploads/mo</li>
                    <li className="text-xs text-muted-foreground flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500" />{limits.features.includes('all') ? 'All features' : limits.features.join(', ')}</li>
                  </ul>
                  {!isCurrent && <Button size="sm" variant="outline" className="w-full mt-3 text-xs">{plan === 'free' ? 'Downgrade' : 'Upgrade'}</Button>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>SRS review reminders</span>
            <input type="checkbox" defaultChecked={user?.settings?.notifications?.srsReminder ?? true} className="accent-violet-600" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Weekly progress report</span>
            <input type="checkbox" defaultChecked={user?.settings?.notifications?.weeklyReport ?? true} className="accent-violet-600" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Shared content notifications</span>
            <input type="checkbox" defaultChecked={user?.settings?.notifications?.sharedContent ?? true} className="accent-violet-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
