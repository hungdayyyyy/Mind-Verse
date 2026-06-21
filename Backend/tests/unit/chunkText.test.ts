import { chunkText, findTimestampForCharOffset } from '@shared/utils/chunkText';

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const chunks = chunkText('This is a short sentence.', 500, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('splits long text into multiple overlapping chunks', () => {
    const longText = 'word '.repeat(2000); // ~10,000 chars
    const chunks = chunkText(longText, 500, 100); // chunkCharSize=2000, stride=1600
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk (except the last) should be roughly chunkTokenSize * 4 chars.
    expect(chunks[0].text.length).toBeLessThanOrEqual(2000 + 10);
  });

  it('assigns sequential chunkIndex values', () => {
    const longText = 'word '.repeat(2000);
    const chunks = chunkText(longText, 500, 100);
    chunks.forEach((c, i) => expect(c.chunkIndex).toBe(i));
  });

  it('throws if overlap is not smaller than chunk size', () => {
    expect(() => chunkText('text', 100, 100)).toThrow(/overlapTokens must be smaller/);
  });
});

describe('findTimestampForCharOffset', () => {
  const segments = [
    { start: 0, end: 5, text: 'Hello' },
    { start: 5, end: 10, text: 'world' },
    { start: 10, end: 15, text: 'today' },
  ];

  it('returns the start time of the segment containing the offset', () => {
    // "Hello world today" — segment lengths include +1 for joining space
    expect(findTimestampForCharOffset(segments, 0)).toBe(0);
  });

  it('returns the last segment start if offset exceeds all segments', () => {
    expect(findTimestampForCharOffset(segments, 9999)).toBe(10);
  });

  it('returns null for empty segments array', () => {
    expect(findTimestampForCharOffset([], 5)).toBeNull();
  });
});
