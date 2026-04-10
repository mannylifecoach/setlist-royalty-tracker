import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { lookupVenueCapacity } from './openstreetmap';

function overpassResponse(elements: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({ elements }),
  };
}

describe('openstreetmap lookupVenueCapacity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns capacity from matching OSM element', async () => {
    mockFetch.mockResolvedValueOnce(
      overpassResponse([
        {
          type: 'way',
          id: 123456,
          tags: { name: 'Madison Square Garden', capacity: '20789' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Madison Square Garden', 'New York');

    expect(result).toEqual({ capacity: 20789, osmId: 'way/123456' });
  });

  it('skips elements without capacity tag', async () => {
    mockFetch.mockResolvedValueOnce(
      overpassResponse([
        { type: 'node', id: 111, tags: { name: 'Some Venue' } },
        {
          type: 'way',
          id: 222,
          tags: { name: 'Some Venue', capacity: '500' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Some Venue');

    expect(result).toEqual({ capacity: 500, osmId: 'way/222' });
  });

  it('returns null when no elements found', async () => {
    mockFetch.mockResolvedValueOnce(overpassResponse([]));

    const result = await lookupVenueCapacity('Nonexistent Venue');

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    const result = await lookupVenueCapacity('Some Venue');

    expect(result).toBeNull();
  });

  it('returns null when capacity is non-numeric', async () => {
    mockFetch.mockResolvedValueOnce(
      overpassResponse([
        {
          type: 'node',
          id: 333,
          tags: { name: 'Small Club', capacity: 'varies' },
        },
      ])
    );

    const result = await lookupVenueCapacity('Small Club');

    expect(result).toBeNull();
  });

  it('uses POST with form-encoded body', async () => {
    mockFetch.mockResolvedValueOnce(overpassResponse([]));

    await lookupVenueCapacity('Test Venue', 'Test City');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: expect.stringContaining('data='),
      })
    );
  });
});
