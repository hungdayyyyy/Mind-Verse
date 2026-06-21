import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { userService } from './user.service';
import { UpdateUserBody } from './user.schema';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: req.user!.toPublicJSON() });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateUserBody;
  const user = await userService.updateProfile(req.user!.id, body);
  res.json({ data: user.toPublicJSON() });
});

export const getMyStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await userService.getStats(req.user!.id);
  res.json({ data: stats });
});

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  await userService.requestAccountDeletion(req.user!.id);
  res.status(202).json({ data: { message: 'Account deletion scheduled.' } });
});
