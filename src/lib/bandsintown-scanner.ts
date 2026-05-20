import { db } from '@/db';
import { users, songs, trackedArtists, performances } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { fetchPastEvents, eventDateString } from './bandsintown';
import { calculateExpirationDate } from './setlistfm';

// Bandsintown Path A scanner — runs once per user during the normal scan flow.
// Returns a result row compatible with the existing ScanResult shape so the
// email digest in scanAllUsers consumes both setlist.fm + bandsintown matches.

export interface BandsintownScanResult {
  artistName: string;
  setlistsFound: number;
  newPerformances: number;
  songTitles: string[];
  source: 'bandsintown';
  skipped?: string; // human-readable reason when we no-oped instead of scanning
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Pulls past Bandsintown events for the artist tied to the user's key, then
 * creates one performance row per song in the user's default setlist template
 * (Card 1) for each event. Dedupes against existing rows on
 * `(userId, artistId, eventDate, lower(venueName))` so a setlist.fm-discovered
 * row already on file won't get a duplicate Bandsintown row.
 *
 * Returns a result describing what happened. `null` is reserved for "user has
 * nothing configured" so the caller can quietly skip without logging.
 */
export async function scanBandsintownForUser(
  userId: string
): Promise<BandsintownScanResult | null> {
  const [user] = await db
    .select({
      bandsintownApiKey: users.bandsintownApiKey,
      bandsintownArtistSlug: users.bandsintownArtistSlug,
      defaultSetlistSongIds: users.defaultSetlistSongIds,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.bandsintownApiKey || !user?.bandsintownArtistSlug) return null;

  const slug = user.bandsintownArtistSlug;
  const templateIds = (user.defaultSetlistSongIds as string[] | null) ?? [];

  // Bandsintown events have no setlists; we must pre-fill from the template.
  if (templateIds.length === 0) {
    return {
      artistName: slug,
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: 'no default setlist template configured',
    };
  }

  // IDOR-style filter: drop any template ids the user has since deleted.
  const ownedSongs = await db
    .select({ id: songs.id, title: songs.title })
    .from(songs)
    .where(and(inArray(songs.id, templateIds), eq(songs.userId, userId)));
  if (ownedSongs.length === 0) {
    return {
      artistName: slug,
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: 'default setlist template references no owned songs',
    };
  }

  // Match the Bandsintown slug to one of the user's tracked artists by
  // normalized name. The slug for "Tiffany Alvord" is "tiffany-alvord"; both
  // normalize to "tiffanyalvord". When 0 or 2+ tracked artists match we skip
  // (a future revision could add an explicit bandsintown_slug column on
  // tracked_artists for unambiguous linking).
  const userArtists = await db
    .select()
    .from(trackedArtists)
    .where(eq(trackedArtists.userId, userId));
  const normalizedSlug = normalizeForMatch(slug);
  const matches = userArtists.filter(
    (a) => normalizeForMatch(a.artistName) === normalizedSlug
  );
  if (matches.length !== 1) {
    return {
      artistName: slug,
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped:
        matches.length === 0
          ? `bandsintown slug "${slug}" does not match any tracked artist`
          : `bandsintown slug "${slug}" matches ${matches.length} tracked artists — link is ambiguous`,
    };
  }
  const artist = matches[0];

  const eventsResult = await fetchPastEvents(user.bandsintownApiKey, slug);
  if (!eventsResult.ok) {
    return {
      artistName: artist.artistName,
      setlistsFound: 0,
      newPerformances: 0,
      songTitles: [],
      source: 'bandsintown',
      skipped: `bandsintown fetch failed: ${eventsResult.error}`,
    };
  }

  // Same 9-month staleness cutoff as the setlist.fm scanner so deadline-aware
  // dashboards stay coherent across sources.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 9);

  const result: BandsintownScanResult = {
    artistName: artist.artistName,
    setlistsFound: eventsResult.data.length,
    newPerformances: 0,
    songTitles: [],
    source: 'bandsintown',
  };

  for (const event of eventsResult.data) {
    const eventDate = eventDateString(event.datetime);
    if (new Date(eventDate) < cutoff) continue;
    if (!event.venue?.name) continue;

    // Dedupe across ALL sources (setlist.fm + Serato + Bandsintown). Same user,
    // same tracked artist, same date, case-insensitive same venue → already
    // discovered.
    const existing = await db
      .select({ id: performances.id })
      .from(performances)
      .where(
        and(
          eq(performances.userId, userId),
          eq(performances.artistId, artist.id),
          eq(performances.eventDate, eventDate),
          sql`lower(coalesce(${performances.venueName}, '')) = lower(${event.venue.name})`
        )
      );
    if (existing.length > 0) continue;

    // Insert one row per template song. Mirrors how the setlist.fm scanner and
    // Serato orchestrator create one row per matched track.
    const rows = ownedSongs.map((s) => ({
      userId,
      songId: s.id,
      artistId: artist.id,
      source: 'bandsintown' as const,
      matchMethod: null,
      eventDate,
      venueName: event.venue.name,
      venueCity: event.venue.city || null,
      venueState: event.venue.region || null,
      venueCountry: event.venue.country || null,
      startTimeHour: null,
      startTimeAmPm: null,
      endTimeHour: null,
      endTimeAmPm: null,
      status: 'discovered' as const,
      expiresAt: calculateExpirationDate(eventDate),
    }));
    await db.insert(performances).values(rows);

    result.newPerformances += rows.length;
    for (const s of ownedSongs) {
      if (!result.songTitles.includes(s.title)) result.songTitles.push(s.title);
    }
  }

  return result;
}
