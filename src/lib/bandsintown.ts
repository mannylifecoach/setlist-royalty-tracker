// Bandsintown Path A client — per-user BYO API key + artist slug.
//
// API surface (verified 2026-05-19 against help.artists.bandsintown.com docs):
//   Base:    https://rest.bandsintown.com
//   Artist:  GET /artists/{slug}/?app_id={key}
//   Events:  GET /artists/{slug}/events/?app_id={key}&date=past
//
// The Public API (no key) was retired 2026-05-04. Each key is bound to a single
// artist on Bandsintown's side, so a key + slug mismatch returns empty events or
// an error — we treat both as "no data" without retrying.
//
// No documented rate limits in the public docs; we add a conservative per-call
// timeout and surface 429s to the caller for backoff.

const BASE = 'https://rest.bandsintown.com';
const TIMEOUT_MS = 8000;

export type BandsintownVenue = {
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
};

export type BandsintownEvent = {
  id: string;
  url: string;
  datetime: string; // ISO8601, e.g. "2024-05-15T20:00:00"
  venue: BandsintownVenue;
  // Other fields exist (lineup, offers, etc.) but we don't consume them today.
};

export type BandsintownArtist = {
  id: string;
  name: string;
  url: string;
  upcoming_event_count?: number;
};

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; retryAfter?: number };

function buildUrl(path: string, apiKey: string, extra?: Record<string, string>): string {
  const url = new URL(path, BASE);
  url.searchParams.set('app_id', apiKey);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return url.toString();
}

// Per RFC 7231 §7.1.3, Retry-After is either a delta-seconds integer or an
// HTTP-date. Numeric is far more common from API providers; we fall back to
// the date form for completeness. Returns seconds-from-now, or undefined if
// the header is missing or unparseable.
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const when = Date.parse(header);
  if (Number.isFinite(when)) return Math.max(1, Math.ceil((when - Date.now()) / 1000));
  return undefined;
}

async function call<T>(url: string): Promise<FetchResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const result: { ok: false; status: number; error: string; retryAfter?: number } = {
        ok: false,
        status: res.status,
        error: `bandsintown returned ${res.status}`,
      };
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
        if (retryAfter !== undefined) result.retryAfter = retryAfter;
      }
      return result;
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return { ok: false, status: 0, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a single artist's profile. Used by the "test connection" button to
 * verify the key + slug combo before saving. Returns a typed artist on success.
 */
export async function fetchArtist(apiKey: string, slug: string): Promise<FetchResult<BandsintownArtist>> {
  if (!apiKey || !slug) {
    return { ok: false, status: 0, error: 'api key and artist slug are required' };
  }
  const url = buildUrl(`/artists/${encodeURIComponent(slug)}/`, apiKey);
  return call<BandsintownArtist>(url);
}

/**
 * Fetch past events for the artist tied to this API key. Returns an empty array
 * (success) when the artist has no past events on file, vs. an error result
 * when the API itself fails. Caller dedupes against existing performances.
 */
export async function fetchPastEvents(
  apiKey: string,
  slug: string
): Promise<FetchResult<BandsintownEvent[]>> {
  if (!apiKey || !slug) {
    return { ok: false, status: 0, error: 'api key and artist slug are required' };
  }
  const url = buildUrl(`/artists/${encodeURIComponent(slug)}/events/`, apiKey, { date: 'past' });
  const result = await call<BandsintownEvent[]>(url);
  if (!result.ok) return result;
  // Bandsintown returns `[]` for "artist exists, no past events" and sometimes
  // `{}` for empty bodies — normalize to a typed array.
  if (!Array.isArray(result.data)) return { ok: true, data: [] };
  return result;
}

/**
 * Returns the date portion of an ISO datetime ("2024-05-15T20:00:00" → "2024-05-15").
 * Used by the scanner to populate performances.eventDate (a DATE column) without
 * dragging timezone math into the import path.
 */
export function eventDateString(datetime: string): string {
  // Defensive: if the input is malformed, just return whatever's before "T" or
  // the original string. Caller will fail validation on a non-YYYY-MM-DD value.
  const idx = datetime.indexOf('T');
  return idx >= 0 ? datetime.slice(0, idx) : datetime;
}
