import type { PerformanceStatus } from '@/lib/constants';
import type { PerformanceSource } from '@/lib/source-display';

export interface PerformanceRow {
  performance: {
    id: string;
    eventDate: string;
    venueName: string | null;
    venueCity: string | null;
    venueState: string | null;
    venueCountry: string | null;
    status: PerformanceStatus;
    expiresAt: string | null;
    setlistFmUrl: string | null;
    tourName: string | null;
    source: PerformanceSource;
  };
  song: { id: string; title: string };
  artist: { id: string; artistName: string };
}

export interface ShowGroup {
  key: string;
  eventDate: string;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  artist: { id: string; artistName: string };
  rows: PerformanceRow[];
  songCount: number;
  statusCounts: Partial<Record<PerformanceStatus, number>>;
  earliestExpiresAt: string | null;
  discoveredIds: string[];
  // Sources represented in this group (almost always length 1 — a show is
  // discovered once by one source. Length 2+ only if dedupe misses, e.g.
  // venue-name capitalization differs between scan sources).
  sources: PerformanceSource[];
}

export function showKey(eventDate: string, venueName: string | null, artistId: string): string {
  return `${eventDate}|${venueName ?? ''}|${artistId}`;
}

// Groups performance rows by (eventDate, venueName, artistId). Preserves the
// input order: a group appears at the position of its first row, so callers
// that pre-sort by eventDate desc keep that ordering at the group level.
export function groupByShow(rows: PerformanceRow[]): ShowGroup[] {
  const groups = new Map<string, ShowGroup>();

  for (const row of rows) {
    const { performance, artist } = row;
    const key = showKey(performance.eventDate, performance.venueName, artist.id);

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        eventDate: performance.eventDate,
        venueName: performance.venueName,
        venueCity: performance.venueCity,
        venueState: performance.venueState,
        venueCountry: performance.venueCountry,
        artist,
        rows: [],
        songCount: 0,
        statusCounts: {},
        earliestExpiresAt: null,
        discoveredIds: [],
        sources: [],
      };
      groups.set(key, group);
    }

    group.rows.push(row);
    group.songCount += 1;
    group.statusCounts[performance.status] =
      (group.statusCounts[performance.status] ?? 0) + 1;
    if (!group.sources.includes(performance.source)) {
      group.sources.push(performance.source);
    }

    if (performance.expiresAt) {
      if (
        group.earliestExpiresAt === null ||
        performance.expiresAt < group.earliestExpiresAt
      ) {
        group.earliestExpiresAt = performance.expiresAt;
      }
    }

    if (performance.status === 'discovered') {
      group.discoveredIds.push(performance.id);
    }
  }

  return Array.from(groups.values());
}

// Renders the status mix as a compact, deterministic string. Order matches
// the lifecycle: discovered → confirmed → submitted → expired → ineligible.
// Used in the multi-song header row so the user can see the show's overall
// state without expanding it.
const STATUS_RENDER_ORDER: PerformanceStatus[] = [
  'discovered',
  'confirmed',
  'submitted',
  'expired',
  'ineligible',
];

export function formatStatusSummary(
  counts: Partial<Record<PerformanceStatus, number>>
): string {
  return STATUS_RENDER_ORDER.filter((s) => (counts[s] ?? 0) > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(' · ');
}
