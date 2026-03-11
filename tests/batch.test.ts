import { describe, it, expect } from 'vitest';

// Test the chunkArray utility directly
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

describe('chunkArray', () => {
  it('should return empty array for empty input', () => {
    expect(chunkArray([], 500)).toEqual([]);
  });

  it('should return single chunk when below limit', () => {
    const items = [1, 2, 3, 4, 5];
    const chunks = chunkArray(items, 500);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual([1, 2, 3, 4, 5]);
  });

  it('should split into correct chunks at the limit', () => {
    const items = Array.from({ length: 500 }, (_, i) => i);
    const chunks = chunkArray(items, 500);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(500);
  });

  it('should split into multiple chunks when exceeding limit', () => {
    const items = Array.from({ length: 1200 }, (_, i) => i);
    const chunks = chunkArray(items, 500);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[2]).toHaveLength(200);
  });

  it('should handle exact multiples', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const chunks = chunkArray(items, 500);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
  });

  it('should preserve item order', () => {
    const items = [1, 2, 3, 4, 5];
    const chunks = chunkArray(items, 2);

    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });
});
