import { SETLISTFM_BASE_URL, SETLISTFM_RATE_LIMIT_MS } from './constants';

interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
}

interface SetlistFmVenue {
  name: string;
  city: {
    name: string;
    state?: string;
    stateCode?: string;
    country: {
      code: string;
      name: string;
    };
  };
}

interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: { mbid: string; name: string };
}

interface SetlistFmSet {
  song: SetlistFmSong[];
  name?: string;
  encore?: number;
}

export interface SetlistFmSetlist {
  id: string;
  eventDate: string; // dd-MM-yyyy
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: { name: string };
  sets: { set: SetlistFmSet[] };
  url: string;
}

interface SetlistFmSearchResult<T> {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  [key: string]: T[] | string | number;
}

const headers = () => ({
  Accept: 'application/json',
  'x-api-key': process.env.SETLISTFM_API_KEY || '',
});

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < SETLISTFM_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, SETLISTFM_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, { headers: headers() });
}

export async function searchArtists(
  query: string
): Promise<SetlistFmArtist[]> {
  const url = `${SETLISTFM_BASE_URL}/search/artists?artistName=${encodeURIComponent(query)}&sort=relevance`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as SetlistFmSearchResult<SetlistFmArtist>;
  return (data.artist as SetlistFmArtist[]) || [];
}

export async function getArtistSetlists(
  mbid: string,
  page = 1
): Promise<{ setlists: SetlistFmSetlist[]; total: number }> {
  const url = `${SETLISTFM_BASE_URL}/artist/${mbid}/setlists?p=${page}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return { setlists: [], total: 0 };
  const data = (await res.json()) as SetlistFmSearchResult<SetlistFmSetlist>;
  return {
    setlists: (data.setlist as SetlistFmSetlist[]) || [],
    total: data.total,
  };
}

export function extractSongsFromSetlist(setlist: SetlistFmSetlist): string[] {
  if (!setlist.sets?.set) return [];
  return setlist.sets.set.flatMap((set) =>
    (set.song || []).map((song) => song.name).filter(Boolean)
  );
}

export function parseSetlistFmDate(dateStr: string): string {
  // setlist.fm format: dd-MM-yyyy → yyyy-MM-dd
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the BMI Live filing deadline for a given performance date.
 *
 * BMI Live runs biannual (overlapping) tracking windows, NOT a rolling 9-month
 * deadline. Each performance falls into TWO 6-month tracking windows; the filing
 * deadline is exactly 3 months after each window's close. Verified 2026-05-04
 * against BMI Live deadline pages — Jul-Dec 2023 perfs → Mar 31 2024; Oct 2025
 * - Mar 2026 perfs → Jun 30 2026.
 *
 * SRT shows the EARLIER of the two valid deadlines for each performance — the
 * conservative framing. Worst case: user files earlier than strictly necessary.
 * Best case: avoids the prior bug where users believed they had 9 months when
 * BMI's actual practical window for them was much shorter (Mckay's 2026-05-03
 * beta-test feedback drove this fix).
 *
 * Per-quarter mapping:
 *   Q1 perfs (Jan-Mar) → Jun 30 same year       (3-6 month filing window)
 *   Q2 perfs (Apr-Jun) → Sep 30 same year       (3-6 month filing window)
 *   Q3 perfs (Jul-Sep) → Dec 31 same year       (3-6 month filing window)
 *   Q4 perfs (Oct-Dec) → Mar 31 NEXT year       (3-6 month filing window)
 */
export function calculateExpirationDate(eventDate: string): string {
  const [year, month] = eventDate.split('-').map(Number);
  let deadlineYear = year;
  let deadlineMonth: number; // 1-12
  let deadlineDay: number;
  if (month <= 3) {
    deadlineMonth = 6;
    deadlineDay = 30;
  } else if (month <= 6) {
    deadlineMonth = 9;
    deadlineDay = 30;
  } else if (month <= 9) {
    deadlineMonth = 12;
    deadlineDay = 31;
  } else {
    deadlineYear = year + 1;
    deadlineMonth = 3;
    deadlineDay = 31;
  }
  const d = new Date(Date.UTC(deadlineYear, deadlineMonth - 1, deadlineDay));
  return d.toISOString().split('T')[0];
}
