import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songArtists, songs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withHandler, parseBody, validateUuid } from '@/lib/api-utils';
import { songArtistSchema } from '@/lib/schemas';
import { enrichSongInBackground } from '@/lib/song-enrichment';

export const POST = withHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: songId } = await params;
  const idCheck = validateUuid(songId);
  if ('error' in idCheck) return idCheck.error;

  const result = await parseBody(request, songArtistSchema);
  if ('error' in result) return result.error;
  const { artistId } = result.data;

  // Verify song belongs to user
  const [song] = await db
    .select()
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, session.user.id)));

  if (!song) {
    return NextResponse.json({ error: 'song not found' }, { status: 404 });
  }

  const [link] = await db
    .insert(songArtists)
    .values({ songId, artistId })
    .onConflictDoNothing()
    .returning();

  // Trigger background metadata enrichment if the song lacks MusicBrainz IDs
  if (!song.workMbid || !song.recordingMbid) {
    void enrichSongInBackground(songId, session.user.id);
  }

  return NextResponse.json(link || { songId, artistId }, { status: 201 });
});

export const DELETE = withHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: songId } = await params;
  const idCheck = validateUuid(songId);
  if ('error' in idCheck) return idCheck.error;

  const result = await parseBody(request, songArtistSchema);
  if ('error' in result) return result.error;
  const { artistId } = result.data;

  // Authz: confirm the song belongs to the current user before mutating its
  // links. Without this precheck, the DELETE WHERE clause only filtered by
  // (songId, artistId), so any authenticated user could unlink an artist from
  // any other user's song. Caught by IDOR audit 2026-04-30.
  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, session.user.id)));
  if (!song) {
    return NextResponse.json({ error: 'song not found' }, { status: 404 });
  }

  await db
    .delete(songArtists)
    .where(
      and(eq(songArtists.songId, songId), eq(songArtists.artistId, artistId))
    );

  return NextResponse.json({ ok: true });
});
