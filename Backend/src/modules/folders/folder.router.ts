import { Router, Request } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { checkProjectAccess } from '@middleware/rbac.middleware';
import { Folder } from './folder.model';
import { NotFoundError } from '@shared/errors';
import {
  createFolderSchema,
  updateFolderSchema,
  moveFolderSchema,
  listFoldersQuerySchema,
} from './folder.schema';
import { listFolders, createFolder, getFolder, updateFolder, deleteFolder, moveFolder } from './folder.controller';

const router = Router();

router.use(authenticate);

/** Resolves the owning project id for routes identified by folder :id. */
async function resolveProjectIdFromFolderParam(req: Request): Promise<string> {
  const folder = await Folder.findOne({ _id: req.params.id, deletedAt: null });
  if (!folder) throw new NotFoundError('Folder');
  return folder.projectId.toString();
}

router.get('/', validate(listFoldersQuerySchema), checkProjectAccess('viewer', async (req) => req.query.projectId as string), listFolders);
router.post('/', validate(createFolderSchema), checkProjectAccess('editor', async (req) => req.body.projectId as string), createFolder);
router.get('/:id', checkProjectAccess('viewer', resolveProjectIdFromFolderParam), getFolder);
router.patch('/:id', validate(updateFolderSchema), checkProjectAccess('editor', resolveProjectIdFromFolderParam), updateFolder);
router.delete('/:id', checkProjectAccess('editor', resolveProjectIdFromFolderParam), deleteFolder);
router.post('/:id/move', validate(moveFolderSchema), checkProjectAccess('editor', resolveProjectIdFromFolderParam), moveFolder);

export { router as folderRouter };
