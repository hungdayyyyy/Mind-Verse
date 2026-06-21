import { Schema, model, Document, Types } from 'mongoose';

export type ShareResourceType = 'project' | 'content' | 'deck' | 'quiz';
export type SharePermission = 'view' | 'fork';

export interface ShareLinkDocument extends Document {
  _id: Types.ObjectId;
  resourceType: ShareResourceType;
  resourceId: Types.ObjectId;
  token: string;
  ownerId: Types.ObjectId;
  permissions: SharePermission;
  expiresAt: Date | null;
  accessCount: number;
  isActive: boolean;
  createdAt: Date;
}

const shareLinkSchema = new Schema<ShareLinkDocument>({
  resourceType: { type: String, enum: ['project', 'content', 'deck', 'quiz'], required: true },
  resourceId: { type: Schema.Types.ObjectId, required: true },
  token: { type: String, required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  permissions: { type: String, enum: ['view', 'fork'], default: 'view' },
  expiresAt: { type: Date, default: null },
  accessCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

shareLinkSchema.index({ token: 1 }, { unique: true });
shareLinkSchema.index({ resourceId: 1, resourceType: 1 });
shareLinkSchema.index({ ownerId: 1 });

export const ShareLink = model<ShareLinkDocument>('ShareLink', shareLinkSchema);
