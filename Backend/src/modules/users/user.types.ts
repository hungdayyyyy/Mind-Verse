import { Document, Types } from 'mongoose';
import { Plan, SystemRole, AccountStatus } from '@shared/types';

export interface UserSettings {
  language: string;
  notifications: {
    srsReminders: boolean;
    emailNotifications: boolean;
    shareInvites: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  timezone: string;
}

export interface UserStats {
  streak: number;
  longestStreak: number;
  totalStudyTime: number;
  lastStudyDate: Date | null;
}

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  avatar: string | null;
  googleId: string | null;
  passwordHash: string | null;
  plan: Plan;
  /** System-wide administrative role; see SystemRole for the access each level grants. */
  systemRole: SystemRole;
  /** Moderation status — suspended/banned users are blocked at the auth layer. */
  accountStatus: AccountStatus;
  /** Free-text reason logged alongside suspend/ban actions, for audit purposes. */
  moderationNote: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  settings: UserSettings;
  stats: UserStats;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  comparePassword(candidate: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

/** Shape of a user object safe to return from the API (no secrets). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  plan: Plan;
  systemRole: SystemRole;
  settings: UserSettings;
  stats: UserStats;
  emailVerified: boolean;
  createdAt: Date;
}

/** Extended admin-only view of a user, including fields hidden from self-service endpoints. */
export interface AdminUserView extends PublicUser {
  accountStatus: AccountStatus;
  moderationNote: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: UserDocument['subscriptionStatus'];
  lastLoginAt: Date | null;
  deletedAt: Date | null;
}

