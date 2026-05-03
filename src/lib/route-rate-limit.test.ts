import { describe, it, expect, beforeEach, vi } from 'vitest';

const sentryCalls: Array<{ message: string; level: string }> = [];

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (message: string, level: string) => {
    sentryCalls.push({ message, level });
  },
}));

import { checkRateLimit, _resetForTests } from './route-rate-limit';

const ROUTE = '/api/extension/venue-enrichment';

beforeEach(() => {
  _resetForTests();
  sentryCalls.length = 0;
});

describe('checkRateLimit', () => {
  it('allows requests under the per-key limit', () => {
    const now = 1_000_000;
    for (let i = 0; i < 60; i++) {
      const result = checkRateLimit({
        keyId: 'k1',
        ip: '1.1.1.1',
        route: ROUTE,
        perKeyPerHour: 60,
        perIpPerHour: 1000,
        now,
      });
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks the 61st request from the same key with Retry-After', () => {
    const now = 1_000_000;
    for (let i = 0; i < 60; i++) {
      checkRateLimit({ keyId: 'k1', ip: '1.1.1.1', route: ROUTE, perKeyPerHour: 60, perIpPerHour: 1000, now });
    }
    const result = checkRateLimit({
      keyId: 'k1',
      ip: '1.1.1.1',
      route: ROUTE,
      perKeyPerHour: 60,
      perIpPerHour: 1000,
      now,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSec).toBeGreaterThan(0);
      expect(result.retryAfterSec).toBeLessThanOrEqual(3600);
    }
  });

  it('isolates buckets per key — one user being limited does not affect another', () => {
    const now = 1_000_000;
    for (let i = 0; i < 65; i++) {
      checkRateLimit({ keyId: 'k1', ip: '1.1.1.1', route: ROUTE, perKeyPerHour: 60, perIpPerHour: 1000, now });
    }
    const otherUser = checkRateLimit({
      keyId: 'k2',
      ip: '2.2.2.2',
      route: ROUTE,
      perKeyPerHour: 60,
      perIpPerHour: 1000,
      now,
    });
    expect(otherUser.allowed).toBe(true);
  });

  it('isolates buckets per route — venue-enrichment limit does not affect other routes', () => {
    const now = 1_000_000;
    for (let i = 0; i < 65; i++) {
      checkRateLimit({ keyId: 'k1', ip: '1.1.1.1', route: ROUTE, perKeyPerHour: 60, perIpPerHour: 1000, now });
    }
    const otherRoute = checkRateLimit({
      keyId: 'k1',
      ip: '1.1.1.1',
      route: '/api/extension/performances',
      perKeyPerHour: 60,
      perIpPerHour: 1000,
      now,
    });
    expect(otherRoute.allowed).toBe(true);
  });

  it('resets after the hour window elapses', () => {
    const start = 1_000_000;
    for (let i = 0; i < 60; i++) {
      checkRateLimit({ keyId: 'k1', ip: '1.1.1.1', route: ROUTE, perKeyPerHour: 60, perIpPerHour: 1000, now: start });
    }
    const blocked = checkRateLimit({
      keyId: 'k1',
      ip: '1.1.1.1',
      route: ROUTE,
      perKeyPerHour: 60,
      perIpPerHour: 1000,
      now: start,
    });
    expect(blocked.allowed).toBe(false);

    const afterReset = checkRateLimit({
      keyId: 'k1',
      ip: '1.1.1.1',
      route: ROUTE,
      perKeyPerHour: 60,
      perIpPerHour: 1000,
      now: start + 60 * 60 * 1000,
    });
    expect(afterReset.allowed).toBe(true);
  });

  it('blocks on per-IP limit when many keys come from one IP', () => {
    const now = 1_000_000;
    for (let i = 0; i < 120; i++) {
      checkRateLimit({
        keyId: `key-${i}`,
        ip: '9.9.9.9',
        route: ROUTE,
        perKeyPerHour: 60,
        perIpPerHour: 120,
        now,
      });
    }
    const result = checkRateLimit({
      keyId: 'fresh-key',
      ip: '9.9.9.9',
      route: ROUTE,
      perKeyPerHour: 60,
      perIpPerHour: 120,
      now,
    });
    expect(result.allowed).toBe(false);
  });

  it('fires Sentry warning exactly once when a key crosses the abuse threshold', () => {
    const now = 1_000_000;
    for (let i = 0; i < 250; i++) {
      checkRateLimit({
        keyId: 'abusive-key',
        ip: '5.5.5.5',
        route: ROUTE,
        perKeyPerHour: 10_000,
        perIpPerHour: 10_000,
        abuseThresholdPerHour: 200,
        now,
      });
    }
    expect(sentryCalls).toHaveLength(1);
    expect(sentryCalls[0].level).toBe('warning');
    expect(sentryCalls[0].message).toContain('abusive-key');
    expect(sentryCalls[0].message).toContain('/api/extension/venue-enrichment');
  });

  it('does not fire Sentry warning under the abuse threshold', () => {
    const now = 1_000_000;
    for (let i = 0; i < 199; i++) {
      checkRateLimit({
        keyId: 'normal-key',
        ip: '5.5.5.5',
        route: ROUTE,
        perKeyPerHour: 10_000,
        perIpPerHour: 10_000,
        abuseThresholdPerHour: 200,
        now,
      });
    }
    expect(sentryCalls).toHaveLength(0);
  });
});
