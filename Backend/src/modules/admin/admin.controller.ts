import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { adminService, toAdminView } from './admin.service';
import {
  ListUsersQuery,
  ChangePlanBody,
  ChangeSystemRoleBody,
  SuspendUserBody,
  BanUserBody,
} from './admin.schema';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated!.query as ListUsersQuery;
  const result = await adminService.listUsers(query);
  res.json({
    data: result.data.map((u) => toAdminView(u)),
    nextCursor: result.nextCursor,
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.getUserById(req.params.id);
  res.json({ data: user });
});

export const getDashboardMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await adminService.getDashboardMetrics();
  res.json({ data: metrics });
});

export const changePlan = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ChangePlanBody;
  const user = await adminService.changePlan(req.user!, req.params.id, body.plan, body.reason);
  res.json({ data: user });
});

export const changeSystemRole = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ChangeSystemRoleBody;
  const user = await adminService.changeSystemRole(req.user!, req.params.id, body.systemRole, body.reason);
  res.json({ data: user });
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as SuspendUserBody;
  const user = await adminService.suspendUser(req.user!, req.params.id, body.reason, body.durationDays);
  res.json({ data: user });
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as BanUserBody;
  const user = await adminService.banUser(req.user!, req.params.id, body.reason);
  res.json({ data: user });
});

export const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.reactivateUser(req.user!, req.params.id);
  res.json({ data: user });
});

export const forcePasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await adminService.forcePasswordReset(req.user!, req.params.id);
  res.json({ data: { success: true } });
});

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { targetUserId, actorId, action, cursor, limit } = req.query as Record<string, string | undefined>;
  const result = await adminService.getAuditLog({
    targetUserId,
    actorId,
    action,
    cursor,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ data: result.data, nextCursor: result.nextCursor });
});
