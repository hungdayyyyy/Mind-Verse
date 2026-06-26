'use client'
import Link from 'next/link'
import { useDecks } from '@/hooks/learning'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard } from 'lucide-react'

export function DeckList({ projectId }: { projectId?: string }) {
  const { data: decks, isLoading } = useDecks(projectId)

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
  if (!decks || decks.length === 0) return <p className="text-sm text-muted-foreground p-4">No decks yet</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {decks.map((deck) => (
        <Link key={deck.id} href={`/study/flashcards/${deck.id}`}
          className="border border-border rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-medium truncate">{deck.name}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{deck.cardCount} cards</span>
            {deck.dueCount > 0 && <span className="text-violet-600 font-medium">{deck.dueCount} due</span>}
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${deck.cardCount ? (deck.masteredCount / deck.cardCount) * 100 : 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  )
}
