import * as Sentry from '@sentry/nextjs';

type Bucket = { count: number; resetAt: number; warned?: boolean };

const buckets = new Map<string, Bucket>();

export function _resetForTests() {
  buckets.clear();
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export type RateLimitOptions = {
  keyId: string;
  ip: string;
  route: string;
  perKeyPerHour: number;
  perIpPerHour: number;
  abuseThresholdPerHour?: number;
  now?: number;
};

const HOUR_MS = 60 * 60 * 1000;

type TakeResult = { blocked: false } | { blocked: true; retryAfterSec: number };

function take(bucketKey: string, max: number, now: number): TakeResult {
  const existing = buckets.get(bucketKey);
  if (!existing || now >= existing.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + HOUR_MS });
    return { blocked: false };
  }
  existing.count++;
  if (existing.count > max) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { blocked: false };
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = opts.now ?? Date.now();
  const keyBucket = `key:${opts.route}:${opts.keyId}`;
  const ipBucket = `ip:${opts.route}:${opts.ip}`;

  const keyResult = take(keyBucket, opts.perKeyPerHour, now);
  const ipResult = take(ipBucket, opts.perIpPerHour, now);

  const abuseThreshold = opts.abuseThresholdPerHour ?? 200;
  const keyState = buckets.get(keyBucket);
  if (keyState && keyState.count > abuseThreshold && !keyState.warned) {
    keyState.warned = true;
    Sentry.captureMessage(
      `Rate limit abuse: ${opts.route} keyId=${opts.keyId} count=${keyState.count} (>${abuseThreshold}/hr)`,
      'warning'
    );
  }

  if (keyResult.blocked) return { allowed: false, retryAfterSec: keyResult.retryAfterSec };
  if (ipResult.blocked) return { allowed: false, retryAfterSec: ipResult.retryAfterSec };
  return { allowed: true };
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
