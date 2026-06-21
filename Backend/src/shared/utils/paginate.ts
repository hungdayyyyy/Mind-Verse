import { FilterQuery, Model, Types } from 'mongoose';

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Cursor-based pagination over a Mongoose model, ordered by _id descending
 * (i.e., newest first — consistent with MongoDB ObjectId's embedded timestamp).
 *
 * Use for any list endpoint that needs stable pagination under concurrent writes,
 * which offset/skip pagination does not guarantee.
 *
 * @example
 * const { data, nextCursor } = await paginate(ContentItem, { projectId, deletedAt: null }, { cursor, limit });
 */
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const cursorFilter: FilterQuery<T> = options.cursor
    ? { ...filter, _id: { $lt: new Types.ObjectId(options.cursor) } }
    : filter;

  // Fetch one extra record to determine if there's a next page.
  const results = await model
    .find(cursorFilter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .exec();

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const last = data[data.length - 1] as unknown as { _id: Types.ObjectId } | undefined;

  return {
    data,
    nextCursor: hasMore && last ? last._id.toString() : null,
  };
}
