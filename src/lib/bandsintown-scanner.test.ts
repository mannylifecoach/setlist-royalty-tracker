import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ARTIST_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SONG_ID_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SONG_ID_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

type DbState = {
  userRow: {
    bandsintownApiKey: string | null;
    bandsintownArtistSlug: string | null;
    defaultSetlistSongIds: string[] | null;
    lastBandsintownScanAt: Date | null;
  } | null;
  ownedSongs: Array<{ id: string; title: string }>;
  trackedArtists: Array<{ id: string; artistName: string; userId: string; mbid: string | null }>;
  existingPerformances: unknown[]; // returned for the dedupe SELECT
  inserted: unknown[][];
  updates: Array<Record<string, unknown>>; // captured users.lastBandsintownScanAt writes
};

let mockDbState: DbState;

vi.mock('@/db', () => {
  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tableName = String((table as any)?.[Symbol.for('drizzle:Name')] || table);
          if (tableName.includes('users')) {
            return {
              where: () =>
                Promise.resolve(mockDbState.userRow ? [mockDbState.userRow] : []),
            };
          }
          if (tableName.includes('songs') && !tableName.includes('song_artists')) {
            return { where: () => Promise.resolve(mockDbState.ownedSongs) };
          }
          if (tableName.includes('tracked_artists') || tableName.includes('trackedArtists')) {
            return { where: () => Promise.resolve(mockDbState.trackedArtists) };
          }
          // performances dedup check
          return { where: () => Promise.resolve(mockDbState.existingPerformances) };
        },
      }),
      insert: () => ({
        values: (rows: unknown[]) => {
          mockDbState.inserted.push(rows as unknown[]);
          return Promise.resolve();
        },
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => {
          mockDbState.updates.push(patch);
          return { where: () => Promise.resolve() };
        },
      }),
    },
  };
});

const sentryCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => sentryCaptureMessage(...args),
}));

const fetchEventsMock = vi.fn();
vi.mock('./bandsintown', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./bandsintown')>();
  return {
    ...actual,
    fetchPastEvents: (...args: Parameters<typeof actual.fetchPastEvents>) =>
      fetchEventsMock(...args),
  };
});

import { scanBandsintownForUser } from './bandsintown-scanner';

function makeEvent(overrides: { datetime: string; venueName?: string; city?: string }) {
  return {
    id: `evt-${overrides.datetime}`,
    url: 'https://bandsintown.com/e/x',
    datetime: overrides.datetime,
    venue: {
      name: overrides.venueName ?? 'The Echo',
      city: overrides.city ?? 'Los Angeles',
      region: 'CA',
      country: 'United States',
      latitude: '34.0',
      longitude: '-118.2',
    },
  };
}

beforeEach(() => {
  fetchEventsMock.mockReset();
  sentryCaptureMessage.mockReset();
  mockDbState = {
    userRow: {
      bandsintownApiKey: 'test-key',
      bandsintownArtistSlug: 'tiffany-alvord',
      defaultSetlistSongIds: [SONG_ID_1, SONG_ID_2],
      lastBandsintownScanAt: null,
    },
    ownedSongs: [
      { id: SONG_ID_1, title: 'Karma' },
      { id: SONG_ID_2, title: 'Beautiful Heartbeat' },
    ],
    trackedArtists: [
      { id: ARTIST_ID, artistName: 'Tiffany Alvord', userId: USER_ID, mbid: 'mbid-x' },
    ],
    existingPerformances: [],
    inserted: [],
    updates: [],
  };
});

