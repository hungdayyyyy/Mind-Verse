import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'crypto';
import { User } from '@modules/users/user.model';
import { UserDocument } from '@modules/users/user.types';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { ConflictError, UnauthorizedError, ValidationError } from '@shared/errors';
import { generateSecureToken } from '@shared/utils/generateToken';
import { emailService } from '@shared/services/email.service';
import { RegisterBody, LoginBody } from './auth.schema';
import { AuthResult } from './auth.types';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_OAUTH_CALLBACK_URL);

/**
 * In-memory + DB-backed refresh token store. Refresh tokens are stored as a
 * SHA-256 hash (never plaintext) on the user document's hidden field, with
 * rotation on every use (old token invalidated, new one issued) to limit the
 * blast radius of a leaked refresh token.
 *
 * For simplicity this implementation stores a single active refresh token
 * hash per user; a production system supporting multiple concurrent devices
 * would store a collection of `{ tokenHash, deviceInfo, expiresAt }` instead.
 */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: UserDocument): string {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, plan: user.plan, systemRole: user.systemRole },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export const authService = {
  /**
   * Registers a new user with email/password, sends a verification email,
   * and returns an authenticated session (access token + refresh token).
   * @throws ConflictError if the email is already registered.
   */
  async register(input: RegisterBody): Promise<{ result: AuthResult; refreshToken: string }> {
    const existing = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null });
    if (existing) {
      throw new ConflictError('An account with this email already exists. Try signing in.');
    }

    const verificationToken = generateSecureToken();

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.password, // hashed by the pre-save hook
      plan: 'free',
      emailVerified: false,
      emailVerificationToken: verificationToken,
    });

    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, user.name, verificationUrl);

    const refreshToken = generateRefreshToken();
    await this.persistRefreshToken(user, refreshToken);

    logger.info('User registered', { userId: user._id.toString() });

    return {
      result: { accessToken: signAccessToken(user), user: this.toAuthUser(user) },
      refreshToken,
    };
  },

  /**
   * Authenticates a user by email/password.
   * @throws UnauthorizedError on any credential mismatch (deliberately vague
   *   to avoid leaking which part of the credentials was wrong).
   */
  async login(input: LoginBody): Promise<{ result: AuthResult; refreshToken: string }> {
    const user = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null });
    if (!user || !(await user.comparePassword(input.password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.accountStatus === 'banned') {
      throw new UnauthorizedError('This account has been banned.', { code: 'ACCOUNT_BANNED' });
    }
    if (user.accountStatus === 'suspended') {
      throw new UnauthorizedError('This account has been suspended. Contact support for assistance.', {
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const refreshToken = generateRefreshToken();
    await this.persistRefreshToken(user, refreshToken);

    logger.info('User logged in', { userId: user._id.toString() });

    return {
      result: { accessToken: signAccessToken(user), user: this.toAuthUser(user) },
      refreshToken,
    };
  },

  /**
   * Exchanges a Google OAuth authorization code for tokens, fetches the
   * user's profile, and finds-or-creates the corresponding LearnWave account.
   * If an email-registered account already exists with the same email, the
   * Google identity is linked to it rather than creating a duplicate account.
   */
  async loginWithGoogle(code: string): Promise<{ result: AuthResult; refreshToken: string }> {
    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedError('Could not retrieve Google profile');
    }

    let user = await User.findOne({ googleId: payload.sub, deletedAt: null });

    if (!user) {
      // Check if an email/password account already exists with this email.
      user = await User.findOne({ email: payload.email.toLowerCase(), deletedAt: null });

      if (user) {
        // Link the Google identity to the existing account.
        user.googleId = payload.sub;
        if (!user.avatar && payload.picture) user.avatar = payload.picture;
        user.emailVerified = true;
        await user.save();
        logger.info('Google account linked to existing user', { userId: user._id.toString() });
      } else {
        user = await User.create({
          name: payload.name ?? payload.email.split('@')[0],
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          avatar: payload.picture ?? null,
          plan: 'free',
          emailVerified: true, // Google has already verified this email
        });
        logger.info('New user registered via Google OAuth', { userId: user._id.toString() });
      }
    }

    if (user.accountStatus === 'banned') {
      throw new UnauthorizedError('This account has been banned.', { code: 'ACCOUNT_BANNED' });
    }
    if (user.accountStatus === 'suspended') {
      throw new UnauthorizedError('This account has been suspended. Contact support for assistance.', {
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const refreshToken = generateRefreshToken();
    await this.persistRefreshToken(user, refreshToken);

    return {
      result: { accessToken: signAccessToken(user), user: this.toAuthUser(user) },
      refreshToken,
    };
  },

  /** Builds the Google OAuth consent screen redirect URL. */
  getGoogleAuthUrl(state: string): string {
    return googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  },

  /**
   * Rotates a refresh token: validates the presented token against the
   * stored hash, issues a new access + refresh token pair, and invalidates
   * the old refresh token (one-time use).
   * @throws UnauthorizedError if the token is missing, unrecognized, or expired.
   */
  async refreshAccessToken(presentedToken: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!presentedToken) throw new UnauthorizedError('No refresh token provided');

    const tokenHash = hashToken(presentedToken);
    const user = await User.findOne({
      // @ts-expect-error — refreshTokenHash/refreshTokenExpires are intentionally
      // not part of the public UserDocument type; accessed only here.
      refreshTokenHash: tokenHash,
      deletedAt: null,
    });

    // @ts-expect-error see above
    if (!user || !user.refreshTokenExpires || user.refreshTokenExpires < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const newRefreshToken = generateRefreshToken();
    await this.persistRefreshToken(user, newRefreshToken);

    return { accessToken: signAccessToken(user), refreshToken: newRefreshToken };
  },

  /** Invalidates the stored refresh token, effectively logging the user out everywhere this token was used. */
  async logout(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId },
      // @ts-expect-error see persistRefreshToken
      { $unset: { refreshTokenHash: '', refreshTokenExpires: '' } }
    );
  },

  /**
   * Initiates a password reset by emailing a time-limited reset link.
   * Always resolves successfully regardless of whether the email exists,
   * to avoid leaking account existence (email enumeration).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) return; // Deliberately silent

    const token = generateSecureToken();
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${env.FRONTEND_URL}/reset-password/${token}`;
    await emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
  },

  /**
   * Completes a password reset using the token emailed by forgotPassword.
   * @throws ValidationError if the token is invalid or expired.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
      deletedAt: null,
    });

    if (!user) {
      throw new ValidationError({ formErrors: ['Reset link is invalid or has expired.'], fieldErrors: {} });
    }

    user.passwordHash = newPassword; // re-hashed by pre-save hook
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    logger.info('Password reset completed', { userId: user._id.toString() });
  },

  /** Persists a hashed refresh token with a 30-day expiry on the user document. */
  async persistRefreshToken(user: UserDocument, refreshToken: string): Promise<void> {
    await User.updateOne(
      { _id: user._id },
      {
        // @ts-expect-error intentional dynamic fields not in the strict type
        refreshTokenHash: hashToken(refreshToken),
        refreshTokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    );
  },

  toAuthUser(user: UserDocument): AuthResult['user'] {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      plan: user.plan,
      systemRole: user.systemRole,
      emailVerified: user.emailVerified,
    };
  },
};
