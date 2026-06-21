import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a URL-safe share token for public resource links
 * (e.g., /shared/:token). Uses UUID v4 for collision resistance.
 */
export function generateShareToken(): string {
  return uuidv4().replace(/-/g, '');
}

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

/**
 * Generates a short, human-typeable invite code for Study Rooms
 * (e.g., "NX7K2P"). Excludes visually ambiguous characters.
 */
export function generateInviteCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS[bytes[i] % INVITE_CODE_CHARS.length];
  }
  return code;
}

/** Generates a cryptographically random token for password reset / email verification. */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}
