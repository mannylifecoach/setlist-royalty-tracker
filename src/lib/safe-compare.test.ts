import { describe, it, expect } from 'vitest';
import { safeCompareSecret } from './safe-compare';

describe('safeCompareSecret', () => {
  it('returns true for identical non-empty strings', () => {
    expect(safeCompareSecret('hunter2', 'hunter2')).toBe(true);
    expect(safeCompareSecret('Bearer abc-123', 'Bearer abc-123')).toBe(true);
  });

  it('returns false for same-length non-matching strings', () => {
    expect(safeCompareSecret('hunter2', 'hunter3')).toBe(false);
    expect(safeCompareSecret('abcdef', 'abcdeg')).toBe(false);
  });

  it('returns false on length mismatch without throwing (regression: would 500 if it threw)', () => {
    // timingSafeEqual throws TypeError on different-length Buffers; we must
    // short-circuit before reaching it so callers get the 401 they expect.
    expect(() => safeCompareSecret('short', 'a-much-longer-secret')).not.toThrow();
    expect(safeCompareSecret('short', 'a-much-longer-secret')).toBe(false);
    expect(safeCompareSecret('a-much-longer-secret', 'short')).toBe(false);
  });

  it('returns false when provided is null/undefined/empty', () => {
    expect(safeCompareSecret(null, 'expected')).toBe(false);
    expect(safeCompareSecret(undefined, 'expected')).toBe(false);
    expect(safeCompareSecret('', 'expected')).toBe(false);
  });

  it('returns false when expected is null/undefined/empty (unset env var)', () => {
    expect(safeCompareSecret('provided', null)).toBe(false);
    expect(safeCompareSecret('provided', undefined)).toBe(false);
    expect(safeCompareSecret('provided', '')).toBe(false);
  });

  it('returns false when both are null/undefined (never accidentally match)', () => {
    expect(safeCompareSecret(null, null)).toBe(false);
    expect(safeCompareSecret(undefined, undefined)).toBe(false);
    expect(safeCompareSecret('', '')).toBe(false);
  });

  it('handles unicode + multi-byte characters correctly', () => {
    expect(safeCompareSecret('café', 'café')).toBe(true);
    expect(safeCompareSecret('café', 'cafe')).toBe(false);
  });
});
