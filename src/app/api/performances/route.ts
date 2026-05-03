import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances, songs, trackedArtists, users } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { createManualPerformanceSchema } from '@/lib/schemas';
import { calculateExpirationDate } from '@/lib/setlistfm';

export const GET = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const songId = searchParams.get('songId');
  const artistId = searchParams.get('artistId');

  const conditions = [eq(performances.userId, session.user.id)];

  if (status) {
    conditions.push(eq(performances.status, status as 'discovered' | 'confirmed' | 'submitted' | 'expired' | 'ineligible'));
  }
  if (songId) {
    conditions.push(eq(performances.songId, songId));
  }
  if (artistId) {
    conditions.push(eq(performances.artistId, artistId));
  }

  const results = await db
    .select({
      performance: performances,
      song: songs,
      artist: trackedArtists,
    })
    .from(performances)
    .innerJoin(songs, eq(performances.songId, songs.id))
    .innerJoin(trackedArtists, eq(performances.artistId, trackedArtists.id))
    .where(and(...conditions))
    .orderBy(desc(performances.eventDate));

  return NextResponse.json(results);
});

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = await parseBody(request, createManualPerformanceSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // IDOR check: artist must belong to caller. 404 (not 403) so id existence
  // isn't an enumeration oracle — matches the convention from the IDOR audit.
  const [artist] = await db
    .select({ id: trackedArtists.id })
    .from(trackedArtists)
    .where(and(eq(trackedArtists.id, body.artistId), eq(trackedArtists.userId, userId)));
  if (!artist) {
    return NextResponse.json({ error: 'artist not found' }, { status: 404 });
  }

  // IDOR check: every song must belong to caller. Single bulk query.
  const ownedSongs = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(inArray(songs.id, body.songIds), eq(songs.userId, userId)));
  if (ownedSongs.length !== body.songIds.length) {
    return NextResponse.json({ error: 'one or more songs not found' }, { status: 404 });
  }

  const [userDefaults] = await db
    .select({
      defaultStartTimeHour: users.defaultStartTimeHour,
      defaultStartTimeAmPm: users.defaultStartTimeAmPm,
      defaultEndTimeHour: users.defaultEndTimeHour,
      defaultEndTimeAmPm: users.defaultEndTimeAmPm,
    })
    .from(users)
    .where(eq(users.id, userId));

  const expiresAt = calculateExpirationDate(body.eventDate);

  const rows = body.songIds.map((songId) => ({
    userId,
    songId,
    artistId: body.artistId,
    source: 'manual' as const,
    matchMethod: 'manual' as const,
    eventDate: body.eventDate,
    venueName: body.venueName,
    venueCity: body.venueCity,
    venueState: body.venueState ?? null,
    venueCountry: body.venueCountry ?? null,
    eventName: body.eventName ?? null,
    tourName: body.tourName ?? null,
    startTimeHour: userDefaults?.defaultStartTimeHour ?? null,
    startTimeAmPm: userDefaults?.defaultStartTimeAmPm ?? null,
    endTimeHour: userDefaults?.defaultEndTimeHour ?? null,
    endTimeAmPm: userDefaults?.defaultEndTimeAmPm ?? null,
    status: 'confirmed' as const,
    expiresAt,
  }));

  const created = await db.insert(performances).values(rows).returning({ id: performances.id });

  return NextResponse.json(
    { created: created.length, performanceIds: created.map((c) => c.id) },
    { status: 201 }
  );
});