describe('scanBandsintownForUser — precondition handling', () => {
  it('returns null when user has no api key', async () => {
    mockDbState.userRow!.bandsintownApiKey = null;
    const result = await scanBandsintownForUser(USER_ID);
    expect(result).toBeNull();
    expect(fetchEventsMock).not.toHaveBeenCalled();
  });

  it('returns null when user has no slug', async () => {
    mockDbState.userRow!.bandsintownArtistSlug = null;
    const result = await scanBandsintownForUser(USER_ID);
    expect(result).toBeNull();
  });

  it('returns null when user row does not exist', async () => {
    mockDbState.userRow = null;
    const result = await scanBandsintownForUser(USER_ID);
    expect(result).toBeNull();
  });

  it('skips with reason when default setlist template is empty', async () => {
    mockDbState.userRow!.defaultSetlistSongIds = [];
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/no default setlist template/i);
    expect(result?.newPerformances).toBe(0);
    expect(fetchEventsMock).not.toHaveBeenCalled();
  });

  it('skips with reason when template references no owned songs (all stale)', async () => {
    mockDbState.ownedSongs = [];
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/no owned songs/i);
  });

  it('skips with reason when slug matches zero tracked artists', async () => {
    mockDbState.trackedArtists = [];
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/does not match any tracked artist/i);
  });

  it('skips with reason when slug matches multiple tracked artists', async () => {
    mockDbState.trackedArtists = [
      { id: 'a1', artistName: 'Tiffany Alvord', userId: USER_ID, mbid: 'mb1' },
      { id: 'a2', artistName: 'tiffany alvord', userId: USER_ID, mbid: 'mb2' },
    ];
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/ambiguous|matches 2 tracked artists/i);
  });

  it('skips with reason when bandsintown fetch fails', async () => {
    fetchEventsMock.mockResolvedValueOnce({ ok: false, status: 401, error: 'bad key' });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/bandsintown fetch failed/i);
  });
});

describe('scanBandsintownForUser — slug matching', () => {
  it('matches the slug case-insensitively across punctuation differences', async () => {
    // "TIFFANY  Alvord!" → "tiffanyalvord" matches "tiffany-alvord" → "tiffanyalvord"
    mockDbState.trackedArtists = [
      { id: ARTIST_ID, artistName: 'TIFFANY  Alvord!', userId: USER_ID, mbid: 'mb' },
    ];
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [] });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBeUndefined();
    expect(result?.artistName).toBe('TIFFANY  Alvord!');
  });
});

describe('scanBandsintownForUser — happy path', () => {
  it('creates one row per template song per event', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: true,
      data: [
        makeEvent({ datetime: '2026-04-15T20:00:00', venueName: 'The Echo' }),
        makeEvent({ datetime: '2026-03-20T20:00:00', venueName: 'Bowery Ballroom' }),
      ],
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBeUndefined();
    expect(result?.newPerformances).toBe(4); // 2 events × 2 template songs
    expect(mockDbState.inserted).toHaveLength(2); // 2 separate insert() calls (one per event)
    expect(mockDbState.inserted[0]).toHaveLength(2); // each insert is 2 rows
  });

  it('marks inserted rows with source=bandsintown + status=discovered', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: true,
      data: [makeEvent({ datetime: '2026-04-15T20:00:00' })],
    });
    await scanBandsintownForUser(USER_ID);
    const firstRow = (mockDbState.inserted[0] as Array<Record<string, unknown>>)[0];
    expect(firstRow.source).toBe('bandsintown');
    expect(firstRow.status).toBe('discovered');
    expect(firstRow.artistId).toBe(ARTIST_ID);
    expect(firstRow.eventDate).toBe('2026-04-15');
    expect(firstRow.venueName).toBe('The Echo');
    expect(firstRow.startTimeHour).toBeNull(); // times resolved at READ time
  });

  it('records song titles for the email digest', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: true,
      data: [makeEvent({ datetime: '2026-04-15T20:00:00' })],
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.songTitles).toContain('Karma');
    expect(result?.songTitles).toContain('Beautiful Heartbeat');
  });

  it('skips stale events older than the 9-month cutoff', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 13);
    const oldIso = oldDate.toISOString().replace('Z', '');
    fetchEventsMock.mockResolvedValueOnce({
      ok: true,
      data: [makeEvent({ datetime: oldIso })],
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.setlistsFound).toBe(1); // event was returned by API
    expect(result?.newPerformances).toBe(0); // but filtered out by cutoff
    expect(mockDbState.inserted).toHaveLength(0);
  });

  it('skips events with missing venue.name', async () => {
    const ev = makeEvent({ datetime: '2026-04-15T20:00:00' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ev.venue as any).name = '';
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [ev] });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.newPerformances).toBe(0);
  });
});

describe('scanBandsintownForUser — dedupe', () => {
  it('does not insert when an existing performance already covers (user, artist, date, venue)', async () => {
    mockDbState.existingPerformances = [{ id: 'existing-perf' }];
    fetchEventsMock.mockResolvedValueOnce({
      ok: true,
      data: [makeEvent({ datetime: '2026-04-15T20:00:00' })],
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.newPerformances).toBe(0);
    expect(mockDbState.inserted).toHaveLength(0);
  });

  it('handles empty events array cleanly (no inserts, no error)', async () => {
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [] });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBeUndefined();
    expect(result?.setlistsFound).toBe(0);
    expect(result?.newPerformances).toBe(0);
  });
});

