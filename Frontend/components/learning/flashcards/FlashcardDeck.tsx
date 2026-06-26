'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, RotateCcw } from 'lucide-react'
import { useDeckCards } from '@/hooks/learning'
import { cn } from '@/lib/utils'
import { Flashcard } from '@/types/learning'

interface Props { deckId: string }

export function FlashcardDeck({ deckId }: Props) {
  const { cards, isLoading, reviewCard } = useDeckCards(deckId)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 rounded-xl" /></div>
  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <CreditCard className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm text-muted-foreground">No flashcards in this deck yet</p>
    </div>
  )

  if (index >= cards.length) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
        <CreditCard className="h-7 w-7 text-green-600" />
      </div>
      <div>
        <p className="text-lg font-semibold">Session complete!</p>
        <p className="text-sm text-muted-foreground mt-1">You reviewed {reviewedCount} card{reviewedCount !== 1 ? 's' : ''}</p>
      </div>
      <Button onClick={() => { setIndex(0); setReviewedCount(0); setFlipped(false) }} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" /> Review Again
      </Button>
    </div>
  )

  const card: Flashcard = cards[index]

  const handleRate = async (rating: 0 | 1 | 2 | 3 | 4 | 5) => {
    await reviewCard({ cardId: card.id, rating })
    setReviewedCount((c) => c + 1)
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="w-full max-w-md flex items-center justify-between text-xs text-muted-foreground">
        <span>{index + 1} / {cards.length}</span>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div key={i} className={cn('h-1 w-4 rounded-full', i < index ? 'bg-violet-500' : i === index ? 'bg-violet-300' : 'bg-muted')} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md h-64 cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setFlipped(!flipped)}>
        <div className={cn('relative w-full h-full transition-transform duration-500', flipped && '[transform:rotateY(180deg)]')} style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 bg-white border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2" style={{ backfaceVisibility: 'hidden' }}>
            <p className="text-lg font-medium">{card.front}</p>
            {card.hint && <p className="text-xs text-muted-foreground italic">Hint: {card.hint}</p>}
          </div>
          <div className="absolute inset-0 bg-violet-50 border border-violet-200 rounded-xl p-6 flex items-center justify-center text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <p className="text-base text-violet-900">{card.back}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{flipped ? 'How well did you know this?' : 'Click to reveal answer'}</p>

      {flipped && (
        <div className="grid grid-cols-3 gap-2 w-full max-w-md">
          <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleRate(1)}>Again</Button>
          <Button variant="outline" size="sm" className="border-yellow-200 text-yellow-600 hover:bg-yellow-50" onClick={() => handleRate(3)}>Good</Button>
          <Button variant="outline" size="sm" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleRate(5)}>Easy</Button>
        </div>
      )}
    </div>
  )
}
