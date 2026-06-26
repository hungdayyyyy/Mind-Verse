'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { notesService, mindMapService, flashcardsService, quizzesService, chatService, analyticsService } from '@/services/learning'
import { NoteBlock, ReviewCardInput, SubmitQuizInput, SendMessageInput, ChatMessage } from '@/types/learning'
import { useLearningStore } from '@/stores/learning'

// Notes
export function useNotes(contentItemId: string) {
  const qc = useQueryClient(); const key = ['notes', contentItemId]
  const q = useQuery({ queryKey: key, queryFn: () => notesService.getByContent(contentItemId), enabled: !!contentItemId })
  const updateM = useMutation({ mutationFn: (blocks: NoteBlock[]) => notesService.update(contentItemId, blocks), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  const regenM = useMutation({ mutationFn: () => notesService.regenerate(contentItemId), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  return { note: q.data ?? null, isLoading: q.isLoading, updateNotes: updateM.mutateAsync, regenerate: regenM.mutate, isRegenerating: regenM.isPending }
}

// Mind Map
export function useMindMap(contentItemId: string) {
  const qc = useQueryClient(); const key = ['mindmap', contentItemId]
  const q = useQuery({ queryKey: key, queryFn: () => mindMapService.getByContent(contentItemId), enabled: !!contentItemId })
  const regenM = useMutation({ mutationFn: () => mindMapService.regenerate(contentItemId), onSuccess: () => qc.invalidateQueries({ queryKey: key }) })
  return { mindMap: q.data ?? null, isLoading: q.isLoading, regenerate: regenM.mutate, isRegenerating: regenM.isPending }
}

// Flashcards
export function useDecks(projectId?: string) {
  return useQuery({ queryKey: ['decks', projectId], queryFn: () => flashcardsService.getDecks(projectId) })
}
export function useDeckCards(deckId: string) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['deck-cards', deckId], queryFn: () => flashcardsService.getDeckCards(deckId), enabled: !!deckId })
  const reviewM = useMutation({ mutationFn: (input: ReviewCardInput) => flashcardsService.reviewCard(input), onSuccess: () => qc.invalidateQueries({ queryKey: ['deck-cards', deckId] }) })
  return { cards: q.data ?? [], isLoading: q.isLoading, reviewCard: reviewM.mutateAsync }
}
export function useDueCards() {
  return useQuery({ queryKey: ['due-cards'], queryFn: flashcardsService.getDueCards, staleTime: 60_000 })
}

// Quiz
export function useQuiz(contentItemId: string) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['quiz', contentItemId], queryFn: () => quizzesService.getByContent(contentItemId), enabled: !!contentItemId })
  const submitM = useMutation({ mutationFn: ({ quizId, input }: { quizId: string; input: SubmitQuizInput }) => quizzesService.submit(quizId, input) })
  const regenM = useMutation({ mutationFn: () => quizzesService.regenerate(contentItemId), onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz', contentItemId] }) })
  return { quiz: q.data ?? null, isLoading: q.isLoading, submitQuiz: submitM.mutateAsync, attempt: submitM.data ?? null, regenerate: regenM.mutate, isRegenerating: regenM.isPending }
}

// Chat
export function useChat(contentItemId?: string) {
  const { messages, isStreaming, streamingText, addMessage, setStreamingText, setIsStreaming } = useLearningStore()

  const sendMessage = useCallback(async (text: string, sessionId?: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: new Date().toISOString() }
    addMessage(userMsg)
    setIsStreaming(true); setStreamingText('')
    let fullText = ''
    await chatService.streamMessage(
      { message: text, contentItemId, sessionId } as SendMessageInput,
      (chunk) => { fullText += chunk; setStreamingText(fullText) },
      (finalMsg) => { addMessage(finalMsg); setStreamingText('') },
      (err) => { addMessage({ id: crypto.randomUUID(), role: 'assistant', content: `Error: ${err}`, createdAt: new Date().toISOString() }); setStreamingText('') }
    )
    setIsStreaming(false)
  }, [contentItemId, addMessage, setStreamingText, setIsStreaming])

  return { messages, sendMessage, isStreaming, streamingText }
}

// Analytics
export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: analyticsService.getDashboard, staleTime: 5 * 60_000 })
}
