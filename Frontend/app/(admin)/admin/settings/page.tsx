'use client'
export default function AdminSettingsPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system-wide settings</p>
      </div>
      <p className="text-sm text-muted-foreground">Plan limits, feature flags, and integration settings go here.</p>
    </div>
  )
}
