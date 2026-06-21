import { MindMap, MindMapDocument, MindMapNode, MindMapEdge } from './mindmap.model';
import { NotFoundError } from '@shared/errors';

export const mindMapService = {
  async getByContentId(contentItemId: string): Promise<MindMapDocument> {
    const map = await MindMap.findOne({ contentItemId });
    if (!map) throw new NotFoundError('Mind map');
    return map;
  },

  async upsertGenerated(contentItemId: string, ownerId: string, nodes: MindMapNode[], edges: MindMapEdge[]): Promise<MindMapDocument> {
    const existing = await MindMap.findOne({ contentItemId });
    if (existing) {
      existing.nodes = nodes;
      existing.edges = edges;
      existing.isAiGenerated = true;
      await existing.save();
      return existing;
    }
    return MindMap.create({ contentItemId, ownerId, nodes, edges, isAiGenerated: true });
  },

  async update(contentItemId: string, nodes: MindMapNode[], edges: MindMapEdge[]): Promise<MindMapDocument> {
    const map = await this.getByContentId(contentItemId);
    map.nodes = nodes;
    map.edges = edges;
    map.isAiGenerated = false;
    map.version += 1;
    await map.save();
    return map;
  },
};
