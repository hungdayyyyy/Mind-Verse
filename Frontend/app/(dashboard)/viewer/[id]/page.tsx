'use client'
import { useParams, useRouter } from 'next/navigation'
import { useContentItem } from '@/hooks/content'
import { AIChatPanel } from '@/components/ai/AIChatPanel'
import { StructuredNotes } from '@/components/learning/notes/StructuredNotes'
import { MindMapView } from '@/components/learning/mindmap/MindMapView'
import { QuizRunner } from '@/components/learning/quiz/QuizRunner'
import { useUIStore } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Share2, Sparkles, FileText, Map, CreditCard, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'mindmap', label: 'Mind Map', icon: Map },
  { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
  { id: 'quiz', label: 'Quiz', icon: ClipboardCheck },
]

export default function ViewerPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { data: content, isLoading } = useContentItem(id)
  const { activeViewerTab, setActiveViewerTab, toggleChatPanel } = useUIStore()

  if (isLoading) return <div className="flex-1 p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
  if (!content) return <div className="flex flex-col items-center justify-center h-full gap-3"><p className="text-sm text-muted-foreground">Content not found</p><Button variant="outline" onClick={() => router.back()}>Go Back</Button></div>

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}><ChevronLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-sm font-semibold truncate max-w-72">{content.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-xs capitalize">{content.type}</Badge>
                <Badge className={cn('text-xs', {
                  'bg-muted text-muted-foreground': content.processingStatus === 'pending',
                  'bg-blue-100 text-blue-700': content.processingStatus === 'processing',
                  'bg-green-100 text-green-700': content.processingStatus === 'completed',
                  'bg-red-100 text-red-700': content.processingStatus === 'failed',
                })}>{content.processingStatus}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={toggleChatPanel}><Sparkles className="h-4 w-4 text-violet-500" /></Button>
            <Button variant="ghost" size="sm"><Share2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {(content.type === 'video' || content.type === 'youtube') && content.source.cloudinaryUrl && (
            <div className="bg-black aspect-video"><video src={content.source.cloudinaryUrl} controls className="w-full h-full" /></div>
          )}
          {content.type === 'audio' && content.source.cloudinaryUrl && (
            <div className="p-6 border-b border-border"><audio src={content.source.cloudinaryUrl} controls className="w-full" /></div>
          )}
          {content.type === 'pdf' && content.source.cloudinaryUrl && (
            <div className="h-80 border-b border-border"><iframe src={content.source.cloudinaryUrl} className="w-full h-full" /></div>
          )}

          <div className="border-b border-border sticky top-0 bg-background z-10">
            <div className="flex">
              {TABS.map(({ id: tabId, label, icon: Icon }) => (
                <button key={tabId} onClick={() => setActiveViewerTab(tabId)}
                  className={cn('flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                    activeViewerTab === tabId ? 'border-violet-600 text-violet-600' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto">
            {activeViewerTab === 'notes' && <StructuredNotes contentItemId={id} />}
            {activeViewerTab === 'mindmap' && <MindMapView contentItemId={id} />}
            {activeViewerTab === 'flashcards' && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Visit <a href="/library" className="text-violet-600 underline">the deck list</a> to study flashcards for this content.
              </div>
            )}
            {activeViewerTab === 'quiz' && <QuizRunner contentItemId={id} />}
          </div>
        </div>
      </div>
      <AIChatPanel contentItemId={id} contentTitle={content.title} />
    </div>
  )
}
