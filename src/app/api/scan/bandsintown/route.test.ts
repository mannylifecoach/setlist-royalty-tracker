import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BandsintownScanResult } from '@/lib/bandsintown-scanner';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const { mockSession, mockScanResult } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id: string; email: string } } | null },
  mockScanResult: { value: null as BandsintownScanResult | null },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

vi.mock('@/lib/bandsintown-scanner', () => ({
  scanBandsintownForUser: vi.fn(async () => mockScanResult.value),
}));

import { POST } from './route';

beforeEach(() => {
  mockSession.value = { user: { id: USER_ID, email: 'test@example.com' } };
  mockScanResult.value = null;
});

describe('POST /api/scan/bandsintown — auth', () => {
  it('returns 401 when no session', async () => {
    mockSession.value = null;
    const res = await POST();
    expect(res.status).toBe(401);
  });
});

describe('POST /api/scan/bandsintown — not configured', () => {
  it('returns 400 with actionable error when scanner returns null (no creds)', async () => {
    mockScanResult.value = null;
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/not connected/i);
  });
});

describe('POST /api/scan/bandsintown — happy path', () => {
  it('returns ok:true with event + new-performance counts', async () => {
    mockScanResult.value = {
      artistName: 'Tiffany Alvord',
      setlistsFound: 12,
      newPerformances: 8,
      songTitles: ['Karma', 'Beautiful Heartbeat'],
      source: 'bandsintown',
    };
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.artistName).toBe('Tiffany Alvord');
    expect(body.events).toBe(12);
    expect(body.newPerformances).toBe(8);
    expect(body.skipped).toBeNull();
    expect(body.songTitles).toEqual(['Karma', 'Beautiful Heartbeat']);
  });
});

describe('POST /api/scan/bandsintown — skipped passthrough', () => {
  it('passes through the cooldown_active skipped reason verbatim', async () => {
    mockScanResult.value = {
      artistName: 'Tiffany Alvord',
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: 'cooldown_active:next_in_64000s',
    };
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe('cooldown_active:next_in_64000s');
    expect(body.newPerformances).toBe(0);
  });

  it('passes through the rate_limited skipped reason verbatim', async () => {
    mockScanResult.value = {
      artistName: 'Tiffany Alvord',
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: 'rate_limited:retry_after_3600s',
    };
    const res = await POST();
    const body = await res.json();
    expect(body.skipped).toBe('rate_limited:retry_after_3600s');
  });

  it('passes through bandsintown-fetch-failed skipped reasons', async () => {
    mockScanResult.value = {
      artistName: 'Tiffany Alvord',
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: 'bandsintown fetch failed: bad key',
    };
    const res = await POST();
    const body = await res.json();
    expect(body.skipped).toMatch(/bandsintown fetch failed/);
  });
});
