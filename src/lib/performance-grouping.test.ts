import { describe, it, expect } from 'vitest';
import {
  groupByShow,
  showKey,
  formatStatusSummary,
  type PerformanceRow,
} from './performance-grouping';
import type { PerformanceStatus } from '@/lib/constants';
import type { PerformanceSource } from '@/lib/source-display';

function makeRow(opts: {
  id: string;
  eventDate: string;
  venueName?: string | null;
  artistId?: string;
  artistName?: string;
  songId?: string;
  songTitle?: string;
  status?: PerformanceStatus;
  expiresAt?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  venueCountry?: string | null;
  source?: PerformanceSource;
}): PerformanceRow {
  return {
    performance: {
      id: opts.id,
      eventDate: opts.eventDate,
      venueName: opts.venueName ?? 'The Echo',
      venueCity: opts.venueCity ?? 'Los Angeles',
      venueState: opts.venueState ?? 'CA',
      venueCountry: opts.venueCountry ?? 'US',
      status: opts.status ?? 'discovered',
      expiresAt: opts.expiresAt ?? null,
      setlistFmUrl: null,
      tourName: null,
      source: opts.source ?? 'setlist_fm',
    },
    song: { id: opts.songId ?? `song-${opts.id}`, title: opts.songTitle ?? 'a song' },
    artist: { id: opts.artistId ?? 'artist-1', artistName: opts.artistName ?? 'Fred Again..' },
  };
}

describe('showKey', () => {
  it('combines eventDate, venueName, and artistId', () => {
    expect(showKey('2026-04-15', 'The Echo', 'artist-1')).toBe(
      '2026-04-15|The Echo|artist-1'
    );
  });

  it('treats null venueName as empty string', () => {
    expect(showKey('2026-04-15', null, 'artist-1')).toBe('2026-04-15||artist-1');
  });

  it('keeps two unrelated shows in different keys', () => {
    expect(showKey('2026-04-15', 'A', 'x')).not.toBe(showKey('2026-04-15', 'B', 'x'));
    expect(showKey('2026-04-15', 'A', 'x')).not.toBe(showKey('2026-04-16', 'A', 'x'));
    expect(showKey('2026-04-15', 'A', 'x')).not.toBe(showKey('2026-04-15', 'A', 'y'));
  });
});

describe('groupByShow', () => {
  it('returns an empty array for empty input', () => {
    expect(groupByShow([])).toEqual([]);
  });

  it('treats one row as a one-song group', () => {
    const groups = groupByShow([makeRow({ id: 'p1', eventDate: '2026-04-15' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].songCount).toBe(1);
    expect(groups[0].rows).toHaveLength(1);
  });

  it('groups multiple songs at the same show together', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', songTitle: 'a' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', songTitle: 'b' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', songTitle: 'c' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].songCount).toBe(3);
    expect(groups[0].rows.map((r) => r.song.title)).toEqual(['a', 'b', 'c']);
  });

  it('separates same-date shows at different venues', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', venueName: 'The Echo' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', venueName: 'The Roxy' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('separates same-date same-venue shows by different artists (festivals)', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', artistId: 'a' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', artistId: 'b' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('groups null-venue shows separately from each other when artist differs', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', venueName: null, artistId: 'a' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', venueName: null, artistId: 'b' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('preserves input order at the group level', () => {
    // Input: most recent first (matches the API ordering).
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-05-01', venueName: 'X' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', venueName: 'Y' }),
      makeRow({ id: 'p3', eventDate: '2026-05-01', venueName: 'X' }),
    ]);
    expect(groups.map((g) => g.eventDate)).toEqual(['2026-05-01', '2026-04-15']);
    expect(groups[0].songCount).toBe(2);
  });

  it('counts statuses per group', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', status: 'confirmed' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', status: 'confirmed' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', status: 'submitted' }),
      makeRow({ id: 'p4', eventDate: '2026-04-15', status: 'discovered' }),
    ]);
    expect(groups[0].statusCounts).toEqual({
      confirmed: 2,
      submitted: 1,
      discovered: 1,
    });
  });

  it('collects discovered ids for show-level bulk-confirm', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', status: 'discovered' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', status: 'confirmed' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', status: 'discovered' }),
    ]);
    expect(groups[0].discoveredIds).toEqual(['p1', 'p3']);
  });

  it('picks the earliest expiration across the show', () => {
    // Important for the show-level deadline display: the group is "ready to file"
    // until its earliest deadline expires, not its latest.
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', expiresAt: '2026-12-31' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', expiresAt: '2026-09-30' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', expiresAt: '2026-11-15' }),
    ]);
    expect(groups[0].earliestExpiresAt).toBe('2026-09-30');
  });

  it('ignores null expirations when picking earliest', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', expiresAt: null }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', expiresAt: '2026-09-30' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', expiresAt: null }),
    ]);
    expect(groups[0].earliestExpiresAt).toBe('2026-09-30');
  });

  it('returns null earliest expiration when every row is null', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', expiresAt: null }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', expiresAt: null }),
    ]);
    expect(groups[0].earliestExpiresAt).toBeNull();
  });
});

describe('groupByShow — sources', () => {
  it('records a single source on the group when every row matches', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', source: 'setlist_fm' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', source: 'setlist_fm' }),
    ]);
    expect(groups[0].sources).toEqual(['setlist_fm']);
  });

  it('dedupes repeated sources within a group', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', source: 'bandsintown' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', source: 'bandsintown' }),
      makeRow({ id: 'p3', eventDate: '2026-04-15', source: 'bandsintown' }),
    ]);
    expect(groups[0].sources).toEqual(['bandsintown']);
  });

  it('collects every distinct source when a group spans multiple (edge case)', () => {
    // This shouldn't normally happen — dedupe is supposed to prevent it —
    // but if e.g. venue-name capitalization differs between two scan sources
    // the helper must still surface both.
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', source: 'setlist_fm' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', source: 'bandsintown' }),
    ]);
    expect(groups[0].sources.sort()).toEqual(['bandsintown', 'setlist_fm']);
  });

  it('keeps source insertion order (first-seen wins)', () => {
    const groups = groupByShow([
      makeRow({ id: 'p1', eventDate: '2026-04-15', source: 'manual' }),
      makeRow({ id: 'p2', eventDate: '2026-04-15', source: 'setlist_fm' }),
    ]);
    expect(groups[0].sources).toEqual(['manual', 'setlist_fm']);
  });
});

describe('formatStatusSummary', () => {
  it('returns empty string when no statuses present', () => {
    expect(formatStatusSummary({})).toBe('');
  });

  it('renders a single status as count + label', () => {
    expect(formatStatusSummary({ confirmed: 4 })).toBe('4 confirmed');
  });

  it('orders by lifecycle (discovered → confirmed → submitted → expired → ineligible)', () => {
    expect(
      formatStatusSummary({
        ineligible: 1,
        submitted: 3,
        confirmed: 8,
        discovered: 2,
      })
    ).toBe('2 discovered · 8 confirmed · 3 submitted · 1 ineligible');
  });

  it('skips zero counts', () => {
    expect(formatStatusSummary({ discovered: 0, confirmed: 5 })).toBe('5 confirmed');
  });
});
