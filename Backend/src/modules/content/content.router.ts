import { Router, Request } from 'express';
import { authenticate, authenticateOptional } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { checkProjectAccess } from '@middleware/rbac.middleware';
import { aiRateLimit } from '@middleware/rateLimit.middleware';
import { contentService } from './content.service';
import {
  uploadContentSchema,
  youtubeIngestSchema,
  updateContentSchema,
  reprocessContentSchema,
  shareContentSchema,
  listContentQuerySchema,
} from './content.schema';
import {
  listContent,
  uploadContent,
  ingestYoutube,
  getContent,
  updateContent,
  deleteContent,
  reprocessContent,
  shareContent,
  cloudinaryWebhook,
} from './content.controller';

const router = Router();

/** Resolves the owning project id for routes identified by content :id. */
async function resolveProjectIdFromContentParam(req: Request): Promise<string> {
  return contentService.getProjectIdForContent(req.params.id);
}

// Cloudinary webhook is unauthenticated (verified by signature instead) and
// must be registered before the `authenticate` blanket middleware below.
router.post('/webhook/cloudinary', cloudinaryWebhook);

router.use(authenticate);

router.get('/', validate(listContentQuerySchema), listContent);
router.post('/upload', validate(uploadContentSchema), checkProjectAccess('editor', async (req) => req.body.projectId as string), uploadContent);
router.post('/youtube', validate(youtubeIngestSchema), checkProjectAccess('editor', async (req) => req.body.projectId as string), ingestYoutube);
router.get('/:id', authenticateOptional, getContent); // public if item.isPublic; ownership enforced in service for private items in a full impl
router.patch('/:id', validate(updateContentSchema), checkProjectAccess('editor', resolveProjectIdFromContentParam), updateContent);
router.delete('/:id', checkProjectAccess('owner', resolveProjectIdFromContentParam), deleteContent);
router.post(
  '/:id/reprocess',
  aiRateLimit,
  validate(reprocessContentSchema),
  checkProjectAccess('editor', resolveProjectIdFromContentParam),
  reprocessContent
);
router.post('/:id/share', validate(shareContentSchema), checkProjectAccess('editor', resolveProjectIdFromContentParam), shareContent);

export { router as contentRouter };
