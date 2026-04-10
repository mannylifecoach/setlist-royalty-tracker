import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { venueCapacityCache, performances } from '@/db/schema';
import { lookupVenueCapacity as wikidataLookup } from './wikidata';
import { lookupVenueCapacity as osmLookup } from './openstreetmap';
import {
  VENUE_CAPACITY_CACHE_TTL_DAYS,
  VENUE_CAPACITY_AGREEMENT_THRESHOLD,
} from './constants';

export interface EnrichmentResult {
  resolvedCapacity: number | null;
  wikidataCapacity: number | null;
  osmCapacity: number | null;
  confidence: 'high' | 'low' | 'user' | null;
  source: 'auto' | 'user' | 'wikidata_only' | 'osm_only';
  attendanceAutoFilled?: boolean;
}

function isCacheStale(lookedUpAt: Date): boolean {
  const ageMs = Date.now() - lookedUpAt.getTime();
  const ttlMs = VENUE_CAPACITY_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

function capacitiesAgree(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  return diff / avg <= VENUE_CAPACITY_AGREEMENT_THRESHOLD;
}

export async function enrichVenueCapacity(
  venueName: string,
  venueCity: string
): Promise<EnrichmentResult> {
  // 1. Check cache
  const [cached] = await db
    .select()
    .from(venueCapacityCache)
    .where(
      and(
        eq(venueCapacityCache.venueName, venueName),
        eq(venueCapacityCache.venueCity, venueCity)
      )
    )
    .limit(1);

  if (cached && !isCacheStale(cached.lookedUpAt)) {
    // User-entered values never go stale
    if (cached.source === 'user' || !isCacheStale(cached.lookedUpAt)) {
      return {
        resolvedCapacity: cached.resolvedCapacity,
        wikidataCapacity: cached.wikidataCapacity,
        osmCapacity: cached.osmCapacity,
        confidence: cached.confidence as EnrichmentResult['confidence'],
        source: cached.source as EnrichmentResult['source'],
      };
    }
  }

  // 2. Query both sources in parallel
  const [wikidataResult, osmResult] = await Promise.all([
    wikidataLookup(venueName, venueCity),
    osmLookup(venueName, venueCity),
  ]);

  const wikidataCapacity = wikidataResult?.capacity ?? null;
  const osmCapacity = osmResult?.capacity ?? null;

  // 3. Resolution logic
  let resolvedCapacity: number | null = null;
  let confidence: 'high' | 'low' | null = null;
  let source: 'auto' | 'wikidata_only' | 'osm_only';

  if (wikidataCapacity !== null && osmCapacity !== null) {
    if (capacitiesAgree(wikidataCapacity, osmCapacity)) {
      resolvedCapacity = Math.round((wikidataCapacity + osmCapacity) / 2);
      confidence = 'high';
      source = 'auto';
    } else {
      // Sources disagree — don't auto-resolve, let user pick
      resolvedCapacity = null;
      confidence = 'low';
      source = 'auto';
    }
  } else if (wikidataCapacity !== null) {
    resolvedCapacity = wikidataCapacity;
    confidence = 'low';
    source = 'wikidata_only';
  } else if (osmCapacity !== null) {
    resolvedCapacity = osmCapacity;
    confidence = 'low';
    source = 'osm_only';
  } else {
    source = 'auto';
  }

  // 4. Upsert cache
  const cacheData = {
    venueName,
    venueCity,
    wikidataCapacity,
    wikidataEntityId: wikidataResult?.entityId ?? null,
    osmCapacity,
    osmId: osmResult?.osmId ?? null,
    resolvedCapacity,
    source,
    confidence,
    lookedUpAt: new Date(),
  };

  if (cached) {
    // Don't overwrite user-entered values
    if (cached.source === 'user') {
      return {
        resolvedCapacity: cached.resolvedCapacity,
        wikidataCapacity,
        osmCapacity,
        confidence: 'user',
        source: 'user',
      };
    }
    await db
      .update(venueCapacityCache)
      .set(cacheData)
      .where(eq(venueCapacityCache.id, cached.id));
  } else {
    await db.insert(venueCapacityCache).values(cacheData);
  }

  return {
    resolvedCapacity,
    wikidataCapacity,
    osmCapacity,
    confidence,
    source,
  };
}

export async function enrichPerformanceCapacity(
  performanceId: string,
  userId: string
): Promise<EnrichmentResult> {
  const [perf] = await db
    .select()
    .from(performances)
    .where(
      and(eq(performances.id, performanceId), eq(performances.userId, userId))
    )
    .limit(1);

  if (!perf) {
    throw new Error('Performance not found');
  }

  if (!perf.venueName || !perf.venueCity) {
    return {
      resolvedCapacity: null,
      wikidataCapacity: null,
      osmCapacity: null,
      confidence: null,
      source: 'auto',
    };
  }

  const result = await enrichVenueCapacity(perf.venueName, perf.venueCity);

  // Auto-fill capacity and use as attendance default when empty
  if (result.resolvedCapacity !== null) {
    const updates: Record<string, unknown> = {
      venueCapacity: String(result.resolvedCapacity),
      updatedAt: new Date(),
    };

    // Suggest capacity as attendance default if attendance is empty
    if (perf.attendance === null) {
      updates.attendance = result.resolvedCapacity;
    }

    if (result.confidence === 'high' || result.confidence === 'low') {
      await db
        .update(performances)
        .set(updates)
        .where(
          and(eq(performances.id, performanceId), eq(performances.userId, userId))
        );
    }
  }

  return {
    ...result,
    attendanceAutoFilled: result.resolvedCapacity !== null && perf.attendance === null,
  };
}

export async function saveUserCapacity(
  venueName: string,
  venueCity: string,
  capacity: number
): Promise<void> {
  const [existing] = await db
    .select()
    .from(venueCapacityCache)
    .where(
      and(
        eq(venueCapacityCache.venueName, venueName),
        eq(venueCapacityCache.venueCity, venueCity)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(venueCapacityCache)
      .set({
        resolvedCapacity: capacity,
        source: 'user',
        confidence: 'user',
        lookedUpAt: new Date(),
      })
      .where(eq(venueCapacityCache.id, existing.id));
  } else {
    await db.insert(venueCapacityCache).values({
      venueName,
      venueCity,
      resolvedCapacity: capacity,
      source: 'user',
      confidence: 'user',
    });
  }
}
