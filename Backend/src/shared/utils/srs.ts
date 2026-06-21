/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Reference implementation of the SuperMemo SM-2 algorithm, used to schedule
 * flashcard reviews. See SRS.md FR-043 and DATABASE.md §4.7 for the product spec.
 *
 * Rating scale used by LearnWave's UI (0–3, mapped from the classic 0–5 SM-2 scale):
 *   0 = Again  (no recall — classic SM-2 quality 0-2)
 *   1 = Hard   (recalled with serious difficulty — quality 3)
 *   2 = Good   (recalled with some effort — quality 4)
 *   3 = Easy   (recalled instantly — quality 5)
 */

export type SRSRating = 0 | 1 | 2 | 3;

export interface SRSData {
  interval: number; // days until next review
  easeFactor: number; // multiplier applied to interval on success (>= 1.3)
  repetitions: number; // consecutive successful reviews
  lapses: number; // total number of times rated "Again"
}

export interface SRSResult extends SRSData {
  dueDate: Date;
}

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const SECOND_INTERVAL_DAYS = 6;

/**
 * Computes the next review state for a flashcard given the user's recall rating.
 *
 * @param current - The card's current SRS data. Pass `{ interval: 1, easeFactor: 2.5,
 *   repetitions: 0, lapses: 0 }` for a brand-new card.
 * @param rating - User's self-reported recall quality (0=Again, 1=Hard, 2=Good, 3=Easy).
 * @param now - Reference date for computing `dueDate` (defaults to current time; pass
 *   explicitly in tests for determinism).
 * @returns Updated SRS state including the new `dueDate`.
 *
 * @example
 * const next = calculateNextReview({ interval: 6, easeFactor: 2.5, repetitions: 1, lapses: 0 }, 2);
 * // → { interval: 15, easeFactor: 2.5, repetitions: 2, lapses: 0, dueDate: <now + 15 days> }
 */
export function calculateNextReview(current: SRSData, rating: SRSRating, now: Date = new Date()): SRSResult {
  let { interval, easeFactor, repetitions, lapses } = current;

  if (rating === 0) {
    // "Again" — recall failed. Reset repetitions, shrink interval, penalize ease factor.
    interval = 1;
    repetitions = 0;
    lapses += 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = SECOND_INTERVAL_DAYS;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // SM-2 ease factor adjustment formula, mapped from our 0-3 rating to
    // the classic 0-5 quality scale used in the original algorithm.
    const quality = mapRatingToQuality(rating);
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + delta);
    repetitions += 1;
  }

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + interval);

  return { interval, easeFactor, repetitions, lapses, dueDate };
}

/** Maps LearnWave's 0-3 UI rating to the classic SM-2 0-5 quality scale. */
function mapRatingToQuality(rating: SRSRating): number {
  switch (rating) {
    case 1:
      return 3; // Hard
    case 2:
      return 4; // Good
    case 3:
      return 5; // Easy
    default:
      return 0;
  }
}

/** Default SRS state for a freshly created flashcard. */
export function createInitialSRSData(): SRSData & { dueDate: Date } {
  return {
    interval: 1,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
    lapses: 0,
    dueDate: new Date(),
  };
}
