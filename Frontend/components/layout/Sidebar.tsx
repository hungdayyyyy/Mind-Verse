'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Library, Clock, Star, ChevronRight, ChevronDown,
  Plus, Settings, LogOut, Sparkles, FolderOpen, PanelLeftClose,
  PanelLeftOpen, MoreHorizontal, FolderPlus, Pencil, Trash2,
  BarChart2, Shield,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useProjects } from '@/hooks/projects'
import { useFolders } from '@/hooks/projects'
import { Project } from '@/types/projects'
import { cn } from '@/lib/utils'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function FolderRow({ projectId, folderId, name, itemCount, isActive }: {
  projectId: string; folderId: string; name: string; itemCount: number; isActive: boolean
}) {
  const { deleteFolder } = useFolders(projectId)
  return (
    <div className={cn('group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
      isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
      <Link href={`/projects/${projectId}?folder=${folderId}`} className="flex items-center gap-1.5 flex-1 min-w-0">
        <FolderOpen className="h-3 w-3 shrink-0" />
        <span className="truncate">{name}</span>
        <span className="ml-auto text-muted-foreground shrink-0">{itemCount}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity">
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem className="text-destructive text-xs" onClick={() => deleteFolder(folderId)}>
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  const { expandedProjects, toggleProjectExpanded } = useUIStore()
  const { deleteProject } = useProjects()
  const { folders, createFolder } = useFolders(project.id)
  const [addingFolder, setAddingFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const pathname = usePathname()
  const isExpanded = expandedProjects.includes(project.id)
  const isActive = pathname.startsWith(`/projects/${project.id}`)

  const handleAddFolder = async () => {
    if (!folderName.trim()) return
    await createFolder({ name: folderName.trim(), projectId: project.id })
    setFolderName(''); setAddingFolder(false)
  }

  return (
    <div>
      <div className={cn('group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
        <button onClick={() => toggleProjectExpanded(project.id)} className="flex items-center gap-1.5 flex-1 min-w-0">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="truncate font-medium">{project.name}</span>
          <span className="ml-auto text-xs text-muted-foreground shrink-0">{project.itemCount}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-accent rounded transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setAddingFolder(true)} className="text-xs">
              <FolderPlus className="h-3.5 w-3.5 mr-2" /> Add Folder
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-xs">
              <Link href={`/projects/${project.id}`}><Pencil className="h-3.5 w-3.5 mr-2" /> Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive text-xs" onClick={() => deleteProject(project.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {folders.map((f) => (
            <FolderRow key={f.id} projectId={project.id} folderId={f.id} name={f.name}
              itemCount={f.itemCount} isActive={pathname.includes(`folder=${f.id}`)} />
          ))}
          {addingFolder ? (
            <input autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setAddingFolder(false) }}
              onBlur={() => { if (!folderName.trim()) setAddingFolder(false) }}
              placeholder="Folder name…"
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-ring" />
          ) : (
            <button onClick={() => setAddingFolder(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground w-full rounded hover:bg-accent/50">
              <Plus className="h-3 w-3" /> New folder
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, toggleChatPanel } = useUIStore()
  const { user, clearAuth, isAdmin } = useAuthStore()
  const { projects, isLoading } = useProjects()
  const [createOpen, setCreateOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/library', label: 'Library', icon: Library },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/recent', label: 'Recent', icon: Clock },
    { href: '/starred', label: 'Starred', icon: Star },
  ]

  if (sidebarCollapsed) return (
    <aside className="w-14 flex flex-col bg-background border-r border-border items-center py-4 gap-3">
      <button onClick={toggleSidebar} className="p-2 hover:bg-accent rounded-md transition-colors">
        <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
      </button>
      {nav.map(({ href, icon: Icon }) => (
        <Link key={href} href={href}
          className={cn('p-2 rounded-md transition-colors', pathname === href ? 'bg-accent' : 'hover:bg-accent/50')}>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
      {isAdmin() && (
        <Link href="/admin" className="p-2 hover:bg-accent rounded-md transition-colors mt-auto">
          <Shield className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
    </aside>
  )

  return (
    <>
      <aside className="w-60 flex flex-col bg-background border-r border-border shrink-0 h-full">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="font-semibold text-sm">LearnWave</span>
          </div>
          <button onClick={toggleSidebar} className="p-1 hover:bg-accent rounded transition-colors">
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Plan badge */}
        {user && (
          <div className="px-4 py-2 border-b border-border">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              user.plan === 'enterprise' ? 'bg-amber-100 text-amber-700' :
              user.plan === 'premium' ? 'bg-violet-100 text-violet-700' :
              'bg-muted text-muted-foreground')}>
              {user.plan === 'free' ? '🆓 Free' : user.plan === 'premium' ? '⚡ Premium' : '🏢 Enterprise'}
            </span>
          </div>
        )}

        {/* Nav */}
        <div className="px-2 py-2 border-b border-border">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                pathname === href ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
              <Icon className="h-4 w-4 shrink-0" />{label}
            </Link>
          ))}
          {isAdmin() && (
            <Link href="/admin"
              className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors mt-1',
                pathname.startsWith('/admin') ? 'bg-red-50 text-red-700 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50')}>
              <Shield className="h-4 w-4 shrink-0" /> Admin
            </Link>
          )}
        </div>

        {/* Projects */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</span>
            <button onClick={() => setCreateOpen(true)} className="p-0.5 hover:bg-accent rounded transition-colors">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-1 px-2">{[1,2,3].map(i => <div key={i} className="h-7 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : projects.length === 0 ? (
            <button onClick={() => setCreateOpen(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent/50">
              <Plus className="h-3 w-3" /> Create first project
            </button>
          ) : (
            <div className="space-y-0.5">{projects.map(p => <ProjectRow key={p.id} project={p} />)}</div>
          )}
        </div>

        {/* AI Tutor */}
        <div className="px-2 py-2 border-t border-border">
          <button onClick={toggleChatPanel}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Sparkles className="h-4 w-4 text-violet-500 shrink-0" /> AI Tutor
          </button>
        </div>

        {/* User */}
        <div className="px-2 py-2 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-medium">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-accent rounded transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild className="text-xs">
                  <Link href="/settings"><Settings className="h-3.5 w-3.5 mr-2" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive text-xs" onClick={() => { clearAuth(); router.push('/sign-in') }}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
