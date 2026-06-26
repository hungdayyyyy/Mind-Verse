import { create } from 'zustand'
import { ChatMessage } from '@/types/learning'

interface LearningStore {
  // Quiz state
  quizAnswers: Record<string, string>
  quizStartTime: number | null
  setQuizAnswer: (questionId: string, answer: string) => void
  resetQuiz: () => void
  startQuizTimer: () => void

  // Flashcard state
  currentCardIndex: number
  isCardFlipped: boolean
  setCardIndex: (i: number) => void
  flipCard: () => void
  resetFlashcards: () => void

  // Chat state
  messages: ChatMessage[]
  isStreaming: boolean
  streamingText: string
  contextContentId: string | null
  activeSessionId: string | null
  addMessage: (msg: ChatMessage) => void
  setStreamingText: (text: string) => void
  setIsStreaming: (v: boolean) => void
  setContextContent: (id: string | null) => void
  setActiveSession: (id: string | null) => void
  clearMessages: () => void
}

export const useLearningStore = create<LearningStore>((set) => ({
  quizAnswers: {}, quizStartTime: null,
  setQuizAnswer: (qId, ans) => set((s) => ({ quizAnswers: { ...s.quizAnswers, [qId]: ans } })),
  resetQuiz: () => set({ quizAnswers: {}, quizStartTime: null }),
  startQuizTimer: () => set({ quizStartTime: Date.now() }),

  currentCardIndex: 0, isCardFlipped: false,
  setCardIndex: (i) => set({ currentCardIndex: i, isCardFlipped: false }),
  flipCard: () => set((s) => ({ isCardFlipped: !s.isCardFlipped })),
  resetFlashcards: () => set({ currentCardIndex: 0, isCardFlipped: false }),

  messages: [], isStreaming: false, streamingText: '',
  contextContentId: null, activeSessionId: null,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setStreamingText: (text) => set({ streamingText: text }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setContextContent: (id) => set({ contextContentId: id, messages: [] }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  clearMessages: () => set({ messages: [], streamingText: '' }),
}))
