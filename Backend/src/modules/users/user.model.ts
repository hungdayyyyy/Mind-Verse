import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '@config/index';
import { UserDocument, PublicUser } from './user.types';

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    avatar: { type: String, default: null },
    googleId: { type: String, sparse: true, unique: true, default: null },
    passwordHash: { type: String, default: null },
    plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free', required: true },
    systemRole: { type: String, enum: ['user', 'support', 'admin', 'super_admin'], default: 'user', required: true },
    accountStatus: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active', required: true },
    moderationNote: { type: String, default: null },
    stripeCustomerId: { type: String, sparse: true, default: null },
    stripeSubscriptionId: { type: String, sparse: true, default: null },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', null],
      default: null,
    },
    settings: {
      language: { type: String, default: 'en' },
      notifications: {
        srsReminders: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true },
        shareInvites: { type: Boolean, default: true },
      },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      timezone: { type: String, default: 'UTC' },
    },
    stats: {
      streak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      totalStudyTime: { type: Number, default: 0 },
      lastStudyDate: { type: Date, default: null },
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ deletedAt: 1 });
userSchema.index({ systemRole: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ plan: 1 });

/** Hash the password before saving, only if it was modified. */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  // Guard against double-hashing if passwordHash was already hashed upstream.
  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, env.BCRYPT_COST_FACTOR);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toPublicJSON = function (): PublicUser {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    plan: this.plan,
    systemRole: this.systemRole,
    settings: this.settings,
    stats: this.stats,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
  };
};

export const User = model<UserDocument>('User', userSchema);
