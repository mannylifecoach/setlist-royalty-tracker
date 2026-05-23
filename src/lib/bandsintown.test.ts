import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchArtist, fetchPastEvents, eventDateString } from './bandsintown';

const KEY = 'test-app-id-xyz';
const SLUG = 'tiffany-alvord';

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

function mockOk(body: unknown) {
  fetchSpy.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  });
}
function mockStatus(status: number, headers: Record<string, string> = {}) {
  fetchSpy.mockResolvedValueOnce({
    ok: false,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => ({ error: `mock ${status}` }),
  });
}

describe('bandsintown.fetchArtist', () => {
  it('hits /artists/{slug}/ with app_id query param', async () => {
    mockOk({ id: '12345', name: 'Tiffany Alvord', url: 'https://bandsintown.com/a/12345' });
    const result = await fetchArtist(KEY, SLUG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe('Tiffany Alvord');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('rest.bandsintown.com/artists/tiffany-alvord/');
    expect(calledUrl).toContain('app_id=test-app-id-xyz');
  });

  it('url-encodes slugs with special characters', async () => {
    mockOk({ id: '1', name: 'X', url: 'u' });
    await fetchArtist(KEY, 'tiësto');
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('ti%C3%ABsto');
  });

  it('returns ok:false with status on non-2xx', async () => {
    mockStatus(404);
    const result = await fetchArtist(KEY, 'no-such-artist');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toMatch(/404/);
    }
  });

  it('returns ok:false when network fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await fetchArtist(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(0);
  });

  it('returns ok:false when key or slug is empty', async () => {
    const a = await fetchArtist('', SLUG);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toMatch(/api key/i);

    const b = await fetchArtist(KEY, '');
    expect(b.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('bandsintown.fetchPastEvents', () => {
  it('hits /artists/{slug}/events/ with date=past', async () => {
    mockOk([]);
    await fetchPastEvents(KEY, SLUG);
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/artists/tiffany-alvord/events/');
    expect(calledUrl).toContain('date=past');
    expect(calledUrl).toContain('app_id=test-app-id-xyz');
  });

  it('returns an empty array when artist has no past events', async () => {
    mockOk([]);
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('normalizes non-array response bodies to []', async () => {
    // Bandsintown occasionally returns `{}` for empty/malformed event lists
    mockOk({});
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('passes through typed events on the happy path', async () => {
    mockOk([
      {
        id: 'evt-1',
        url: 'https://bandsintown.com/e/1',
        datetime: '2024-08-15T20:00:00',
        venue: {
          name: 'The Echo',
          city: 'Los Angeles',
          region: 'CA',
          country: 'United States',
          latitude: '34.0',
          longitude: '-118.2',
        },
      },
    ]);
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].venue.name).toBe('The Echo');
      expect(result.data[0].datetime).toBe('2024-08-15T20:00:00');
    }
  });

  it('returns ok:false with status on 401 (bad/revoked key)', async () => {
    mockStatus(401);
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('returns ok:false with status on 429 (rate-limited)', async () => {
    mockStatus(429);
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.retryAfter).toBeUndefined();
    }
  });

  it('parses Retry-After as integer seconds on 429', async () => {
    mockStatus(429, { 'Retry-After': '120' });
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfter).toBe(120);
  });

  it('parses Retry-After as HTTP-date on 429', async () => {
    const future = new Date(Date.now() + 90_000).toUTCString(); // ~90s out
    mockStatus(429, { 'Retry-After': future });
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfter).toBeGreaterThanOrEqual(80);
      expect(result.retryAfter).toBeLessThanOrEqual(100);
    }
  });

  it('rounds fractional Retry-After seconds up', async () => {
    mockStatus(429, { 'Retry-After': '0.4' });
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfter).toBe(1);
  });

  it('ignores garbage Retry-After header', async () => {
    mockStatus(429, { 'Retry-After': 'not-a-number' });
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfter).toBeUndefined();
  });

  it('does not populate retryAfter on non-429 errors', async () => {
    mockStatus(503, { 'Retry-After': '60' });
    const result = await fetchPastEvents(KEY, SLUG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfter).toBeUndefined();
  });
});

describe('eventDateString', () => {
  it('extracts YYYY-MM-DD from a full ISO datetime', () => {
    expect(eventDateString('2024-08-15T20:00:00')).toBe('2024-08-15');
  });
  it('handles a Z-suffixed UTC string', () => {
    expect(eventDateString('2024-08-15T20:00:00Z')).toBe('2024-08-15');
  });
  it('returns input unchanged when no T is present', () => {
    expect(eventDateString('2024-08-15')).toBe('2024-08-15');
  });
});
