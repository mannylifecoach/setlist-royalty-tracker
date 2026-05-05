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
import { lookupSongMetadata } from './musicbrainz';

interface ScanResult {
  artistName: string;
  setlistsFound: number;
  newPerformances: number;
  songTitles: string[];
}

export async function scanForUser(userId: string): Promise<ScanResult[]> {
  // Load user's default times for new performances
  const [userDefaults] = await db
    .select({
      defaultStartTimeHour: users.defaultStartTimeHour,
      defaultStartTimeAmPm: users.defaultStartTimeAmPm,
      defaultEndTimeHour: users.defaultEndTimeHour,
      defaultEndTimeAmPm: users.defaultEndTimeAmPm,
    })
    .from(users)
    .where(eq(users.id, userId));

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
    const result = await scanArtistForUser(userId, artist, userDefaults || null);
    console.log(`[scan] ${artist.artistName}: ${result.setlistsFound} setlists, ${result.newPerformances} new performances`);
    results.push(result);
  }

  return results;
}

interface TimeDefaults {
  defaultStartTimeHour: string | null;
  defaultStartTimeAmPm: string | null;
  defaultEndTimeHour: string | null;
  defaultEndTimeAmPm: string | null;
}

async function scanArtistForUser(
  userId: string,
  artist: typeof trackedArtists.$inferSelect,
  timeDefaults: TimeDefaults | null
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

  // Build a Work MBID map for structural matching (the technical moat)
  // Songs with a workMbid can be matched even when titles diverge (remixes, edits, covers)
  const workMbidMap = new Map(
    linkedSongs
      .filter((ls) => ls.song.workMbid)
      .map((ls) => [ls.song.workMbid as string, ls.song])
  );

  // Stale-data cutoff: don't bother with setlist.fm rows older than 9 months.
  // BMI's filing windows mean any performance more than ~6 months old is
  // already past its deadline (per calculateExpirationDate's quarterly logic),
  // but we keep 9 months of margin so users can still SEE recently-expired
  // rows on their dashboard rather than having them silently disappear.
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
        // Tier 1: Try fuzzy title matching first (fast, no external API)
        let matchedSong: typeof songs.$inferSelect | null = null;
        let matchMethod: 'fuzzy' | 'work_mbid' | 'exact' | null = null;

        const fuzzyResult = findBestMatch(songName, songTitleMap);
        if (fuzzyResult) {
          matchedSong = fuzzyResult.match;
          matchMethod = fuzzyResult.method === 'exact' ? 'exact' : 'fuzzy';
          if (fuzzyResult.method === 'fuzzy') {
            console.log(`[scan] Fuzzy match: "${songName}" → "${matchedSong.title}" (score: ${fuzzyResult.score.toFixed(2)})`);
          }
        } else if (workMbidMap.size > 0) {
          // Tier 2: MusicBrainz Work MBID matching — catches remixes, renamed versions, covers
          // Only attempted if at least one registered song has a Work MBID (avoids unnecessary API calls)
          const mbResult = await lookupSongMetadata(songName, artist.artistName);
          if (mbResult?.workMbid && workMbidMap.has(mbResult.workMbid)) {
            matchedSong = workMbidMap.get(mbResult.workMbid)!;
            matchMethod = 'work_mbid';
            console.log(`[scan] Work MBID match: "${songName}" → "${matchedSong.title}" (work: ${mbResult.workMbid})`);
          }
        }

        if (!matchedSong) continue;

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

        // Insert new performance with user's default times
        await db.insert(performances).values({
          userId,
          songId: matchedSong.id,
          artistId: artist.id,
          setlistFmId: setlist.id,
          matchMethod,
          eventDate,
          tourName: setlist.tour?.name || null,
          venueName: setlist.venue?.name || null,
          venueCity: setlist.venue?.city?.name || null,
          venueState: setlist.venue?.city?.stateCode || setlist.venue?.city?.state || null,
          venueCountry: setlist.venue?.city?.country?.code || null,
          startTimeHour: timeDefaults?.defaultStartTimeHour || null,
          startTimeAmPm: timeDefaults?.defaultStartTimeAmPm || null,
          endTimeHour: timeDefaults?.defaultEndTimeHour || null,
          endTimeAmPm: timeDefaults?.defaultEndTimeAmPm || null,
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
    if (totalNew > 0 && user.email && user.emailNotifications) {
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
