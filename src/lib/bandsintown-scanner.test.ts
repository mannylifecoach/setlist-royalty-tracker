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
  } | null;
  ownedSongs: Array<{ id: string; title: string }>;
  trackedArtists: Array<{ id: string; artistName: string; userId: string; mbid: string | null }>;
  existingPerformances: unknown[]; // returned for the dedupe SELECT
  inserted: unknown[][];
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
    },
  };
});

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
  mockDbState = {
    userRow: {
      bandsintownApiKey: 'test-key',
      bandsintownArtistSlug: 'tiffany-alvord',
      defaultSetlistSongIds: [SONG_ID_1, SONG_ID_2],
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
