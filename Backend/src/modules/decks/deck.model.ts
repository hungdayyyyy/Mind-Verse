import { Schema, model, Document, Types } from 'mongoose';

export interface DeckDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  contentItemId: Types.ObjectId;
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  cardCount: number;
  masteredCount: number;
  newCount: number;
  dueCount: number;
  language: string;
  isPublic: boolean;
  shareToken: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const deckSchema = new Schema<DeckDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 500 },
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cardCount: { type: Number, default: 0 },
    masteredCount: { type: Number, default: 0 },
    newCount: { type: Number, default: 0 },
    dueCount: { type: Number, default: 0 },
    language: { type: String, default: 'en' },
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, sparse: true, default: null },
    coverImageUrl: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deckSchema.index({ ownerId: 1, deletedAt: 1 });
deckSchema.index({ contentItemId: 1 });
deckSchema.index({ shareToken: 1 }, { sparse: true });

export const Deck = model<DeckDocument>('Deck', deckSchema);
