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

export function calculateExpirationDate(eventDate: string): string {
  const [year, month, day] = eventDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCMonth(d.getUTCMonth() + 9);
  return d.toISOString().split('T')[0];
}
