import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { folderService } from './folder.service';
import { CreateFolderBody, UpdateFolderBody, MoveFolderBody } from './folder.schema';

export const listFolders = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.query as { projectId: string };
  const folders = await folderService.listByProject(projectId);
  res.json({ data: folders });
});

export const createFolder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateFolderBody;
  const folder = await folderService.createFolder(req.user!.id, body);
  res.status(201).json({ data: folder });
});

export const getFolder = asyncHandler(async (req: Request, res: Response) => {
  const folder = await folderService.getById(req.params.id);
  res.json({ data: folder });
});

export const updateFolder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateFolderBody;
  const folder = await folderService.updateFolder(req.params.id, body);
  res.json({ data: folder });
});

export const deleteFolder = asyncHandler(async (req: Request, res: Response) => {
  await folderService.deleteFolder(req.params.id);
  res.json({ data: { success: true } });
});

export const moveFolder = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as MoveFolderBody;
  const folder = await folderService.moveFolder(req.params.id, body.newParentFolderId);
  res.json({ data: folder });
});
