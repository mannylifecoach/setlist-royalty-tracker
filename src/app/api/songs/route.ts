import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songs, songArtists, trackedArtists, songWriters, users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { createSongSchema } from '@/lib/schemas';
import { WRITER_SHARE_TOTAL } from '@/lib/constants';

export const GET = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userSongs = await db
    .select()
    .from(songs)
    .where(eq(songs.userId, session.user.id))
    .orderBy(songs.title);

  if (userSongs.length === 0) {
    return NextResponse.json([]);
  }

  const songIds = userSongs.map((s) => s.id);

  // Bulk-load linked artists + writers for all songs in two queries instead of N+1.
  const [allLinkedArtists, allWriters] = await Promise.all([
    db
      .select({ songId: songArtists.songId, artist: trackedArtists })
      .from(songArtists)
      .innerJoin(trackedArtists, eq(songArtists.artistId, trackedArtists.id))
      .where(inArray(songArtists.songId, songIds)),
    db
      .select()
      .from(songWriters)
      .where(inArray(songWriters.songId, songIds))
      .orderBy(songWriters.createdAt),
  ]);

  const artistsBySong = new Map<string, typeof trackedArtists.$inferSelect[]>();
  for (const row of allLinkedArtists) {
    const list = artistsBySong.get(row.songId) ?? [];
    list.push(row.artist);
    artistsBySong.set(row.songId, list);
  }
  const writersBySong = new Map<string, typeof songWriters.$inferSelect[]>();
  for (const w of allWriters) {
    const list = writersBySong.get(w.songId) ?? [];
    list.push(w);
    writersBySong.set(w.songId, list);
  }

  return NextResponse.json(
    userSongs.map((s) => ({
      ...s,
      artists: artistsBySong.get(s.id) ?? [],
      writers: writersBySong.get(s.id) ?? [],
    }))
  );
});

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, createSongSchema);
  if ('error' in result) return result.error;
  const { title, iswc, bmiWorkId, ascapWorkId } = result.data;

  const [song] = await db
    .insert(songs)
    .values({
      userId: session.user.id,
      title,
      iswc: iswc || null,
      bmiWorkId: bmiWorkId || null,
      ascapWorkId: ascapWorkId || null,
    })
    .returning();

  // Auto-create a default writer row using the user's name + IPI at the full
  // 50% writer share. Mirrors the migration backfill for existing songs so the
  // user never sees a "writers don't sum to 50" error on a brand-new song.
  // They can edit/add co-writers from the songs page.
  try {
    const [user] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        stageName: users.stageName,
        email: users.email,
        ipi: users.ipi,
        defaultRole: users.defaultRole,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (user) {
      const writerName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        user.stageName ||
        user.email.split('@')[0];
      await db.insert(songWriters).values({
        songId: song.id,
        name: writerName,
        ipi: user.ipi || null,
        role: user.defaultRole || 'CA',
        sharePercent: WRITER_SHARE_TOTAL.toFixed(2),
      });
    }
  } catch (err) {
    console.error('default writer insert failed', err);
  }

  return NextResponse.json(song, { status: 201 });
});
