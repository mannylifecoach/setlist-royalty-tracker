/**
 * Fuzzy song title matching for the scanner.
 *
 * Matching strategy (in order):
 *   1. Exact match on normalized titles
 *   2. Levenshtein similarity ≥ 0.85
 */

const STRIP_PATTERNS = [
  /\(feat\.?\s+[^)]*\)/gi,   // (feat. Artist)
  /\(ft\.?\s+[^)]*\)/gi,     // (ft. Artist)
  /\(live[^)]*\)/gi,          // (Live), (Live at Wembley)
  /\(acoustic[^)]*\)/gi,      // (Acoustic)
  /\([^)]*remix[^)]*\)/gi,    // (Remix), (DJ X Remix)
  /\(radio edit\)/gi,          // (Radio Edit)
  /\(deluxe[^)]*\)/gi,        // (Deluxe Version)
  /\(remaster(ed)?[^)]*\)/gi,  // (Remastered 2024)
  /\(original mix\)/gi,
  /\(ver\.?\s*\d*\)/gi,       // (Ver. 2)
  /\(version\s*\d*\)/gi,
];

/** Normalize a song title for comparison. */
export function normalizeTitle(title: string): string {
  let t = title;

  // Strip common parenthetical tags
  for (const pattern of STRIP_PATTERNS) {
    t = t.replace(pattern, '');
  }

  // Strip accents/diacritics
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove all punctuation except spaces
  t = t.replace(/[^\w\s]/g, '');

  // Collapse whitespace and trim
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();

  return t;
}

/** Levenshtein distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Optimization: use single-row DP
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/** Similarity ratio 0–1 (1 = identical). */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.85;

export interface MatchResult<T> {
  match: T;
  score: number;       // 1.0 = exact normalized, 0.85–0.99 = fuzzy
  method: 'exact' | 'fuzzy';
}

/**
 * Find the best matching song from a pre-built normalized map.
 *
 * @param setlistSongName  Raw song name from setlist.fm
 * @param normalizedMap    Map of normalizedTitle → song object
 * @returns The best match above threshold, or null
 */
export function findBestMatch<T>(
  setlistSongName: string,
  normalizedMap: Map<string, T>
): MatchResult<T> | null {
  const normalized = normalizeTitle(setlistSongName);

  // 1. Exact normalized match
  const exact = normalizedMap.get(normalized);
  if (exact) {
    return { match: exact, score: 1.0, method: 'exact' };
  }

  // 2. Fuzzy match — find the closest title above threshold
  let bestScore = 0;
  let bestMatch: T | null = null;

  for (const [catalogTitle, song] of normalizedMap) {
    const score = similarity(normalized, catalogTitle);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = song;
    }
  }

  if (bestMatch && bestScore >= FUZZY_THRESHOLD) {
    return { match: bestMatch, score: bestScore, method: 'fuzzy' };
  }

  return null;
}
