import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./wikidata', () => ({
  lookupVenueCapacity: vi.fn(),
}));
vi.mock('./openstreetmap', () => ({
  lookupVenueCapacity: vi.fn(),
}));

// Use hoisted variables for the db mock so they're available at factory time
const { mockCacheRows, mockPerfRows, mockInsert, mockUpdate } = vi.hoisted(() => {
  const mockCacheRows = { value: [] as Record<string, unknown>[] };
  const mockPerfRows = { value: [] as Record<string, unknown>[] };
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  return { mockCacheRows, mockPerfRows, mockInsert, mockUpdate };
});

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableName = (table as any)?.[Symbol.for('drizzle:Name')] || String(table);
        const rows = tableName.includes('venue_capacity_cache')
          ? mockCacheRows.value
          : mockPerfRows.value;
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rows),
          }),
        };
      },
    }),
    insert: () => ({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: () => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

import { enrichVenueCapacity } from './venue-enrichment';
import { lookupVenueCapacity as wikidataLookup } from './wikidata';
import { lookupVenueCapacity as osmLookup } from './openstreetmap';

const mockWikidata = vi.mocked(wikidataLookup);
const mockOsm = vi.mocked(osmLookup);

describe('venue-enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheRows.value = [];
    mockPerfRows.value = [];
  });

  describe('enrichVenueCapacity', () => {
    it('returns cached result when fresh', async () => {
      mockCacheRows.value = [
        {
          id: 'cached-id',
          venueName: 'Red Rocks',
          venueCity: 'Morrison',
          resolvedCapacity: 9525,
          wikidataCapacity: 9525,
          osmCapacity: 9500,
          source: 'auto',
          confidence: 'high',
          lookedUpAt: new Date(), // fresh
        },
      ];

      const result = await enrichVenueCapacity('Red Rocks', 'Morrison');

      expect(result.resolvedCapacity).toBe(9525);
      expect(result.confidence).toBe('high');
      expect(mockWikidata).not.toHaveBeenCalled();
      expect(mockOsm).not.toHaveBeenCalled();
    });

    it('auto-resolves when both sources agree', async () => {
      mockWikidata.mockResolvedValue({ capacity: 20000, entityId: 'Q186' });
      mockOsm.mockResolvedValue({ capacity: 20500, osmId: 'way/123' });

      const result = await enrichVenueCapacity('MSG', 'New York');

      expect(result.confidence).toBe('high');
      expect(result.resolvedCapacity).toBe(20250); // average
      expect(result.source).toBe('auto');
    });

    it('returns low confidence when sources disagree', async () => {
      mockWikidata.mockResolvedValue({ capacity: 20000, entityId: 'Q186' });
      mockOsm.mockResolvedValue({ capacity: 5000, osmId: 'way/456' });

      const result = await enrichVenueCapacity('Some Arena', 'Chicago');

      expect(result.confidence).toBe('low');
      expect(result.resolvedCapacity).toBeNull();
      expect(result.wikidataCapacity).toBe(20000);
      expect(result.osmCapacity).toBe(5000);
    });

    it('uses single source when only wikidata has data', async () => {
      mockWikidata.mockResolvedValue({ capacity: 15000, entityId: 'Q999' });
      mockOsm.mockResolvedValue(null);

      const result = await enrichVenueCapacity('The Forum', 'Inglewood');

      expect(result.confidence).toBe('low');
      expect(result.resolvedCapacity).toBe(15000);
      expect(result.source).toBe('wikidata_only');
    });

    it('uses single source when only OSM has data', async () => {
      mockWikidata.mockResolvedValue(null);
      mockOsm.mockResolvedValue({ capacity: 800, osmId: 'node/789' });

      const result = await enrichVenueCapacity('The Basement', 'Nashville');

      expect(result.confidence).toBe('low');
      expect(result.resolvedCapacity).toBe(800);
      expect(result.source).toBe('osm_only');
    });

    it('returns null when neither source has data', async () => {
      mockWikidata.mockResolvedValue(null);
      mockOsm.mockResolvedValue(null);

      const result = await enrichVenueCapacity("Joe's Garage", 'Smalltown');

      expect(result.resolvedCapacity).toBeNull();
      expect(result.confidence).toBeNull();
    });

    it('preserves user-entered cache values', async () => {
      mockCacheRows.value = [
        {
          id: 'user-cache-id',
          venueName: 'Local Bar',
          venueCity: 'Honolulu',
          resolvedCapacity: 150,
          wikidataCapacity: null,
          osmCapacity: null,
          source: 'user',
          confidence: 'user',
          lookedUpAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // stale
        },
      ];

      const result = await enrichVenueCapacity('Local Bar', 'Honolulu');

      // User values never go stale
      expect(result.resolvedCapacity).toBe(150);
      expect(result.source).toBe('user');
      expect(result.confidence).toBe('user');
    });

    it('agreement threshold handles edge case at exactly 10%', async () => {
      // 10000 vs 9000 = 10.5% diff → should NOT agree
      mockWikidata.mockResolvedValue({ capacity: 10000, entityId: 'Q1' });
      mockOsm.mockResolvedValue({ capacity: 9000, osmId: 'way/1' });

      const result = await enrichVenueCapacity('Test Arena', 'Test City');

      expect(result.confidence).toBe('low');
      expect(result.resolvedCapacity).toBeNull();
    });
  });
});
