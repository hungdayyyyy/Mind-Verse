import { Router, Request } from 'express';
import { authenticate, authenticateOptional } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { checkProjectAccess } from '@middleware/rbac.middleware';
import { contentService } from '@modules/content/content.service';
import { updateNotesSchema } from './notes.schema';
import { getNotes, updateNotes, getNotesHistory } from './notes.controller';

const router = Router();

async function resolveProjectIdFromContentId(req: Request): Promise<string> {
  return contentService.getProjectIdForContent(req.params.contentId);
}

router.get('/:contentId', authenticateOptional, getNotes);
router.put('/:contentId', authenticate, validate(updateNotesSchema), checkProjectAccess('editor', resolveProjectIdFromContentId), updateNotes);
router.get('/:contentId/history', authenticate, checkProjectAccess('viewer', resolveProjectIdFromContentId), getNotesHistory);

export { router as notesRouter };
