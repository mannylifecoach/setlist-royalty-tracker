import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SetlistFmSetlist } from './setlistfm';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing scanner
// ---------------------------------------------------------------------------

let mockDbState: {
  artists: unknown[];
  linkedSongs: unknown[];
  existingPerformances: unknown[];
  insertedPerformances: unknown[];
  insertedScanLogs: unknown[];
};

vi.mock('@/db', () => {
  return {
    db: {
      select: () => ({
        from: (table: unknown) => {
          // Differentiate by table reference
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tableName = (table as any)?.[Symbol.for('drizzle:Name')] || String(table);

          if (tableName.includes('tracked_artists') || tableName.includes('trackedArtists')) {
            return { where: vi.fn().mockImplementation(() => Promise.resolve(mockDbState.artists)) };
          }
          if (tableName.includes('song_artists') || tableName.includes('songArtists')) {
            return {
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => Promise.resolve(mockDbState.linkedSongs)),
              }),
            };
          }
          // performances (dedup check)
          return {
            where: vi.fn().mockImplementation(() => Promise.resolve(mockDbState.existingPerformances)),
          };
        },
      }),
      insert: () => ({
        values: vi.fn().mockImplementation((val: unknown) => {
          mockDbState.insertedPerformances.push(val);
          return Promise.resolve();
        }),
      }),
    },
  };
});

// Mock setlistfm — keep pure functions real, mock API calls
vi.mock('./setlistfm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./setlistfm')>();
  return {
    ...actual,
    getArtistSetlists: vi.fn(),
  };
});

// Mock email
vi.mock('./email', () => ({
  sendNewPerformancesEmail: vi.fn(),
}));

import { scanForUser } from './scanner';
import { getArtistSetlists, extractSongsFromSetlist, parseSetlistFmDate, calculateExpirationDate } from './setlistfm';

