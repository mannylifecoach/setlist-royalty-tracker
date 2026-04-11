import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./musicbrainz', () => ({
  lookupSongMetadata: vi.fn(),
}));
vi.mock('./venue-enrichment', () => ({
  enrichVenueCapacity: vi.fn(),
}));

const {
  mockSongs,
  mockSongArtistLinks,
  mockInsertedPerformances,
  mockInsertedBatches,
  mockUpdatedBatchCounts,
} = vi.hoisted(() => ({
  mockSongs: { value: [] as Record<string, unknown>[] },
  mockSongArtistLinks: { value: [] as { songId: string; artistId: string }[] },
  mockInsertedPerformances: { value: [] as Record<string, unknown>[] },
  mockInsertedBatches: { value: [] as Record<string, unknown>[] },
  mockUpdatedBatchCounts: { value: [] as { id: string; performancesCreated: number }[] },
}));

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableName = (table as any)?.[Symbol.for('drizzle:Name')] || String(table);

        if (tableName.includes('song_artists')) {
          // Return all links (no where clause in the orchestrator for this)
          return Promise.resolve(mockSongArtistLinks.value);
        }

        return {
          where: vi.fn().mockResolvedValue(mockSongs.value),
        };
      },
    }),
    insert: (table: unknown) => ({
      values: (val: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableName = (table as any)?.[Symbol.for('drizzle:Name')] || String(table);
        if (tableName.includes('import_batches')) {
          const batch = { id: `batch-${mockInsertedBatches.value.length + 1}`, ...val };
          mockInsertedBatches.value.push(batch);
          return { returning: () => Promise.resolve([batch]) };
        }
        if (tableName.includes('performances')) {
          mockInsertedPerformances.value.push(val);
        }
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (val: Record<string, unknown>) => ({
        where: () => {
          mockUpdatedBatchCounts.value.push({
            id: 'batch',
            performancesCreated: val.performancesCreated as number,
          });
          return Promise.resolve();
        },
      }),
    }),
  },
}));

import { importSeratoTracks } from './serato-import-orchestrator';
import { lookupSongMetadata } from './musicbrainz';
import { enrichVenueCapacity } from './venue-enrichment';
import type { SeratoTrack } from './serato-import';

const mockMb = vi.mocked(lookupSongMetadata);
const mockEnrich = vi.mocked(enrichVenueCapacity);

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ARTIST_ID = '22222222-2222-2222-2222-222222222222';

const venue = {
  name: 'Rebel',
  city: 'Toronto',
  state: 'ON',
  country: 'CA',
  eventDate: '2025-12-26',
};

function track(title: string, artistName = 'Producer A'): SeratoTrack {
  return { title, artistName, startTime: null, row: 1 };
}

