import { Schema, model, Document, Types } from 'mongoose';

export interface EmbeddingDocument extends Document {
  _id: Types.ObjectId;
  contentItemId: Types.ObjectId;
  ownerId: Types.ObjectId;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
  metadata: {
    startChar: number | null;
    endChar: number | null;
    startTime: number | null;
    endTime: number | null;
    pageNumber: number | null;
  };
  model: string;
  createdAt: Date;
}

const embeddingSchema = new Schema<EmbeddingDocument>({
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chunkIndex: { type: Number, required: true },
  chunkText: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: {
    startChar: { type: Number, default: null },
    endChar: { type: Number, default: null },
    startTime: { type: Number, default: null },
    endTime: { type: Number, default: null },
    pageNumber: { type: Number, default: null },
  },
  model: { type: String, default: 'text-embedding-3-small' },
  createdAt: { type: Date, default: Date.now },
});

embeddingSchema.index({ contentItemId: 1, chunkIndex: 1 });
embeddingSchema.index({ ownerId: 1 });

export const Embedding = model<EmbeddingDocument>('Embedding', embeddingSchema);
