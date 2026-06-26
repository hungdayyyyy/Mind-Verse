'use client'
import { UserTable } from '@/components/admin/UserTable'

export default function AdminUsersPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Manage users, roles, and plans</p>
      </div>
      <UserTable />
    </div>
  )
}
