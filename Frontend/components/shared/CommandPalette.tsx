'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FileUp, Plus, FolderOpen, Settings, Search, LayoutDashboard } from 'lucide-react'
import { useUIStore } from '@/stores/ui'

const COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'browse-library', label: 'Browse Library', icon: FolderOpen, href: '/library' },
  { id: 'upload-file', label: 'Upload File', icon: FileUp, href: '/library' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

export function CommandPalette() {
  const router = useRouter()
  const { commandOpen, setCommandOpen } = useUIStore()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCommandOpen(!commandOpen) }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandOpen, setCommandOpen])

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-md">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Type a command or search..." />
          </div>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Commands">
              {COMMANDS.map((cmd) => {
                const Icon = cmd.icon
                return (
                  <CommandItem key={cmd.id} value={cmd.label} onSelect={() => { router.push(cmd.href); setCommandOpen(false) }}>
                    <Icon className="mr-2 h-4 w-4" /><span>{cmd.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
