import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { contentService } from './content.service';
import {
  UploadContentBody,
  YoutubeIngestBody,
  UpdateContentBody,
  ReprocessContentBody,
  ShareContentBody,
} from './content.schema';

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, folderId, cursor, limit } = req.query as Record<string, string | undefined>;
  const result = await contentService.listByProject(projectId, folderId, cursor, limit ? Number(limit) : undefined);
  res.json({ data: result.data, nextCursor: result.nextCursor });
});

export const uploadContent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UploadContentBody;
  const result = await contentService.initiateUpload(req.user!.id, req.user!.plan, body);
  res.status(201).json({ data: result });
});

export const ingestYoutube = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as YoutubeIngestBody;
  const item = await contentService.ingestYoutube(req.user!.id, body);
  res.status(201).json({ data: item });
});

export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const item = await contentService.getById(req.params.id);
  res.json({ data: item });
});

export const updateContent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateContentBody;
  const item = await contentService.updateContent(req.params.id, body);
  res.json({ data: item });
});

export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  await contentService.deleteContent(req.params.id);
  res.json({ data: { success: true } });
});

export const reprocessContent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ReprocessContentBody;
  await contentService.reprocess(req.params.id, body.stage);
  res.status(202).json({ data: { status: 'queued' } });
});

export const shareContent = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ShareContentBody;
  const result = await contentService.createShareLink(req.params.id, req.user!.id, body);
  res.status(201).json({ data: result });
});

/**
 * Cloudinary webhook receiver — confirms an upload has landed and triggers
 * the processing pipeline. Verifies the webhook signature before trusting
 * the payload (see middleware applied in content.router.ts).
 */
export const cloudinaryWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { public_id: contentItemId, secure_url: cloudinaryUrl, duration, thumbnail_url: thumbnailUrl } = req.body as {
    public_id: string;
    secure_url: string;
    duration?: number;
    thumbnail_url?: string;
  };

  await contentService.confirmUploadComplete(contentItemId, {
    cloudinaryId: contentItemId,
    cloudinaryUrl,
    duration,
    thumbnailUrl,
  });

  res.status(200).json({ received: true });
});
