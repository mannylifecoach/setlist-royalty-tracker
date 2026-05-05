/**
 * Serato import orchestrator.
 *
 * Takes a parsed Serato CSV plus venue/date details, runs the same matching
 * logic as the setlist.fm scanner, and creates performance records for every
 * matched track.
 *
 * Matching tiers:
 *   1. Fuzzy title match against the user's registered songs (fast, free)
 *   2. MusicBrainz Work MBID match (catches remixes and renamed versions)
 *
 * Only matched tracks become performance records. Unmatched tracks are
 * reported in the result summary so the user can see what was skipped.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs, songArtists, performances, importBatches, users } from '@/db/schema';
import { normalizeTitle, findBestMatch } from './fuzzy-match';
import { lookupSongMetadata } from './musicbrainz';
import { calculateExpirationDate } from './setlistfm';
import { enrichVenueCapacity } from './venue-enrichment';
import type { SeratoTrack } from './serato-import';

export interface SeratoImportVenue {
  name: string;
  city: string;
  state: string | null;
  country: string | null;
  eventDate: string; // YYYY-MM-DD
}

export interface SeratoImportResult {
  importBatchId: string;
  tracksFound: number;
  performancesCreated: number;
  matched: { trackTitle: string; songTitle: string; method: string }[];
  unmatched: string[];
}

interface LinkedSong {
  id: string;
  title: string;
  workMbid: string | null;
  // Plus whatever else drizzle returns — we only care about id, title, workMbid
  [key: string]: unknown;
}

export async function importSeratoTracks(
  userId: string,
  tracks: SeratoTrack[],
  venue: SeratoImportVenue
): Promise<SeratoImportResult> {
  // Times are NOT eager-filled here — they get resolved at READ time in the
  // extension API via user.default*Time fallback (commit fixing the
  // 2026-05-03 Mckay bug where settings changes never reached existing rows).

  // Load all of the user's registered songs — we match against every song,
  // not just songs linked to specific artists, because a DJ's own productions
  // may not have setlist.fm-registered performer artists yet.
  const userSongs = (await db
    .select()
    .from(songs)
    .where(eq(songs.userId, userId))) as LinkedSong[];

  if (userSongs.length === 0) {
    return {
      importBatchId: '',
      tracksFound: tracks.length,
      performancesCreated: 0,
      matched: [],
      unmatched: tracks.map((t) => t.title),
    };
  }

  // Build lookup maps for matching
  const songTitleMap = new Map<string, LinkedSong>(
    userSongs.map((s) => [normalizeTitle(s.title), s])
  );
  const workMbidMap = new Map<string, LinkedSong>(
    userSongs
      .filter((s) => s.workMbid)
      .map((s) => [s.workMbid as string, s])
  );

  // Enrich venue capacity (fires Wikidata + OSM lookups, caches result)
  // Best-effort — if it fails, the performance still gets created.
  let resolvedCapacity: number | null = null;
  try {
    const enrichment = await enrichVenueCapacity(venue.name, venue.city);
    resolvedCapacity = enrichment.resolvedCapacity;
  } catch (err) {
    console.error('[serato-import] Venue enrichment failed:', err);
  }

  // Find the first linked artist for any matched songs — we need an artistId
  // to satisfy the performances.artistId foreign key constraint.
  // Strategy: for each matched song, look up any artist it's linked to and
  // use that. If the song has no linked artist, we skip it with a warning.
  const linkedArtistBySong = new Map<string, string>();
  const linkRows = await db.select().from(songArtists);
  for (const link of linkRows) {
    if (!linkedArtistBySong.has(link.songId)) {
      linkedArtistBySong.set(link.songId, link.artistId);
    }
  }

  // Create the import batch record first so we can reference its ID
  const [batch] = await db
    .insert(importBatches)
    .values({
      userId,
      source: 'serato',
      venueName: venue.name,
      venueCity: venue.city,
      venueState: venue.state,
      venueCountry: venue.country,
      eventDate: venue.eventDate,
      tracksFound: tracks.length,
      performancesCreated: 0,
    })
    .returning();

  const result: SeratoImportResult = {
    importBatchId: batch.id,
    tracksFound: tracks.length,
    performancesCreated: 0,
    matched: [],
    unmatched: [],
  };

  const expiresAt = calculateExpirationDate(venue.eventDate);

  for (const track of tracks) {
    let matchedSong: LinkedSong | null = null;
    let method: string = 'none';

    // Tier 1: Fuzzy title match
    const fuzzy = findBestMatch(track.title, songTitleMap);
    if (fuzzy) {
      matchedSong = fuzzy.match;
      method = fuzzy.method;
    } else if (workMbidMap.size > 0) {
      // Tier 2: MusicBrainz Work MBID match
      const mbResult = await lookupSongMetadata(track.title, track.artistName);
      if (mbResult?.workMbid && workMbidMap.has(mbResult.workMbid)) {
        matchedSong = workMbidMap.get(mbResult.workMbid)!;
        method = 'work_mbid';
      }
    }

    if (!matchedSong) {
      result.unmatched.push(track.title);
      continue;
    }

    // Need an artistId for the foreign key. If this song has no linked artist,
    // we can't create a performance record — skip with a warning.
    const artistId = linkedArtistBySong.get(matchedSong.id);
    if (!artistId) {
      result.unmatched.push(`${track.title} (no linked artist on registered song)`);
      continue;
    }

    // Normalize match method to the canonical enum values
    const canonicalMethod: 'fuzzy' | 'work_mbid' | 'exact' =
      method === 'work_mbid' ? 'work_mbid' : method === 'exact' ? 'exact' : 'fuzzy';

    // Create the performance record with user's default times
    await db.insert(performances).values({
      userId,
      songId: matchedSong.id,
      artistId,
      source: 'serato_import',
      matchMethod: canonicalMethod,
      importBatchId: batch.id,
      setlistFmId: null,
      setlistFmUrl: null,
      eventDate: venue.eventDate,
      venueName: venue.name,
      venueCity: venue.city,
      venueState: venue.state,
      venueCountry: venue.country,
      attendance: resolvedCapacity,
      venueCapacity: resolvedCapacity !== null ? String(resolvedCapacity) : null,
      startTimeHour: null,
      startTimeAmPm: null,
      endTimeHour: null,
      endTimeAmPm: null,
      status: 'discovered',
      expiresAt,
    });

    result.performancesCreated++;
    result.matched.push({
      trackTitle: track.title,
      songTitle: matchedSong.title,
      method,
    });
  }

  // Update the batch record with the final count
  await db
    .update(importBatches)
    .set({ performancesCreated: result.performancesCreated })
    .where(eq(importBatches.id, batch.id));

  return result;
}
