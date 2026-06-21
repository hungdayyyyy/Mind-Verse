import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { projectService } from './project.service';
import {
  CreateProjectBody,
  UpdateProjectBody,
  AddMemberBody,
  UpdateMemberRoleBody,
  ShareProjectBody,
} from './project.schema';

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateProjectBody;
  const project = await projectService.createProject(req.user!.id, req.user!.plan, body);
  res.status(201).json({ data: project });
});

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const { cursor, limit } = req.query as { cursor?: string; limit?: string };
  const result = await projectService.listForUser(req.user!.id, cursor, limit ? Number(limit) : undefined);
  res.json({ data: result.data, nextCursor: result.nextCursor });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getById(req.params.id);
  res.json({ data: project });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateProjectBody;
  const project = await projectService.updateProject(req.params.id, body);
  res.json({ data: project });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.id);
  res.json({ data: { success: true } });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await projectService.listMembers(req.params.id);
  res.json({ data: members });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as AddMemberBody;
  await projectService.addMember(req.params.id, req.user!.name, body);
  res.status(201).json({ data: { success: true, invited: true } });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateMemberRoleBody;
  await projectService.updateMemberRole(req.params.id, req.params.userId, body);
  res.json({ data: { success: true } });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await projectService.removeMember(req.params.id, req.params.userId);
  res.json({ data: { success: true } });
});

export const shareProject = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ShareProjectBody;
  const result = await projectService.createShareLink(req.params.id, req.user!.id, body);
  res.status(201).json({ data: result });
});
