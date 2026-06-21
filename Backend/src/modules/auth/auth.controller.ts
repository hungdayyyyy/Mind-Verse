import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { env, config } from '@config/index';
import { authService } from './auth.service';
import { RegisterBody, LoginBody, ForgotPasswordBody, ResetPasswordBody } from './auth.schema';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as RegisterBody;
  const { result, refreshToken } = await authService.register(body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as LoginBody;
  const { result, refreshToken } = await authService.login(body);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.logout(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(200).json({ data: { success: true } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const { accessToken, refreshToken } = await authService.refreshAccessToken(presented);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ data: { accessToken } });
});

export const googleRedirect = asyncHandler(async (req: Request, res: Response) => {
  const state = randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, secure: config.isProduction, maxAge: 10 * 60 * 1000 });
  const url = authService.getGoogleAuthUrl(state);
  res.redirect(url);
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const cookieState = req.cookies?.oauth_state as string | undefined;

  if (!code) {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_denied`);
    return;
  }

  if (!state || state !== cookieState) {
    res.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
    return;
  }

  const { result, refreshToken } = await authService.loginWithGoogle(code);
  setRefreshCookie(res, refreshToken);
  res.clearCookie('oauth_state');

  // Hand the access token to the frontend via a short-lived URL fragment;
  // the frontend immediately exchanges it for a stored session and strips the URL.
  res.redirect(`${env.FRONTEND_URL}/auth/callback#accessToken=${result.accessToken}`);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ForgotPasswordBody;
  await authService.forgotPassword(body.email);
  res.status(200).json({ data: { message: 'If that email exists, a reset link has been sent.' } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ResetPasswordBody;
  await authService.resetPassword(body.token, body.newPassword);
  res.status(200).json({ data: { success: true } });
});
