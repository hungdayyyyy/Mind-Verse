import { baseQuery } from '@/lib/api/baseQuery'
import {
  Note, NoteBlock, MindMap, MindMapNode, MindMapEdge,
  Deck, Flashcard, ReviewCardInput,
  Quiz, QuizAttempt, SubmitQuizInput,
  ChatSession, ChatMessage, SendMessageInput,
} from '@/types/learning'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Notes
export const notesService = {
  getByContent: (contentItemId: string) =>
    baseQuery.get<Note>(`/notes/${contentItemId}`),
  update: (contentItemId: string, blocks: NoteBlock[]) =>
    baseQuery.put<Note>(`/notes/${contentItemId}`, { blocks }),
  regenerate: (contentItemId: string) =>
    baseQuery.post<Note>(`/notes/${contentItemId}/regenerate`),
}

// Mind Map
export const mindMapService = {
  getByContent: (contentItemId: string) =>
    baseQuery.get<MindMap>(`/mindmaps/${contentItemId}`),
  update: (contentItemId: string, nodes: MindMapNode[], edges: MindMapEdge[]) =>
    baseQuery.put<MindMap>(`/mindmaps/${contentItemId}`, { nodes, edges }),
  regenerate: (contentItemId: string) =>
    baseQuery.post<MindMap>(`/mindmaps/${contentItemId}/regenerate`),
}

// Flashcards & Decks
export const flashcardsService = {
  getDecks: (projectId?: string) =>
    baseQuery.get<Deck[]>('/decks', { params: { projectId } }),
  getDeck: (id: string) => baseQuery.get<Deck>(`/decks/${id}`),
  getDeckCards: (deckId: string) =>
    baseQuery.get<Flashcard[]>(`/decks/${deckId}/cards`),
  getDueCards: () => baseQuery.get<Flashcard[]>('/flashcards/due'),
  reviewCard: (input: ReviewCardInput) =>
    baseQuery.post<Flashcard>(`/flashcards/${input.cardId}/review`, {
      rating: input.rating, timeTaken: input.timeTaken,
    }),
  regenerate: (contentItemId: string) =>
    baseQuery.post<Flashcard[]>(`/flashcards/generate/${contentItemId}`),
  shareDeck: (deckId: string) =>
    baseQuery.post<{ token: string; shareUrl: string }>(`/decks/${deckId}/share`),
  forkDeck: (token: string, projectId: string) =>
    baseQuery.post<Deck>(`/decks/fork/${token}`, { projectId }),
}

// Quizzes
export const quizzesService = {
  getByContent: (contentItemId: string) =>
    baseQuery.get<Quiz>(`/quizzes/content/${contentItemId}`),
  getById: (id: string) => baseQuery.get<Quiz>(`/quizzes/${id}`),
  submit: (quizId: string, input: SubmitQuizInput) =>
    baseQuery.post<QuizAttempt>(`/quizzes/${quizId}/attempt`, input),
  getAttempts: (quizId: string) =>
    baseQuery.get<QuizAttempt[]>(`/quizzes/${quizId}/attempts`),
  regenerate: (contentItemId: string) =>
    baseQuery.post<Quiz>(`/quizzes/generate/${contentItemId}`),
  shareQuiz: (quizId: string) =>
    baseQuery.post<{ token: string; shareUrl: string }>(`/quizzes/${quizId}/share`),
}

// Chat (RAG)
export const chatService = {
  getSessions: () => baseQuery.get<ChatSession[]>('/chat/sessions'),
  getSession: (id: string) => baseQuery.get<ChatSession>(`/chat/sessions/${id}`),
  deleteSession: (id: string) => baseQuery.delete<void>(`/chat/sessions/${id}`),

  streamMessage: async (
    input: SendMessageInput,
    onChunk: (text: string) => void,
    onDone: (msg: ChatMessage) => void,
    onError?: (err: string) => void
  ) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lw_token') : null
    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const { value, done: isDone } = await reader.read()
        done = isDone
        if (value) {
          decoder.decode(value).split('\n').forEach((line) => {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'text') onChunk(data.content)
                else if (data.type === 'done') onDone(data.message)
                else if (data.type === 'error') onError?.(data.message)
              } catch {}
            }
          })
        }
      }
    } catch (err: unknown) {
      onError?.((err as Error).message || 'Unknown error')
    }
  },
}

// Analytics
export const analyticsService = {
  getDashboard: () => baseQuery.get<import('@/types/learning').AnalyticsDashboard>('/analytics/dashboard'),
  getWeakAreas: () =>
    baseQuery.get<{ tag: string; correctRate: number; count: number }[]>('/analytics/weak-areas'),
  getSRSDue: () => baseQuery.get<{ count: number }>('/analytics/srs-due'),
}
