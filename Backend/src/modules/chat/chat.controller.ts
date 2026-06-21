import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { chatService } from './chat.service';
import { SendMessageBody, RenameSessionBody } from './chat.schema';

/** Streams the RAG response via Server-Sent Events. */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as SendMessageBody;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  await chatService.sendMessageStreaming(req.user!.id, body, res);
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await chatService.listSessions(req.user!.id);
  res.json({ data: sessions });
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await chatService.getSession(req.params.id, req.user!.id);
  res.json({ data: session });
});

export const renameSession = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as RenameSessionBody;
  const session = await chatService.renameSession(req.params.id, req.user!.id, body.title);
  res.json({ data: session });
});

export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  await chatService.deleteSession(req.params.id, req.user!.id);
  res.json({ data: { success: true } });
});
