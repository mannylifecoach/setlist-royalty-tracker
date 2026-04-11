import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { songs, songArtists, trackedArtists } from '@/db/schema';
import { lookupSongMetadata } from './musicbrainz';

export interface SongEnrichmentResult {
  workMbid: string | null;
  recordingMbid: string | null;
  iswc: string | null;
  source: 'musicbrainz' | 'partial' | 'none';
}

/**
 * Enrich a song's metadata via MusicBrainz.
 *
 * Strategy:
 * 1. Look up the song in MusicBrainz using title + linked artist name
 * 2. Get the Recording MBID, Work MBID, and ISWC from MusicBrainz
 * 3. Update the song record with whatever we found
 *
 * User-entered values are NEVER overwritten — we only fill in nulls.
 * BMI/ASCAP Work IDs are entered manually by the user; there is no
 * public API to look them up programmatically.
 */
export async function enrichSongMetadata(
  songId: string,
  userId: string
): Promise<SongEnrichmentResult> {
  // Load the song and its linked artists
  const [song] = await db
    .select()
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)))
    .limit(1);

  if (!song) {
    throw new Error('Song not found');
  }

  // Get the first linked artist for the MusicBrainz query
  const linkedArtists = await db
    .select({ artist: trackedArtists })
    .from(songArtists)
    .innerJoin(trackedArtists, eq(songArtists.artistId, trackedArtists.id))
    .where(eq(songArtists.songId, songId))
    .limit(1);

  if (linkedArtists.length === 0) {
    return {
      workMbid: null,
      recordingMbid: null,
      iswc: null,
      source: 'none',
    };
  }

  const artistName = linkedArtists[0].artist.artistName;

  // MusicBrainz lookup
  const mbResult = await lookupSongMetadata(song.title, artistName);

  if (!mbResult) {
    return {
      workMbid: null,
      recordingMbid: null,
      iswc: null,
      source: 'none',
    };
  }

  // Update the song — only fill nulls, never overwrite user input
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (!song.recordingMbid && mbResult.recordingMbid) {
    updates.recordingMbid = mbResult.recordingMbid;
  }
  if (!song.workMbid && mbResult.workMbid) {
    updates.workMbid = mbResult.workMbid;
  }
  if (!song.iswc && mbResult.iswc) {
    updates.iswc = mbResult.iswc;
  }

  if (Object.keys(updates).length > 1) {
    // More than just updatedAt
    await db.update(songs).set(updates).where(eq(songs.id, songId));
  }

  // Determine source classification for the response
  const hasFullMb = !!(mbResult.workMbid && mbResult.iswc);
  const hasAnyData = !!(
    mbResult.recordingMbid ||
    mbResult.workMbid ||
    mbResult.iswc
  );

  return {
    workMbid: mbResult.workMbid,
    recordingMbid: mbResult.recordingMbid,
    iswc: mbResult.iswc,
    source: hasFullMb ? 'musicbrainz' : hasAnyData ? 'partial' : 'none',
  };
}

/**
 * Background-friendly enrichment that swallows errors so it can be fired
 * during song creation without blocking the response.
 */
export async function enrichSongInBackground(
  songId: string,
  userId: string
): Promise<void> {
  try {
    await enrichSongMetadata(songId, userId);
  } catch (err) {
    console.error('[song-enrichment] Background enrichment failed:', err);
  }
}
