import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'srs_reminder'
  | 'share_invite'
  | 'processing_done'
  | 'processing_failed'
  | 'study_room_invite'
  | 'project_invite'
  | 'quiz_challenge';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'srs_reminder',
      'share_invite',
      'processing_done',
      'processing_failed',
      'study_room_invite',
      'project_invite',
      'quiz_challenge',
    ],
    required: true,
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 500 },
  data: { type: Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: '90d' }, // TTL auto-delete after 90 days
});

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>('Notification', notificationSchema);
