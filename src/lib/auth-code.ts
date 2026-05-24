import { randomInt } from 'crypto';

// 6-digit numeric codes used as Auth.js verification tokens. Paired with the
// magic link in the sign-in email so PWA users (where the link opens in
// Safari instead of the installed app) can complete sign-in by entering the
// code directly in the PWA — no context-switching, no stuck "check your
// email" page.
//
// Range 100000–999999 (no leading zeros) keeps the displayed code visually
// clean — easier for users to read aloud / type correctly. ~900K possible
// values × the existing 24h verification_tokens expiry + IP/email
// rate-limiting on /api/auth/verify-code makes brute-force impractical.

export const SIX_DIGIT_CODE_PATTERN = /^\d{6}$/;

export function generateSixDigitCode(): string {
  return String(randomInt(100000, 1000000));
}

export function isValidSixDigitCode(input: string): boolean {
  return SIX_DIGIT_CODE_PATTERN.test(input);
}
