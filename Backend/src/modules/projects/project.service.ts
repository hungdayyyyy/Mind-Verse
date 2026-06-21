import { Project, ProjectDocument } from './project.model';
import { User } from '@modules/users/user.model';
import { NotFoundError, PlanLimitError, ForbiddenError } from '@shared/errors';
import { paginate, PaginatedResult } from '@shared/utils/paginate';
import { generateShareToken } from '@shared/utils/generateToken';
import { config } from '@config/index';
import { logger } from '@config/logger';
import { emailService } from '@shared/services/email.service';
import { env } from '@config/index';
import {
  CreateProjectBody,
  UpdateProjectBody,
  AddMemberBody,
  UpdateMemberRoleBody,
  ShareProjectBody,
} from './project.schema';

export const projectService = {
  /**
   * Creates a new project for the given user. Enforces the Free plan's
   * 5-project limit (Pro plan has no limit).
   * @throws PlanLimitError if a Free user has reached their project limit.
   */
  async createProject(ownerId: string, plan: 'free' | 'pro' | 'premium', input: CreateProjectBody): Promise<ProjectDocument> {
    const limit = config.plans[plan].maxProjects;
    if (Number.isFinite(limit)) {
      const count = await Project.countDocuments({ ownerId, deletedAt: null });
      if (count >= limit) {
        throw new PlanLimitError(
          plan === 'free'
            ? 'Free plan is limited to 5 projects. Upgrade to Pro or Premium for unlimited projects.'
            : `Your plan is limited to ${limit} projects.`,
          { limit }
        );
      }
    }

    const project = await Project.create({
      name: input.name,
      description: input.description ?? '',
      color: input.color,
      icon: input.icon,
      ownerId,
      members: [{ userId: ownerId, role: 'owner', joinedAt: new Date() }],
    });

    logger.info('Project created', { projectId: project._id.toString(), ownerId });
    return project;
  },

  /** Lists all projects the user owns or is a member of, paginated, most recently active first. */
  async listForUser(userId: string, cursor?: string, limit?: number): Promise<PaginatedResult<ProjectDocument>> {
    return paginate(
      Project,
      { $or: [{ ownerId: userId }, { 'members.userId': userId }], deletedAt: null },
      { cursor, limit }
    );
  },

  async getById(projectId: string): Promise<ProjectDocument> {
    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async updateProject(projectId: string, input: UpdateProjectBody): Promise<ProjectDocument> {
    const project = await this.getById(projectId);
    Object.assign(project, input);
    project.lastActivityAt = new Date();
    await project.save();
    return project;
  },

  /**
   * Soft-deletes a project and cascades soft-deletion to its folders and
   * content items. The actual cascade is delegated to lazy-imported services
   * to avoid circular module dependencies at load time.
   */
  async deleteProject(projectId: string): Promise<void> {
    const project = await this.getById(projectId);
    project.deletedAt = new Date();
    await project.save();

    const { Folder } = await import('@modules/folders/folder.model');
    const { ContentItem } = await import('@modules/content/content.model');

    await Promise.all([
      Folder.updateMany({ projectId, deletedAt: null }, { deletedAt: new Date() }),
      ContentItem.updateMany({ projectId, deletedAt: null }, { deletedAt: new Date() }),
    ]);

    logger.info('Project soft-deleted (cascaded to folders/content)', { projectId });
  },

  async listMembers(projectId: string): Promise<Array<{ userId: string; name: string; email: string; role: string; joinedAt: Date }>> {
    const project = await this.getById(projectId);
    const userIds = project.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return project.members.map((m) => {
      const u = userMap.get(m.userId.toString());
      return {
        userId: m.userId.toString(),
        name: u?.name ?? 'Unknown User',
        email: u?.email ?? '',
        role: m.role,
        joinedAt: m.joinedAt,
      };
    });
  },

  /**
   * Invites a user to a project by email. If the email belongs to an
   * existing user, they are added as a member immediately and notified by
   * email. If not, a registration invite is sent (the member entry is
   * deferred until they register — left as a TODO hook for a pending-invites
   * collection in a full implementation).
   */
  async addMember(projectId: string, inviterName: string, input: AddMemberBody): Promise<void> {
    const project = await this.getById(projectId);
    const invitee = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null });

    if (invitee) {
      const alreadyMember = project.members.some((m) => m.userId.toString() === invitee._id.toString());
      if (!alreadyMember) {
        project.members.push({ userId: invitee._id, role: input.role, joinedAt: new Date() });
        await project.save();
      }
    }

    const inviteUrl = `${env.FRONTEND_URL}/projects/${projectId}`;
    await emailService.sendProjectInviteEmail(input.email, inviterName, project.name, inviteUrl);

    logger.info('Project member invited', { projectId, email: input.email, role: input.role });
  },

  async updateMemberRole(projectId: string, targetUserId: string, input: UpdateMemberRoleBody): Promise<void> {
    const project = await this.getById(projectId);
    const member = project.members.find((m) => m.userId.toString() === targetUserId);
    if (!member) throw new NotFoundError('Project member');
    member.role = input.role;
    await project.save();
  },

  async removeMember(projectId: string, targetUserId: string): Promise<void> {
    const project = await this.getById(projectId);
    if (project.ownerId.toString() === targetUserId) {
      throw new ForbiddenError('Cannot remove the project owner');
    }
    project.members = project.members.filter((m) => m.userId.toString() !== targetUserId);
    await project.save();
  },

  async createShareLink(projectId: string, ownerId: string, input: ShareProjectBody): Promise<{ url: string; token: string }> {
    const project = await this.getById(projectId);
    const token = generateShareToken();
    project.shareToken = token;
    project.isPublic = true;
    await project.save();

    // Persist full share-link metadata (permissions, expiry) in the shared ShareLink collection.
    const { ShareLink } = await import('@modules/content/shareLink.model');
    await ShareLink.create({
      resourceType: 'project',
      resourceId: project._id,
      token,
      ownerId,
      permissions: input.permissions,
      expiresAt: input.expiresAt ?? null,
    });

    return { url: `${env.FRONTEND_URL}/shared/${token}`, token };
  },
};
