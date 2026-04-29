import { describe, it, expect } from 'vitest';
import { validateWriterSplits } from './song-writers';

describe('validateWriterSplits', () => {
  it('rejects an empty writer list', () => {
    const r = validateWriterSplits([]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least one writer/i);
  });

  it('accepts a single writer at 50.00', () => {
    expect(
      validateWriterSplits([{ name: 'Manny', role: 'CA', sharePercent: 50 }]).ok
    ).toBe(true);
  });

  it('accepts two co-writers at 25/25', () => {
    expect(
      validateWriterSplits([
        { name: 'A', role: 'CA', sharePercent: 25 },
        { name: 'B', role: 'CA', sharePercent: 25 },
      ]).ok
    ).toBe(true);
  });

  it('accepts three co-writers at 16.67/16.67/16.66 within rounding tolerance', () => {
    expect(
      validateWriterSplits([
        { name: 'A', role: 'CA', sharePercent: 16.67 },
        { name: 'B', role: 'CA', sharePercent: 16.67 },
        { name: 'C', role: 'CA', sharePercent: 16.66 },
      ]).ok
    ).toBe(true);
  });

  it('rejects when total is below 50', () => {
    const r = validateWriterSplits([
      { name: 'A', role: 'CA', sharePercent: 20 },
      { name: 'B', role: 'CA', sharePercent: 20 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/sum to 50/);
  });

  it('rejects when total is above 50 (overshoots writer side)', () => {
    const r = validateWriterSplits([
      { name: 'A', role: 'CA', sharePercent: 30 },
      { name: 'B', role: 'CA', sharePercent: 30 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.total).toBe(60);
  });

  it('coerces string sharePercent values from form inputs', () => {
    expect(
      validateWriterSplits([
        // Form inputs commonly arrive as strings — helper should still pass.
        { name: 'A', role: 'CA', sharePercent: '50' as unknown as number },
      ]).ok
    ).toBe(true);
  });
});
