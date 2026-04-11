/**
 * Songview lookup — queries the BMI public repertoire and ASCAP repertoire
 * to find Work IDs given an ISWC.
 *
 * Songview (songview.com) is the joint ASCAP/BMI public works database.
 * Both PROs expose search endpoints that accept ISWC queries.
 *
 * Note: BMI and ASCAP do not publish official APIs for these endpoints.
 * Both expose JSON-returning search endpoints used by their public web UI.
 * If those endpoints change shape, this module will need to be updated.
 */

const BMI_SEARCH_URL = 'https://repertoire.bmi.com/Search/Search';
const ASCAP_SEARCH_URL = 'https://www.ascap.com/repertory/api/search';

export interface SongviewResult {
  bmiWorkId: string | null;
  ascapWorkId: string | null;
}

interface BmiSearchResult {
  TableData?: Array<{ WorkID?: string }>;
}

interface AscapSearchResult {
  results?: Array<{ workId?: string; ascapWorkId?: string }>;
}

async function lookupBmi(iswc: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      Main_Search_Text: iswc,
      Main_Search: 'ISWC',
      Sub_Search: 'WORKID',
      Search_Type: 'all',
      Search_Determiner: '0',
      View_Count: '20',
      Page_Number: '0',
      StartIndex: '0',
    });

    const res = await fetch(BMI_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as BmiSearchResult;
    return data?.TableData?.[0]?.WorkID || null;
  } catch {
    return null;
  }
}

async function lookupAscap(iswc: string): Promise<string | null> {
  try {
    const url = `${ASCAP_SEARCH_URL}?searchType=workid&searchTerm=${encodeURIComponent(iswc)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as AscapSearchResult;
    const first = data?.results?.[0];
    return first?.ascapWorkId || first?.workId || null;
  } catch {
    return null;
  }
}

/**
 * Look up BMI and ASCAP Work IDs for a given ISWC by querying both PROs in parallel.
 * Returns null for either PRO if no match is found or the lookup fails.
 */
export async function lookupWorkIdsByIswc(
  iswc: string
): Promise<SongviewResult> {
  const [bmiWorkId, ascapWorkId] = await Promise.all([
    lookupBmi(iswc),
    lookupAscap(iswc),
  ]);

  return { bmiWorkId, ascapWorkId };
}
