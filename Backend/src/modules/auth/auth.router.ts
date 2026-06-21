import { Router } from 'express';
import { validate } from '@middleware/validate.middleware';
import { authenticate } from '@middleware/auth.middleware';
import { authRateLimit } from '@middleware/rateLimit.middleware';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';
import {
  register,
  login,
  logout,
  refresh,
  googleRedirect,
  googleCallback,
  forgotPassword,
  resetPassword,
} from './auth.controller';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), resetPassword);

export { router as authRouter };
