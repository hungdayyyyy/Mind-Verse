'use client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, RefreshCw, Loader2 } from 'lucide-react'
import { useNotes } from '@/hooks/learning'
import { NoteBlock, NoteBlockType } from '@/types/learning'

const BLOCK_STYLES: Record<NoteBlockType, string> = {
  h1: 'text-xl font-bold text-foreground mt-6 mb-2',
  h2: 'text-lg font-semibold text-foreground mt-4 mb-1.5',
  h3: 'text-base font-semibold text-foreground mt-3 mb-1',
  bullet: 'flex gap-2 text-sm text-foreground ml-3 my-1',
  callout: 'bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 text-sm text-violet-900 my-3',
  quote: 'border-l-4 border-border pl-4 italic text-muted-foreground text-sm my-3',
  keyterm: 'inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-xs text-amber-800 my-1',
  paragraph: 'text-sm text-foreground my-2 leading-relaxed',
}

export function StructuredNotes({ contentItemId }: { contentItemId: string }) {
  const { note, isLoading, regenerate, isRegenerating } = useNotes(contentItemId)

  if (isLoading) return <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>

  if (!note) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <FileText className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm text-muted-foreground">Notes not yet generated</p>
      <Button size="sm" onClick={() => regenerate()}>Generate Notes</Button>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => regenerate()} disabled={isRegenerating} className="gap-1.5">
          {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerate
        </Button>
      </div>
      {note.blocks.map((block: NoteBlock) => {
        const cls = BLOCK_STYLES[block.type] ?? 'text-sm'
        if (block.type === 'bullet') return <div key={block.id} className={cls}><span className="mt-1">•</span><span>{block.content}</span></div>
        return <div key={block.id} className={cls}>{block.content}</div>
      })}
    </div>
  )
}
