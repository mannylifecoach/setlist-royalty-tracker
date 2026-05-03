import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser, mockLookup } = vi.hoisted(() => ({
  mockUser: { value: null as { id: string; email: string } | null },
  mockLookup: vi.fn(),
}));

vi.mock('@/lib/api-key-auth', () => ({
  authenticateApiKey: vi.fn(async () => mockUser.value),
}));

vi.mock('@/lib/google-places', () => ({
  lookupVenue: mockLookup,
}));

vi.mock('@/lib/cors', () => ({
  getCorsHeaders: () => ({ 'access-control-allow-origin': '*' }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

import { GET } from './route';
import { _resetForTests } from '@/lib/route-rate-limit';

const USER_A = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'a@example.com' };
const USER_B = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'b@example.com' };

function makeRequest(name = 'The Forum', ip = '1.2.3.4'): unknown {
  return {
    headers: new Headers({
      authorization: 'Bearer test-key',
      'x-forwarded-for': ip,
    }),
    url: `https://x/api/extension/venue-enrichment?name=${encodeURIComponent(name)}`,
  };
}

beforeEach(() => {
  _resetForTests();
  mockUser.value = USER_A;
  mockLookup.mockReset();
  mockLookup.mockResolvedValue({ found: true, venue: { name: 'The Forum' } });
});

describe('GET /api/extension/venue-enrichment — auth', () => {
  it('returns 401 when API key is invalid', async () => {
    mockUser.value = null;
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/extension/venue-enrichment — rate limiting', () => {
  it('allows 60 requests per hour from the same key', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await GET(makeRequest() as never);
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 with Retry-After on the 61st request', async () => {
    for (let i = 0; i < 60; i++) {
      await GET(makeRequest() as never);
    }
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(3600);
  });

  it('does not count rate-limited requests against Google Places', async () => {
    for (let i = 0; i < 60; i++) await GET(makeRequest() as never);
    mockLookup.mockClear();
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(429);
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('limits per API key — user B is unaffected by user A hitting the cap', async () => {
    mockUser.value = USER_A;
    for (let i = 0; i < 60; i++) await GET(makeRequest() as never);

    mockUser.value = USER_B;
    const res = await GET(makeRequest('Madison Square Garden', '5.6.7.8') as never);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/extension/venue-enrichment — input validation', () => {
  it('returns 400 when name is missing', async () => {
    const req = {
      headers: new Headers({ authorization: 'Bearer test-key' }),
      url: 'https://x/api/extension/venue-enrichment',
    };
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is too long', async () => {
    const res = await GET(makeRequest('a'.repeat(201)) as never);
    expect(res.status).toBe(400);
  });
});
