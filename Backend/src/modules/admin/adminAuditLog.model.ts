import { Schema, model, Document, Types } from 'mongoose';

/**
 * Immutable audit trail of every administrative action taken on a user
 * account or platform-wide setting. Never updated or deleted — only
 * appended to — so it can serve as a reliable record for support disputes,
 * compliance reviews, and detecting abuse of admin privileges.
 */
export interface AdminAuditLogDocument extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorEmail: string;
  action:
    | 'user.plan_changed'
    | 'user.role_changed'
    | 'user.suspended'
    | 'user.banned'
    | 'user.reactivated'
    | 'user.password_reset_forced'
    | 'user.deleted'
    | 'content.removed'
    | 'feature_flag.toggled';
  targetUserId: Types.ObjectId | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

const adminAuditLogSchema = new Schema<AdminAuditLogDocument>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorEmail: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'user.plan_changed',
      'user.role_changed',
      'user.suspended',
      'user.banned',
      'user.reactivated',
      'user.password_reset_forced',
      'user.deleted',
      'content.removed',
      'feature_flag.toggled',
    ],
    required: true,
  },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  details: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

adminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetUserId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export const AdminAuditLog = model<AdminAuditLogDocument>('AdminAuditLog', adminAuditLogSchema);
