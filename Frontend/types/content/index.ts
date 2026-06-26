export type ContentType = 'video' | 'audio' | 'pdf' | 'doc' | 'youtube' | 'note'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ContentItem {
  id: string
  title: string
  type: ContentType
  projectId: string
  folderId?: string
  ownerId: string
  source: ContentSource
  transcript?: Transcript
  processingStatus: ProcessingStatus
  processingJobs?: ProcessingJobs
  tags?: string[]
  isPublic: boolean
  shareToken?: string
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface ContentSource {
  url?: string
  cloudinaryId?: string
  cloudinaryUrl?: string
  thumbnailUrl?: string
  duration?: number
  pageCount?: number
  fileSize?: number
  mimeType?: string
}

export interface Transcript {
  text: string
  language?: string
  segments?: TranscriptSegment[]
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface ProcessingJobs {
  transcribe?: ProcessingStatus
  notes?: ProcessingStatus
  flashcards?: ProcessingStatus
  quiz?: ProcessingStatus
  embeddings?: ProcessingStatus
  mindmap?: ProcessingStatus
}

export interface UploadContentInput {
  projectId: string
  folderId?: string
  title?: string
}
