import { Sidebar } from '@/components/layout/Sidebar'
import { CommandPalette } from '@/components/shared/CommandPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      <CommandPalette />
    </div>
  )
}
