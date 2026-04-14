/**
 * Build a deep-link URL to BMI's Songview repertoire search.
 *
 * BMI's repertoire.bmi.com search supports URL-based pre-fill via query params.
 * It carries the full Songview dataset (covers both BMI and ASCAP works).
 *
 * When we have an ISWC, search by ISWC (most accurate).
 * Otherwise fall back to title search.
 *
 * Note: first-time visitors hit a T&C disclaimer page that preserves the
 * query params, so the deep-link works after they accept once.
 */
export function songviewSearchUrl(iswc: string | null, title: string): string {
  const base = 'https://repertoire.bmi.com/Search/Search';
  const common = 'Search_Type=all&View_Count=0&Page_Number=0';

  if (iswc) {
    return `${base}?Main_Search_Text=${encodeURIComponent(iswc)}&Main_Search=ISWC&${common}`;
  }

  return `${base}?Main_Search_Text=${encodeURIComponent(title)}&Main_Search=Title&${common}`;
}
