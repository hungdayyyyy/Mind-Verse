import { Schema, model, Document, Types } from 'mongoose';

export interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'branch' | 'leaf';
  x: number;
  y: number;
  style?: { backgroundColor?: string; fontSize?: number };
  metadata?: { contentTimestamp?: number | null; pageRef?: number | null };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'straight' | 'step';
}

export interface MindMapDocument extends Document {
  _id: Types.ObjectId;
  contentItemId: Types.ObjectId;
  ownerId: Types.ObjectId;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  version: number;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mindMapSchema = new Schema<MindMapDocument>(
  {
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nodes: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true, maxlength: 200 },
        type: { type: String, enum: ['root', 'branch', 'leaf'], default: 'leaf' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        style: {
          backgroundColor: { type: String, default: null },
          fontSize: { type: Number, default: 14 },
        },
        metadata: {
          contentTimestamp: { type: Number, default: null },
          pageRef: { type: Number, default: null },
        },
      },
    ],
    edges: [
      {
        id: { type: String, required: true },
        source: { type: String, required: true },
        target: { type: String, required: true },
        label: { type: String, default: '' },
        type: { type: String, enum: ['default', 'straight', 'step'], default: 'default' },
      },
    ],
    version: { type: Number, default: 1 },
    isAiGenerated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

mindMapSchema.index({ contentItemId: 1 });

export const MindMap = model<MindMapDocument>('MindMap', mindMapSchema);
