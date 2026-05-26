import { timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison for secrets (CRON_SECRET, ADMIN_SECRET, etc.).
 * Plain `===` returns early at the first mismatched character; an attacker
 * who can measure response timing across many requests can infer the secret
 * one character at a time. `timingSafeEqual` ALWAYS scans both inputs end-
 * to-end, eliminating the leak.
 *
 * Length-mismatch short-circuits to false (timingSafeEqual would otherwise
 * throw on different-length Buffers, which would surface as a 500 instead
 * of the 401 callers expect). The length leak is acceptable: knowing a
 * secret is N bytes long doesn't meaningfully shrink a brute-force search
 * over a 32+ byte random secret.
 *
 * Null/undefined on either side → false (never accidentally match an unset
 * env var against an empty header).
 */
export function safeCompareSecret(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
