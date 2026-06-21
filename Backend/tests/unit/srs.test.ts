import { calculateNextReview, createInitialSRSData } from '@shared/utils/srs';

describe('SRS algorithm (SM-2)', () => {
  const fixedNow = new Date('2025-01-01T00:00:00.000Z');

  it('creates correct initial state for a new card', () => {
    const initial = createInitialSRSData();
    expect(initial.interval).toBe(1);
    expect(initial.easeFactor).toBe(2.5);
    expect(initial.repetitions).toBe(0);
    expect(initial.lapses).toBe(0);
  });

  it('sets interval to 1 day on first successful review (Good)', () => {
    const result = calculateNextReview({ interval: 1, easeFactor: 2.5, repetitions: 0, lapses: 0 }, 2, fixedNow);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.dueDate.toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('sets interval to 6 days on second successful review', () => {
    const result = calculateNextReview({ interval: 1, easeFactor: 2.5, repetitions: 1, lapses: 0 }, 2, fixedNow);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('multiplies interval by ease factor on subsequent reviews', () => {
    const result = calculateNextReview({ interval: 6, easeFactor: 2.5, repetitions: 2, lapses: 0 }, 2, fixedNow);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.repetitions).toBe(3);
  });

  it('resets interval and repetitions on "Again" (rating 0)', () => {
    const result = calculateNextReview({ interval: 15, easeFactor: 2.5, repetitions: 3, lapses: 0 }, 0, fixedNow);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.lapses).toBe(1);
  });

  it('decreases ease factor on "Again" but never below 1.3', () => {
    const result = calculateNextReview({ interval: 1, easeFactor: 1.35, repetitions: 0, lapses: 0 }, 0, fixedNow);
    expect(result.easeFactor).toBeCloseTo(1.3, 5);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('increases ease factor more for "Easy" than for "Good"', () => {
    const goodResult = calculateNextReview({ interval: 6, easeFactor: 2.5, repetitions: 2, lapses: 0 }, 2, fixedNow);
    const easyResult = calculateNextReview({ interval: 6, easeFactor: 2.5, repetitions: 2, lapses: 0 }, 3, fixedNow);
    expect(easyResult.easeFactor).toBeGreaterThan(goodResult.easeFactor);
  });

  it('never lets ease factor drop below the 1.3 floor even after repeated lapses', () => {
    let state = { interval: 1, easeFactor: 1.4, repetitions: 0, lapses: 0 };
    for (let i = 0; i < 5; i++) {
      state = calculateNextReview(state, 0, fixedNow);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('computes dueDate as now + interval days', () => {
    const result = calculateNextReview({ interval: 1, easeFactor: 2.5, repetitions: 1, lapses: 0 }, 2, fixedNow);
    const expected = new Date(fixedNow);
    expected.setDate(expected.getDate() + result.interval);
    expect(result.dueDate.toISOString()).toBe(expected.toISOString());
  });
});
