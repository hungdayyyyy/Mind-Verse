import { Schema, model, Document, Types } from 'mongoose';
import { SRSData } from '@shared/utils/srs';

export interface FlashcardSRSData extends SRSData {
  dueDate: Date;
  lastReviewedAt: Date | null;
  lastRating: number | null;
}

export interface FlashcardDocument extends Document {
  _id: Types.ObjectId;
  contentItemId: Types.ObjectId;
  deckId: Types.ObjectId;
  ownerId: Types.ObjectId;
  front: { text: string; richText: string | null; imageUrl: string | null };
  back: { text: string; richText: string | null; imageUrl: string | null };
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  srsData: FlashcardSRSData;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const flashcardSchema = new Schema<FlashcardDocument>(
  {
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
    deckId: { type: Schema.Types.ObjectId, ref: 'Deck', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    front: {
      text: { type: String, required: true, maxlength: 2000 },
      richText: { type: String, default: null },
      imageUrl: { type: String, default: null },
    },
    back: {
      text: { type: String, required: true, maxlength: 5000 },
      richText: { type: String, default: null },
      imageUrl: { type: String, default: null },
    },
    tags: [String],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    srsData: {
      dueDate: { type: Date, default: Date.now },
      interval: { type: Number, default: 1 },
      easeFactor: { type: Number, default: 2.5 },
      repetitions: { type: Number, default: 0 },
      lapses: { type: Number, default: 0 },
      lastReviewedAt: { type: Date, default: null },
      lastRating: { type: Number, default: null },
    },
    isAiGenerated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

flashcardSchema.index({ deckId: 1 });
flashcardSchema.index({ ownerId: 1, 'srsData.dueDate': 1 });
flashcardSchema.index({ contentItemId: 1 });

export const Flashcard = model<FlashcardDocument>('Flashcard', flashcardSchema);
