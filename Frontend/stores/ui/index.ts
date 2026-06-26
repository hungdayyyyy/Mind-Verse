import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  sidebarCollapsed: boolean
  chatPanelOpen: boolean
  activeViewerTab: string
  commandOpen: boolean
  expandedProjects: string[]
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleChatPanel: () => void
  setChatPanelOpen: (v: boolean) => void
  setActiveViewerTab: (tab: string) => void
  setCommandOpen: (v: boolean) => void
  toggleProjectExpanded: (id: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      chatPanelOpen: false,
      activeViewerTab: 'notes',
      commandOpen: false,
      expandedProjects: [],
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setChatPanelOpen: (v) => set({ chatPanelOpen: v }),
      setActiveViewerTab: (tab) => set({ activeViewerTab: tab }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      toggleProjectExpanded: (id) =>
        set((s) => ({
          expandedProjects: s.expandedProjects.includes(id)
            ? s.expandedProjects.filter((x) => x !== id)
            : [...s.expandedProjects, id],
        })),
    }),
    { name: 'lw-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, expandedProjects: s.expandedProjects }) }
  )
)
