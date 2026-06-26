'use client'
import { useParams, useRouter } from 'next/navigation'
import { QuizRunner } from '@/components/learning/quiz/QuizRunner'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function QuizStudyPage() {
  const params = useParams()
  const router = useRouter()
  const contentItemId = params.quizId as string

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-sm font-semibold">Quiz</h1>
      </div>
      <div className="flex-1 overflow-auto"><QuizRunner contentItemId={contentItemId} /></div>
    </div>
  )
}
