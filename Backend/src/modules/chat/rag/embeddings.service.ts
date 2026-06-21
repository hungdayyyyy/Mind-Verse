import { openai, openaiModels } from '@config/openai';
import { config } from '@config/index';
import { logger } from '@config/logger';
import { chunkText, findTimestampForCharOffset } from '@shared/utils/chunkText';
import { TranscriptSegment } from '@modules/content/content.types';
import { Embedding } from './embedding.model';

const EMBEDDING_BATCH_SIZE = 50;

export const embeddingsService = {
  /**
   * Chunks the given text, generates embeddings for each chunk via OpenAI,
   * and persists them. Called by the embeddings worker (GenerateEmbeddingsJob)
   * after transcription/text-extraction completes.
   *
   * Chunks are embedded in batches to respect OpenAI's per-request input
   * array limits and to bound memory usage for very long transcripts.
   */
  async generateAndStore(
    contentItemId: string,
    ownerId: string,
    sourceText: string,
    segments: TranscriptSegment[] = []
  ): Promise<number> {
    const chunks = chunkText(sourceText, config.rag.chunkTokenSize, config.rag.chunkOverlapTokens);

    if (chunks.length === 0) {
      logger.warn('No chunks generated from source text; skipping embeddings', { contentItemId });
      return 0;
    }

    // Clear any prior embeddings for this content item (e.g., on reprocess).
    await Embedding.deleteMany({ contentItemId });

    let stored = 0;
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

      const response = await openai.embeddings.create({
        model: openaiModels.embedding,
        input: batch.map((c) => c.text),
      });

      const docs = batch.map((chunk, idx) => ({
        contentItemId,
        ownerId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        embedding: response.data[idx].embedding,
        metadata: {
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          startTime: segments.length > 0 ? findTimestampForCharOffset(segments, chunk.startChar) : null,
          endTime: null,
          pageNumber: null,
        },
        model: openaiModels.embedding,
      }));

      await Embedding.insertMany(docs);
      stored += docs.length;
    }

    logger.info('Embeddings generated and stored', { contentItemId, chunkCount: stored });
    return stored;
  },

  /** Generates a single embedding vector for an arbitrary query string (used by retrieval.service.ts). */
  async embedQuery(query: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: openaiModels.embedding,
      input: query,
    });
    return response.data[0].embedding;
  },
};
