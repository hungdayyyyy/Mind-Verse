import { Document, Types } from 'mongoose';
import { JobStageStatus } from '@shared/types';

export type ContentType = 'video' | 'audio' | 'pdf' | 'doc' | 'pptx' | 'txt' | 'youtube' | 'note';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ContentSource {
  url: string | null;
  cloudinaryId: string | null;
  cloudinaryUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  pageCount: number | null;
  fileSize: number | null;
  mimeType: string | null;
  youtubeVideoId: string | null;
}

export interface ContentTranscript {
  text: string | null;
  segments: TranscriptSegment[];
  language: string | null;
  wordCount: number | null;
}

export interface ProcessingJobs {
  transcribe: JobStageStatus;
  notes: JobStageStatus;
  flashcards: JobStageStatus;
  quiz: JobStageStatus;
  embeddings: JobStageStatus;
}

export interface ContentItemDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  type: ContentType;
  projectId: Types.ObjectId;
  folderId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  source: ContentSource;
  transcript: ContentTranscript;
  processingStatus: ProcessingStatus;
  processingJobs: ProcessingJobs;
  tags: string[];
  language: string;
  isPublic: boolean;
  shareToken: string | null;
  viewCount: number;
  masteryScore: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
