import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const { mockSession, mockFetchResult } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id: string; email: string } } | null },
  mockFetchResult: {
    value: null as
      | { ok: true; data: { id: string; name: string; url: string } }
      | { ok: false; status: number; error: string }
      | null,
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

vi.mock('@/lib/bandsintown', () => ({
  fetchArtist: vi.fn(async () => mockFetchResult.value),
}));

import { POST } from './route';

function makeRequest(body: unknown): unknown {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

beforeEach(() => {
  mockSession.value = { user: { id: USER_ID, email: 'test@example.com' } };
  mockFetchResult.value = null;
});

describe('POST /api/settings/bandsintown/test — auth + validation', () => {
  it('returns 401 when no session', async () => {
    mockSession.value = null;
    const res = await POST(makeRequest({ apiKey: 'k', artistSlug: 's' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ artistSlug: 's' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when artistSlug is empty', async () => {
    const res = await POST(makeRequest({ apiKey: 'k', artistSlug: '' }) as never);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/settings/bandsintown/test — happy path', () => {
  it('returns ok:true with artist name + id when bandsintown 200s', async () => {
    mockFetchResult.value = {
      ok: true,
      data: { id: '12345', name: 'Tiffany Alvord', url: 'https://bandsintown.com/a/12345' },
    };
    const res = await POST(makeRequest({ apiKey: 'k', artistSlug: 'tiffany-alvord' }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.artistName).toBe('Tiffany Alvord');
    expect(body.artistId).toBe('12345');
  });
});

describe('POST /api/settings/bandsintown/test — failure passthrough', () => {
  it('maps 401 to a "invalid key" actionable message (returns 200 with ok:false)', async () => {
    mockFetchResult.value = { ok: false, status: 401, error: 'bandsintown returned 401' };
    const res = await POST(makeRequest({ apiKey: 'bad', artistSlug: 's' }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid api key/i);
  });

  it('maps 403 to the same "invalid key" message', async () => {
    mockFetchResult.value = { ok: false, status: 403, error: 'bandsintown returned 403' };
    const res = await POST(makeRequest({ apiKey: 'bad', artistSlug: 's' }) as never);
    const body = await res.json();
    expect(body.error).toMatch(/invalid api key/i);
  });

  it('maps 404 to a "artist not found" message', async () => {
    mockFetchResult.value = { ok: false, status: 404, error: 'bandsintown returned 404' };
    const res = await POST(makeRequest({ apiKey: 'k', artistSlug: 'no-such' }) as never);
    const body = await res.json();
    expect(body.error).toMatch(/artist not found/i);
  });

  it('maps network failure (status 0) to a friendly "could not reach" message', async () => {
    mockFetchResult.value = { ok: false, status: 0, error: 'ECONNREFUSED' };
    const res = await POST(makeRequest({ apiKey: 'k', artistSlug: 's' }) as never);
    const body = await res.json();
    expect(body.error).toMatch(/could not reach bandsintown/i);
  });

  it('never echoes the api key in error responses', async () => {
    mockFetchResult.value = { ok: false, status: 500, error: 'bandsintown returned 500' };
    const apiKey = 'super-secret-key-do-not-leak';
    const res = await POST(makeRequest({ apiKey, artistSlug: 's' }) as never);
    const bodyText = await res.text();
    expect(bodyText).not.toContain(apiKey);
  });
});
