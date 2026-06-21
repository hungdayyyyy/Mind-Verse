import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { requireOwner, requireEditor, requireViewer } from '@middleware/rbac.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  shareProjectSchema,
  listProjectsQuerySchema,
} from './project.schema';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  shareProject,
} from './project.controller';

const router = Router();

router.use(authenticate);

router.post('/', validate(createProjectSchema), createProject);
router.get('/', validate(listProjectsQuerySchema), listProjects);
router.get('/:id', requireViewer, getProject);
router.patch('/:id', requireEditor, validate(updateProjectSchema), updateProject);
router.delete('/:id', requireOwner, deleteProject);

router.get('/:id/members', requireViewer, listMembers);
router.post('/:id/members', requireOwner, validate(addMemberSchema), addMember);
router.patch('/:id/members/:userId', requireOwner, validate(updateMemberRoleSchema), updateMemberRole);
router.delete('/:id/members/:userId', requireOwner, removeMember);

router.post('/:id/share', requireEditor, validate(shareProjectSchema), shareProject);

export { router as projectRouter };
