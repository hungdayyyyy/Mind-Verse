import { Request, Response, Router } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { ForbiddenError } from '@shared/errors';
import { authenticate, authenticateOptional } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { checkProjectAccess } from '@middleware/rbac.middleware';
import { contentService } from '@modules/content/content.service';
import { mindMapService } from './mindmap.service';
import { updateMindMapSchema, UpdateMindMapBody } from './mindmap.schema';
import { planAtLeast } from '@config/index';

export const getMindMap = asyncHandler(async (req: Request, res: Response) => {
  const map = await mindMapService.getByContentId(req.params.contentId);
  res.json({ data: map });
});

export const updateMindMap = asyncHandler(async (req: Request, res: Response) => {
  if (!planAtLeast(req.user!.plan, 'pro')) {
    throw new ForbiddenError('Editing mind maps is a Pro feature. Upgrade to edit.');
  }
  const body = req.validated!.body as UpdateMindMapBody;
  const map = await mindMapService.update(req.params.contentId, body.nodes, body.edges);
  res.json({ data: map });
});

const router = Router();

async function resolveProjectIdFromContentId(req: Request): Promise<string> {
  return contentService.getProjectIdForContent(req.params.contentId);
}

router.get('/:contentId', authenticateOptional, getMindMap);
router.put(
  '/:contentId',
  authenticate,
  validate(updateMindMapSchema),
  checkProjectAccess('editor', resolveProjectIdFromContentId),
  updateMindMap
);

export { router as mindmapRouter };