describe('scanBandsintownForUser — cooldown', () => {
  it('skips with cooldown_active reason when last scan was inside the 24h window', async () => {
    // Last scan 6h ago → cooldown still active
    mockDbState.userRow!.lastBandsintownScanAt = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/^cooldown_active:next_in_\d+s$/);
    // The next_in value should be roughly 18h = 64800s, give or take a few seconds
    const next = Number(result?.skipped?.match(/next_in_(\d+)s/)?.[1]);
    expect(next).toBeGreaterThan(64000);
    expect(next).toBeLessThan(65000);
    expect(fetchEventsMock).not.toHaveBeenCalled();
    expect(mockDbState.updates).toHaveLength(0);
  });

  it('allows a scan when last scan was outside the 24h window', async () => {
    mockDbState.userRow!.lastBandsintownScanAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [] });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBeUndefined();
    expect(fetchEventsMock).toHaveBeenCalledOnce();
  });

  it('allows the first-ever scan when lastBandsintownScanAt is null', async () => {
    mockDbState.userRow!.lastBandsintownScanAt = null;
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [] });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBeUndefined();
    expect(fetchEventsMock).toHaveBeenCalledOnce();
  });

  it('does NOT enforce cooldown before preflight checks (config diagnostics still surface)', async () => {
    // Even with cooldown active, if the user's config is broken they should
    // still see the config error — not "cooldown_active".
    mockDbState.userRow!.lastBandsintownScanAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    mockDbState.trackedArtists = []; // slug matches zero tracked artists
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toMatch(/does not match any tracked artist/i);
    expect(fetchEventsMock).not.toHaveBeenCalled();
  });
});

describe('scanBandsintownForUser — lastBandsintownScanAt write', () => {
  it('records the timestamp after a successful fetch', async () => {
    fetchEventsMock.mockResolvedValueOnce({ ok: true, data: [] });
    await scanBandsintownForUser(USER_ID);
    expect(mockDbState.updates).toHaveLength(1);
    expect(mockDbState.updates[0].lastBandsintownScanAt).toBeInstanceOf(Date);
  });

  it('records the timestamp on 401 (any server-returned status)', async () => {
    fetchEventsMock.mockResolvedValueOnce({ ok: false, status: 401, error: 'bad key' });
    await scanBandsintownForUser(USER_ID);
    expect(mockDbState.updates).toHaveLength(1);
  });

  it('does NOT record the timestamp on status 0 (local network/abort error)', async () => {
    // Flaky local network shouldn't lock the user out of retrying soon.
    fetchEventsMock.mockResolvedValueOnce({ ok: false, status: 0, error: 'ECONNREFUSED' });
    await scanBandsintownForUser(USER_ID);
    expect(mockDbState.updates).toHaveLength(0);
  });
});

describe('scanBandsintownForUser — 429 handling', () => {
  it('surfaces rate_limited:retry_after_<n>s when Bandsintown returns 429 with Retry-After', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: 'bandsintown returned 429',
      retryAfter: 120,
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBe('rate_limited:retry_after_120s');
  });

  it('defaults retryAfter to 3600s when Bandsintown returned 429 with no Retry-After header', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: 'bandsintown returned 429',
    });
    const result = await scanBandsintownForUser(USER_ID);
    expect(result?.skipped).toBe('rate_limited:retry_after_3600s');
  });

  it('fires a Sentry warning on 429 (signals our cooldown failed upstream)', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: 'bandsintown returned 429',
      retryAfter: 90,
    });
    await scanBandsintownForUser(USER_ID);
    expect(sentryCaptureMessage).toHaveBeenCalledOnce();
    const [msg, level] = sentryCaptureMessage.mock.calls[0];
    expect(level).toBe('warning');
    expect(msg).toMatch(/Bandsintown 429/);
    expect(msg).toContain(USER_ID);
    expect(msg).toContain('retryAfter=90s');
  });

  it('records the timestamp on 429 just like any other server response', async () => {
    fetchEventsMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: 'bandsintown returned 429',
      retryAfter: 60,
    });
    await scanBandsintownForUser(USER_ID);
    expect(mockDbState.updates).toHaveLength(1);
  });
});
