import { db } from '@/db';
import {
  songs,
  trackedArtists,
  songArtists,
  performances,
  scanLog,
  users,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getArtistSetlists,
  extractSongsFromSetlist,
  parseSetlistFmDate,
  calculateExpirationDate,
} from './setlistfm';
import { sendNewPerformancesEmail } from './email';
import { normalizeTitle, findBestMatch } from './fuzzy-match';

interface ScanResult {
  artistName: string;
  setlistsFound: number;
  newPerformances: number;
  songTitles: string[];
}

export async function scanForUser(userId: string): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  // Get user's tracked artists with MBIDs
  const artists = await db
    .select()
    .from(trackedArtists)
    .where(eq(trackedArtists.userId, userId));

  console.log(`[scan] Found ${artists.length} tracked artists for user ${userId}`);

  for (const artist of artists) {
    if (!artist.mbid) {
      console.log(`[scan] Skipping ${artist.artistName} — no MBID`);
      continue;
    }

    console.log(`[scan] Scanning ${artist.artistName} (${artist.mbid})...`);
    const result = await scanArtistForUser(userId, artist);
    console.log(`[scan] ${artist.artistName}: ${result.setlistsFound} setlists, ${result.newPerformances} new performances`);
    results.push(result);
  }

  return results;
}

async function scanArtistForUser(
  userId: string,
  artist: typeof trackedArtists.$inferSelect
): Promise<ScanResult> {
  const result: ScanResult = {
    artistName: artist.artistName,
    setlistsFound: 0,
    newPerformances: 0,
    songTitles: [],
  };

  // Get the user's songs linked to this artist
  const linkedSongs = await db
    .select({ song: songs })
    .from(songArtists)
    .innerJoin(songs, eq(songArtists.songId, songs.id))
    .where(eq(songArtists.artistId, artist.id));

  if (linkedSongs.length === 0) return result;

  // Build a normalized title map for fuzzy matching
  const songTitleMap = new Map(
    linkedSongs.map((ls) => [normalizeTitle(ls.song.title), ls.song])
  );

  // 9 months ago cutoff
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 9);

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { setlists, total } = await getArtistSetlists(artist.mbid!, page);
    result.setlistsFound += setlists.length;

    for (const setlist of setlists) {
      const eventDate = parseSetlistFmDate(setlist.eventDate);
      if (new Date(eventDate) < cutoff) {
        hasMore = false;
        break;
      }

      const setlistSongs = extractSongsFromSetlist(setlist);

      for (const songName of setlistSongs) {
        const matchResult = findBestMatch(songName, songTitleMap);
        if (!matchResult) continue;
        const matchedSong = matchResult.match;

        if (matchResult.method === 'fuzzy') {
          console.log(`[scan] Fuzzy match: "${songName}" → "${matchedSong.title}" (score: ${matchResult.score.toFixed(2)})`);
        }

        // Check for existing performance (dedup)
        const existing = await db
          .select()
          .from(performances)
          .where(
            and(
              eq(performances.userId, userId),
              eq(performances.songId, matchedSong.id),
              eq(performances.setlistFmId, setlist.id)
            )
          );

        if (existing.length > 0) continue;

        // Insert new performance
        await db.insert(performances).values({
          userId,
          songId: matchedSong.id,
          artistId: artist.id,
          setlistFmId: setlist.id,
          eventDate,
          tourName: setlist.tour?.name || null,
          venueName: setlist.venue?.name || null,
          venueCity: setlist.venue?.city?.name || null,
          venueState: setlist.venue?.city?.stateCode || setlist.venue?.city?.state || null,
          venueCountry: setlist.venue?.city?.country?.code || null,
          status: 'discovered',
          expiresAt: calculateExpirationDate(eventDate),
          setlistFmUrl: setlist.url,
        });

        result.newPerformances++;
        if (!result.songTitles.includes(matchedSong.title)) {
          result.songTitles.push(matchedSong.title);
        }
      }
    }

    // Check if there are more pages
    const totalPages = Math.ceil(total / 20);
    if (page >= totalPages) hasMore = false;
    page++;
  }

  // Log the scan
  await db.insert(scanLog).values({
    userId,
    artistId: artist.id,
    setlistsFound: result.setlistsFound,
    newPerformances: result.newPerformances,
  });

  return result;
}

export async function scanAllUsers(): Promise<void> {
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    const results = await scanForUser(user.id);

    // Send email notification if new performances found
    const totalNew = results.reduce((sum, r) => sum + r.newPerformances, 0);
    if (totalNew > 0 && user.email) {
      for (const result of results) {
        if (result.newPerformances > 0) {
          await sendNewPerformancesEmail(
            user.email,
            result.artistName,
            result.newPerformances,
            result.songTitles
          );
        }
      }
    }
  }
}
