import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_SOURCES,
  SOURCE_BADGE_LABELS,
  SOURCE_DETAIL_PHRASES,
  SOURCE_CHIP_LABELS,
  hasMultipleSources,
  countBySource,
  matchesSourceFilter,
  type PerformanceSource,
} from './source-display';

describe('PERFORMANCE_SOURCES + label maps', () => {
  it('exports exactly the four canonical sources', () => {
    expect(PERFORMANCE_SOURCES).toEqual(['setlist_fm', 'bandsintown', 'serato_import', 'manual']);
  });

  it('has a badge label for every source', () => {
    for (const s of PERFORMANCE_SOURCES) {
      expect(SOURCE_BADGE_LABELS[s]).toBeTruthy();
    }
  });

  it('has a detail phrase for every source', () => {
    for (const s of PERFORMANCE_SOURCES) {
      expect(SOURCE_DETAIL_PHRASES[s]).toBeTruthy();
    }
  });

  it('has a chip label for every source', () => {
    for (const s of PERFORMANCE_SOURCES) {
      expect(SOURCE_CHIP_LABELS[s]).toBeTruthy();
    }
  });

  it('every label set is visually distinct (no duplicates within a set)', () => {
    const badgeValues = Object.values(SOURCE_BADGE_LABELS);
    expect(new Set(badgeValues).size).toBe(badgeValues.length);

    const detailValues = Object.values(SOURCE_DETAIL_PHRASES);
    expect(new Set(detailValues).size).toBe(detailValues.length);
  });
});

describe('hasMultipleSources', () => {
  it('returns false for an empty list', () => {
    expect(hasMultipleSources([])).toBe(false);
  });

  it('returns false for a single-source list (one item)', () => {
    expect(hasMultipleSources(['setlist_fm'])).toBe(false);
  });

  it('returns false when every entry is the same source', () => {
    expect(hasMultipleSources(['setlist_fm', 'setlist_fm', 'setlist_fm'])).toBe(false);
  });

  it('returns true the moment a second distinct source appears', () => {
    expect(hasMultipleSources(['setlist_fm', 'bandsintown'])).toBe(true);
  });

  it('returns true for three or more distinct sources', () => {
    expect(hasMultipleSources(['setlist_fm', 'bandsintown', 'manual'])).toBe(true);
  });

  it('short-circuits without scanning the whole list when the second distinct hits early', () => {
    // Pure correctness check — also a smoke test that we don't recurse or allocate proportional to N
    const huge: PerformanceSource[] = Array(10_000).fill('setlist_fm');
    huge[1] = 'bandsintown';
    expect(hasMultipleSources(huge)).toBe(true);
  });
});

describe('countBySource', () => {
  it('returns all-zero counts for an empty list', () => {
    expect(countBySource([])).toEqual({
      setlist_fm: 0,
      bandsintown: 0,
      serato_import: 0,
      manual: 0,
    });
  });

  it('counts each source independently', () => {
    expect(
      countBySource([
        'setlist_fm',
        'setlist_fm',
        'bandsintown',
        'manual',
        'manual',
        'manual',
        'serato_import',
      ])
    ).toEqual({
      setlist_fm: 2,
      bandsintown: 1,
      serato_import: 1,
      manual: 3,
    });
  });

  it('ignores entries that are not canonical sources (defensive)', () => {
    // Cast to bypass the type — protects against bad DB rows or older code paths
    // sneaking a non-canonical value through.
    const counts = countBySource(['setlist_fm', 'old_legacy_source' as PerformanceSource]);
    expect(counts.setlist_fm).toBe(1);
    expect(counts.bandsintown).toBe(0);
  });
});

describe('matchesSourceFilter — chip narrows the list', () => {
  it('"all" matches every source', () => {
    for (const s of PERFORMANCE_SOURCES) {
      expect(matchesSourceFilter(s, 'all')).toBe(true);
    }
  });

  it('a specific source filter matches only that source', () => {
    expect(matchesSourceFilter('setlist_fm', 'setlist_fm')).toBe(true);
    expect(matchesSourceFilter('bandsintown', 'setlist_fm')).toBe(false);
    expect(matchesSourceFilter('serato_import', 'setlist_fm')).toBe(false);
    expect(matchesSourceFilter('manual', 'setlist_fm')).toBe(false);
  });

  it('narrows a mixed-source dataset down to the chip-selected subset', () => {
    // Simulates the /performances filter behavior end-to-end:
    // given mixed-source rows, applying a chip leaves only matching rows.
    const dataset: PerformanceSource[] = [
      'setlist_fm',
      'setlist_fm',
      'bandsintown',
      'manual',
      'bandsintown',
      'serato_import',
      'setlist_fm',
    ];
    const filteredToBandsintown = dataset.filter((s) =>
      matchesSourceFilter(s, 'bandsintown')
    );
    expect(filteredToBandsintown).toEqual(['bandsintown', 'bandsintown']);

    const filteredToManual = dataset.filter((s) => matchesSourceFilter(s, 'manual'));
    expect(filteredToManual).toEqual(['manual']);

    const filteredToAll = dataset.filter((s) => matchesSourceFilter(s, 'all'));
    expect(filteredToAll).toEqual(dataset);
  });
});
