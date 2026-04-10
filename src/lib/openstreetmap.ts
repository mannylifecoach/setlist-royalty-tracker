import { OSM_OVERPASS_ENDPOINT, OSM_RATE_LIMIT_MS } from './constants';

export interface OsmVenueResult {
  capacity: number;
  osmId: string;
}

let lastRequestTime = 0;

async function rateLimitedFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < OSM_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, OSM_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'SetlistRoyaltyTracker/1.0 (https://setlistroyalty.com)',
      ...init.headers,
    },
  });
}

function escapeOverpass(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildOverpassQuery(venueName: string, venueCity?: string): string {
  const nameEscaped = escapeOverpass(venueName);

  if (venueCity) {
    const cityEscaped = escapeOverpass(venueCity);
    return `
[out:json][timeout:10];
area["name"="${cityEscaped}"]->.city;
(
  nwr["name"~"${nameEscaped}",i]["capacity"](area.city);
);
out body;`;
  }

  return `
[out:json][timeout:10];
(
  nwr["name"~"${nameEscaped}",i]["capacity"];
);
out body 5;`;
}

export async function lookupVenueCapacity(
  venueName: string,
  venueCity?: string
): Promise<OsmVenueResult | null> {
  const query = buildOverpassQuery(venueName, venueCity);

  try {
    const res = await rateLimitedFetch(OSM_OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const elements = data?.elements;
    if (!elements || elements.length === 0) return null;

    // Find the first element with a numeric capacity tag
    for (const el of elements) {
      const rawCapacity = el.tags?.capacity;
      if (!rawCapacity) continue;

      const capacity = parseInt(rawCapacity, 10);
      if (isNaN(capacity)) continue;

      return {
        capacity,
        osmId: `${el.type}/${el.id}`,
      };
    }

    return null;
  } catch {
    return null;
  }
}
