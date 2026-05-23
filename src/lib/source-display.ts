// Canonical labels + visibility rules for the performance source indicators
// on /performances (group badge, filter chips) and /performances/[id]
// (discovered-via line). Keeping the labels here means the four sources
// stay visually consistent across surfaces, and adding a fifth source
// (e.g. a future Songkick path) is one-place work.

export const PERFORMANCE_SOURCES = [
  'setlist_fm',
  'bandsintown',
  'serato_import',
  'manual',
] as const;

export type PerformanceSource = (typeof PERFORMANCE_SOURCES)[number];

// Short labels for the group-header badge — "via {label}".
// Lowercase to match the rest of the app's tone; no emoji to keep the
// list dense.
export const SOURCE_BADGE_LABELS: Record<PerformanceSource, string> = {
  setlist_fm: 'setlist.fm',
  bandsintown: 'bandsintown',
  serato_import: 'serato',
  manual: 'manual',
};

// Full sentences for the detail page "discovered via X" line. Phrased per
// source so the user understands the data lineage at a glance.
export const SOURCE_DETAIL_PHRASES: Record<PerformanceSource, string> = {
  setlist_fm: 'discovered via setlist.fm scan',
  bandsintown: 'imported from your bandsintown profile',
  serato_import: 'imported from serato dj history',
  manual: 'added manually',
};

// Filter chip labels for the /performances source filter row.
export const SOURCE_CHIP_LABELS: Record<PerformanceSource, string> = {
  setlist_fm: 'setlist.fm',
  bandsintown: 'bandsintown',
  serato_import: 'serato',
  manual: 'manual',
};

/**
 * Returns true when the user has performances from more than one source.
 * Drives whether we render the group-badge + filter-chip row at all — keeps
 * the list visually clean for users with a single source (most beta testers
 * today have only setlist.fm + manual, sometimes only setlist.fm).
 */
export function hasMultipleSources(sources: ReadonlyArray<PerformanceSource>): boolean {
  if (sources.length < 2) return false;
  const seen = new Set<PerformanceSource>();
  for (const s of sources) {
    seen.add(s);
    if (seen.size > 1) return true;
  }
  return false;
}

/**
 * Counts of each source in the dataset. Used for the filter-chip badges
 * ("setlist.fm (24)"). Includes every canonical source even when the count
 * is zero so the chip row is deterministic across renders.
 */
export function countBySource(
  sources: ReadonlyArray<PerformanceSource>
): Record<PerformanceSource, number> {
  const counts: Record<PerformanceSource, number> = {
    setlist_fm: 0,
    bandsintown: 0,
    serato_import: 0,
    manual: 0,
  };
  for (const s of sources) {
    if (s in counts) counts[s] += 1;
  }
  return counts;
}

/**
 * The filter-chip predicate: returns true when the row's source matches the
 * active filter ('all' matches everything). Pulled out of the page so the
 * "chip narrows the list" behavior is unit-testable without RTL.
 */
export function matchesSourceFilter(
  source: PerformanceSource,
  filter: PerformanceSource | 'all'
): boolean {
  if (filter === 'all') return true;
  return source === filter;
}
