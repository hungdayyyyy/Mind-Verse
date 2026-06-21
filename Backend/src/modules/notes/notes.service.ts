import { Notes } from './notes.model';
import { NotesDocument, NoteBlock } from './notes.model';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { Types } from 'mongoose';

export const notesService = {
  async getByContentId(contentItemId: string): Promise<NotesDocument> {
    const notes = await Notes.findOne({ contentItemId });
    if (!notes) throw new NotFoundError('Notes');
    return notes;
  },

  /** Creates or replaces the AI-generated notes for a content item (called by the worker). */
  async upsertGenerated(contentItemId: string, ownerId: string, blocks: NoteBlock[]): Promise<NotesDocument> {
    const existing = await Notes.findOne({ contentItemId });
    if (existing) {
      existing.blocks = blocks;
      existing.isAiGenerated = true;
      await existing.save();
      return existing;
    }
    return Notes.create({ contentItemId, ownerId, blocks, isAiGenerated: true });
  },

  /**
   * Manually edits notes (Pro feature, FR-035). Snapshots the prior version
   * into history before overwriting, keeping the last 10 versions.
   */
  async editNotes(contentItemId: string, editedBy: string, blocks: NoteBlock[]): Promise<NotesDocument> {
    const notes = await this.getByContentId(contentItemId);
    (notes as NotesDocument & { snapshotBeforeEdit: (id: Types.ObjectId) => void }).snapshotBeforeEdit(
      new Types.ObjectId(editedBy)
    );
    notes.blocks = blocks;
    notes.isAiGenerated = false;
    notes.lastEditedAt = new Date();
    await notes.save();
    return notes;
  },

  async getHistory(contentItemId: string): Promise<Array<{ version: number; savedAt: Date; savedBy: string | null }>> {
    const notes = await this.getByContentId(contentItemId);
    return notes.versionHistory.map((v) => ({
      version: v.version,
      savedAt: v.savedAt,
      savedBy: v.savedBy?.toString() ?? null,
    }));
  },
};
