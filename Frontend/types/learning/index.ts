// ─── Notes ───
export type NoteBlockType = 'h1' | 'h2' | 'h3' | 'bullet' | 'callout' | 'quote' | 'keyterm' | 'paragraph'

export interface NoteBlock {
  id: string
  type: NoteBlockType
  content: string
  metadata?: Record<string, string>
}

export interface Note {
  id: string
  contentItemId: string
  ownerId: string
  blocks: NoteBlock[]
  version: number
  isAiGenerated: boolean
  lastEditedAt: string
  createdAt: string
  updatedAt: string
}

// ─── Mind Map ───
export interface MindMapNode {
  id: string
  label: string
  type?: 'root' | 'branch' | 'leaf'
  x: number
  y: number
  color?: string
  metadata?: Record<string, string>
}

export interface MindMapEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface MindMap {
  id: string
  contentItemId: string
  ownerId: string
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  version: number
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

// ─── Flashcards ───
export interface SRSData {
  dueDate: string
  interval: number        // days
  easeFactor: number      // SM-2 E-Factor, default 2.5
  repetitions: number
  lastReviewedAt?: string
}

export type FlashcardRating = 0 | 1 | 2 | 3 | 4 | 5  // SM-2 scale

export interface Flashcard {
  id: string
  contentItemId: string
  deckId: string
  ownerId: string
  front: string
  back: string
  hint?: string
  tags?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  srsData: SRSData
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface Deck {
  id: string
  name: string
  description?: string
  contentItemId?: string
  projectId: string
  ownerId: string
  cardCount: number
  masteredCount: number
  dueCount: number
  isPublic: boolean
  shareToken?: string
  createdAt: string
  updatedAt: string
}

export interface ReviewCardInput {
  cardId: string
  rating: FlashcardRating
  timeTaken?: number
}

// ─── Quiz ───
export type QuestionType = 'mcq' | 'truefalse' | 'short'

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  options?: QuizOption[]
  correctAnswer: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
  points: number
}

export interface Quiz {
  id: string
  contentItemId: string
  ownerId: string
  title: string
  description?: string
  questions: QuizQuestion[]
  totalPoints: number
  settings: QuizSettings
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface QuizSettings {
  timeLimit?: number        // seconds, null = unlimited
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showExplanation: boolean
  passingScore: number      // percentage
}

export interface QuizAnswer {
  questionId: string
  selectedAnswer: string
  timeTaken?: number
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  answers: (QuizAnswer & { isCorrect: boolean; pointsEarned: number })[]
  score: number             // percentage
  totalPoints: number
  earnedPoints: number
  totalQuestions: number
  correctCount: number
  timeTaken?: number
  weakAreas?: string[]
  passed: boolean
  completedAt: string
  createdAt: string
}

export interface SubmitQuizInput {
  answers: QuizAnswer[]
  timeTaken?: number
}

// ─── Chat ───
export interface ChatSource {
  contentItemId: string
  excerpt: string
  relevanceScore: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  createdAt: string
}

export interface ChatSession {
  id: string
  userId: string
  contentItemId?: string
  title: string
  messages: ChatMessage[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SendMessageInput {
  message: string
  contentItemId?: string
  sessionId?: string
}

// ─── Analytics ───
export interface AnalyticsDashboard {
  totalItems: number
  streak: number
  totalStudyTimeMinutes: number
  masteryPercent: number
  srsDueCount: number
  weeklyActivity: { date: string; minutes: number }[]
  weakAreas: { tag: string; correctRate: number; count: number }[]
  recentActivity: { type: string; title: string; date: string }[]
}
