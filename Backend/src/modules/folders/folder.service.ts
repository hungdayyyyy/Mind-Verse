import { Folder, FolderDocument } from './folder.model';
import { NotFoundError, ValidationError } from '@shared/errors';
import { CreateFolderBody, UpdateFolderBody } from './folder.schema';

const MAX_DEPTH = 1; // 0-indexed: depth 0 = top-level, depth 1 = nested (2 levels total)

export const folderService = {
  async listByProject(projectId: string): Promise<FolderDocument[]> {
    return Folder.find({ projectId, deletedAt: null }).sort({ order: 1, createdAt: 1 });
  },

  async getById(folderId: string): Promise<FolderDocument> {
    const folder = await Folder.findOne({ _id: folderId, deletedAt: null });
    if (!folder) throw new NotFoundError('Folder');
    return folder;
  },

  /**
   * Creates a folder, enforcing the 2-level max nesting constraint
   * (FR-013): a folder may only be created under a parent that is itself
   * top-level (depth 0).
   */
  async createFolder(ownerId: string, input: CreateFolderBody): Promise<FolderDocument> {
    let depth = 0;

    if (input.parentFolderId) {
      const parent = await this.getById(input.parentFolderId);
      if (parent.depth >= MAX_DEPTH) {
        throw new ValidationError({
          formErrors: ['Maximum folder nesting depth (2 levels) exceeded.'],
          fieldErrors: {},
        });
      }
      depth = parent.depth + 1;
    }

    return Folder.create({
      name: input.name,
      projectId: input.projectId,
      parentFolderId: input.parentFolderId ?? null,
      ownerId,
      depth,
    });
  },

  async updateFolder(folderId: string, input: UpdateFolderBody): Promise<FolderDocument> {
    const folder = await this.getById(folderId);
    if (input.name !== undefined) folder.name = input.name;
    if (input.order !== undefined) folder.order = input.order;
    await folder.save();
    return folder;
  },

  /**
   * Moves a folder to a new parent (or to project root if null), re-validating
   * the nesting depth constraint at the destination.
   */
  async moveFolder(folderId: string, newParentFolderId: string | null): Promise<FolderDocument> {
    const folder = await this.getById(folderId);

    let newDepth = 0;
    if (newParentFolderId) {
      if (newParentFolderId === folderId) {
        throw new ValidationError({ formErrors: ['A folder cannot be moved into itself.'], fieldErrors: {} });
      }
      const newParent = await this.getById(newParentFolderId);
      if (newParent.depth >= MAX_DEPTH) {
        throw new ValidationError({
          formErrors: ['Maximum folder nesting depth (2 levels) exceeded.'],
          fieldErrors: {},
        });
      }
      newDepth = newParent.depth + 1;
    }

    folder.parentFolderId = newParentFolderId ? (newParentFolderId as unknown as typeof folder.parentFolderId) : null;
    folder.depth = newDepth;
    await folder.save();

    // If this folder has children, their depth must be recalculated too.
    await Folder.updateMany({ parentFolderId: folder._id, deletedAt: null }, { depth: newDepth + 1 });

    return folder;
  },

  /** Soft-deletes a folder and cascades to its content items. */
  async deleteFolder(folderId: string): Promise<void> {
    const folder = await this.getById(folderId);
    folder.deletedAt = new Date();
    await folder.save();

    const { ContentItem } = await import('@modules/content/content.model');
    await ContentItem.updateMany({ folderId, deletedAt: null }, { deletedAt: new Date() });
  },
};