// ---------------------------------------------------------------------------
// Helper: build a setlist.fm setlist object
// ---------------------------------------------------------------------------
function makeSetlist(overrides: Partial<SetlistFmSetlist> & { songNames?: string[] } = {}): SetlistFmSetlist {
  const { songNames = [], ...rest } = overrides;
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  return {
    id: 'setlist-1',
    eventDate: `${dd}-${mm}-${yyyy}`,
    artist: { mbid: 'mbid-1', name: 'Fred Again..', sortName: 'Fred Again..' },
    venue: {
      name: 'Madison Square Garden',
      city: {
        name: 'New York',
        state: 'New York',
        stateCode: 'NY',
        country: { code: 'US', name: 'United States' },
      },
    },
    tour: { name: 'USB Tour' },
    sets: {
      set: [{ song: songNames.map((name) => ({ name })) }],
    },
    url: 'https://setlist.fm/setlist/1',
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// Pure functions: extractSongsFromSetlist
// ---------------------------------------------------------------------------
describe('extractSongsFromSetlist', () => {
  it('extracts song names from a normal setlist', () => {
    const setlist = makeSetlist({ songNames: ['Delilah', 'Lace It', 'Rumble'] });
    expect(extractSongsFromSetlist(setlist)).toEqual(['Delilah', 'Lace It', 'Rumble']);
  });

  it('returns empty array for setlist with no sets', () => {
    const setlist = makeSetlist();
    setlist.sets = { set: [] };
    expect(extractSongsFromSetlist(setlist)).toEqual([]);
  });

  it('returns empty array when sets is undefined', () => {
    const setlist = makeSetlist();
    // @ts-expect-error — testing defensive behavior
    setlist.sets = undefined;
    expect(extractSongsFromSetlist(setlist)).toEqual([]);
  });

  it('extracts songs from multiple sets (main + encore)', () => {
    const setlist = makeSetlist();
    setlist.sets = {
      set: [
        { song: [{ name: 'Delilah' }, { name: 'Lace It' }] },
        { song: [{ name: 'Rumble' }], encore: 1 },
      ],
    };
    expect(extractSongsFromSetlist(setlist)).toEqual(['Delilah', 'Lace It', 'Rumble']);
  });

  it('filters out songs with empty names', () => {
    const setlist = makeSetlist();
    setlist.sets = {
      set: [{ song: [{ name: 'Delilah' }, { name: '' }, { name: 'Rumble' }] }],
    };
    expect(extractSongsFromSetlist(setlist)).toEqual(['Delilah', 'Rumble']);
  });

  it('handles sets with no song array', () => {
    const setlist = makeSetlist();
    setlist.sets = {
      // @ts-expect-error — testing defensive behavior
      set: [{ name: 'Main Set' }],
    };
    expect(extractSongsFromSetlist(setlist)).toEqual([]);
  });

  it('includes cover songs (they still have a name)', () => {
    const setlist = makeSetlist();
    setlist.sets = {
      set: [{
        song: [
          { name: 'Delilah' },
          { name: 'Summertime Sadness', cover: { mbid: 'abc', name: 'Lana Del Rey' } },
        ],
      }],
    };
    expect(extractSongsFromSetlist(setlist)).toEqual(['Delilah', 'Summertime Sadness']);
  });
});

// ---------------------------------------------------------------------------
// Pure functions: parseSetlistFmDate
// ---------------------------------------------------------------------------
describe('parseSetlistFmDate', () => {
  it('converts dd-MM-yyyy to yyyy-MM-dd', () => {
    expect(parseSetlistFmDate('15-03-2026')).toBe('2026-03-15');
  });

  it('handles single-digit day/month with leading zeros', () => {
    expect(parseSetlistFmDate('01-01-2026')).toBe('2026-01-01');
  });

  it('handles end-of-year dates', () => {
    expect(parseSetlistFmDate('31-12-2025')).toBe('2025-12-31');
  });
});

// ---------------------------------------------------------------------------
// Pure functions: calculateExpirationDate
// ---------------------------------------------------------------------------
describe('calculateExpirationDate (BMI quarterly tracking-window deadlines)', () => {
  // BMI Live's actual rule (verified 2026-05-04 against bmi.com deadline pages):
  // performances fall into overlapping 6-month tracking windows; the filing
  // deadline is 3 months after the window closes. SRT shows the EARLIER of the
  // two valid deadlines for each performance — most conservative warning.
  //
  // Per-quarter mapping:
  //   Q1 (Jan-Mar) → Jun 30 same year
  //   Q2 (Apr-Jun) → Sep 30 same year
  //   Q3 (Jul-Sep) → Dec 31 same year
  //   Q4 (Oct-Dec) → Mar 31 NEXT year

  describe('Q1 performances (Jan-Mar) → Jun 30 same year', () => {
    it('Jan 1 → Jun 30 same year (max ~6 months filing window)', () => {
      expect(calculateExpirationDate('2026-01-01')).toBe('2026-06-30');
    });
    it('Jan 15 → Jun 30 same year', () => {
      expect(calculateExpirationDate('2026-01-15')).toBe('2026-06-30');
    });
    it('Feb 29 (leap year) → Jun 30 same year', () => {
      expect(calculateExpirationDate('2024-02-29')).toBe('2024-06-30');
    });
    it('Mar 31 → Jun 30 same year (min ~3 months filing window)', () => {
      expect(calculateExpirationDate('2026-03-31')).toBe('2026-06-30');
    });
  });

  describe('Q2 performances (Apr-Jun) → Sep 30 same year', () => {
    it('Apr 1 → Sep 30 same year', () => {
      expect(calculateExpirationDate('2026-04-01')).toBe('2026-09-30');
    });
    it('May 15 → Sep 30 same year', () => {
      expect(calculateExpirationDate('2025-05-15')).toBe('2025-09-30');
    });
    it('Jun 30 → Sep 30 same year', () => {
      expect(calculateExpirationDate('2026-06-30')).toBe('2026-09-30');
    });
  });

  describe('Q3 performances (Jul-Sep) → Dec 31 same year', () => {
    it('Jul 1 → Dec 31 same year', () => {
      expect(calculateExpirationDate('2026-07-01')).toBe('2026-12-31');
    });
    it('Aug 15 → Dec 31 same year', () => {
      expect(calculateExpirationDate('2025-08-15')).toBe('2025-12-31');
    });
    it('Sep 30 → Dec 31 same year', () => {
      expect(calculateExpirationDate('2026-09-30')).toBe('2026-12-31');
    });
  });

  describe('Q4 performances (Oct-Dec) → Mar 31 NEXT year', () => {
    it('Oct 1 → Mar 31 next year', () => {
      expect(calculateExpirationDate('2025-10-01')).toBe('2026-03-31');
    });
    it('Nov 15 → Mar 31 next year', () => {
      expect(calculateExpirationDate('2025-11-15')).toBe('2026-03-31');
    });
    it('Dec 15 → Mar 31 next year (matches the verified BMI Jul-Dec→Mar 31 deadline)', () => {
      expect(calculateExpirationDate('2025-12-15')).toBe('2026-03-31');
    });
    it('Dec 31 → Mar 31 next year', () => {
      expect(calculateExpirationDate('2026-12-31')).toBe('2027-03-31');
    });
  });

  describe('format and idempotency', () => {
    it('returns YYYY-MM-DD format', () => {
      const result = calculateExpirationDate('2026-07-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('is idempotent across repeated calls', () => {
      const input = '2026-04-12';
      expect(calculateExpirationDate(input)).toBe(calculateExpirationDate(input));
    });

    it('produces an expired date for a 1-year-old performance', () => {
      const result = calculateExpirationDate('2025-01-15');
      // Q1 2025 perf → Jun 30 2025, which is in the past
      expect(result).toBe('2025-06-30');
      expect(new Date(result).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('regression: nobody gets the prior false 9-month deadline', () => {
    // Pre-fix bug: code added +9 months to event date, telling users they had
    // until ~Oct 15 for a Jan 15 performance. Actual BMI deadline is Jun 30.
    it('Jan 15 perf NEVER returns "9 months later" (Oct 15) — that was the bug', () => {
      const result = calculateExpirationDate('2026-01-15');
      expect(result).not.toBe('2026-10-15');
      expect(result).toBe('2026-06-30');
    });
  });
});

// ---------------------------------------------------------------------------
// Warning threshold logic: ensure 30/14/7 day windows work correctly
// ---------------------------------------------------------------------------
describe('expiration warning thresholds', () => {
  const WARNING_THRESHOLDS = [30, 14, 7];

  function daysUntilExpiration(expiresAt: string): number {
    const [y, m, d] = expiresAt.split('-').map(Number);
    const expiryUTC = Date.UTC(y, m - 1, d);
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor((expiryUTC - todayUTC) / (1000 * 60 * 60 * 24));
  }

  it('identifies a performance 30 days from expiration', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const dateStr = future.toISOString().split('T')[0];
    expect(daysUntilExpiration(dateStr)).toBe(30);
    expect(WARNING_THRESHOLDS).toContain(daysUntilExpiration(dateStr));
  });

  it('identifies a performance 14 days from expiration', () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    const dateStr = future.toISOString().split('T')[0];
    expect(daysUntilExpiration(dateStr)).toBe(14);
    expect(WARNING_THRESHOLDS).toContain(daysUntilExpiration(dateStr));
  });

  it('identifies a performance 7 days from expiration', () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const dateStr = future.toISOString().split('T')[0];
    expect(daysUntilExpiration(dateStr)).toBe(7);
    expect(WARNING_THRESHOLDS).toContain(daysUntilExpiration(dateStr));
  });

  it('does not trigger warning between thresholds (e.g. 20 days)', () => {
    const future = new Date();
    future.setDate(future.getDate() + 20);
    const dateStr = future.toISOString().split('T')[0];
    expect(WARNING_THRESHOLDS).not.toContain(daysUntilExpiration(dateStr));
  });

  it('treats an already-expired performance as negative days', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const dateStr = past.toISOString().split('T')[0];
    expect(daysUntilExpiration(dateStr)).toBeLessThan(0);
  });

  it('treats today as 0 days from expiration', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysUntilExpiration(today)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scanForUser — integration with mocks
// ---------------------------------------------------------------------------
describe('scanForUser', () => {
  const userId = 'user-123';
  const artistId = 'artist-456';
  const songId = 'song-789';
  const mbid = 'mbid-fred';

  const mockArtist = {
    id: artistId,
    userId,
    artistName: 'Fred Again..',
    mbid,
    createdAt: new Date(),
  };

  const mockSong = {
    id: songId,
    userId,
    title: 'Delilah (pull me out of this)',
    iswc: null,
    bmiWorkId: null,
    ascapWorkId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDbState = {
      artists: [mockArtist],
      linkedSongs: [{ song: mockSong }],
      existingPerformances: [],
      insertedPerformances: [],
      insertedScanLogs: [],
    };
  });

  it('returns empty results when artist has no MBID', async () => {
    mockDbState.artists = [{ ...mockArtist, mbid: null }];

    const results = await scanForUser(userId);
    expect(results).toEqual([]);
    expect(getArtistSetlists).not.toHaveBeenCalled();
  });

  it('returns empty results when artist has no linked songs', async () => {
    mockDbState.linkedSongs = [];

    const results = await scanForUser(userId);
    expect(results).toHaveLength(1);
    expect(results[0].newPerformances).toBe(0);
    expect(getArtistSetlists).not.toHaveBeenCalled();
  });

  it('matches an exact song title and creates a performance', async () => {
    const setlist = makeSetlist({
      songNames: ['Delilah (pull me out of this)'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results).toHaveLength(1);
    expect(results[0].newPerformances).toBe(1);
    expect(results[0].songTitles).toContain('Delilah (pull me out of this)');
    expect(mockDbState.insertedPerformances).toHaveLength(2); // 1 performance + 1 scan log
  });

  it('skips songs that do not match any catalog entry', async () => {
    const setlist = makeSetlist({
      songNames: ['Unknown Song That Nobody Wrote'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(0);
  });

  it('matches via normalization (feat. tag stripped)', async () => {
    const setlist = makeSetlist({
      songNames: ['Delilah (pull me out of this) (feat. Someone)'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(1);
  });

  it('skips duplicate performances', async () => {
    mockDbState.existingPerformances = [{ id: 'existing-perf' }];

    const setlist = makeSetlist({
      songNames: ['Delilah (pull me out of this)'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(0);
  });

  it('counts setlists correctly', async () => {
    const setlists = [
      makeSetlist({ id: 'sl-1', songNames: ['Other Song'] }),
      makeSetlist({ id: 'sl-2', songNames: ['Another Song'] }),
      makeSetlist({ id: 'sl-3', songNames: ['Yet Another'] }),
    ];
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists, total: 3 });

    const results = await scanForUser(userId);
    expect(results[0].setlistsFound).toBe(3);
  });

  it('stops scanning when setlist date is older than 9 months', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 10);
    const dd = String(oldDate.getDate()).padStart(2, '0');
    const mm = String(oldDate.getMonth() + 1).padStart(2, '0');
    const yyyy = oldDate.getFullYear();

    const oldSetlist = makeSetlist({
      id: 'old-sl',
      eventDate: `${dd}-${mm}-${yyyy}`,
      songNames: ['Delilah (pull me out of this)'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [oldSetlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(0);
  });

  it('handles multiple songs in one setlist', async () => {
    const song2 = { ...mockSong, id: 'song-2', title: 'Lace It' };
    mockDbState.linkedSongs = [{ song: mockSong }, { song: song2 }];

    const setlist = makeSetlist({
      songNames: ['Delilah (pull me out of this)', 'Lace It', 'Unknown Song'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(2);
    expect(results[0].songTitles).toContain('Delilah (pull me out of this)');
    expect(results[0].songTitles).toContain('Lace It');
  });

  it('does not duplicate song titles in results', async () => {
    const sl1 = makeSetlist({ id: 'sl-1', songNames: ['Delilah (pull me out of this)'] });
    const sl2 = makeSetlist({ id: 'sl-2', songNames: ['Delilah (pull me out of this)'] });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [sl1, sl2], total: 2 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(2);
    expect(results[0].songTitles).toEqual(['Delilah (pull me out of this)']);
  });

  it('matches case-insensitively', async () => {
    const setlist = makeSetlist({
      songNames: ['DELILAH (PULL ME OUT OF THIS)'],
    });
    vi.mocked(getArtistSetlists).mockResolvedValue({ setlists: [setlist], total: 1 });

    const results = await scanForUser(userId);
    expect(results[0].newPerformances).toBe(1);
  });
});
