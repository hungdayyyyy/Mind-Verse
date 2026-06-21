import { Schema, model, Document, Types } from 'mongoose';
import { ProjectRole } from '@shared/types';

export interface ProjectMember {
  userId: Types.ObjectId;
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  icon: string;
  ownerId: Types.ObjectId;
  members: ProjectMember[];
  isPublic: boolean;
  shareToken: string | null;
  itemCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#6366f1', match: /^#[0-9a-fA-F]{6}$/ },
    icon: { type: String, default: '📚', maxlength: 10 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, sparse: true, default: null },
    itemCount: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

projectSchema.index({ ownerId: 1, deletedAt: 1 });
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ shareToken: 1 }, { sparse: true });

export const Project = model<ProjectDocument>('Project', projectSchema);
