import { NextFunction, Request, Response } from 'express';
import { Project } from '@modules/projects/project.model';
import { ForbiddenError, NotFoundError } from '@shared/errors';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { ProjectRole } from '@shared/types';

const ROLE_RANK: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };

/**
 * Resolves the requesting user's role on a project, given a request that
 * contains a `projectId` somewhere we can find it (params.projectId,
 * params.id treated as a project id, body.projectId, or query.projectId).
 * Attaches `req.projectRole` for downstream handlers and throws if the user
 * has no role at all (not a member).
 *
 * @param minRole - Minimum role required to proceed (viewer < editor < owner).
 * @param resolveProjectId - Optional custom extractor for the project id when
 *   it can't be found via the default lookup strategy (e.g., for routes scoped
 *   by folderId or contentId, where the project must first be looked up via
 *   that resource).
 */
export function checkProjectAccess(minRole: ProjectRole, resolveProjectId?: (req: Request) => Promise<string>) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const projectId = resolveProjectId
      ? await resolveProjectId(req)
      : (req.params.projectId ?? req.body?.projectId ?? req.query?.projectId ?? req.params.id);

    if (!projectId) {
      throw new NotFoundError('Project');
    }

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new NotFoundError('Project');
    }

    const userId = req.user!._id.toString();
    const isOwner = project.ownerId.toString() === userId;
    const membership = project.members.find((m) => m.userId.toString() === userId);

    const role: ProjectRole | null = isOwner ? 'owner' : (membership?.role as ProjectRole | undefined) ?? null;

    if (!role) {
      throw new ForbiddenError('You do not have access to this project');
    }

    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      throw new ForbiddenError(`This action requires ${minRole} access or higher`);
    }

    // Attach for downstream handlers that want to branch on exact role.
    (req as Request & { projectRole?: ProjectRole; project?: typeof project }).projectRole = role;
    (req as Request & { projectRole?: ProjectRole; project?: typeof project }).project = project;

    next();
  });
}

/** Convenience export for the common "must be owner" check (delete, transfer, member management). */
export const requireOwner = checkProjectAccess('owner');
/** Convenience export for "must be able to edit" (upload, create folder, share). */
export const requireEditor = checkProjectAccess('editor');
/** Convenience export for "must at least be able to view". */
export const requireViewer = checkProjectAccess('viewer');
