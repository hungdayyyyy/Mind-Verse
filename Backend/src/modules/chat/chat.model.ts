import { Schema, model, Document, Types } from 'mongoose';

export interface ChatSource {
  contentItemId: Types.ObjectId;
  excerpt: string;
  relevanceScore: number;
  timestamp: number | null;
  pageNumber: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
  tokenCount: number | null;
  createdAt: Date;
}

export interface ChatSessionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  contentItemId: Types.ObjectId | null;
  title: string;
  messages: ChatMessage[];
  totalTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chatSessionSchema = new Schema<ChatSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', default: null },
    title: { type: String, default: 'New Chat', maxlength: 200 },
    messages: [
      {
        id: { type: String, required: true },
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true, maxlength: 50000 },
        sources: [
          {
            contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem' },
            excerpt: String,
            relevanceScore: Number,
            timestamp: { type: Number, default: null },
            pageNumber: { type: Number, default: null },
          },
        ],
        tokenCount: { type: Number, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalTokens: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ contentItemId: 1 });

export const ChatSession = model<ChatSessionDocument>('ChatSession', chatSessionSchema);
