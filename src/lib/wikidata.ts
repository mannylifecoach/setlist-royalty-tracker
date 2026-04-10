import { WIKIDATA_SPARQL_ENDPOINT, WIKIDATA_RATE_LIMIT_MS } from './constants';

export interface WikidataVenueResult {
  capacity: number;
  entityId: string;
}

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < WIKIDATA_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, WIKIDATA_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'SetlistRoyaltyTracker/1.0 (https://setlistroyalty.com)',
    },
  });
}

function escapeSparql(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildExactQuery(venueName: string): string {
  const escaped = escapeSparql(venueName);
  return `
SELECT ?venue ?capacity WHERE {
  { ?venue rdfs:label "${escaped}"@en }
  UNION
  { ?venue skos:altLabel "${escaped}"@en }
  ?venue wdt:P1083 ?capacity .
} LIMIT 1`;
}

function buildFuzzyQuery(venueName: string, venueCity?: string): string {
  const escaped = escapeSparql(venueName.toLowerCase());
  let filter = `FILTER(CONTAINS(LCASE(?label), "${escaped}"))`;
  if (venueCity) {
    const cityEscaped = escapeSparql(venueCity.toLowerCase());
    filter += `
  OPTIONAL {
    ?venue wdt:P131 ?location .
    ?location rdfs:label ?locLabel .
    FILTER(LANG(?locLabel) = "en")
    FILTER(CONTAINS(LCASE(?locLabel), "${cityEscaped}"))
  }`;
  }
  return `
SELECT ?venue ?capacity WHERE {
  ?venue wdt:P1083 ?capacity .
  ?venue rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  ${filter}
} LIMIT 5`;
}

function parseEntityId(uri: string): string {
  const match = uri.match(/\/(Q\d+)$/);
  return match ? match[1] : uri;
}

export async function lookupVenueCapacity(
  venueName: string,
  venueCity?: string
): Promise<WikidataVenueResult | null> {
  // Try exact match first (fast)
  const exactQuery = buildExactQuery(venueName);
  const exactResult = await executeSparqlQuery(exactQuery);
  if (exactResult) return exactResult;

  // Fall back to fuzzy match (slower but catches name variations)
  const fuzzyQuery = buildFuzzyQuery(venueName, venueCity);
  return executeSparqlQuery(fuzzyQuery);
}

async function executeSparqlQuery(
  query: string
): Promise<WikidataVenueResult | null> {
  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;

  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const bindings = data?.results?.bindings;
    if (!bindings || bindings.length === 0) return null;

    const first = bindings[0];
    const capacity = parseInt(first.capacity?.value, 10);
    if (isNaN(capacity)) return null;

    return {
      capacity,
      entityId: parseEntityId(first.venue?.value || ''),
    };
  } catch {
    return null;
  }
}
