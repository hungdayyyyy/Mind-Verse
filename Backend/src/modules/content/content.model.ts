import { Schema, model } from 'mongoose';
import { ContentItemDocument } from './content.types';

const contentItemSchema = new Schema<ContentItemDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 255 },
    type: {
      type: String,
      enum: ['video', 'audio', 'pdf', 'doc', 'pptx', 'txt', 'youtube', 'note'],
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: {
      url: { type: String, default: null },
      cloudinaryId: { type: String, default: null },
      cloudinaryUrl: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      duration: { type: Number, default: null },
      pageCount: { type: Number, default: null },
      fileSize: { type: Number, default: null },
      mimeType: { type: String, default: null },
      youtubeVideoId: { type: String, default: null },
    },
    transcript: {
      text: { type: String, default: null },
      segments: [{ start: Number, end: Number, text: String }],
      language: { type: String, default: null },
      wordCount: { type: Number, default: null },
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
      default: 'pending',
    },
    processingJobs: {
      transcribe: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      notes: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      flashcards: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      quiz: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
      embeddings: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'skipped'], default: 'pending' },
    },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    language: { type: String, default: 'en' },
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, sparse: true, default: null },
    viewCount: { type: Number, default: 0 },
    masteryScore: { type: Number, default: 0, min: 0, max: 100 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

contentItemSchema.index({ projectId: 1, deletedAt: 1 });
contentItemSchema.index({ ownerId: 1, deletedAt: 1 });
contentItemSchema.index({ folderId: 1, deletedAt: 1 });
contentItemSchema.index({ shareToken: 1 }, { sparse: true });
contentItemSchema.index({ processingStatus: 1 });
contentItemSchema.index({ tags: 1 });

export const ContentItem = model<ContentItemDocument>('ContentItem', contentItemSchema);
