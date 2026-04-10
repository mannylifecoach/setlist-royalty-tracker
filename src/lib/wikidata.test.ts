import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { lookupVenueCapacity } from './wikidata';

function sparqlResponse(bindings: Record<string, { value: string }>[]) {
  return {
    ok: true,
    json: async () => ({ results: { bindings } }),
  };
}

function emptyResponse() {
  return sparqlResponse([]);
}

describe('wikidata lookupVenueCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns capacity from exact label match', async () => {
    mockFetch.mockResolvedValueOnce(
      sparqlResponse([
        {
          venue: { value: 'http://www.wikidata.org/entity/Q186' },
          capacity: { value: '20789' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Madison Square Garden');

    expect(result).toEqual({ capacity: 20789, entityId: 'Q186' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to fuzzy match when exact returns nothing', async () => {
    mockFetch
      .mockResolvedValueOnce(emptyResponse()) // exact match fails
      .mockResolvedValueOnce(
        sparqlResponse([
          {
            venue: { value: 'http://www.wikidata.org/entity/Q1234' },
            capacity: { value: '5000' },
          },
        ])
      );

    const result = await lookupVenueCapacity('The Fillmore', 'San Francisco');

    expect(result).toEqual({ capacity: 5000, entityId: 'Q1234' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when neither query finds results', async () => {
    mockFetch
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(emptyResponse());

    const result = await lookupVenueCapacity("Bob's Backyard Stage");

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    const result = await lookupVenueCapacity('Madison Square Garden');

    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await lookupVenueCapacity('Madison Square Garden');

    // Exact fails, then fuzzy also gets attempted
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(result).toBeNull();
  });

  it('returns null when capacity is non-numeric', async () => {
    mockFetch.mockResolvedValueOnce(
      sparqlResponse([
        {
          venue: { value: 'http://www.wikidata.org/entity/Q999' },
          capacity: { value: 'unknown' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Some Venue');

    expect(result).toBeNull();
  });

  it('escapes special characters in venue names', async () => {
    mockFetch.mockResolvedValueOnce(
      sparqlResponse([
        {
          venue: { value: 'http://www.wikidata.org/entity/Q555' },
          capacity: { value: '1500' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Joe\'s Pub & "Grill"');

    expect(result).toEqual({ capacity: 1500, entityId: 'Q555' });
    // Verify the query was properly escaped
    const queryUrl = mockFetch.mock.calls[0][0];
    expect(queryUrl).not.toContain('unescaped');
  });
});
