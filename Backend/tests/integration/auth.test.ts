import { authService } from '@modules/auth/auth.service';
import { User } from '@modules/users/user.model';
import { createTestUser } from '../fixtures/userFactory';

describe('authService — registration, login, and account-status enforcement', () => {
  describe('register', () => {
    it('creates a new free-plan user with a hashed password', async () => {
      const { result } = await authService.register({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'SecurePass1!',
      });

      expect(result.user.email).toBe('alice@example.com');
      expect(result.user.plan).toBe('free');
      expect(result.user.systemRole).toBe('user');
      expect(result.accessToken).toBeTruthy();

      const stored = await User.findOne({ email: 'alice@example.com' });
      expect(stored?.passwordHash).not.toBe('SecurePass1!'); // must be hashed, not plaintext
    });

    it('rejects registration with a duplicate email', async () => {
      await authService.register({ name: 'Alice', email: 'dup@example.com', password: 'SecurePass1!' });

      await expect(
        authService.register({ name: 'Alice 2', email: 'dup@example.com', password: 'SecurePass1!' })
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('login', () => {
    it('authenticates with correct credentials', async () => {
      await authService.register({ name: 'Bob', email: 'bob@example.com', password: 'SecurePass1!' });

      const { result } = await authService.login({ email: 'bob@example.com', password: 'SecurePass1!' });
      expect(result.user.email).toBe('bob@example.com');
    });

    it('rejects an incorrect password', async () => {
      await authService.register({ name: 'Carol', email: 'carol@example.com', password: 'SecurePass1!' });

      await expect(authService.login({ email: 'carol@example.com', password: 'WrongPassword1!' })).rejects.toThrow(
        /Invalid email or password/
      );
    });

    it('blocks login for a suspended account', async () => {
      const user = await createTestUser({ email: 'suspended@example.com', password: 'SecurePass1!' });
      user.accountStatus = 'suspended';
      await user.save();

      await expect(authService.login({ email: 'suspended@example.com', password: 'SecurePass1!' })).rejects.toThrow(
        /suspended/
      );
    });

    it('blocks login for a banned account', async () => {
      const user = await createTestUser({ email: 'banned@example.com', password: 'SecurePass1!' });
      user.accountStatus = 'banned';
      await user.save();

      await expect(authService.login({ email: 'banned@example.com', password: 'SecurePass1!' })).rejects.toThrow(
        /banned/
      );
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('does not throw for a non-existent email (avoids enumeration)', async () => {
      await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
    });

    it('rejects an invalid or expired reset token', async () => {
      await expect(authService.resetPassword('not-a-real-token', 'NewPassword1!')).rejects.toThrow(/invalid or has expired/);
    });
  });
});
