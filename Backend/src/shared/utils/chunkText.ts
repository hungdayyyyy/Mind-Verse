/**
 * Splits text into overlapping chunks suitable for embedding generation.
 * Uses a rough token estimate (1 token ≈ 4 characters in English) since we
 * don't want a heavyweight tokenizer dependency just for chunk sizing —
 * the OpenAI embeddings call will truncate/reject if we're ever off by a
 * little, and the overlap makes boundary errors harmless for retrieval quality.
 */

export interface TextChunk {
  text: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

const CHARS_PER_TOKEN_ESTIMATE = 4;

/**
 * @param text - Full source text (e.g., a transcript or extracted document text).
 * @param chunkTokenSize - Target chunk size in tokens (default 500, per config.rag).
 * @param overlapTokens - Token overlap between consecutive chunks (default 100).
 */
export function chunkText(text: string, chunkTokenSize = 500, overlapTokens = 100): TextChunk[] {
  const chunkCharSize = chunkTokenSize * CHARS_PER_TOKEN_ESTIMATE;
  const overlapCharSize = overlapTokens * CHARS_PER_TOKEN_ESTIMATE;
  const stride = chunkCharSize - overlapCharSize;

  if (stride <= 0) {
    throw new Error('overlapTokens must be smaller than chunkTokenSize');
  }

  const chunks: TextChunk[] = [];
  let chunkIndex = 0;
  let start = 0;

  const normalized = text.trim();
  if (!normalized) return chunks;

  while (start < normalized.length) {
    const end = Math.min(start + chunkCharSize, normalized.length);
    const slice = normalized.slice(start, end).trim();

    if (slice.length > 0) {
      chunks.push({ text: slice, chunkIndex, startChar: start, endChar: end });
      chunkIndex += 1;
    }

    if (end >= normalized.length) break;
    start += stride;
  }

  return chunks;
}

/**
 * Maps a character offset back to an approximate timestamp using the
 * transcript's segment list — used to attach video/audio timestamps to
 * embedding chunk metadata so RAG citations can deep-link into the source.
 */
export function findTimestampForCharOffset(
  segments: Array<{ start: number; end: number; text: string }>,
  charOffset: number
): number | null {
  let cursor = 0;
  for (const segment of segments) {
    const segmentLength = segment.text.length + 1; // +1 for the joining space
    if (charOffset >= cursor && charOffset < cursor + segmentLength) {
      return segment.start;
    }
    cursor += segmentLength;
  }
  return segments.length > 0 ? segments[segments.length - 1].start : null;
}
