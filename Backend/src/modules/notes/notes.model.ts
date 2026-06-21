import { Schema, model, Document, Types } from 'mongoose';

export type NoteBlockType =
  | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'callout' | 'quote' | 'keyterm' | 'code' | 'divider' | 'summary';

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  content: string;
  metadata?: {
    calloutType?: 'info' | 'warning' | 'tip' | 'danger';
    language?: string;
    url?: string;
  };
}

export interface NoteVersionSnapshot {
  version: number;
  blocks: NoteBlock[];
  savedAt: Date;
  savedBy: Types.ObjectId | null;
}

export interface NotesDocument extends Document {
  _id: Types.ObjectId;
  contentItemId: Types.ObjectId;
  ownerId: Types.ObjectId;
  blocks: NoteBlock[];
  version: number;
  versionHistory: NoteVersionSnapshot[];
  isAiGenerated: boolean;
  lastEditedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const noteBlockSchema = new Schema<NoteBlock>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['h1', 'h2', 'h3', 'bullet', 'numbered', 'callout', 'quote', 'keyterm', 'code', 'divider', 'summary'],
      required: true,
    },
    content: { type: String, default: '' },
    metadata: {
      calloutType: { type: String, enum: ['info', 'warning', 'tip', 'danger'], default: null },
      language: { type: String, default: null },
      url: { type: String, default: null },
    },
  },
  { _id: false }
);

const notesSchema = new Schema<NotesDocument>(
  {
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blocks: [noteBlockSchema],
    version: { type: Number, default: 1 },
    versionHistory: [
      {
        version: Number,
        blocks: [noteBlockSchema],
        savedAt: Date,
        savedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
    isAiGenerated: { type: Boolean, default: true },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notesSchema.index({ contentItemId: 1 });
notesSchema.index({ ownerId: 1 });

const MAX_VERSION_HISTORY = 10;

/** Pushes the current blocks into versionHistory before overwriting, capping history at 10 entries. */
notesSchema.methods.snapshotBeforeEdit = function (editedBy: Types.ObjectId | null) {
  this.versionHistory.push({
    version: this.version,
    blocks: this.blocks,
    savedAt: new Date(),
    savedBy: editedBy,
  });
  if (this.versionHistory.length > MAX_VERSION_HISTORY) {
    this.versionHistory = this.versionHistory.slice(-MAX_VERSION_HISTORY);
  }
  this.version += 1;
};

export const Notes = model<NotesDocument & { snapshotBeforeEdit: (editedBy: Types.ObjectId | null) => void }>(
  'Notes',
  notesSchema
);
