import { Schema, model, Document, Types } from 'mongoose';

export interface FolderDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  projectId: Types.ObjectId;
  parentFolderId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  itemCount: number;
  order: number;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const folderSchema = new Schema<FolderDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    parentFolderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    depth: { type: Number, default: 0, max: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

folderSchema.index({ projectId: 1, parentFolderId: 1, deletedAt: 1 });
folderSchema.index({ ownerId: 1 });

export const Folder = model<FolderDocument>('Folder', folderSchema);
