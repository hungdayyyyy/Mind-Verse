'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useQuiz } from '@/hooks/learning'
import { cn } from '@/lib/utils'

export function QuizRunner({ contentItemId }: { contentItemId: string }) {
  const { quiz, isLoading, submitQuiz, attempt } = useQuiz(contentItemId)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [startTime] = useState(Date.now())
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (quiz?.settings.timeLimit) setTimeLeft(quiz.settings.timeLimit)
  }, [quiz])

  useEffect(() => {
    if (timeLeft === null || submitted) return
    if (timeLeft <= 0) { handleSubmit(); return }
    const t = setTimeout(() => setTimeLeft((t) => (t ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, submitted])

  if (isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
  if (!quiz) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <ClipboardCheck className="h-8 w-8 text-muted-foreground opacity-40" />
      <p className="text-sm text-muted-foreground">No quiz generated yet</p>
    </div>
  )

  const handleSubmit = async () => {
    const formatted = Object.entries(answers).map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }))
    await submitQuiz({ quizId: quiz.id, input: { answers: formatted, timeTaken: Math.round((Date.now() - startTime) / 1000) } })
    setSubmitted(true)
  }

  if (submitted && attempt) return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <div className={cn('text-5xl font-bold mb-2', attempt.passed ? 'text-green-600' : 'text-amber-600')}>{attempt.score}%</div>
        <p className="text-sm text-muted-foreground">{attempt.correctCount} / {attempt.totalQuestions} correct</p>
        <p className={cn('text-xs font-medium mt-1', attempt.passed ? 'text-green-600' : 'text-amber-600')}>
          {attempt.passed ? '✓ Passed' : 'Below passing score'}
        </p>
      </div>

      {/* Per-question review */}
      <div className="space-y-3 mb-4">
        {quiz.questions.map((q, i) => {
          const ans = attempt.answers.find(a => a.questionId === q.id)
          return (
            <div key={q.id} className={cn('border rounded-lg p-3', ans?.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50')}>
              <div className="flex items-start gap-2">
                {ans?.isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {attempt.weakAreas && attempt.weakAreas.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <p className="text-sm font-medium text-amber-900 mb-2">Focus areas to review:</p>
          {attempt.weakAreas.map((area) => <p key={area} className="text-xs text-amber-700">• {area}</p>)}
        </div>
      )}

      <Button className="w-full" onClick={() => { setAnswers({}); setSubmitted(false) }}>Retry Quiz</Button>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto">
      {timeLeft !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground sticky top-0 bg-background py-2">
          <Clock className="h-3.5 w-3.5" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} remaining
        </div>
      )}
      {quiz.questions.map((q, i) => (
        <div key={q.id} className="border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-3">{i + 1}. {q.question}</p>
          {q.type === 'mcq' && q.options?.map((opt) => (
            <button key={opt.id} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
              className={cn('w-full text-left text-sm px-3 py-2 rounded-lg border mb-1.5 transition-colors',
                answers[q.id] === opt.id ? 'border-violet-500 bg-violet-50 text-violet-900' : 'border-border hover:border-violet-200')}>
              {opt.text}
            </button>
          ))}
          {q.type === 'truefalse' && ['True', 'False'].map((opt) => (
            <button key={opt} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
              className={cn('w-1/2 inline-block text-center text-sm px-3 py-2 rounded-lg border mr-1.5 transition-colors',
                answers[q.id] === opt ? 'border-violet-500 bg-violet-50 text-violet-900' : 'border-border hover:border-violet-200')}>
              {opt}
            </button>
          ))}
          {q.type === 'short' && (
            <input value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Type your answer..." className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-1 focus:ring-ring" />
          )}
        </div>
      ))}
      <Button className="w-full" onClick={handleSubmit} disabled={Object.keys(answers).length < quiz.questions.length}>
        Submit Quiz
      </Button>
    </div>
  )
}
