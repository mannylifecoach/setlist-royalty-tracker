import { describe, it, expect } from 'vitest';
import {
  generateSixDigitCode,
  isValidSixDigitCode,
  SIX_DIGIT_CODE_PATTERN,
} from './auth-code';

describe('generateSixDigitCode', () => {
  it('returns a string of exactly 6 digits', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSixDigitCode();
      expect(code).toMatch(SIX_DIGIT_CODE_PATTERN);
      expect(code).toHaveLength(6);
    }
  });

  it('never returns a code with a leading zero', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSixDigitCode();
      expect(code[0]).not.toBe('0');
    }
  });

  it('returns values within the 100000-999999 range', () => {
    for (let i = 0; i < 50; i++) {
      const value = Number(generateSixDigitCode());
      expect(value).toBeGreaterThanOrEqual(100000);
      expect(value).toBeLessThanOrEqual(999999);
    }
  });

  it('produces varied output across many calls (smoke test for randomness)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateSixDigitCode());
    // With 900K possible values, 100 calls should yield ~100 unique results.
    // Allow some slack for stochastic collisions.
    expect(seen.size).toBeGreaterThan(90);
  });
});

describe('isValidSixDigitCode', () => {
  it('accepts 6 numeric digits', () => {
    expect(isValidSixDigitCode('123456')).toBe(true);
    expect(isValidSixDigitCode('999999')).toBe(true);
    expect(isValidSixDigitCode('100000')).toBe(true);
  });

  it('accepts 6 digits starting with zero (defensive — generator avoids them but parser is lenient)', () => {
    expect(isValidSixDigitCode('012345')).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(isValidSixDigitCode('abcdef')).toBe(false);
    expect(isValidSixDigitCode('12345a')).toBe(false);
    expect(isValidSixDigitCode('   ')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidSixDigitCode('12345')).toBe(false);
    expect(isValidSixDigitCode('1234567')).toBe(false);
    expect(isValidSixDigitCode('')).toBe(false);
  });

  it('rejects whitespace-padded input', () => {
    expect(isValidSixDigitCode(' 123456')).toBe(false);
    expect(isValidSixDigitCode('123456 ')).toBe(false);
  });
});
