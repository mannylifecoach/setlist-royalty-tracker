import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { songs, songArtists, trackedArtists } from '@/db/schema';
import { lookupSongMetadata } from './musicbrainz';
import { lookupWorkIdsByIswc } from './songview';

export interface SongEnrichmentResult {
  workMbid: string | null;
  recordingMbid: string | null;
  iswc: string | null;
  bmiWorkId: string | null;
  ascapWorkId: string | null;
  source: 'musicbrainz' | 'partial' | 'none';
}

/**
 * Enrich a song's metadata via MusicBrainz + Songview.
 *
 * Strategy:
 * 1. Look up the song in MusicBrainz using title + linked artist name
 * 2. Get the Recording MBID, Work MBID, and ISWC from MusicBrainz
 * 3. If we have an ISWC, query Songview for BMI/ASCAP Work IDs
 * 4. Update the song record with whatever we found
 *
 * User-entered values are NEVER overwritten — we only fill in nulls.
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
      bmiWorkId: null,
      ascapWorkId: null,
      source: 'none',
    };
  }

  const artistName = linkedArtists[0].artist.artistName;

  // Step 1 + 2: MusicBrainz lookup
  const mbResult = await lookupSongMetadata(song.title, artistName);

  if (!mbResult) {
    return {
      workMbid: null,
      recordingMbid: null,
      iswc: null,
      bmiWorkId: null,
      ascapWorkId: null,
      source: 'none',
    };
  }

  // Step 3: If we have an ISWC, look up Work IDs via Songview
  let bmiWorkId: string | null = null;
  let ascapWorkId: string | null = null;
  if (mbResult.iswc) {
    const sv = await lookupWorkIdsByIswc(mbResult.iswc);
    bmiWorkId = sv.bmiWorkId;
    ascapWorkId = sv.ascapWorkId;
  }

  // Step 4: Update the song — only fill nulls, never overwrite user input
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
  if (!song.bmiWorkId && bmiWorkId) {
    updates.bmiWorkId = bmiWorkId;
  }
  if (!song.ascapWorkId && ascapWorkId) {
    updates.ascapWorkId = ascapWorkId;
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
    mbResult.iswc ||
    bmiWorkId ||
    ascapWorkId
  );

  return {
    workMbid: mbResult.workMbid,
    recordingMbid: mbResult.recordingMbid,
    iswc: mbResult.iswc,
    bmiWorkId,
    ascapWorkId,
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
