import { Schema, model, Document, Types } from 'mongoose';

export type SessionType = 'video' | 'audio' | 'flashcard' | 'quiz' | 'notes' | 'mindmap' | 'chat';

export interface StudySessionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  contentItemId: Types.ObjectId;
  projectId: Types.ObjectId;
  sessionType: SessionType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
  itemsReviewed: number;
  itemsMastered: number;
  date: string; // 'YYYY-MM-DD', for daily aggregation
  createdAt: Date;
}

const studySessionSchema = new Schema<StudySessionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sessionType: { type: String, enum: ['video', 'audio', 'flashcard', 'quiz', 'notes', 'mindmap', 'chat'], required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
  itemsReviewed: { type: Number, default: 0 },
  itemsMastered: { type: Number, default: 0 },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

studySessionSchema.index({ userId: 1, date: 1 });
studySessionSchema.index({ userId: 1, contentItemId: 1 });
studySessionSchema.index({ userId: 1, startedAt: -1 });

export const StudySession = model<StudySessionDocument>('StudySession', studySessionSchema);
