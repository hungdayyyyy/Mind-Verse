import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function generateShareUrl(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${token}`
}

// SM-2 SRS algorithm
export function calculateNextReview(easeFactor: number, repetitions: number, rating: number) {
  if (rating < 3) return { interval: 1, easeFactor, repetitions: 0 }
  const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))
  let interval: number
  if (repetitions === 0) interval = 1
  else if (repetitions === 1) interval = 6
  else interval = Math.round(repetitions * newEF)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + interval)
  return { interval, easeFactor: newEF, repetitions: repetitions + 1, dueDate: dueDate.toISOString() }
}
