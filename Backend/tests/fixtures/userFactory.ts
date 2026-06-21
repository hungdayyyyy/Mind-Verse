import { User } from '@modules/users/user.model';
import { UserDocument } from '@modules/users/user.types';
import { SystemRole, Plan } from '@shared/types';

let counter = 0;

/**
 * Creates a test user with sensible defaults, overridable per-test.
 * Each call gets a unique email to avoid unique-index collisions across
 * tests sharing the in-memory MongoDB instance within a single test file.
 */
export async function createTestUser(overrides: {
  email?: string;
  name?: string;
  password?: string;
  plan?: Plan;
  systemRole?: SystemRole;
  emailVerified?: boolean;
} = {}): Promise<UserDocument> {
  counter += 1;
  return User.create({
    email: overrides.email ?? `test-user-${counter}@example.com`,
    name: overrides.name ?? `Test User ${counter}`,
    passwordHash: overrides.password ?? 'TestPassword1!',
    plan: overrides.plan ?? 'free',
    systemRole: overrides.systemRole ?? 'user',
    emailVerified: overrides.emailVerified ?? true,
  });
}

export async function createAdmin(): Promise<UserDocument> {
  return createTestUser({ systemRole: 'admin' });
}

export async function createSuperAdmin(): Promise<UserDocument> {
  return createTestUser({ systemRole: 'super_admin' });
}
