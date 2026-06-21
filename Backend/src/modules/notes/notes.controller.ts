import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { ForbiddenError } from '@shared/errors';
import { planAtLeast } from '@config/index';
import { notesService } from './notes.service';
import { UpdateNotesBody } from './notes.schema';

export const getNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await notesService.getByContentId(req.params.contentId);
  res.json({ data: notes });
});

export const updateNotes = asyncHandler(async (req: Request, res: Response) => {
  if (!planAtLeast(req.user!.plan, 'pro')) {
    throw new ForbiddenError('Editing notes is a Pro feature. Upgrade to edit your notes.');
  }
  const body = req.validated!.body as UpdateNotesBody;
  const notes = await notesService.editNotes(req.params.contentId, req.user!.id, body.blocks);
  res.json({ data: notes });
});

export const getNotesHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await notesService.getHistory(req.params.contentId);
  res.json({ data: history });
});