describe('importSeratoTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSongs.value = [];
    mockSongArtistLinks.value = [];
    mockInsertedPerformances.value = [];
    mockInsertedBatches.value = [];
    mockUpdatedBatchCounts.value = [];
    mockEnrich.mockResolvedValue({
      resolvedCapacity: 2000,
      wikidataCapacity: null,
      osmCapacity: null,
      confidence: 'high',
      source: 'auto',
    });
  });

  it('returns zero matches when user has no registered songs', async () => {
    mockSongs.value = [];

    const result = await importSeratoTracks(
      USER_ID,
      [track('Midnight Bass')],
      venue
    );

    expect(result.performancesCreated).toBe(0);
    expect(result.unmatched).toEqual(['Midnight Bass']);
    expect(mockInsertedPerformances.value).toHaveLength(0);
  });

  it('creates performance for exact title match', async () => {
    mockSongs.value = [
      { id: 'song-1', title: 'Midnight Bass', workMbid: null },
    ];
    mockSongArtistLinks.value = [{ songId: 'song-1', artistId: ARTIST_ID }];

    const result = await importSeratoTracks(
      USER_ID,
      [track('Midnight Bass')],
      venue
    );

    expect(result.performancesCreated).toBe(1);
    expect(result.matched[0].method).toBe('exact');
    expect(mockInsertedPerformances.value).toHaveLength(1);
    expect(mockInsertedPerformances.value[0]).toMatchObject({
      userId: USER_ID,
      songId: 'song-1',
      artistId: ARTIST_ID,
      source: 'serato_import',
      venueName: 'Rebel',
      venueCity: 'Toronto',
      attendance: 2000,
      venueCapacity: '2000',
      status: 'discovered',
    });
  });

  it('matches remix via MusicBrainz Work MBID', async () => {
    mockSongs.value = [
      { id: 'song-1', title: 'Midnight Bass', workMbid: 'work-abc' },
    ];
    mockSongArtistLinks.value = [{ songId: 'song-1', artistId: ARTIST_ID }];

    // Fuzzy match will fail because title is so different
    // MusicBrainz returns the same Work MBID
    mockMb.mockResolvedValue({
      recordingMbid: 'rec-remix',
      workMbid: 'work-abc',
      iswc: 'T-123',
      title: 'Bassline Lover (Skrillex VIP Edit)',
      artistName: 'Skrillex',
    });

    const result = await importSeratoTracks(
      USER_ID,
      [track('Bassline Lover (Skrillex VIP Edit)', 'Skrillex')],
      venue
    );

    expect(result.performancesCreated).toBe(1);
    expect(result.matched[0].method).toBe('work_mbid');
    expect(result.matched[0].songTitle).toBe('Midnight Bass');
  });

  it('skips tracks with no match', async () => {
    mockSongs.value = [
      { id: 'song-1', title: 'My Track', workMbid: null },
    ];
    mockSongArtistLinks.value = [{ songId: 'song-1', artistId: ARTIST_ID }];
    mockMb.mockResolvedValue(null);

    const result = await importSeratoTracks(
      USER_ID,
      [track('Something Completely Different')],
      venue
    );

    expect(result.performancesCreated).toBe(0);
    expect(result.unmatched).toEqual(['Something Completely Different']);
  });

  it('skips matched songs that have no linked artist', async () => {
    mockSongs.value = [
      { id: 'song-orphan', title: 'Orphan Song', workMbid: null },
    ];
    mockSongArtistLinks.value = []; // No artist linked

    const result = await importSeratoTracks(
      USER_ID,
      [track('Orphan Song')],
      venue
    );

    expect(result.performancesCreated).toBe(0);
    expect(result.unmatched[0]).toContain('no linked artist');
  });

  it('creates import batch record with correct counts', async () => {
    mockSongs.value = [
      { id: 'song-1', title: 'Track One', workMbid: null },
      { id: 'song-2', title: 'Track Two', workMbid: null },
    ];
    mockSongArtistLinks.value = [
      { songId: 'song-1', artistId: ARTIST_ID },
      { songId: 'song-2', artistId: ARTIST_ID },
    ];

    await importSeratoTracks(
      USER_ID,
      [track('Track One'), track('Track Two'), track('Unknown')],
      venue
    );

    expect(mockInsertedBatches.value).toHaveLength(1);
    expect(mockInsertedBatches.value[0]).toMatchObject({
      userId: USER_ID,
      source: 'serato',
      venueName: 'Rebel',
      eventDate: '2025-12-26',
      tracksFound: 3,
    });
    // Final count updated after processing
    expect(mockUpdatedBatchCounts.value[0].performancesCreated).toBe(2);
  });

  it('falls back gracefully when venue enrichment fails', async () => {
    mockSongs.value = [
      { id: 'song-1', title: 'Track', workMbid: null },
    ];
    mockSongArtistLinks.value = [{ songId: 'song-1', artistId: ARTIST_ID }];
    mockEnrich.mockRejectedValue(new Error('wikidata down'));

    const result = await importSeratoTracks(
      USER_ID,
      [track('Track')],
      venue
    );

    // Performance should still be created, just without capacity
    expect(result.performancesCreated).toBe(1);
    expect(mockInsertedPerformances.value[0].venueCapacity).toBeNull();
    expect(mockInsertedPerformances.value[0].attendance).toBeNull();
  });
});
