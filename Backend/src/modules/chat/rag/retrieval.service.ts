import { Embedding } from './embedding.model';
import { embeddingsService } from './embeddings.service';
import { cosineSimilarity } from '@shared/utils/cosineSimilarity';
import { config } from '@config/index';
import { logger } from '@config/logger';

export interface RetrievedChunk {
  contentItemId: string;
  chunkText: string;
  relevanceScore: number;
  startTime: number | null;
  pageNumber: number | null;
}

/**
 * Vector similarity retrieval for RAG. This MongoDB-backed implementation
 * does a brute-force cosine similarity scan, which is fine up to a few
 * thousand chunks per query scope (single content item or a user's full
 * library) but should be swapped for Pinecone's ANN index at larger scale
 * (see SDS.md §5.3 — PINECONE_* env vars are reserved for that path).
 */
export const retrievalService = {
  /**
   * Retrieves the top-K most relevant chunks for a query, scoped either to
   * a single content item (content-specific chat) or to all of a user's
   * content (Global AI Tutor mode when contentItemId is omitted).
   */
  async retrieveRelevantChunks(
    query: string,
    opts: { contentItemId?: string; ownerId: string; topK?: number }
  ): Promise<RetrievedChunk[]> {
    const queryEmbedding = await embeddingsService.embedQuery(query);
    const topK = opts.topK ?? config.rag.topK;

    const filter: Record<string, unknown> = { ownerId: opts.ownerId };
    if (opts.contentItemId) filter.contentItemId = opts.contentItemId;

    const candidates = await Embedding.find(filter).select('contentItemId chunkText embedding metadata').lean();

    if (candidates.length === 0) {
      logger.debug('No embeddings found for RAG query scope', { ownerId: opts.ownerId, contentItemId: opts.contentItemId });
      return [];
    }

    const scored = candidates.map((c) => ({
      contentItemId: c.contentItemId.toString(),
      chunkText: c.chunkText,
      relevanceScore: cosineSimilarity(queryEmbedding, c.embedding),
      startTime: c.metadata?.startTime ?? null,
      pageNumber: c.metadata?.pageNumber ?? null,
    }));

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, topK);
  },

  /** Builds a single context string from retrieved chunks for the GPT-4o prompt. */
  buildContextString(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return '(No relevant content found.)';
    return chunks
      .map((c, i) => {
        const locator = c.startTime !== null ? `[t=${Math.round(c.startTime)}s]` : c.pageNumber !== null ? `[p.${c.pageNumber}]` : '';
        return `[Source ${i + 1}${locator ? ' ' + locator : ''}]\n${c.chunkText}`;
      })
      .join('\n\n');
  },
};
